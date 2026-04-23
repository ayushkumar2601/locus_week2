/**
 * Deployer Agent - Handles deployment operations via Locus API
 * Manages deployment lifecycle, status tracking, and error recovery
 */

const axios = require('axios');
const EventEmitter = require('events');

class DeployerAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.locusApiKey = options.locusApiKey || process.env.LOCUS_API_KEY;
    this.locusApiUrl = options.locusApiUrl || process.env.LOCUS_API_URL || 'https://api.locus.com/v1';
    this.logger = options.logger || console;
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      ...options.retryConfig
    };
    this.deployments = new Map(); // Track active deployments
    this.rateLimiter = new RateLimiter(options.rateLimit || { requests: 100, window: 60000 });
    
    if (!this.locusApiKey) {
      throw new Error('Locus API key is required');
    }
  }

  /**
   * Deploy application using deployment plan
   * @param {Object} deploymentPlan - Plan from PlannerAgent
   * @param {Object} options - Deployment options
   * @returns {Object} Deployment result with ID and status
   */
  async deploy(deploymentPlan, options = {}) {
    const deploymentId = this.generateDeploymentId();
    
    try {
      this.logger.info('Starting deployment', { deploymentId, plan: deploymentPlan.id });
      
      // Track deployment
      this.deployments.set(deploymentId, {
        id: deploymentId,
        status: 'INITIALIZING',
        plan: deploymentPlan,
        startTime: Date.now(),
        options
      });

      this.emit('deployment:started', { deploymentId, plan: deploymentPlan });

      // Step 1: Validate deployment plan
      await this.validateDeploymentPlan(deploymentPlan);
      this.updateDeploymentStatus(deploymentId, 'VALIDATED');

      // Step 2: Prepare deployment specification
      const deploymentSpec = await this.prepareDeploymentSpec(deploymentPlan, options);
      this.updateDeploymentStatus(deploymentId, 'PREPARED');

      // Step 3: Execute deployment via Locus API
      const locusDeployment = await this.executeLocusDeployment(deploymentSpec);
      this.updateDeploymentStatus(deploymentId, 'DEPLOYING', { locusId: locusDeployment.id });

      // Step 4: Monitor deployment progress
      const deploymentResult = await this.monitorDeployment(deploymentId, locusDeployment.id);
      
      // Step 5: Verify deployment health
      await this.verifyDeploymentHealth(deploymentResult);
      this.updateDeploymentStatus(deploymentId, 'DEPLOYED');

      const result = {
        deploymentId,
        locusDeploymentId: locusDeployment.id,
        status: 'SUCCESS',
        endpoints: deploymentResult.endpoints,
        resources: deploymentResult.resources,
        cost: deploymentResult.estimatedCost,
        duration: Date.now() - this.deployments.get(deploymentId).startTime,
        metadata: {
          region: deploymentResult.region,
          instances: deploymentResult.instances,
          version: deploymentResult.version
        }
      };

      this.emit('deployment:completed', result);
      this.logger.info('Deployment completed successfully', { deploymentId, duration: result.duration });

      return result;

    } catch (error) {
      this.updateDeploymentStatus(deploymentId, 'FAILED', { error: error.message });
      this.emit('deployment:failed', { deploymentId, error });
      this.logger.error('Deployment failed', { deploymentId, error: error.message, stack: error.stack });
      
      // Attempt cleanup on failure
      await this.cleanupFailedDeployment(deploymentId);
      
      throw new DeployerError(`Deployment failed: ${error.message}`, deploymentId, error);
    }
  }

  /**
   * Validate deployment plan before execution
   */
  async validateDeploymentPlan(plan) {
    const requiredFields = ['id', 'stack', 'infrastructure', 'buildConfig'];
    
    for (const field of requiredFields) {
      if (!plan[field]) {
        throw new Error(`Missing required field in deployment plan: ${field}`);
      }
    }

    // Validate infrastructure requirements
    if (!plan.infrastructure.compute || !plan.infrastructure.compute.cpu) {
      throw new Error('Invalid compute requirements in deployment plan');
    }

    // Validate build configuration
    if (!plan.buildConfig.startCommand) {
      throw new Error('Missing start command in build configuration');
    }

    this.logger.debug('Deployment plan validated successfully', { planId: plan.id });
  }

  /**
   * Prepare Locus API deployment specification
   */
  async prepareDeploymentSpec(plan, options) {
    const spec = {
      name: options.name || `app-${plan.id}`,
      environment: options.environment || 'production',
      region: options.region || 'us-east-1',
      
      // Application configuration
      application: {
        repository: plan.repository,
        buildConfig: {
          buildCommand: plan.buildConfig.buildCommand,
          startCommand: plan.buildConfig.startCommand,
          port: plan.buildConfig.port,
          healthCheck: plan.buildConfig.healthCheck,
          environment: {
            ...plan.buildConfig.environment,
            ...options.environmentVariables
          }
        },
        runtime: this.mapStackToRuntime(plan.stack.primary)
      },

      // Infrastructure configuration
      infrastructure: {
        compute: {
          cpu: plan.infrastructure.compute.cpu,
          memory: plan.infrastructure.compute.memory,
          instances: plan.infrastructure.compute.instances,
          scaling: plan.infrastructure.compute.scaling
        },
        storage: plan.infrastructure.storage,
        network: {
          ...plan.infrastructure.network,
          domains: options.domains || []
        }
      },

      // Database configuration
      databases: plan.infrastructure.database.map(db => ({
        type: db.type,
        size: db.size,
        backup: db.backup,
        multiAZ: db.multiAZ || false
      })),

      // Services configuration
      services: plan.infrastructure.services,

      // Deployment strategy
      deploymentStrategy: {
        type: plan.deploymentStrategy,
        rollback: {
          enabled: true,
          automatic: options.autoRollback !== false
        }
      },

      // Monitoring configuration
      monitoring: {
        enabled: true,
        healthCheck: {
          path: plan.buildConfig.healthCheck,
          interval: 30,
          timeout: 10,
          retries: 3
        },
        metrics: ['cpu', 'memory', 'requests', 'errors'],
        alerts: options.alerts || []
      }
    };

    this.logger.debug('Deployment specification prepared', { 
      name: spec.name, 
      region: spec.region,
      instances: spec.infrastructure.compute.instances 
    });

    return spec;
  }

  /**
   * Execute deployment via Locus API
   */
  async executeLocusDeployment(spec) {
    await this.rateLimiter.acquire();

    const response = await this.withRetry(async () => {
      return await axios.post(`${this.locusApiUrl}/deployments`, spec, {
        headers: {
          'Authorization': `Bearer ${this.locusApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DeployerAgent/1.0'
        },
        timeout: 60000
      });
    });

    if (response.status !== 201) {
      throw new Error(`Locus API deployment failed: ${response.statusText}`);
    }

    const deployment = response.data;
    
    this.logger.info('Locus deployment initiated', { 
      locusId: deployment.id,
      status: deployment.status 
    });

    return deployment;
  }

  /**
   * Monitor deployment progress
   */
  async monitorDeployment(deploymentId, locusDeploymentId) {
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const pollInterval = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.getDeploymentStatus(locusDeploymentId);
        
        this.updateDeploymentStatus(deploymentId, 'DEPLOYING', { 
          locusStatus: status.status,
          progress: status.progress 
        });

        this.emit('deployment:progress', {
          deploymentId,
          locusDeploymentId,
          status: status.status,
          progress: status.progress,
          logs: status.logs
        });

        if (status.status === 'COMPLETED') {
          return status;
        } else if (status.status === 'FAILED') {
          throw new Error(`Locus deployment failed: ${status.error}`);
        }

        await this.sleep(pollInterval);

      } catch (error) {
        if (error.message.includes('deployment failed')) {
          throw error;
        }
        
        this.logger.warn('Error polling deployment status', { 
          deploymentId, 
          locusDeploymentId, 
          error: error.message 
        });
        
        await this.sleep(pollInterval);
      }
    }

    throw new Error('Deployment timeout: exceeded maximum wait time');
  }

  /**
   * Get deployment status from Locus API
   */
  async getDeploymentStatus(locusDeploymentId) {
    await this.rateLimiter.acquire();

    const response = await this.withRetry(async () => {
      return await axios.get(`${this.locusApiUrl}/deployments/${locusDeploymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.locusApiKey}`
        },
        timeout: 30000
      });
    });

    return response.data;
  }

  /**
   * Verify deployment health after completion
   */
  async verifyDeploymentHealth(deploymentResult) {
    if (!deploymentResult.endpoints || deploymentResult.endpoints.length === 0) {
      throw new Error('No endpoints available for health verification');
    }

    const healthChecks = deploymentResult.endpoints.map(async (endpoint) => {
      try {
        const healthUrl = `${endpoint.url}/health`;
        const response = await axios.get(healthUrl, { 
          timeout: 10000,
          validateStatus: (status) => status < 500 // Accept 4xx as valid responses
        });
        
        return {
          endpoint: endpoint.url,
          healthy: response.status < 400,
          status: response.status,
          responseTime: response.headers['x-response-time'] || 'unknown'
        };
      } catch (error) {
        return {
          endpoint: endpoint.url,
          healthy: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(healthChecks);
    const healthyEndpoints = results.filter(r => r.healthy);

    if (healthyEndpoints.length === 0) {
      throw new Error('All endpoints failed health checks');
    }

    this.logger.info('Health verification completed', {
      total: results.length,
      healthy: healthyEndpoints.length,
      results
    });

    return results;
  }

  /**
   * Rollback deployment
   */
  async rollback(deploymentId, targetVersion = null) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      this.logger.info('Starting rollback', { deploymentId, targetVersion });
      this.updateDeploymentStatus(deploymentId, 'ROLLING_BACK');

      await this.rateLimiter.acquire();

      const response = await this.withRetry(async () => {
        return await axios.post(
          `${this.locusApiUrl}/deployments/${deployment.locusId}/rollback`,
          { targetVersion },
          {
            headers: {
              'Authorization': `Bearer ${this.locusApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
      });

      const rollbackResult = response.data;
      this.updateDeploymentStatus(deploymentId, 'ROLLED_BACK', { rollbackId: rollbackResult.id });

      this.emit('deployment:rolled_back', { deploymentId, rollbackId: rollbackResult.id });
      this.logger.info('Rollback completed', { deploymentId, rollbackId: rollbackResult.id });

      return rollbackResult;

    } catch (error) {
      this.logger.error('Rollback failed', { deploymentId, error: error.message });
      throw new DeployerError(`Rollback failed: ${error.message}`, deploymentId, error);
    }
  }

  /**
   * Destroy deployment and cleanup resources
   */
  async destroy(deploymentId) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      this.logger.info('Starting deployment destruction', { deploymentId });
      this.updateDeploymentStatus(deploymentId, 'DESTROYING');

      await this.rateLimiter.acquire();

      const response = await this.withRetry(async () => {
        return await axios.delete(`${this.locusApiUrl}/deployments/${deployment.locusId}`, {
          headers: {
            'Authorization': `Bearer ${this.locusApiKey}`
          },
          timeout: 30000
        });
      });

      this.updateDeploymentStatus(deploymentId, 'DESTROYED');
      this.deployments.delete(deploymentId);

      this.emit('deployment:destroyed', { deploymentId });
      this.logger.info('Deployment destroyed successfully', { deploymentId });

      return response.data;

    } catch (error) {
      this.logger.error('Deployment destruction failed', { deploymentId, error: error.message });
      throw new DeployerError(`Destruction failed: ${error.message}`, deploymentId, error);
    }
  }

  /**
   * Get deployment information
   */
  getDeployment(deploymentId) {
    return this.deployments.get(deploymentId);
  }

  /**
   * List all deployments
   */
  listDeployments() {
    return Array.from(this.deployments.values());
  }

  // Utility methods
  generateDeploymentId() {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateDeploymentStatus(deploymentId, status, metadata = {}) {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.status = status;
      deployment.lastUpdated = Date.now();
      deployment.metadata = { ...deployment.metadata, ...metadata };
      
      this.emit('deployment:status_updated', {
        deploymentId,
        status,
        metadata
      });
    }
  }

  mapStackToRuntime(stack) {
    const runtimeMap = {
      'nodejs': 'node:18',
      'python': 'python:3.11',
      'ruby': 'ruby:3.2',
      'golang': 'go:1.21',
      'rust': 'rust:1.70',
      'php': 'php:8.2',
      'java': 'openjdk:17'
    };

    return runtimeMap[stack] || 'node:18';
  }

  async cleanupFailedDeployment(deploymentId) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (deployment && deployment.metadata && deployment.metadata.locusId) {
        await this.destroy(deploymentId);
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup failed deployment', { 
        deploymentId, 
        error: error.message 
      });
    }
  }

  async withRetry(operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        this.logger.warn('Operation failed, retrying', { 
          attempt, 
          maxAttempts: this.retryConfig.maxAttempts,
          delay,
          error: error.message 
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  shouldRetry(error, attempt) {
    if (attempt >= this.retryConfig.maxAttempts) return false;
    
    // Retry on network errors and 5xx responses
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    if (error.response && error.response.status >= 500) return true;
    if (error.response && error.response.status === 429) return true; // Rate limited
    
    return false;
  }

  calculateDelay(attempt) {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(exponentialDelay, this.retryConfig.maxDelay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter for API calls
 */
class RateLimiter {
  constructor(config) {
    this.requests = config.requests;
    this.window = config.window;
    this.queue = [];
    this.tokens = this.requests;
    this.lastRefill = Date.now();
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.tokens > 0) {
        this.tokens--;
        resolve();
      } else {
        this.queue.push(resolve);
        this.scheduleRefill();
      }
    });
  }

  scheduleRefill() {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    
    if (timeSinceLastRefill >= this.window) {
      this.refill();
    } else {
      setTimeout(() => this.refill(), this.window - timeSinceLastRefill);
    }
  }

  refill() {
    this.tokens = this.requests;
    this.lastRefill = Date.now();
    
    while (this.queue.length > 0 && this.tokens > 0) {
      const resolve = this.queue.shift();
      this.tokens--;
      resolve();
    }
  }
}

class DeployerError extends Error {
  constructor(message, deploymentId, originalError) {
    super(message);
    this.name = 'DeployerError';
    this.deploymentId = deploymentId;
    this.originalError = originalError;
  }
}

module.exports = { DeployerAgent, DeployerError };