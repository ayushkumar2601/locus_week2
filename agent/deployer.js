/**
 * Deployer Agent - Professional Deployment Interface
 * Handles deployments through deployment service with Locus-compatible API
 */

import { EventEmitter } from 'events';
import { DeploymentService } from '../services/deployService.js';

export class DeployerError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DeployerError';
    this.originalError = originalError;
  }
}

export class DeployerAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    
    // Initialize deployment service with Locus-compatible interface
    this.deploymentService = new DeploymentService({
      logger: this.logger,
      simulation: options.simulation
    });
    
    this.deployments = new Map();
    
    // Listen to deployment service events
    this.deploymentService.on('deployment:started', (event) => {
      this.emit('deployment:started', event);
    });
    
    this.deploymentService.on('deployment:completed', (event) => {
      this.emit('deployment:completed', event);
    });
    
    this.deploymentService.on('deployment:failed', (event) => {
      this.emit('deployment:error', event);
    });
    
    this.deploymentService.on('deployment:progress', (event) => {
      this.emit('deployment:progress', event);
    });
    
    this.logger.info('🚀 DeployerAgent initialized with professional deployment service');
  }

  /**
   * Deploy application using deployment service
   */
  async deploy(plan, options = {}) {
    try {
      this.logger.info('Starting deployment via deployment service', { 
        planId: plan.id, 
        appName: options.name 
      });
      
      // Convert plan to deployment config
      const deploymentConfig = this.convertPlanToDeploymentConfig(plan, options);
      
      // Deploy via deployment service
      const deploymentResult = await this.deploymentService.deployApp(deploymentConfig);
      
      // Create deployment record
      const deployment = {
        deploymentId: deploymentResult.deploymentId,
        status: deploymentResult.status,
        endpoints: deploymentResult.endpoints,
        resources: deploymentResult.resources,
        startTime: Date.now(),
        estimatedDuration: deploymentResult.estimatedDuration,
        metadata: deploymentResult.metadata,
        plan: plan
      };
      
      this.deployments.set(deployment.deploymentId, deployment);
      
      this.emit('deployment:started', deployment);
      
      this.logger.info('✅ Deployment initiated successfully', {
        deploymentId: deployment.deploymentId,
        status: deployment.status
      });
      
      return deployment;
      
    } catch (error) {
      this.logger.error('❌ Deployment failed', { 
        error: error.message,
        plan: plan.id 
      });
      
      throw new DeployerError(`Deployment failed: ${error.message}`, error);
    }
  }

  /**
   * Get deployment status from deployment service
   */
  async getDeploymentStatus(deploymentId) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }
      
      // Get status from deployment service
      const status = await this.deploymentService.getDeploymentStatus(deploymentId);
      
      // Update local deployment record
      deployment.status = status.status;
      deployment.progress = status.progress;
      deployment.phase = status.phase;
      deployment.endpoints = status.endpoints;
      deployment.health = status.health;
      deployment.lastUpdate = Date.now();
      
      this.deployments.set(deploymentId, deployment);
      
      return deployment;
      
    } catch (error) {
      this.logger.error('Failed to get deployment status', { 
        deploymentId, 
        error: error.message 
      });
      throw new DeployerError(`Status check failed: ${error.message}`, error);
    }
  }

  /**
   * Get deployment logs from deployment service
   */
  async getDeploymentLogs(deploymentId, options = {}) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }
      
      const logs = await this.deploymentService.getLogs(deploymentId, options);
      
      return {
        deploymentId,
        logs: logs.logs,
        metadata: logs.metadata
      };
      
    } catch (error) {
      this.logger.error('Failed to get deployment logs', { 
        deploymentId, 
        error: error.message 
      });
      throw new DeployerError(`Log retrieval failed: ${error.message}`, error);
    }
  }

  /**
   * Scale deployment (simulated for demo)
   */
  async scaleDeployment(deploymentId, scaleConfig) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }
      
      // Update deployment resources
      deployment.resources = {
        ...deployment.resources,
        instances: scaleConfig.instances || deployment.resources.instances,
        cpu: scaleConfig.cpu || deployment.resources.cpu,
        memory: scaleConfig.memory || deployment.resources.memory
      };
      
      this.deployments.set(deploymentId, deployment);
      
      this.logger.info('✅ Deployment scaled successfully', {
        deploymentId,
        scaleConfig
      });
      
      return {
        status: 'SUCCESS',
        resources: deployment.resources,
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.logger.error('❌ Scaling failed', { 
        deploymentId, 
        error: error.message 
      });
      throw new DeployerError(`Scaling failed: ${error.message}`, error);
    }
  }

  /**
   * Rollback deployment (simulated for demo)
   */
  async rollback(deploymentId, targetVersion = null) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }
      
      // Simulate rollback by updating status
      deployment.status = 'deployed';
      deployment.phase = 'rollback_completed';
      deployment.lastUpdate = Date.now();
      
      this.deployments.set(deploymentId, deployment);
      
      this.logger.info('✅ Rollback completed', {
        deploymentId,
        targetVersion
      });
      
      return {
        id: `rollback_${Date.now()}`,
        status: 'SUCCESS',
        targetVersion,
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.logger.error('❌ Rollback failed', { 
        deploymentId, 
        error: error.message 
      });
      throw new DeployerError(`Rollback failed: ${error.message}`, error);
    }
  }

  /**
   * Destroy deployment (simulated for demo)
   */
  async destroy(deploymentId) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }
      
      this.deployments.delete(deploymentId);
      
      this.logger.info('✅ Deployment destroyed', { deploymentId });
      
      return { status: 'SUCCESS', timestamp: Date.now() };
      
    } catch (error) {
      this.logger.error('❌ Destruction failed', { 
        deploymentId, 
        error: error.message 
      });
      throw new DeployerError(`Destruction failed: ${error.message}`, error);
    }
  }

  /**
   * Get all deployments
   */
  getDeployment(deploymentId) {
    return this.deployments.get(deploymentId) || null;
  }

  /**
   * List all active deployments
   */
  listDeployments() {
    return Array.from(this.deployments.values());
  }
}