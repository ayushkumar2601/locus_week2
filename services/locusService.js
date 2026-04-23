/**
 * Locus API Service - Deployment backbone integration
 * Provides a clean abstraction layer for all Locus API operations
 * Handles deployments, monitoring, scaling, and log management
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { EventEmitter } from 'events';

// Load environment variables
dotenv.config();

class LocusService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.apiKey = options.apiKey || process.env.LOCUS_API_KEY;
    this.baseUrl = options.baseUrl || process.env.LOCUS_API_URL || 'https://api.locus.com/v1';
    this.timeout = options.timeout || 30000;
    this.logger = options.logger || console;
    
    // Retry configuration
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      ...options.retryConfig
    };
    
    // Rate limiting
    this.rateLimiter = new RateLimiter({
      requests: 100,
      window: 60000, // 1 minute
      ...options.rateLimit
    });
    
    // Request interceptor for common headers
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LocusService/1.0.0'
      }
    });
    
    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => this.handleResponseError(error)
    );
    
    if (!this.apiKey) {
      throw new Error('Locus API key is required');
    }
    
    this.logger.info('LocusService initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Deploy application to Locus platform
   * @param {Object} config - Deployment configuration
   * @returns {Object} Deployment result with ID and initial status
   */
  async deployApp(config) {
    try {
      this.logger.info('Starting application deployment', { 
        name: config.name,
        repository: config.repository?.url 
      });
      
      // Validate configuration
      this.validateDeploymentConfig(config);
      
      // Prepare deployment payload
      const deploymentPayload = this.buildDeploymentPayload(config);
      
      // Execute deployment with retry logic
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.post('/deployments', deploymentPayload);
      });
      
      const deployment = response.data;
      
      this.logger.info('Deployment initiated successfully', { 
        deploymentId: deployment.id,
        status: deployment.status,
        estimatedDuration: deployment.estimatedDuration 
      });
      
      // Emit deployment started event
      this.emit('deployment:started', {
        deploymentId: deployment.id,
        config,
        timestamp: Date.now()
      });
      
      return {
        deploymentId: deployment.id,
        status: deployment.status,
        endpoints: deployment.endpoints || [],
        resources: deployment.resources || {},
        estimatedDuration: deployment.estimatedDuration || 600, // 10 minutes default
        region: deployment.region,
        environment: deployment.environment,
        buildId: deployment.buildId,
        metadata: {
          createdAt: deployment.createdAt,
          updatedAt: deployment.updatedAt,
          version: deployment.version
        }
      };
      
    } catch (error) {
      this.logger.error('Deployment failed', { 
        config: config.name,
        error: error.message,
        stack: error.stack 
      });
      
      this.emit('deployment:failed', {
        config,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw new LocusServiceError(`Deployment failed: ${error.message}`, 'DEPLOYMENT_FAILED', error);
    }
  }

  /**
   * Get deployment status and details
   * @param {string} deploymentId - Deployment identifier
   * @returns {Object} Current deployment status and details
   */
  async getDeploymentStatus(deploymentId) {
    try {
      this.logger.debug('Fetching deployment status', { deploymentId });
      
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.get(`/deployments/${deploymentId}`);
      });
      
      const deployment = response.data;
      
      // Normalize status response
      const status = {
        deploymentId: deployment.id,
        status: deployment.status, // PENDING, BUILDING, DEPLOYING, DEPLOYED, FAILED, STOPPED
        progress: deployment.progress || 0, // 0-100
        phase: deployment.currentPhase || 'unknown',
        endpoints: deployment.endpoints || [],
        resources: {
          instances: deployment.resources?.instances || 0,
          cpu: deployment.resources?.cpu || 0,
          memory: deployment.resources?.memory || 0,
          storage: deployment.resources?.storage || 0
        },
        health: {
          status: deployment.health?.status || 'unknown',
          checks: deployment.health?.checks || [],
          lastCheck: deployment.health?.lastCheck
        },
        metrics: {
          uptime: deployment.metrics?.uptime || 0,
          requests: deployment.metrics?.requests || 0,
          errors: deployment.metrics?.errors || 0,
          responseTime: deployment.metrics?.responseTime || 0
        },
        cost: {
          current: deployment.cost?.current || 0,
          projected: deployment.cost?.projected || 0,
          currency: deployment.cost?.currency || 'USD'
        },
        metadata: {
          createdAt: deployment.createdAt,
          updatedAt: deployment.updatedAt,
          version: deployment.version,
          region: deployment.region,
          environment: deployment.environment
        }
      };
      
      // Emit status update event
      this.emit('deployment:status_updated', {
        deploymentId,
        status: status.status,
        progress: status.progress,
        timestamp: Date.now()
      });
      
      return status;
      
    } catch (error) {
      this.logger.error('Failed to get deployment status', { 
        deploymentId, 
        error: error.message 
      });
      
      throw new LocusServiceError(
        `Failed to get deployment status: ${error.message}`, 
        'STATUS_FETCH_FAILED', 
        error
      );
    }
  }

  /**
   * Get deployment logs
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} options - Log retrieval options
   * @returns {Object} Log entries and metadata
   */
  async getLogs(deploymentId, options = {}) {
    try {
      this.logger.debug('Fetching deployment logs', { deploymentId, options });
      
      const params = {
        lines: options.lines || 1000,
        since: options.since,
        until: options.until,
        level: options.level || 'info,warn,error',
        source: options.source, // build, runtime, system
        follow: options.follow || false
      };
      
      // Remove undefined parameters
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) delete params[key];
      });
      
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.get(`/deployments/${deploymentId}/logs`, { params });
      });
      
      const logsData = response.data;
      
      // Normalize log entries
      const logs = (logsData.logs || []).map(log => ({
        id: log.id,
        timestamp: new Date(log.timestamp),
        level: log.level.toLowerCase(),
        source: log.source || 'runtime',
        message: log.message,
        metadata: log.metadata || {},
        raw: log
      }));
      
      const result = {
        deploymentId,
        logs,
        metadata: {
          total: logsData.total || logs.length,
          hasMore: logsData.hasMore || false,
          nextCursor: logsData.nextCursor,
          retrievedAt: new Date().toISOString()
        }
      };
      
      this.emit('logs:retrieved', {
        deploymentId,
        count: logs.length,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Failed to get deployment logs', { 
        deploymentId, 
        error: error.message 
      });
      
      throw new LocusServiceError(
        `Failed to get deployment logs: ${error.message}`, 
        'LOGS_FETCH_FAILED', 
        error
      );
    }
  }

  /**
   * Stream deployment logs in real-time
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} options - Streaming options
   * @returns {EventEmitter} Log stream emitter
   */
  streamLogs(deploymentId, options = {}) {
    const logStream = new EventEmitter();
    
    try {
      this.logger.debug('Starting log stream', { deploymentId, options });
      
      // Simulate WebSocket connection for log streaming
      // In real implementation, this would use WebSocket or Server-Sent Events
      const streamUrl = `${this.baseUrl}/deployments/${deploymentId}/logs/stream`;
      
      // For now, implement polling-based streaming
      const pollInterval = options.pollInterval || 2000; // 2 seconds
      let isStreaming = true;
      let lastTimestamp = options.since || new Date().toISOString();
      
      const poll = async () => {
        if (!isStreaming) return;
        
        try {
          const logs = await this.getLogs(deploymentId, {
            since: lastTimestamp,
            lines: 100,
            level: options.level
          });
          
          if (logs.logs.length > 0) {
            logs.logs.forEach(log => {
              logStream.emit('log', log);
            });
            
            // Update last timestamp
            const latestLog = logs.logs[logs.logs.length - 1];
            lastTimestamp = latestLog.timestamp.toISOString();
          }
          
          setTimeout(poll, pollInterval);
          
        } catch (error) {
          logStream.emit('error', error);
        }
      };
      
      // Start polling
      poll();
      
      // Cleanup function
      logStream.stop = () => {
        isStreaming = false;
        logStream.emit('end');
      };
      
      this.emit('logs:stream_started', { deploymentId, timestamp: Date.now() });
      
    } catch (error) {
      logStream.emit('error', error);
    }
    
    return logStream;
  }

  /**
   * Redeploy application with updated configuration
   * @param {string} deploymentId - Existing deployment identifier
   * @param {Object} updatedConfig - Updated deployment configuration
   * @returns {Object} New deployment result
   */
  async redeploy(deploymentId, updatedConfig) {
    try {
      this.logger.info('Starting redeployment', { deploymentId, updatedConfig: updatedConfig.name });
      
      // Get current deployment details
      const currentDeployment = await this.getDeploymentStatus(deploymentId);
      
      // Merge current config with updates
      const redeploymentPayload = {
        sourceDeploymentId: deploymentId,
        ...this.buildDeploymentPayload(updatedConfig),
        strategy: updatedConfig.strategy || 'rolling', // rolling, blue-green, canary
        rollback: {
          enabled: updatedConfig.rollback?.enabled !== false,
          automatic: updatedConfig.rollback?.automatic !== false,
          healthCheckGracePeriod: updatedConfig.rollback?.healthCheckGracePeriod || 300
        }
      };
      
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.post(`/deployments/${deploymentId}/redeploy`, redeploymentPayload);
      });
      
      const newDeployment = response.data;
      
      this.logger.info('Redeployment initiated successfully', { 
        originalDeploymentId: deploymentId,
        newDeploymentId: newDeployment.id,
        strategy: redeploymentPayload.strategy 
      });
      
      this.emit('deployment:redeployed', {
        originalDeploymentId: deploymentId,
        newDeploymentId: newDeployment.id,
        strategy: redeploymentPayload.strategy,
        timestamp: Date.now()
      });
      
      return {
        deploymentId: newDeployment.id,
        originalDeploymentId: deploymentId,
        status: newDeployment.status,
        strategy: redeploymentPayload.strategy,
        endpoints: newDeployment.endpoints || [],
        estimatedDuration: newDeployment.estimatedDuration || 600,
        metadata: {
          createdAt: newDeployment.createdAt,
          version: newDeployment.version
        }
      };
      
    } catch (error) {
      this.logger.error('Redeployment failed', { 
        deploymentId, 
        error: error.message 
      });
      
      this.emit('deployment:redeploy_failed', {
        deploymentId,
        error: error.message,
        timestamp: Date.now()
      });
      
      throw new LocusServiceError(`Redeployment failed: ${error.message}`, 'REDEPLOYMENT_FAILED', error);
    }
  }

  /**
   * Scale deployment resources
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} scaleConfig - Scaling configuration
   * @returns {Object} Scaling result
   */
  async scaleDeployment(deploymentId, scaleConfig) {
    try {
      this.logger.info('Scaling deployment', { deploymentId, scaleConfig });
      
      const scalingPayload = {
        instances: scaleConfig.instances,
        cpu: scaleConfig.cpu,
        memory: scaleConfig.memory,
        autoScale: scaleConfig.autoScale || false,
        scaling: scaleConfig.autoScale ? {
          minInstances: scaleConfig.minInstances || 1,
          maxInstances: scaleConfig.maxInstances || 10,
          targetCPU: scaleConfig.targetCPU || 70,
          targetMemory: scaleConfig.targetMemory || 80
        } : undefined
      };
      
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.post(`/deployments/${deploymentId}/scale`, scalingPayload);
      });
      
      const scalingResult = response.data;
      
      this.emit('deployment:scaled', {
        deploymentId,
        scaleConfig,
        result: scalingResult,
        timestamp: Date.now()
      });
      
      return scalingResult;
      
    } catch (error) {
      this.logger.error('Scaling failed', { deploymentId, error: error.message });
      throw new LocusServiceError(`Scaling failed: ${error.message}`, 'SCALING_FAILED', error);
    }
  }

  /**
   * Rollback deployment to previous version
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} rollbackConfig - Rollback configuration
   * @returns {Object} Rollback result
   */
  async rollbackDeployment(deploymentId, rollbackConfig = {}) {
    try {
      this.logger.info('Rolling back deployment', { deploymentId, rollbackConfig });
      
      const rollbackPayload = {
        targetVersion: rollbackConfig.targetVersion,
        reason: rollbackConfig.reason || 'Manual rollback',
        strategy: rollbackConfig.strategy || 'immediate' // immediate, gradual
      };
      
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.post(`/deployments/${deploymentId}/rollback`, rollbackPayload);
      });
      
      const rollbackResult = response.data;
      
      this.emit('deployment:rolled_back', {
        deploymentId,
        rollbackId: rollbackResult.id,
        targetVersion: rollbackConfig.targetVersion,
        timestamp: Date.now()
      });
      
      return rollbackResult;
      
    } catch (error) {
      this.logger.error('Rollback failed', { deploymentId, error: error.message });
      throw new LocusServiceError(`Rollback failed: ${error.message}`, 'ROLLBACK_FAILED', error);
    }
  }

  /**
   * Stop/destroy deployment
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} options - Destruction options
   * @returns {Object} Destruction result
   */
  async destroyDeployment(deploymentId, options = {}) {
    try {
      this.logger.info('Destroying deployment', { deploymentId, options });
      
      const destructionPayload = {
        force: options.force || false,
        preserveData: options.preserveData || false,
        reason: options.reason || 'Manual destruction'
      };
      
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.delete(`/deployments/${deploymentId}`, {
          data: destructionPayload
        });
      });
      
      const destructionResult = response.data;
      
      this.emit('deployment:destroyed', {
        deploymentId,
        destructionId: destructionResult.id,
        timestamp: Date.now()
      });
      
      return destructionResult;
      
    } catch (error) {
      this.logger.error('Deployment destruction failed', { deploymentId, error: error.message });
      throw new LocusServiceError(`Destruction failed: ${error.message}`, 'DESTRUCTION_FAILED', error);
    }
  }

  /**
   * Get deployment metrics
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} options - Metrics options
   * @returns {Object} Deployment metrics
   */
  async getDeploymentMetrics(deploymentId, options = {}) {
    try {
      const params = {
        timeRange: options.timeRange || '1h', // 1h, 6h, 24h, 7d, 30d
        metrics: options.metrics || 'cpu,memory,requests,errors,responseTime',
        granularity: options.granularity || '1m' // 1m, 5m, 1h
      };
      
      const response = await this.withRetry(async () => {
        await this.rateLimiter.acquire();
        return await this.axiosInstance.get(`/deployments/${deploymentId}/metrics`, { params });
      });
      
      return response.data;
      
    } catch (error) {
      this.logger.error('Failed to get deployment metrics', { deploymentId, error: error.message });
      throw new LocusServiceError(`Metrics fetch failed: ${error.message}`, 'METRICS_FETCH_FAILED', error);
    }
  }

  // Private helper methods
  validateDeploymentConfig(config) {
    const required = ['name', 'repository'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (config.repository && !config.repository.url) {
      throw new Error('Repository URL is required');
    }
  }

  buildDeploymentPayload(config) {
    return {
      name: config.name,
      environment: config.environment || 'production',
      region: config.region || 'us-east-1',
      
      // Repository configuration
      repository: {
        url: config.repository.url,
        branch: config.repository.branch || 'main',
        accessToken: config.repository.accessToken,
        subPath: config.repository.subPath
      },
      
      // Build configuration
      build: {
        command: config.build?.command || 'npm run build',
        outputDirectory: config.build?.outputDirectory || 'dist',
        environment: config.build?.environment || {},
        nodeVersion: config.build?.nodeVersion || '18',
        installCommand: config.build?.installCommand || 'npm install'
      },
      
      // Runtime configuration
      runtime: {
        command: config.runtime?.command || 'npm start',
        port: config.runtime?.port || 3000,
        healthCheck: config.runtime?.healthCheck || '/health',
        environment: config.runtime?.environment || {}
      },
      
      // Infrastructure configuration
      infrastructure: {
        instances: config.infrastructure?.instances || 1,
        cpu: config.infrastructure?.cpu || 1,
        memory: config.infrastructure?.memory || 1024, // MB
        storage: config.infrastructure?.storage || 10, // GB
        scaling: config.infrastructure?.scaling || {
          enabled: false,
          minInstances: 1,
          maxInstances: 5,
          targetCPU: 70
        }
      },
      
      // Networking configuration
      networking: {
        domains: config.networking?.domains || [],
        ssl: config.networking?.ssl !== false,
        cdn: config.networking?.cdn || false
      },
      
      // Database configuration
      databases: config.databases || [],
      
      // Monitoring configuration
      monitoring: {
        enabled: config.monitoring?.enabled !== false,
        healthCheck: {
          path: config.runtime?.healthCheck || '/health',
          interval: 30,
          timeout: 10,
          retries: 3
        },
        alerts: config.monitoring?.alerts || []
      }
    };
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
    
    // Don't retry on client errors (4xx)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    
    // Retry on server errors (5xx) and network errors
    if (error.response && error.response.status >= 500) return true;
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return true;
    
    return false;
  }

  calculateDelay(attempt) {
    const exponentialDelay = this.retryConfig.baseDelay * 
      Math.pow(this.retryConfig.backoffFactor, attempt - 1);
    return Math.min(exponentialDelay, this.retryConfig.maxDelay);
  }

  handleResponseError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data?.message || data?.error || `HTTP ${status} Error`;
      
      this.logger.error('Locus API error', { 
        status, 
        message, 
        url: error.config?.url 
      });
      
      throw new LocusServiceError(message, `HTTP_${status}`, error);
    } else if (error.request) {
      // Network error
      this.logger.error('Network error', { error: error.message });
      throw new LocusServiceError('Network error', 'NETWORK_ERROR', error);
    } else {
      // Other error
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  constructor(config) {
    this.requests = config.requests;
    this.window = config.window;
    this.tokens = this.requests;
    this.lastRefill = Date.now();
    this.queue = [];
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

/**
 * Custom error class for Locus Service
 */
class LocusServiceError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'LocusServiceError';
    this.code = code;
    this.originalError = originalError;
  }
}

export { LocusService, LocusServiceError };

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const locusService = new LocusService({
    apiKey: process.env.LOCUS_API_KEY,
    logger: console
  });

  // Example deployment
  const deploymentConfig = {
    name: 'my-app',
    repository: {
      url: 'https://github.com/user/repo',
      branch: 'main'
    },
    build: {
      command: 'npm run build'
    },
    runtime: {
      command: 'npm start',
      port: 3000
    },
    infrastructure: {
      instances: 2,
      cpu: 1,
      memory: 1024
    }
  };

  locusService.deployApp(deploymentConfig)
    .then(result => {
      console.log('Deployment successful:', result);
      return locusService.getDeploymentStatus(result.deploymentId);
    })
    .then(status => {
      console.log('Deployment status:', status);
    })
    .catch(error => {
      console.error('Deployment failed:', error.message);
    });
}