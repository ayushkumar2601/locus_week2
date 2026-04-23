/**
 * Agent Layer - Main orchestrator for the autonomous deployment system
 * Coordinates all agents and provides a unified interface
 * Integrates with the central Agent Brain for intelligent coordination
 */

import { PlannerAgent, PlannerError } from './planner.js';
import { DeployerAgent, DeployerError } from './deployer.js';
import { AnalyzerAgent, AnalyzerError } from './analyzer.js';
import { MonitorAgent, MonitorError } from './monitor.js';
import { AgentBrain } from './brain.js';
import { EventEmitter } from 'events';

class AgentOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.config = {
      aiProvider: options.aiProvider || 'openai',
      apiKeys: options.apiKeys || {},
      locusApiKey: options.locusApiKey || process.env.LOCUS_API_KEY,
      locusApiUrl: options.locusApiUrl || process.env.LOCUS_API_URL,
      autoRecovery: options.autoRecovery !== false,
      enableBrain: options.enableBrain !== false, // Enable brain by default
      ...options
    };

    // Initialize agents
    this.planner = new PlannerAgent({
      aiProvider: this.config.aiProvider,
      apiKeys: this.config.apiKeys,
      logger: this.logger,
      memory: this.brain?.memory // Pass memory system to planner
    });

    this.deployer = new DeployerAgent({
      locusApiKey: this.config.locusApiKey,
      locusApiUrl: this.config.locusApiUrl,
      logger: this.logger,
      retryConfig: this.config.retryConfig
    });

    this.analyzer = new AnalyzerAgent({
      aiProvider: this.config.aiProvider,
      apiKeys: this.config.apiKeys,
      logger: this.logger
    });

    this.monitor = new MonitorAgent({
      analyzer: this.analyzer,
      deployer: this.deployer,
      locusApiKey: this.config.locusApiKey,
      locusApiUrl: this.config.locusApiUrl,
      autoRecovery: this.config.autoRecovery,
      logger: this.logger
    });

    // Initialize Agent Brain if enabled
    if (this.config.enableBrain) {
      this.brain = new AgentBrain({
        ...this.config,
        orchestrator: this, // Inject orchestrator to avoid circular dependency
        logger: this.logger
      });
      
      this.logger.info('🧠 Agent Brain initialized - Central intelligence active');
    }

    // Set up event forwarding
    this.setupEventForwarding();

    // Track active deployments
    this.activeDeployments = new Map();
    
    // Start brain if enabled
    if (this.brain && this.config.autoStartBrain !== false) {
      this.startBrain();
    }
  }

  /**
   * Start the Agent Brain
   */
  async startBrain() {
    if (this.brain && !this.brain.isRunning) {
      await this.brain.startAgentLoop();
      this.logger.info('🧠 Agent Brain started - Autonomous intelligence active');
    }
  }

  /**
   * Stop the Agent Brain
   */
  async stopBrain() {
    if (this.brain && this.brain.isRunning) {
      await this.brain.stopAgentLoop();
      this.logger.info('🧠 Agent Brain stopped');
    }
  }

  /**
   * Get brain status and metrics
   */
  getBrainStatus() {
    if (!this.brain) {
      return { enabled: false, status: 'disabled' };
    }
    
    return {
      enabled: true,
      running: this.brain.isRunning,
      memory: {
        observations: this.brain.memory.observations.length,
        thoughts: this.brain.memory.thoughts.length,
        decisions: this.brain.memory.decisions.length,
        actions: this.brain.memory.actions.length,
        reflections: this.brain.memory.reflections.length
      },
      systemState: {
        deployments: this.brain.systemState.deployments.size,
        errors: this.brain.systemState.errors.length,
        activeActions: this.brain.systemState.activeActions.size
      }
    };
  }

  /**
   * Complete autonomous deployment workflow
   * @param {string|Object} input - Repository URL or deployment request
   * @param {Object} options - Deployment options
   * @returns {Object} Deployment result
   */
  async deploy(input, options = {}) {
    const workflowId = this.generateWorkflowId();
    
    try {
      this.logger.info('Starting autonomous deployment workflow', { workflowId, input });
      this.emit('workflow:started', { workflowId, input, options });

      // Phase 1: Planning
      this.logger.info('Phase 1: Analyzing repository and generating deployment plan');
      const plan = await this.planner.plan(input);
      
      this.emit('workflow:planned', { workflowId, plan });
      this.logger.info('Deployment plan generated', { 
        workflowId, 
        planId: plan.id,
        stack: plan.stack.primary,
        estimatedCost: plan.estimatedCost.monthly 
      });

      // Phase 2: Deployment
      this.logger.info('Phase 2: Executing deployment via Locus API');
      const deployment = await this.deployer.deploy(plan, {
        name: options.name || `auto-deploy-${workflowId}`,
        environment: options.environment || 'production',
        ...options
      });

      this.emit('workflow:deployed', { workflowId, deployment });
      this.logger.info('Deployment completed successfully', { 
        workflowId, 
        deploymentId: deployment.deploymentId,
        duration: deployment.duration 
      });

      // Phase 3: Start Monitoring
      this.logger.info('Phase 3: Starting continuous monitoring');
      await this.monitor.startMonitoring(deployment.deploymentId, {
        locusDeploymentId: deployment.locusDeploymentId,
        endpoints: deployment.endpoints,
        stack: plan.stack.primary,
        environment: options.environment || 'production',
        autoRecovery: options.autoRecovery !== false
      });

      // Track deployment
      this.activeDeployments.set(deployment.deploymentId, {
        workflowId,
        plan,
        deployment,
        startTime: Date.now(),
        status: 'active'
      });

      const result = {
        workflowId,
        deploymentId: deployment.deploymentId,
        status: 'SUCCESS',
        plan: {
          id: plan.id,
          stack: plan.stack.primary,
          confidence: plan.confidence,
          estimatedCost: plan.estimatedCost
        },
        deployment: {
          locusDeploymentId: deployment.locusDeploymentId,
          endpoints: deployment.endpoints,
          resources: deployment.resources,
          duration: deployment.duration
        },
        monitoring: {
          status: 'active',
          autoRecovery: options.autoRecovery !== false
        },
        totalDuration: Date.now() - Date.now() // Will be updated
      };

      this.emit('workflow:completed', { workflowId, result });
      this.logger.info('Autonomous deployment workflow completed successfully', { 
        workflowId, 
        deploymentId: deployment.deploymentId 
      });

      return result;

    } catch (error) {
      this.emit('workflow:failed', { workflowId, error: error.message });
      this.logger.error('Autonomous deployment workflow failed', { 
        workflowId, 
        error: error.message, 
        stack: error.stack 
      });
      
      // Cleanup on failure
      await this.cleanupFailedWorkflow(workflowId);
      
      throw new AgentOrchestrationError(`Deployment workflow failed: ${error.message}`, workflowId, error);
    }
  }

  /**
   * Analyze deployment logs and get fix suggestions
   * @param {string} deploymentId - Deployment identifier
   * @returns {Object} Analysis result with errors and suggestions
   */
  async analyzeDeployment(deploymentId) {
    try {
      this.logger.info('Analyzing deployment', { deploymentId });

      // Get deployment logs
      const logs = await this.getDeploymentLogs(deploymentId);
      
      // Get deployment context
      const context = this.getDeploymentContext(deploymentId);
      
      // Analyze logs
      const analysis = await this.analyzer.analyze(deploymentId, logs, context);
      
      this.logger.info('Deployment analysis completed', { 
        deploymentId, 
        errorsFound: analysis.summary.errorsFound,
        fixableErrors: analysis.summary.fixableErrors 
      });

      return analysis;

    } catch (error) {
      this.logger.error('Deployment analysis failed', { deploymentId, error: error.message });
      throw new AgentOrchestrationError(`Analysis failed: ${error.message}`, deploymentId, error);
    }
  }

  /**
   * Get deployment status and health information
   * @param {string} deploymentId - Deployment identifier
   * @returns {Object} Comprehensive deployment status
   */
  async getDeploymentStatus(deploymentId) {
    try {
      const activeDeployment = this.activeDeployments.get(deploymentId);
      const deployerStatus = this.deployer.getDeployment(deploymentId);
      const monitorStatus = this.monitor.getDeploymentStatus(deploymentId);

      return {
        deploymentId,
        active: !!activeDeployment,
        workflow: activeDeployment ? {
          id: activeDeployment.workflowId,
          startTime: activeDeployment.startTime,
          status: activeDeployment.status
        } : null,
        deployment: deployerStatus,
        monitoring: monitorStatus,
        lastUpdated: Date.now()
      };

    } catch (error) {
      this.logger.error('Failed to get deployment status', { deploymentId, error: error.message });
      throw new AgentOrchestrationError(`Status retrieval failed: ${error.message}`, deploymentId, error);
    }
  }

  /**
   * Rollback deployment to previous version
   * @param {string} deploymentId - Deployment identifier
   * @param {string} targetVersion - Target version to rollback to
   * @returns {Object} Rollback result
   */
  async rollbackDeployment(deploymentId, targetVersion = null) {
    try {
      this.logger.info('Initiating deployment rollback', { deploymentId, targetVersion });

      // Execute rollback via deployer
      const rollbackResult = await this.deployer.rollback(deploymentId, targetVersion);
      
      // Update monitoring if needed
      const monitorStatus = this.monitor.getDeploymentStatus(deploymentId);
      if (monitorStatus) {
        // Reset recovery attempts after successful rollback
        monitorStatus.recoveryAttempts = 0;
      }

      this.logger.info('Deployment rollback completed', { 
        deploymentId, 
        rollbackId: rollbackResult.id 
      });

      return rollbackResult;

    } catch (error) {
      this.logger.error('Deployment rollback failed', { deploymentId, error: error.message });
      throw new AgentOrchestrationError(`Rollback failed: ${error.message}`, deploymentId, error);
    }
  }

  /**
   * Destroy deployment and cleanup all resources
   * @param {string} deploymentId - Deployment identifier
   * @returns {Object} Destruction result
   */
  async destroyDeployment(deploymentId) {
    try {
      this.logger.info('Destroying deployment', { deploymentId });

      // Stop monitoring first
      await this.monitor.stopMonitoring(deploymentId);
      
      // Destroy deployment via deployer
      const destructionResult = await this.deployer.destroy(deploymentId);
      
      // Remove from active deployments
      this.activeDeployments.delete(deploymentId);

      this.logger.info('Deployment destroyed successfully', { deploymentId });

      return destructionResult;

    } catch (error) {
      this.logger.error('Deployment destruction failed', { deploymentId, error: error.message });
      throw new AgentOrchestrationError(`Destruction failed: ${error.message}`, deploymentId, error);
    }
  }

  /**
   * List all active deployments
   * @returns {Array} List of active deployments
   */
  listActiveDeployments() {
    return Array.from(this.activeDeployments.values()).map(deployment => ({
      workflowId: deployment.workflowId,
      deploymentId: deployment.deployment.deploymentId,
      status: deployment.status,
      startTime: deployment.startTime,
      stack: deployment.plan.stack.primary,
      endpoints: deployment.deployment.endpoints,
      cost: deployment.plan.estimatedCost
    }));
  }

  /**
   * Update configuration for all agents
   * @param {Object} newConfig - New configuration options
   */
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update individual agents if needed
    if (newConfig.alertThresholds) {
      this.monitor.updateAlertThresholds(newConfig.alertThresholds);
    }
    
    this.logger.info('Agent configuration updated', { config: this.config });
  }

  // Private methods
  setupEventForwarding() {
    // Forward events from individual agents
    this.planner.on('*', (event, data) => this.emit(`planner:${event}`, data));
    this.deployer.on('*', (event, data) => this.emit(`deployer:${event}`, data));
    this.analyzer.on('*', (event, data) => this.emit(`analyzer:${event}`, data));
    this.monitor.on('*', (event, data) => this.emit(`monitor:${event}`, data));

    // Set up specific event handlers
    this.monitor.on('recovery:failed', async (data) => {
      await this.handleRecoveryFailure(data.deploymentId);
    });

    this.monitor.on('alert:critical', async (data) => {
      await this.handleCriticalAlert(data.deploymentId, data.alert);
    });
  }

  async handleRecoveryFailure(deploymentId) {
    this.logger.error('Recovery failed for deployment', { deploymentId });
    
    // Analyze deployment to understand the failure
    try {
      const analysis = await this.analyzeDeployment(deploymentId);
      
      this.emit('recovery:analysis_complete', { 
        deploymentId, 
        analysis,
        recommendation: 'manual_intervention_required' 
      });
      
    } catch (error) {
      this.logger.error('Failed to analyze deployment after recovery failure', { 
        deploymentId, 
        error: error.message 
      });
    }
  }

  async handleCriticalAlert(deploymentId, alert) {
    this.logger.warn('Critical alert received', { deploymentId, alert });
    
    // Emit critical alert for external handling
    this.emit('alert:critical', { deploymentId, alert, timestamp: Date.now() });
  }

  async getDeploymentLogs(deploymentId) {
    // This would integrate with the Locus API to get logs
    // For now, return empty array
    return [];
  }

  getDeploymentContext(deploymentId) {
    const activeDeployment = this.activeDeployments.get(deploymentId);
    if (!activeDeployment) return {};

    return {
      stack: activeDeployment.plan.stack.primary,
      environment: 'production', // Default
      deploymentType: activeDeployment.plan.deploymentStrategy
    };
  }

  async cleanupFailedWorkflow(workflowId) {
    try {
      // Find deployment by workflow ID
      const deployment = Array.from(this.activeDeployments.values())
        .find(d => d.workflowId === workflowId);
      
      if (deployment) {
        await this.destroyDeployment(deployment.deployment.deploymentId);
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup failed workflow', { workflowId, error: error.message });
    }
  }

  generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class AgentOrchestrationError extends Error {
  constructor(message, workflowId, originalError) {
    super(message);
    this.name = 'AgentOrchestrationError';
    this.workflowId = workflowId;
    this.originalError = originalError;
  }
}

// Export all agents and orchestrator
export {
  AgentOrchestrator,
  PlannerAgent,
  DeployerAgent,
  AnalyzerAgent,
  MonitorAgent,
  // Errors
  AgentOrchestrationError,
  PlannerError,
  DeployerError,
  AnalyzerError,
  MonitorError
};

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new AgentOrchestrator({
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    },
    locusApiKey: process.env.LOCUS_API_KEY,
    logger: console
  });

  // Example deployment
  orchestrator.deploy('https://github.com/user/repo', {
    name: 'my-app',
    environment: 'production'
  }).then(result => {
    console.log('Deployment successful:', result);
  }).catch(error => {
    console.error('Deployment failed:', error.message);
  });
}