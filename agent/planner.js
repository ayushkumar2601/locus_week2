/**
 * Planner Agent - Real deployment planning with memory integration
 */

import { EventEmitter } from 'events';

export class PlannerError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'PlannerError';
    this.originalError = originalError;
  }
}

export class PlannerAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.aiProvider = options.aiProvider;
    this.apiKeys = options.apiKeys || {};
    this.memory = options.memory; // Inject memory system
    this.deployer = options.deployer; // Inject deployer for real deployments
    
    this.logger.info('📋 Planner Agent initialized with memory integration');
  }

  /**
   * Create deployment plan from parsed NLP input
   */
  async plan(input) {
    try {
      this.logger.info('Planning deployment for:', input);
      
      // Check memory for existing patterns
      const repoId = this.generateRepoId(input);
      let existingMemory = null;
      
      if (this.memory) {
        existingMemory = this.memory.getMemory(repoId);
        if (existingMemory) {
          this.logger.info('Found existing memory for repository:', {
            successCount: existingMemory.successCount,
            errorCount: existingMemory.errorCount,
            recommendations: existingMemory.recommendations.length
          });
        }
      }
      
      // Build comprehensive deployment plan
      const plan = await this.buildDeploymentPlan(input, existingMemory);
      
      // Validate plan
      const validationResult = this.validatePlan(plan);
      if (!validationResult.valid) {
        throw new PlannerError(`Plan validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      this.emit('plan:created', { planId: plan.id, repoId, confidence: plan.confidence });
      
      return plan;
      
    } catch (error) {
      this.logger.error('Planning failed:', error);
      throw new PlannerError(`Planning failed: ${error.message}`, error);
    }
  }

  /**
   * Execute deployment plan using real deployer
   */
  async executePlan(plan, options = {}) {
    try {
      this.logger.info('Executing deployment plan:', { planId: plan.id });
      
      if (!this.deployer) {
        throw new PlannerError('No deployer available for plan execution');
      }
      
      // Convert plan to deployer format
      const deploymentConfig = this.convertPlanToDeploymentConfig(plan, options);
      
      // Execute deployment
      const deploymentResult = await this.deployer.deploy(plan, deploymentConfig);
      
      // Update memory with deployment attempt
      if (this.memory && plan.repoId) {
        this.memory.updateMemory(plan.repoId, {
          deployment: {
            planId: plan.id,
            success: deploymentResult.status !== 'failed',
            timestamp: Date.now(),
            deploymentId: deploymentResult.deploymentId
          }
        });
      }
      
      this.emit('plan:executed', { 
        planId: plan.id, 
        deploymentId: deploymentResult.deploymentId,
        success: deploymentResult.status !== 'failed'
      });
      
      return deploymentResult;
      
    } catch (error) {
      this.logger.error('Plan execution failed:', error);
      
      // Record failure in memory
      if (this.memory && plan.repoId) {
        this.memory.updateMemory(plan.repoId, {
          errors: [{
            message: `Plan execution failed: ${error.message}`,
            type: 'execution_failure',
            timestamp: Date.now()
          }]
        });
      }
      
      throw new PlannerError(`Plan execution failed: ${error.message}`, error);
    }
  }

  /**
   * Process GitHub webhook events
   */
  async processGitHubEvent(eventData) {
    try {
      this.logger.info('Processing GitHub event:', { 
        type: eventData.type, 
        repository: eventData.repository?.name 
      });
      
      // Handle different event types
      switch (eventData.type) {
        case 'push':
          return await this.handlePushEvent(eventData);
        case 'pull_request':
          return await this.handlePullRequestEvent(eventData);
        case 'release':
          return await this.handleReleaseEvent(eventData);
        default:
          return { status: 'ignored', reason: 'unsupported_event_type' };
      }
      
    } catch (error) {
      this.logger.error('GitHub event processing failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  // Private methods

  /**
   * Build comprehensive deployment plan
   */
  async buildDeploymentPlan(input, existingMemory) {
    const plan = {
      id: `plan_${Date.now()}`,
      createdAt: new Date().toISOString(),
      input,
      repoId: this.generateRepoId(input),
      
      // Technology stack (from NLP parsing or input)
      stack: this.determineStack(input),
      
      // Build configuration
      buildConfig: this.generateBuildConfig(input, existingMemory),
      
      // Runtime configuration
      runtime: this.generateRuntimeConfig(input, existingMemory),
      
      // Infrastructure requirements
      infrastructure: this.generateInfrastructureConfig(input, existingMemory),
      
      // Database configuration
      databases: this.generateDatabaseConfig(input),
      
      // Networking configuration
      networking: this.generateNetworkingConfig(input),
      
      // Security configuration
      security: this.generateSecurityConfig(input),
      
      // Monitoring configuration
      monitoring: this.generateMonitoringConfig(input),
      
      // Cost estimation
      estimatedCost: this.calculateCostEstimate(input),
      
      // Deployment strategy
      deploymentStrategy: this.selectDeploymentStrategy(input, existingMemory),
      
      // Confidence score
      confidence: this.calculatePlanConfidence(input, existingMemory),
      
      // Memory insights
      memoryInsights: existingMemory ? {
        hasHistory: true,
        successRate: existingMemory.successCount / (existingMemory.successCount + existingMemory.errorCount),
        recommendations: existingMemory.recommendations.slice(0, 3),
        lastDeployment: existingMemory.lastDeployment
      } : { hasHistory: false }
    };
    
    return plan;
  }

  /**
   * Determine technology stack from input
   */
  determineStack(input) {
    // If input is parsed NLP config
    if (input.stack) {
      return {
        primary: input.stack,
        language: input.language || 'javascript',
        frontend: input.frontend || [],
        backend: input.backend || [],
        database: input.database?.type || null
      };
    }
    
    // If input is repository URL or string
    if (typeof input === 'string') {
      return {
        primary: 'nodejs',
        language: 'javascript',
        frontend: [],
        backend: ['express'],
        database: null
      };
    }
    
    // Default stack
    return {
      primary: 'nodejs',
      language: 'javascript',
      frontend: [],
      backend: ['express'],
      database: null
    };
  }

  /**
   * Generate build configuration
   */
  generateBuildConfig(input, existingMemory) {
    const baseConfig = {
      buildCommand: 'npm run build',
      installCommand: 'npm install',
      outputDirectory: 'dist',
      nodeVersion: '18',
      environment: {}
    };
    
    // Apply memory-based optimizations
    if (existingMemory && existingMemory.recommendations) {
      const buildRecs = existingMemory.recommendations.filter(r => r.category === 'build');
      buildRecs.forEach(rec => {
        if (rec.type === 'build_command') {
          baseConfig.buildCommand = rec.value;
        }
        if (rec.type === 'node_version') {
          baseConfig.nodeVersion = rec.value;
        }
      });
    }
    
    // Apply input-specific configurations
    if (input.build) {
      Object.assign(baseConfig, input.build);
    }
    
    return baseConfig;
  }

  /**
   * Generate runtime configuration
   */
  generateRuntimeConfig(input, existingMemory) {
    const baseConfig = {
      command: 'npm start',
      port: 3000,
      healthCheck: '/health',
      environment: {
        NODE_ENV: 'production'
      }
    };
    
    // Apply memory-based optimizations
    if (existingMemory && existingMemory.recommendations) {
      const runtimeRecs = existingMemory.recommendations.filter(r => r.category === 'runtime');
      runtimeRecs.forEach(rec => {
        if (rec.type === 'start_command') {
          baseConfig.command = rec.value;
        }
        if (rec.type === 'port') {
          baseConfig.port = rec.value;
        }
      });
    }
    
    // Apply input-specific configurations
    if (input.runtime) {
      Object.assign(baseConfig, input.runtime);
    }
    
    return baseConfig;
  }

  /**
   * Generate infrastructure configuration
   */
  generateInfrastructureConfig(input, existingMemory) {
    let baseConfig = {
      compute: {
        instances: 1,
        cpu: 1,
        memory: 1024,
        scaling: { enabled: false, minInstances: 1, maxInstances: 5 }
      },
      storage: {
        size: 10,
        type: 'ssd'
      }
    };
    
    // Apply memory-based optimizations
    if (existingMemory && existingMemory.successfulConfigs) {
      const lastSuccessful = existingMemory.successfulConfigs[existingMemory.successfulConfigs.length - 1];
      if (lastSuccessful && lastSuccessful.infrastructure) {
        baseConfig = { ...baseConfig, ...lastSuccessful.infrastructure };
      }
    }
    
    // Apply input-specific configurations
    if (input.infrastructure) {
      baseConfig = { ...baseConfig, ...input.infrastructure };
    }
    
    return baseConfig;
  }

  /**
   * Generate database configuration
   */
  generateDatabaseConfig(input) {
    if (!input.database) return [];
    
    return [{
      type: input.database.type,
      version: this.getDefaultDatabaseVersion(input.database.type),
      size: 'small',
      backup: true,
      features: input.database.features || []
    }];
  }

  /**
   * Generate networking configuration
   */
  generateNetworkingConfig(input) {
    return {
      domains: input.networking?.domains || [],
      ssl: input.networking?.ssl !== false,
      cdn: input.networking?.cdn || false,
      cors: input.features?.includes('api') || false
    };
  }

  /**
   * Generate security configuration
   */
  generateSecurityConfig(input) {
    return {
      https: true,
      headers: true,
      csrf: input.features?.includes('authentication') || false,
      rateLimit: input.features?.includes('api') || false,
      firewall: false
    };
  }

  /**
   * Generate monitoring configuration
   */
  generateMonitoringConfig(input) {
    return {
      enabled: true,
      healthCheck: {
        path: '/health',
        interval: 30,
        timeout: 10,
        retries: 3
      },
      logging: {
        level: 'info',
        format: 'json'
      },
      metrics: input.features?.includes('analytics') || false,
      alerts: {
        email: [],
        webhook: []
      }
    };
  }

  /**
   * Calculate cost estimate
   */
  calculateCostEstimate(input) {
    const baseCompute = 20.00; // Base compute cost
    const storagePerGB = 0.50;
    const databaseCost = input.database ? 15.00 : 0;
    
    const computeCost = baseCompute * (input.infrastructure?.compute?.instances || 1);
    const storageCost = (input.infrastructure?.storage?.size || 10) * storagePerGB;
    
    return {
      monthly: computeCost + storageCost + databaseCost,
      breakdown: {
        compute: computeCost,
        storage: storageCost,
        database: databaseCost
      }
    };
  }

  /**
   * Select deployment strategy
   */
  selectDeploymentStrategy(input, existingMemory) {
    if (existingMemory && existingMemory.successRate > 0.8) {
      return 'direct'; // High success rate, deploy directly
    }
    
    if (input.environment === 'production') {
      return 'blue-green'; // Safe production deployment
    }
    
    return 'direct'; // Default strategy
  }

  /**
   * Calculate plan confidence
   */
  calculatePlanConfidence(input, existingMemory) {
    let confidence = 0.75; // Base confidence
    
    // Increase confidence based on memory
    if (existingMemory) {
      const successRate = existingMemory.successCount / (existingMemory.successCount + existingMemory.errorCount);
      confidence = Math.min(0.95, confidence + (successRate * 0.2));
    }
    
    // Increase confidence based on input completeness
    if (input.stack) confidence += 0.05;
    if (input.database) confidence += 0.05;
    if (input.infrastructure) confidence += 0.05;
    
    return Math.min(0.99, confidence);
  }

  /**
   * Validate deployment plan
   */
  validatePlan(plan) {
    const errors = [];
    
    if (!plan.stack || !plan.stack.primary) {
      errors.push('Missing primary technology stack');
    }
    
    if (!plan.buildConfig || !plan.buildConfig.buildCommand) {
      errors.push('Missing build command');
    }
    
    if (!plan.runtime || !plan.runtime.command) {
      errors.push('Missing runtime command');
    }
    
    if (!plan.infrastructure || !plan.infrastructure.compute) {
      errors.push('Missing infrastructure configuration');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert plan to deployment configuration
   */
  convertPlanToDeploymentConfig(plan, options) {
    return {
      name: options.name || plan.repoId,
      repository: options.repository || { url: plan.input },
      build: plan.buildConfig,
      runtime: plan.runtime,
      infrastructure: plan.infrastructure,
      networking: plan.networking,
      databases: plan.databases,
      monitoring: plan.monitoring,
      environment: options.environment || 'production'
    };
  }

  /**
   * Handle GitHub push events
   */
  async handlePushEvent(eventData) {
    const branch = eventData.ref?.replace('refs/heads/', '');
    
    if (branch === 'main' || branch === 'master') {
      // Trigger deployment for main branch
      return {
        status: 'deployment_triggered',
        branch,
        action: 'auto_deploy'
      };
    }
    
    return {
      status: 'ignored',
      reason: 'non_main_branch',
      branch
    };
  }

  /**
   * Handle GitHub pull request events
   */
  async handlePullRequestEvent(eventData) {
    if (eventData.action === 'opened' || eventData.action === 'synchronize') {
      return {
        status: 'preview_deployment_triggered',
        action: eventData.action,
        pr_number: eventData.number
      };
    }
    
    return {
      status: 'ignored',
      reason: 'unsupported_pr_action',
      action: eventData.action
    };
  }

  /**
   * Handle GitHub release events
   */
  async handleReleaseEvent(eventData) {
    if (eventData.action === 'published') {
      return {
        status: 'production_deployment_triggered',
        tag: eventData.release?.tag_name,
        action: 'release_deploy'
      };
    }
    
    return {
      status: 'ignored',
      reason: 'unsupported_release_action',
      action: eventData.action
    };
  }

  /**
   * Generate repository ID from input
   */
  generateRepoId(input) {
    if (typeof input === 'string') {
      // Extract repo name from URL or use as-is
      const match = input.match(/github\.com\/[^\/]+\/([^\/]+)/);
      return match ? match[1] : input.replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    if (input.name) {
      return input.name.replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    return `repo_${Date.now()}`;
  }

  /**
   * Get default database version
   */
  getDefaultDatabaseVersion(dbType) {
    const versions = {
      'postgresql': '14',
      'mysql': '8.0',
      'mongodb': '6.0',
      'redis': '7.0'
    };
    
    return versions[dbType] || 'latest';
  }
}