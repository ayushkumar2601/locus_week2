/**
 * Monitor Agent - Continuously monitors deployments and triggers recovery actions
 * Handles health checks, performance monitoring, and automatic issue resolution
 */

const EventEmitter = require('events');
const axios = require('axios');
const { SelfHealingSystem } = require('./selfHealer');

class MonitorAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.deployments = new Map(); // Track monitored deployments
    this.healthChecks = new Map(); // Active health check intervals
    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5%
      cpuUsage: 80, // 80%
      memoryUsage: 85, // 85%
      diskUsage: 90, // 90%
      ...options.alertThresholds
    };
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.analyzer = options.analyzer; // AnalyzerAgent instance
    this.deployer = options.deployer; // DeployerAgent instance
    this.locusApiKey = options.locusApiKey || process.env.LOCUS_API_KEY;
    this.locusApiUrl = options.locusApiUrl || process.env.LOCUS_API_URL || 'https://api.locus.com/v1';
    this.autoRecovery = options.autoRecovery !== false; // Enable by default
    this.maxRecoveryAttempts = options.maxRecoveryAttempts || 3;
    
    // Initialize self-healing system
    this.selfHealer = new SelfHealingSystem({
      locusService: options.locusService,
      aiProvider: options.aiProvider,
      logger: this.logger,
      config: options.healingConfig
    });
    
    // Set up self-healing event handlers
    this.setupSelfHealingHandlers();
  }

  /**
   * Start monitoring a deployment
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} config - Monitoring configuration
   */
  async startMonitoring(deploymentId, config = {}) {
    try {
      this.logger.info('Starting deployment monitoring', { deploymentId });

      const monitoringConfig = {
        deploymentId,
        locusDeploymentId: config.locusDeploymentId,
        endpoints: config.endpoints || [],
        healthCheckPath: config.healthCheckPath || '/health',
        metrics: config.metrics || ['health', 'performance', 'resources'],
        alerting: config.alerting !== false,
        autoRecovery: config.autoRecovery !== false && this.autoRecovery,
        recoveryAttempts: 0,
        lastHealthy: Date.now(),
        status: 'monitoring',
        startTime: Date.now(),
        ...config
      };

      this.deployments.set(deploymentId, monitoringConfig);

      // Start health check monitoring
      await this.startHealthChecks(deploymentId);

      // Start performance monitoring
      await this.startPerformanceMonitoring(deploymentId);

      // Start resource monitoring
      await this.startResourceMonitoring(deploymentId);

      this.emit('monitoring:started', { deploymentId, config: monitoringConfig });
      this.logger.info('Monitoring started successfully', { deploymentId });

      return monitoringConfig;

    } catch (error) {
      this.logger.error('Failed to start monitoring', { deploymentId, error: error.message });
      throw new MonitorError(`Failed to start monitoring: ${error.message}`, error);
    }
  }

  /**
   * Stop monitoring a deployment
   * @param {string} deploymentId - Deployment identifier
   */
  async stopMonitoring(deploymentId) {
    try {
      this.logger.info('Stopping deployment monitoring', { deploymentId });

      const config = this.deployments.get(deploymentId);
      if (!config) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      // Clear health check intervals
      if (this.healthChecks.has(deploymentId)) {
        clearInterval(this.healthChecks.get(deploymentId));
        this.healthChecks.delete(deploymentId);
      }

      // Update status
      config.status = 'stopped';
      config.stopTime = Date.now();

      this.emit('monitoring:stopped', { deploymentId });
      this.logger.info('Monitoring stopped', { deploymentId });

    } catch (error) {
      this.logger.error('Failed to stop monitoring', { deploymentId, error: error.message });
      throw new MonitorError(`Failed to stop monitoring: ${error.message}`, error);
    }
  }

  /**
   * Start health check monitoring
   */
  async startHealthChecks(deploymentId) {
    const config = this.deployments.get(deploymentId);
    if (!config) return;

    const healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck(deploymentId);
      } catch (error) {
        this.logger.error('Health check failed', { deploymentId, error: error.message });
      }
    }, this.checkInterval);

    this.healthChecks.set(deploymentId, healthCheckInterval);
    this.logger.debug('Health check monitoring started', { deploymentId, interval: this.checkInterval });
  }

  /**
   * Perform health check for deployment
   */
  async performHealthCheck(deploymentId) {
    const config = this.deployments.get(deploymentId);
    if (!config || config.status !== 'monitoring') return;

    const healthResults = [];

    // Check application endpoints
    for (const endpoint of config.endpoints) {
      const result = await this.checkEndpointHealth(endpoint, config.healthCheckPath);
      healthResults.push(result);
    }

    // Check Locus deployment status
    if (config.locusDeploymentId) {
      const locusHealth = await this.checkLocusDeploymentHealth(config.locusDeploymentId);
      healthResults.push(locusHealth);
    }

    // Analyze health results
    const overallHealth = this.analyzeHealthResults(healthResults);
    
    // Update deployment status
    config.lastHealthCheck = Date.now();
    config.healthStatus = overallHealth.status;
    config.healthDetails = overallHealth.details;

    if (overallHealth.status === 'healthy') {
      config.lastHealthy = Date.now();
      config.recoveryAttempts = 0; // Reset recovery attempts on successful health check
    }

    this.emit('health:checked', {
      deploymentId,
      status: overallHealth.status,
      details: overallHealth.details,
      timestamp: Date.now()
    });

    // Trigger recovery if unhealthy
    if (overallHealth.status === 'unhealthy' && config.autoRecovery) {
      await this.handleUnhealthyDeployment(deploymentId, overallHealth);
    }

    return overallHealth;
  }

  /**
   * Check individual endpoint health
   */
  async checkEndpointHealth(endpoint, healthCheckPath) {
    const startTime = Date.now();
    
    try {
      const healthUrl = `${endpoint.url}${healthCheckPath}`;
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 400;

      return {
        endpoint: endpoint.url,
        type: 'application',
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        statusCode: response.status,
        details: {
          headers: response.headers,
          data: response.data
        }
      };

    } catch (error) {
      return {
        endpoint: endpoint.url,
        type: 'application',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          code: error.code,
          message: error.message
        }
      };
    }
  }

  /**
   * Check Locus deployment health
   */
  async checkLocusDeploymentHealth(locusDeploymentId) {
    try {
      const response = await axios.get(
        `${this.locusApiUrl}/deployments/${locusDeploymentId}/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.locusApiKey}`
          },
          timeout: 15000
        }
      );

      return {
        type: 'infrastructure',
        status: response.data.status === 'healthy' ? 'healthy' : 'unhealthy',
        details: response.data
      };

    } catch (error) {
      return {
        type: 'infrastructure',
        status: 'unhealthy',
        error: error.message,
        details: {
          code: error.code,
          message: error.message
        }
      };
    }
  }

  /**
   * Start performance monitoring
   */
  async startPerformanceMonitoring(deploymentId) {
    const config = this.deployments.get(deploymentId);
    if (!config) return;

    const performanceInterval = setInterval(async () => {
      try {
        await this.collectPerformanceMetrics(deploymentId);
      } catch (error) {
        this.logger.error('Performance monitoring failed', { deploymentId, error: error.message });
      }
    }, this.checkInterval * 2); // Check every minute

    config.performanceInterval = performanceInterval;
    this.logger.debug('Performance monitoring started', { deploymentId });
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics(deploymentId) {
    const config = this.deployments.get(deploymentId);
    if (!config || config.status !== 'monitoring') return;

    try {
      // Get metrics from Locus API
      const response = await axios.get(
        `${this.locusApiUrl}/deployments/${config.locusDeploymentId}/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${this.locusApiKey}`
          },
          timeout: 15000
        }
      );

      const metrics = response.data;
      
      // Analyze metrics for anomalies
      const analysis = this.analyzePerformanceMetrics(metrics);
      
      // Update deployment config
      config.lastMetrics = metrics;
      config.lastMetricsCheck = Date.now();

      this.emit('metrics:collected', {
        deploymentId,
        metrics,
        analysis,
        timestamp: Date.now()
      });

      // Check for performance alerts
      if (analysis.alerts.length > 0) {
        await this.handlePerformanceAlerts(deploymentId, analysis.alerts);
      }

      return metrics;

    } catch (error) {
      this.logger.warn('Failed to collect performance metrics', { 
        deploymentId, 
        error: error.message 
      });
    }
  }

  /**
   * Start resource monitoring
   */
  async startResourceMonitoring(deploymentId) {
    const config = this.deployments.get(deploymentId);
    if (!config) return;

    const resourceInterval = setInterval(async () => {
      try {
        await this.monitorResources(deploymentId);
      } catch (error) {
        this.logger.error('Resource monitoring failed', { deploymentId, error: error.message });
      }
    }, this.checkInterval * 3); // Check every 90 seconds

    config.resourceInterval = resourceInterval;
    this.logger.debug('Resource monitoring started', { deploymentId });
  }

  /**
   * Monitor resource usage
   */
  async monitorResources(deploymentId) {
    const config = this.deployments.get(deploymentId);
    if (!config || config.status !== 'monitoring') return;

    try {
      // Get resource usage from Locus API
      const response = await axios.get(
        `${this.locusApiUrl}/deployments/${config.locusDeploymentId}/resources`,
        {
          headers: {
            'Authorization': `Bearer ${this.locusApiKey}`
          },
          timeout: 15000
        }
      );

      const resources = response.data;
      
      // Check resource thresholds
      const alerts = this.checkResourceThresholds(resources);
      
      // Update deployment config
      config.lastResources = resources;
      config.lastResourceCheck = Date.now();

      this.emit('resources:monitored', {
        deploymentId,
        resources,
        alerts,
        timestamp: Date.now()
      });

      // Handle resource alerts
      if (alerts.length > 0) {
        await this.handleResourceAlerts(deploymentId, alerts);
      }

      return resources;

    } catch (error) {
      this.logger.warn('Failed to monitor resources', { 
        deploymentId, 
        error: error.message 
      });
    }
  }

  /**
   * Handle unhealthy deployment with self-healing capabilities
   */
  async handleUnhealthyDeployment(deploymentId, healthResult) {
    const config = this.deployments.get(deploymentId);
    if (!config) return;

    this.logger.warn('Unhealthy deployment detected', { 
      deploymentId, 
      status: healthResult.status,
      attempts: config.recoveryAttempts 
    });

    // Check if we've exceeded max recovery attempts
    if (config.recoveryAttempts >= this.maxRecoveryAttempts) {
      this.logger.error('Max recovery attempts exceeded', { deploymentId });
      this.emit('recovery:failed', { deploymentId, reason: 'max_attempts_exceeded' });
      return;
    }

    config.recoveryAttempts++;

    try {
      // ENHANCED: Use self-healing system for intelligent recovery
      if (this.autoRecovery && this.selfHealer) {
        this.logger.info('Triggering self-healing system', { deploymentId });
        
        const failureContext = {
          type: 'health_check_failure',
          healthResult,
          deploymentConfig: config,
          timestamp: Date.now()
        };
        
        const healingResult = await this.selfHealer.healDeployment(deploymentId, failureContext);
        
        if (healingResult.success) {
          this.logger.info('Self-healing successful', { 
            deploymentId, 
            healingTime: healingResult.healingTime,
            appliedFix: healingResult.appliedFix?.id 
          });
          
          config.recoveryAttempts = 0; // Reset counter on successful healing
          this.emit('recovery:self_healed', { deploymentId, healingResult });
          return;
        } else {
          this.logger.warn('Self-healing failed, falling back to traditional recovery', { 
            deploymentId, 
            reason: healingResult.message 
          });
        }
      }
      
      // Fallback to traditional recovery if self-healing is disabled or failed
      await this.performTraditionalRecovery(deploymentId, healthResult);

    } catch (error) {
      this.logger.error('Recovery attempt failed', { 
        deploymentId, 
        attempt: config.recoveryAttempts,
        error: error.message 
      });
      
      this.emit('recovery:attempt_failed', { 
        deploymentId, 
        attempt: config.recoveryAttempts,
        error: error.message 
      });
    }
  }

  /**
   * Traditional recovery method (fallback)
   */
  async performTraditionalRecovery(deploymentId, healthResult) {
    // Get deployment logs for analysis
    const logs = await this.getDeploymentLogs(deploymentId);
    
    // Analyze logs if analyzer is available
    let analysis = null;
    if (this.analyzer) {
      analysis = await this.analyzer.analyze(deploymentId, logs, {
        stack: config.stack,
        environment: config.environment
      });
    }

    // Determine recovery strategy
    const recoveryStrategy = await this.determineRecoveryStrategy(
      deploymentId, 
      healthResult, 
      analysis
    );

    // Execute recovery
    await this.executeRecovery(deploymentId, recoveryStrategy);
  }

  /**
   * Setup self-healing event handlers
   */
  setupSelfHealingHandlers() {
    if (!this.selfHealer) return;
    
    // Forward self-healing events
    this.selfHealer.on('failure:analyzed', (data) => {
      this.emit('self_healing:analysis_complete', data);
      this.logger.info('Self-healing analysis complete', { 
        deploymentId: data.deploymentId,
        failureType: data.failureType,
        confidence: data.confidence 
      });
    });
    
    this.selfHealer.on('healing:completed', (data) => {
      this.emit('self_healing:completed', data);
      this.logger.info('Self-healing process completed', { 
        deploymentId: data.deploymentId,
        success: data.success,
        healingTime: data.healingTime 
      });
    });
    
    // Handle deployment failures detected by other systems
    this.on('deployment:failed', async (data) => {
      if (this.autoRecovery && this.selfHealer) {
        this.logger.info('Deployment failure detected, triggering self-healing', { 
          deploymentId: data.deploymentId 
        });
        
        const failureContext = {
          type: 'deployment_failure',
          error: data.error,
          stage: data.stage,
          timestamp: Date.now()
        };
        
        try {
          await this.selfHealer.healDeployment(data.deploymentId, failureContext);
        } catch (error) {
          this.logger.error('Self-healing trigger failed', { 
            deploymentId: data.deploymentId,
            error: error.message 
          });
        }
      }
    });
    
    // Handle build failures
    this.on('build:failed', async (data) => {
      if (this.autoRecovery && this.selfHealer) {
        this.logger.info('Build failure detected, triggering self-healing', { 
          deploymentId: data.deploymentId 
        });
        
        const failureContext = {
          type: 'build_failure',
          buildLogs: data.logs,
          buildConfig: data.config,
          timestamp: Date.now()
        };
        
        try {
          await this.selfHealer.healDeployment(data.deploymentId, failureContext);
        } catch (error) {
          this.logger.error('Self-healing for build failure failed', { 
            deploymentId: data.deploymentId,
            error: error.message 
          });
        }
      }
    });
    
    // Handle runtime crashes
    this.on('runtime:crashed', async (data) => {
      if (this.autoRecovery && this.selfHealer) {
        this.logger.info('Runtime crash detected, triggering self-healing', { 
          deploymentId: data.deploymentId 
        });
        
        const failureContext = {
          type: 'runtime_crash',
          crashLogs: data.logs,
          exitCode: data.exitCode,
          timestamp: Date.now()
        };
        
        try {
          await this.selfHealer.healDeployment(data.deploymentId, failureContext);
        } catch (error) {
          this.logger.error('Self-healing for runtime crash failed', { 
            deploymentId: data.deploymentId,
            error: error.message 
          });
        }
      }
    });
  }

  /**
   * Manually trigger self-healing for a deployment
   * @param {string} deploymentId - Deployment identifier
   * @param {Object} context - Additional context for healing
   * @returns {Object} Healing result
   */
  async triggerSelfHealing(deploymentId, context = {}) {
    if (!this.selfHealer) {
      throw new MonitorError('Self-healing system not available');
    }
    
    this.logger.info('Manually triggering self-healing', { deploymentId });
    
    const failureContext = {
      type: 'manual_trigger',
      ...context,
      timestamp: Date.now()
    };
    
    return await this.selfHealer.healDeployment(deploymentId, failureContext);
  }

  /**
   * Get self-healing history for a deployment
   * @param {string} deploymentId - Deployment identifier
   * @returns {Array} Healing history
   */
  getSelfHealingHistory(deploymentId) {
    if (!this.selfHealer) {
      return [];
    }
    
    return this.selfHealer.healingHistory.get(deploymentId) || [];
  }

  /**
   * Get self-healing statistics
   * @returns {Object} Healing statistics
   */
  getSelfHealingStats() {
    if (!this.selfHealer) {
      return { available: false };
    }
    
    const totalAttempts = Array.from(this.selfHealer.healingAttempts.values())
      .reduce((sum, attempts) => sum + attempts.count, 0);
    
    const totalSuccesses = Array.from(this.selfHealer.healingHistory.values())
      .flat()
      .filter(entry => entry.success).length;
    
    return {
      available: true,
      totalAttempts,
      totalSuccesses,
      successRate: totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0,
      activeDeployments: this.selfHealer.healingAttempts.size
    };
  }

  /**
   * Determine recovery strategy based on health status and analysis
   */
  async determineRecoveryStrategy(deploymentId, healthResult, analysis) {
    const config = this.deployments.get(deploymentId);
    
    // Default strategy
    let strategy = {
      type: 'restart',
      priority: 'medium',
      actions: ['restart_instances']
    };

    // Analyze health result details
    const applicationUnhealthy = healthResult.details.some(d => 
      d.type === 'application' && d.status === 'unhealthy'
    );
    
    const infrastructureUnhealthy = healthResult.details.some(d => 
      d.type === 'infrastructure' && d.status === 'unhealthy'
    );

    // Determine strategy based on failure type
    if (infrastructureUnhealthy) {
      strategy = {
        type: 'infrastructure_recovery',
        priority: 'high',
        actions: ['check_infrastructure', 'restart_services', 'scale_if_needed']
      };
    } else if (applicationUnhealthy) {
      strategy = {
        type: 'application_recovery',
        priority: 'high',
        actions: ['restart_application', 'check_dependencies', 'verify_configuration']
      };
    }

    // Enhance strategy with analysis results
    if (analysis && analysis.errors.length > 0) {
      const criticalErrors = analysis.errors.filter(e => e.severity === 'critical');
      
      if (criticalErrors.length > 0) {
        strategy.priority = 'critical';
        strategy.analysisGuided = true;
        strategy.errors = criticalErrors;
        
        // Add specific actions based on error categories
        const errorCategories = [...new Set(criticalErrors.map(e => e.category))];
        if (errorCategories.includes('memory')) {
          strategy.actions.push('increase_memory', 'restart_with_more_resources');
        }
        if (errorCategories.includes('database')) {
          strategy.actions.push('check_database_connectivity', 'restart_database_connections');
        }
      }
    }

    this.logger.info('Recovery strategy determined', { deploymentId, strategy });
    return strategy;
  }

  /**
   * Execute recovery strategy
   */
  async executeRecovery(deploymentId, strategy) {
    const config = this.deployments.get(deploymentId);
    
    this.logger.info('Executing recovery strategy', { 
      deploymentId, 
      type: strategy.type,
      priority: strategy.priority 
    });

    this.emit('recovery:started', { deploymentId, strategy });

    try {
      for (const action of strategy.actions) {
        await this.executeRecoveryAction(deploymentId, action, strategy);
      }

      // Wait for recovery to take effect
      await this.sleep(30000); // Wait 30 seconds

      // Verify recovery
      const healthCheck = await this.performHealthCheck(deploymentId);
      
      if (healthCheck.status === 'healthy') {
        this.logger.info('Recovery successful', { deploymentId, strategy: strategy.type });
        this.emit('recovery:successful', { deploymentId, strategy });
        config.recoveryAttempts = 0; // Reset counter on success
      } else {
        this.logger.warn('Recovery did not restore health', { deploymentId });
        this.emit('recovery:incomplete', { deploymentId, strategy });
      }

    } catch (error) {
      this.logger.error('Recovery execution failed', { 
        deploymentId, 
        strategy: strategy.type,
        error: error.message 
      });
      
      this.emit('recovery:failed', { deploymentId, strategy, error: error.message });
      throw error;
    }
  }

  /**
   * Execute individual recovery action
   */
  async executeRecoveryAction(deploymentId, action, strategy) {
    const config = this.deployments.get(deploymentId);
    
    this.logger.debug('Executing recovery action', { deploymentId, action });

    switch (action) {
      case 'restart_instances':
        await this.restartInstances(config.locusDeploymentId);
        break;
        
      case 'restart_application':
        await this.restartApplication(config.locusDeploymentId);
        break;
        
      case 'scale_if_needed':
        await this.scaleIfNeeded(config.locusDeploymentId);
        break;
        
      case 'increase_memory':
        await this.increaseMemory(config.locusDeploymentId);
        break;
        
      case 'check_database_connectivity':
        await this.checkDatabaseConnectivity(deploymentId);
        break;
        
      default:
        this.logger.warn('Unknown recovery action', { deploymentId, action });
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId) {
    const config = this.deployments.get(deploymentId);
    if (!config || !config.locusDeploymentId) return [];

    try {
      const response = await axios.get(
        `${this.locusApiUrl}/deployments/${config.locusDeploymentId}/logs`,
        {
          headers: {
            'Authorization': `Bearer ${this.locusApiKey}`
          },
          params: {
            lines: 1000, // Get last 1000 lines
            level: 'error,warn,info'
          },
          timeout: 30000
        }
      );

      return response.data.logs || [];

    } catch (error) {
      this.logger.warn('Failed to get deployment logs', { 
        deploymentId, 
        error: error.message 
      });
      return [];
    }
  }

  // Recovery action implementations
  async restartInstances(locusDeploymentId) {
    await axios.post(
      `${this.locusApiUrl}/deployments/${locusDeploymentId}/restart`,
      {},
      {
        headers: { 'Authorization': `Bearer ${this.locusApiKey}` },
        timeout: 60000
      }
    );
  }

  async restartApplication(locusDeploymentId) {
    await axios.post(
      `${this.locusApiUrl}/deployments/${locusDeploymentId}/restart-app`,
      {},
      {
        headers: { 'Authorization': `Bearer ${this.locusApiKey}` },
        timeout: 60000
      }
    );
  }

  async scaleIfNeeded(locusDeploymentId) {
    // Get current metrics to determine if scaling is needed
    const response = await axios.get(
      `${this.locusApiUrl}/deployments/${locusDeploymentId}/metrics`,
      {
        headers: { 'Authorization': `Bearer ${this.locusApiKey}` }
      }
    );

    const metrics = response.data;
    
    // Scale up if CPU or memory usage is high
    if (metrics.cpu > 80 || metrics.memory > 85) {
      await axios.post(
        `${this.locusApiUrl}/deployments/${locusDeploymentId}/scale`,
        { instances: '+1' },
        {
          headers: { 'Authorization': `Bearer ${this.locusApiKey}` }
        }
      );
    }
  }

  async increaseMemory(locusDeploymentId) {
    await axios.post(
      `${this.locusApiUrl}/deployments/${locusDeploymentId}/resize`,
      { memory: '+512MB' },
      {
        headers: { 'Authorization': `Bearer ${this.locusApiKey}` }
      }
    );
  }

  async checkDatabaseConnectivity(deploymentId) {
    // This would implement database connectivity checks
    // For now, just log the action
    this.logger.info('Checking database connectivity', { deploymentId });
  }

  // Utility methods
  analyzeHealthResults(results) {
    const unhealthyResults = results.filter(r => r.status === 'unhealthy');
    
    return {
      status: unhealthyResults.length === 0 ? 'healthy' : 'unhealthy',
      details: results,
      summary: {
        total: results.length,
        healthy: results.length - unhealthyResults.length,
        unhealthy: unhealthyResults.length
      }
    };
  }

  analyzePerformanceMetrics(metrics) {
    const alerts = [];
    
    if (metrics.responseTime > this.alertThresholds.responseTime) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `High response time: ${metrics.responseTime}ms`,
        threshold: this.alertThresholds.responseTime,
        actual: metrics.responseTime
      });
    }
    
    if (metrics.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'performance',
        severity: 'critical',
        message: `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        threshold: this.alertThresholds.errorRate,
        actual: metrics.errorRate
      });
    }
    
    return { alerts, metrics };
  }

  checkResourceThresholds(resources) {
    const alerts = [];
    
    if (resources.cpu > this.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'resource',
        resource: 'cpu',
        severity: 'warning',
        message: `High CPU usage: ${resources.cpu}%`,
        threshold: this.alertThresholds.cpuUsage,
        actual: resources.cpu
      });
    }
    
    if (resources.memory > this.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'resource',
        resource: 'memory',
        severity: 'critical',
        message: `High memory usage: ${resources.memory}%`,
        threshold: this.alertThresholds.memoryUsage,
        actual: resources.memory
      });
    }
    
    return alerts;
  }

  async handlePerformanceAlerts(deploymentId, alerts) {
    for (const alert of alerts) {
      this.emit('alert:performance', { deploymentId, alert });
      this.logger.warn('Performance alert', { deploymentId, alert });
    }
  }

  async handleResourceAlerts(deploymentId, alerts) {
    for (const alert of alerts) {
      this.emit('alert:resource', { deploymentId, alert });
      this.logger.warn('Resource alert', { deploymentId, alert });
      
      // Trigger automatic scaling for critical resource alerts
      if (alert.severity === 'critical' && this.autoRecovery) {
        await this.handleResourceCriticalAlert(deploymentId, alert);
      }
    }
  }

  async handleResourceCriticalAlert(deploymentId, alert) {
    const config = this.deployments.get(deploymentId);
    if (!config) return;

    try {
      if (alert.resource === 'memory' && alert.actual > 90) {
        await this.increaseMemory(config.locusDeploymentId);
        this.logger.info('Automatically increased memory due to critical alert', { deploymentId });
      } else if (alert.resource === 'cpu' && alert.actual > 90) {
        await this.scaleIfNeeded(config.locusDeploymentId);
        this.logger.info('Automatically scaled instances due to critical CPU alert', { deploymentId });
      }
    } catch (error) {
      this.logger.error('Failed to handle critical resource alert', { 
        deploymentId, 
        alert, 
        error: error.message 
      });
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for external control
  getDeploymentStatus(deploymentId) {
    return this.deployments.get(deploymentId);
  }

  listMonitoredDeployments() {
    return Array.from(this.deployments.values());
  }

  updateAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    this.logger.info('Alert thresholds updated', { thresholds: this.alertThresholds });
  }
}

class MonitorError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'MonitorError';
    this.originalError = originalError;
  }
}

module.exports = { MonitorAgent, MonitorError };