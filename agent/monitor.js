/**
 * Monitor Agent - Professional deployment monitoring with deployment service integration
 */

import { EventEmitter } from 'events';
import { DeploymentService } from '../services/deployService.js';

export class MonitorError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'MonitorError';
    this.originalError = originalError;
  }
}

export class MonitorAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.analyzer = options.analyzer;
    this.deployer = options.deployer;
    
    // Initialize deployment service for monitoring
    this.deploymentService = new DeploymentService({
      logger: this.logger,
      simulation: options.simulation
    });
    
    this.monitoredDeployments = new Map();
    this.monitoringInterval = options.monitoringInterval || 30000; // 30 seconds
    this.isMonitoring = false;
    
    this.logger.info('🔍 Monitor Agent initialized with deployment service integration');
  }

  /**
   * Start monitoring a deployment
   */
  async startMonitoring(deploymentId, options = {}) {
    try {
      this.logger.info('Starting monitoring for deployment:', { deploymentId, options });
      
      // Get initial deployment status from deployment service
      const initialStatus = await this.deploymentService.getDeploymentStatus(deploymentId);
      
      const monitoringConfig = {
        deploymentId,
        status: 'monitoring',
        startTime: Date.now(),
        lastCheck: Date.now(),
        checkInterval: options.checkInterval || this.monitoringInterval,
        alertThresholds: {
          errorRate: options.errorRate || 0.05, // 5%
          responseTime: options.responseTime || 5000, // 5 seconds
          uptime: options.uptime || 0.99, // 99%
          ...options.alertThresholds
        },
        initialStatus,
        ...options
      };
      
      this.monitoredDeployments.set(deploymentId, monitoringConfig);
      
      // Start continuous monitoring if not already running
      if (!this.isMonitoring) {
        this.startContinuousMonitoring();
      }
      
      this.emit('monitoring:started', { deploymentId, config: monitoringConfig });
      
      return { 
        status: 'monitoring_started',
        deploymentId,
        checkInterval: monitoringConfig.checkInterval
      };
      
    } catch (error) {
      this.logger.error('Failed to start monitoring:', error);
      throw new MonitorError(`Failed to start monitoring: ${error.message}`, error);
    }
  }

  /**
   * Stop monitoring a deployment
   */
  async stopMonitoring(deploymentId) {
    this.logger.info('Stopping monitoring for deployment:', deploymentId);
    
    const monitoringConfig = this.monitoredDeployments.get(deploymentId);
    if (monitoringConfig) {
      monitoringConfig.status = 'stopped';
      monitoringConfig.stopTime = Date.now();
      
      this.emit('monitoring:stopped', { 
        deploymentId, 
        duration: Date.now() - monitoringConfig.startTime 
      });
    }
    
    this.monitoredDeployments.delete(deploymentId);
    
    // Stop continuous monitoring if no deployments left
    if (this.monitoredDeployments.size === 0) {
      this.isMonitoring = false;
    }
    
    return { status: 'monitoring_stopped', deploymentId };
  }

  /**
   * Get deployment status from deployment service
   */
  async getDeploymentStatus(deploymentId) {
    try {
      const monitoring = this.monitoredDeployments.get(deploymentId);
      if (!monitoring) {
        // Try to get status directly from deployment service
        const status = await this.deploymentService.getDeploymentStatus(deploymentId);
        return this.formatDeploymentStatus(deploymentId, status);
      }
      
      // Get fresh status from deployment service
      const status = await this.deploymentService.getDeploymentStatus(deploymentId);
      
      // Update monitoring record
      monitoring.lastCheck = Date.now();
      monitoring.lastStatus = status;
      
      const formattedStatus = this.formatDeploymentStatus(deploymentId, status, monitoring);
      
      // Check for alerts
      await this.checkAlerts(deploymentId, formattedStatus, monitoring);
      
      return formattedStatus;
      
    } catch (error) {
      this.logger.error('Failed to get deployment status:', error);
      return {
        deploymentId,
        status: 'error',
        error: error.message,
        monitoring: false,
        lastCheck: Date.now()
      };
    }
  }

  /**
   * List all active deployments being monitored
   */
  async listActiveDeployments() {
    const activeDeployments = [];
    
    for (const [deploymentId, monitoring] of this.monitoredDeployments) {
      if (monitoring.status === 'monitoring') {
        try {
          const status = await this.getDeploymentStatus(deploymentId);
          activeDeployments.push({
            id: deploymentId,
            name: monitoring.name || deploymentId,
            status: status.status,
            health: status.health,
            uptime: Date.now() - monitoring.startTime,
            lastCheck: monitoring.lastCheck
          });
        } catch (error) {
          activeDeployments.push({
            id: deploymentId,
            name: monitoring.name || deploymentId,
            status: 'error',
            health: 'unknown',
            error: error.message
          });
        }
      }
    }
    
    return activeDeployments;
  }

  /**
   * Get deployment health metrics
   */
  async getDeploymentHealth(deploymentId) {
    try {
      const status = await this.getDeploymentStatus(deploymentId);
      
      // Simulate metrics for demo
      const mockMetrics = {
        cpu: Math.random() * 80 + 10, // 10-90%
        memory: Math.random() * 70 + 20, // 20-90%
        requests: Math.floor(Math.random() * 1000) + 100,
        errors: Math.floor(Math.random() * 10),
        responseTime: Math.floor(Math.random() * 500) + 100
      };
      
      return {
        deploymentId,
        overall: status.health?.status || 'healthy',
        metrics: mockMetrics,
        checks: status.health?.checks || [],
        lastCheck: Date.now(),
        alerts: this.getActiveAlerts(deploymentId)
      };
      
    } catch (error) {
      this.logger.error('Failed to get deployment health:', error);
      return {
        deploymentId,
        overall: 'error',
        error: error.message,
        lastCheck: Date.now()
      };
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId, options = {}) {
    try {
      const logs = await this.deploymentService.getLogs(deploymentId, {
        lines: options.lines || 1000,
        since: options.since,
        level: options.level || 'info,warn,error',
        source: options.source
      });
      
      return {
        deploymentId,
        logs: logs.logs,
        metadata: logs.metadata,
        retrievedAt: Date.now()
      };
      
    } catch (error) {
      this.logger.error('Failed to get deployment logs:', error);
      throw new MonitorError(`Failed to get logs: ${error.message}`, error);
    }
  }

  /**
   * Update alert thresholds for a deployment
   */
  updateAlertThresholds(deploymentId, thresholds) {
    const monitoring = this.monitoredDeployments.get(deploymentId);
    if (monitoring) {
      monitoring.alertThresholds = {
        ...monitoring.alertThresholds,
        ...thresholds
      };
      
      this.logger.info('Updated alert thresholds:', { deploymentId, thresholds });
      this.emit('thresholds:updated', { deploymentId, thresholds });
    }
  }

  /**
   * Get queue status for brain integration
   */
  async getQueueStatus() {
    const activeCount = Array.from(this.monitoredDeployments.values())
      .filter(m => m.status === 'monitoring').length;
    
    return {
      pending: 0, // No queue in monitor
      processing: activeCount,
      completed: this.monitoredDeployments.size - activeCount
    };
  }

  /**
   * Scale processing (placeholder for brain integration)
   */
  async scaleProcessing() {
    this.logger.info('Scaling monitoring processing');
    // In a real implementation, this might adjust monitoring intervals
    // or spawn additional monitoring workers
    return { status: 'scaled', message: 'Monitoring capacity increased' };
  }

  // Private methods

  /**
   * Start continuous monitoring loop
   */
  startContinuousMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.logger.info('Starting continuous monitoring loop');
    
    const monitoringLoop = async () => {
      if (!this.isMonitoring) return;
      
      try {
        // Check all monitored deployments
        const promises = Array.from(this.monitoredDeployments.keys()).map(
          deploymentId => this.performHealthCheck(deploymentId)
        );
        
        await Promise.allSettled(promises);
        
      } catch (error) {
        this.logger.error('Monitoring loop error:', error);
      }
      
      // Schedule next check
      if (this.isMonitoring) {
        setTimeout(monitoringLoop, this.monitoringInterval);
      }
    };
    
    // Start the loop
    setTimeout(monitoringLoop, this.monitoringInterval);
  }

  /**
   * Perform health check for a specific deployment
   */
  async performHealthCheck(deploymentId) {
    try {
      const status = await this.getDeploymentStatus(deploymentId);
      
      this.emit('health:checked', {
        deploymentId,
        status: status.status,
        health: status.health,
        timestamp: Date.now()
      });
      
      return status;
      
    } catch (error) {
      this.logger.error('Health check failed:', { deploymentId, error: error.message });
      
      this.emit('health:error', {
        deploymentId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Format deployment status for consistent output
   */
  formatDeploymentStatus(deploymentId, status, monitoring = null) {
    return {
      deploymentId,
      status: status.status,
      health: status.health || { status: 'healthy' },
      progress: status.progress || 0,
      phase: status.phase || 'unknown',
      endpoints: status.endpoints || [],
      resources: status.resources || {},
      metrics: status.metrics || {},
      monitoring: !!monitoring,
      uptime: monitoring ? Date.now() - monitoring.startTime : 0,
      lastCheck: Date.now(),
      metadata: status.metadata || {}
    };
  }

  /**
   * Check for alerts based on thresholds
   */
  async checkAlerts(deploymentId, status, monitoring) {
    const thresholds = monitoring.alertThresholds;
    const alerts = [];
    
    // Check deployment health
    if (status.health.status === 'unhealthy') {
      alerts.push({
        type: 'unhealthy_deployment',
        severity: 'critical',
        message: 'Deployment health check failing',
        checks: status.health.checks
      });
    }
    
    // Check deployment status
    if (status.status === 'failed') {
      alerts.push({
        type: 'deployment_failed',
        severity: 'critical',
        message: 'Deployment has failed',
        status: status.status
      });
    }
    
    // Emit alerts
    if (alerts.length > 0) {
      this.emit('alerts:triggered', {
        deploymentId,
        alerts,
        timestamp: Date.now()
      });
      
      // Store alerts in monitoring config
      monitoring.alerts = monitoring.alerts || [];
      monitoring.alerts.push(...alerts.map(alert => ({
        ...alert,
        timestamp: Date.now()
      })));
    }
  }

  /**
   * Get active alerts for a deployment
   */
  getActiveAlerts(deploymentId) {
    const monitoring = this.monitoredDeployments.get(deploymentId);
    if (!monitoring || !monitoring.alerts) return [];
    
    // Return alerts from last 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return monitoring.alerts.filter(alert => alert.timestamp > fiveMinutesAgo);
  }
}