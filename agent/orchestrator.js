/**
 * System Orchestrator - Central coordination of all agents
 * Connects Brain, Planner, Deployer, Monitor, Analyzer, and Self-Healer
 */

import { EventEmitter } from 'events';
import { AgentBrain } from './brain.js';
import { PlannerAgent } from './planner.js';
import { DeployerAgent } from './deployer.js';
import { MonitorAgent } from './monitor.js';
import { AnalyzerAgent } from './analyzer.js';
import { SelfHealingSystem } from './selfHealer.js';
import { AgentMemory } from './memory.js';
import { LocusService } from '../services/locusService.js';

export class SystemOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    
    // Initialize shared services
    this.locusService = new LocusService({
      apiKey: options.locusApiKey || process.env.LOCUS_API_KEY,
      baseUrl: options.locusApiUrl || process.env.LOCUS_API_URL,
      logger: this.logger
    });
    
    this.memory = new AgentMemory({ logger: this.logger });
    
    // Initialize all agents with proper dependencies
    this.initializeAgents(options);
    
    // Connect agent events
    this.connectAgentEvents();
    
    this.logger.info('🎯 System Orchestrator initialized - All agents connected');
  }

  /**
   * Initialize all agents with proper dependency injection
   */
  initializeAgents(options) {
    // Initialize Analyzer first (no dependencies)
    this.analyzer = new AnalyzerAgent({
      logger: this.logger,
      locusApiKey: options.locusApiKey,
      locusApiUrl: options.locusApiUrl,
      aiProvider: options.aiProvider
    });

    // Initialize Monitor (depends on Analyzer)
    this.monitor = new MonitorAgent({
      logger: this.logger,
      locusApiKey: options.locusApiKey,
      locusApiUrl: options.locusApiUrl,
      analyzer: this.analyzer
    });

    // Initialize Deployer (no dependencies)
    this.deployer = new DeployerAgent({
      logger: this.logger,
      locusApiKey: options.locusApiKey,
      locusApiUrl: options.locusApiUrl
    });

    // Initialize Self-Healer (depends on Locus service)
    this.selfHealer = new SelfHealingSystem({
      logger: this.logger,
      locusService: this.locusService,
      aiProvider: options.aiProvider
    });

    // Initialize Planner (depends on Memory and Deployer)
    this.planner = new PlannerAgent({
      logger: this.logger,
      memory: this.memory,
      deployer: this.deployer,
      aiProvider: options.aiProvider
    });

    // Initialize Brain (depends on all other agents)
    this.brain = new AgentBrain({
      logger: this.logger,
      planner: this.planner,
      deployer: this.deployer,
      analyzer: this.analyzer,
      monitor: this.monitor,
      selfHealer: this.selfHealer,
      locusApiKey: options.locusApiKey,
      locusApiUrl: options.locusApiUrl,
      aiProvider: options.aiProvider
    });
  }

  /**
   * Connect agent events for coordination
   */
  connectAgentEvents() {
    // Brain events
    this.brain.on('brain:started', () => {
      this.logger.info('🧠 Agent Brain started');
      this.emit('system:ready');
    });

    this.brain.on('brain:error', (error) => {
      this.logger.error('🧠 Agent Brain error:', error);
      this.emit('system:error', { source: 'brain', error });
    });

    // Deployment events
    this.deployer.on('deployment:started', (deployment) => {
      this.logger.info('🚀 Deployment started:', deployment.deploymentId);
      
      // Start monitoring the new deployment
      this.monitor.startMonitoring(deployment.deploymentId, {
        name: deployment.name || deployment.deploymentId
      });
      
      this.emit('deployment:started', deployment);
    });

    this.deployer.on('deployment:completed', (deployment) => {
      this.logger.info('✅ Deployment completed:', deployment.deploymentId);
      this.emit('deployment:completed', deployment);
    });

    this.deployer.on('deployment:error', (error) => {
      this.logger.error('❌ Deployment error:', error);
      
      // Trigger self-healing for failed deployments
      if (error.deploymentId) {
        this.triggerSelfHealing(error.deploymentId, error);
      }
      
      this.emit('deployment:error', error);
    });

    // Monitoring events
    this.monitor.on('alerts:triggered', (alert) => {
      this.logger.warn('🚨 Alert triggered:', alert);
      
      // Trigger analysis for alerts
      this.analyzer.analyze(alert.deploymentId, null, { 
        trigger: 'alert', 
        alert: alert.alerts 
      });
      
      this.emit('alert:triggered', alert);
    });

    this.monitor.on('health:error', (healthError) => {
      this.logger.error('💔 Health check failed:', healthError);
      
      // Trigger self-healing for health failures
      this.triggerSelfHealing(healthError.deploymentId, {
        type: 'health_check_failure',
        error: healthError.error
      });
      
      this.emit('health:error', healthError);
    });

    // Analysis events
    this.analyzer.on('analysis:completed', (analysis) => {
      this.logger.info('🔍 Analysis completed:', {
        deploymentId: analysis.deploymentId,
        errorsFound: analysis.errorsFound,
        recommendations: analysis.recommendationsCount
      });
      
      this.emit('analysis:completed', analysis);
    });

    // Self-healing events
    this.selfHealer.on('healing:completed', (healing) => {
      this.logger.info('🔧 Self-healing completed:', {
        deploymentId: healing.deploymentId,
        success: healing.success
      });
      
      this.emit('healing:completed', healing);
    });

    // Planning events
    this.planner.on('plan:created', (plan) => {
      this.logger.info('📋 Plan created:', {
        planId: plan.planId,
        confidence: plan.confidence
      });
      
      this.emit('plan:created', plan);
    });

    this.planner.on('plan:executed', (execution) => {
      this.logger.info('⚡ Plan executed:', {
        planId: execution.planId,
        deploymentId: execution.deploymentId,
        success: execution.success
      });
      
      this.emit('plan:executed', execution);
    });
  }

  /**
   * Start the entire system
   */
  async startSystem() {
    try {
      this.logger.info('🚀 Starting autonomous deployment system...');
      
      // Start the Agent Brain (which starts the cognitive loop)
      await this.brain.startAgentLoop();
      
      this.logger.info('✅ System started successfully');
      return { status: 'started', timestamp: Date.now() };
      
    } catch (error) {
      this.logger.error('❌ Failed to start system:', error);
      throw error;
    }
  }

  /**
   * Stop the entire system
   */
  async stopSystem() {
    try {
      this.logger.info('🛑 Stopping autonomous deployment system...');
      
      // Stop the Agent Brain
      await this.brain.stopAgentLoop();
      
      // Stop monitoring for all deployments
      const activeDeployments = await this.monitor.listActiveDeployments();
      for (const deployment of activeDeployments) {
        await this.monitor.stopMonitoring(deployment.id);
      }
      
      this.logger.info('✅ System stopped successfully');
      return { status: 'stopped', timestamp: Date.now() };
      
    } catch (error) {
      this.logger.error('❌ Failed to stop system:', error);
      throw error;
    }
  }

  /**
   * Process deployment request through the full pipeline
   */
  async processDeploymentRequest(request) {
    try {
      this.logger.info('📥 Processing deployment request:', request);
      
      // 1. Create deployment plan
      const plan = await this.planner.plan(request);
      
      // 2. Execute the plan
      const deployment = await this.planner.executePlan(plan, {
        name: request.name || plan.repoId,
        repository: request.repository,
        environment: request.environment || 'production'
      });
      
      // 3. Start monitoring
      await this.monitor.startMonitoring(deployment.deploymentId, {
        name: deployment.name || deployment.deploymentId,
        planId: plan.id
      });
      
      return {
        success: true,
        planId: plan.id,
        deploymentId: deployment.deploymentId,
        status: deployment.status,
        endpoints: deployment.endpoints,
        estimatedTime: plan.estimatedTime || '5-10 minutes'
      };
      
    } catch (error) {
      this.logger.error('❌ Deployment request processing failed:', error);
      throw error;
    }
  }

  /**
   * Trigger self-healing for a failed deployment
   */
  async triggerSelfHealing(deploymentId, failureContext) {
    try {
      this.logger.info('🔧 Triggering self-healing:', { deploymentId, failureContext });
      
      const healingResult = await this.selfHealer.healDeployment(deploymentId, failureContext);
      
      if (healingResult.success) {
        this.logger.info('✅ Self-healing successful:', deploymentId);
        
        // Start monitoring the healed deployment
        if (healingResult.deploymentId !== deploymentId) {
          await this.monitor.startMonitoring(healingResult.deploymentId);
        }
      } else {
        this.logger.warn('⚠️ Self-healing failed:', healingResult.message);
      }
      
      return healingResult;
      
    } catch (error) {
      this.logger.error('❌ Self-healing trigger failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    try {
      const [
        brainHealth,
        activeDeployments,
        systemMemory,
        locusStatus
      ] = await Promise.all([
        this.brain.performHealthCheck(),
        this.monitor.listActiveDeployments(),
        this.memory.getStats(),
        this.checkLocusConnection()
      ]);
      
      return {
        overall: brainHealth.overall,
        components: {
          brain: brainHealth.overall,
          planner: this.planner ? 'healthy' : 'missing',
          deployer: this.deployer ? 'healthy' : 'missing',
          monitor: this.monitor ? 'healthy' : 'missing',
          analyzer: this.analyzer ? 'healthy' : 'missing',
          selfHealer: this.selfHealer ? 'healthy' : 'missing',
          memory: systemMemory ? 'healthy' : 'missing',
          locus: locusStatus
        },
        activeDeployments: activeDeployments.length,
        memoryStats: systemMemory,
        timestamp: Date.now()
      };
      
    } catch (error) {
      this.logger.error('Failed to get system status:', error);
      return {
        overall: 'error',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get deployment status through the system
   */
  async getDeploymentStatus(deploymentId) {
    try {
      const [
        monitorStatus,
        analysisInsights
      ] = await Promise.all([
        this.monitor.getDeploymentStatus(deploymentId),
        this.analyzer.getDeploymentInsights(deploymentId).catch(() => null)
      ]);
      
      return {
        ...monitorStatus,
        insights: analysisInsights,
        systemManaged: true
      };
      
    } catch (error) {
      this.logger.error('Failed to get deployment status:', error);
      throw error;
    }
  }

  /**
   * List all deployments managed by the system
   */
  async listManagedDeployments() {
    try {
      const activeDeployments = await this.monitor.listActiveDeployments();
      
      const deployments = await Promise.all(
        activeDeployments.map(async (deployment) => {
          try {
            const insights = await this.analyzer.getDeploymentInsights(deployment.id);
            return {
              ...deployment,
              insights: insights.insights,
              recommendations: insights.actionableRecommendations.length
            };
          } catch (error) {
            return {
              ...deployment,
              insights: null,
              recommendations: 0
            };
          }
        })
      );
      
      return deployments;
      
    } catch (error) {
      this.logger.error('Failed to list managed deployments:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Check Locus API connection
   */
  async checkLocusConnection() {
    try {
      // Try a simple API call to check connection
      await this.locusService.validateDeploymentConfig({
        name: 'health-check',
        repository: { url: 'https://github.com/test/test' }
      });
      return 'healthy';
    } catch (error) {
      this.logger.warn('Locus connection check failed:', error.message);
      return 'unhealthy';
    }
  }

  /**
   * Get orchestrator instance for external use
   */
  static getInstance(options = {}) {
    if (!SystemOrchestrator._instance) {
      SystemOrchestrator._instance = new SystemOrchestrator(options);
    }
    return SystemOrchestrator._instance;
  }
}

// Export singleton instance
export default SystemOrchestrator;