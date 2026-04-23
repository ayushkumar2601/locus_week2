/**
 * Self-Healing Deployment System Demo
 * Demonstrates the "WOW factor" - intelligent autonomous recovery
 */

const { AgentOrchestrator } = require('../agent/index');
const { SelfHealingSystem } = require('../agent/selfHealer');
const { LocusService } = require('../services/locusService');

class SelfHealingDemo {
  constructor() {
    this.logger = console;
    
    // Initialize the orchestrator with self-healing enabled
    this.orchestrator = new AgentOrchestrator({
      apiKeys: {
        openai: process.env.OPENAI_API_KEY
      },
      locusApiKey: process.env.LOCUS_API_KEY,
      autoRecovery: true,
      logger: this.logger
    });
    
    // Set up demo event handlers
    this.setupEventHandlers();
  }

  /**
   * Demo 1: Dependency Issue Self-Healing
   * Simulates a deployment failure due to missing dependency
   */
  async demoDependencyHealing() {
    this.logger.info('🚀 DEMO 1: Dependency Issue Self-Healing');
    this.logger.info('Deploying application with missing dependency...');
    
    try {
      // Deploy an application that will fail due to missing dependency
      const result = await this.orchestrator.deploy('https://github.com/demo/broken-deps-app', {
        name: 'demo-dependency-healing',
        environment: 'development'
      });
      
      this.logger.info('Initial deployment result:', result);
      
      // Simulate deployment failure detection
      setTimeout(() => {
        this.simulateDeploymentFailure(result.deploymentId, 'dependency_missing');
      }, 5000);
      
      return result;
      
    } catch (error) {
      this.logger.error('Demo 1 failed:', error.message);
      throw error;
    }
  }

  /**
   * Demo 2: Port Conflict Self-Healing
   * Simulates a deployment failure due to port conflict
   */
  async demoPortConflictHealing() {
    this.logger.info('🚀 DEMO 2: Port Conflict Self-Healing');
    this.logger.info('Deploying application with port conflict...');
    
    try {
      const result = await this.orchestrator.deploy('https://github.com/demo/port-conflict-app', {
        name: 'demo-port-healing',
        environment: 'development'
      });
      
      // Simulate port conflict failure
      setTimeout(() => {
        this.simulateDeploymentFailure(result.deploymentId, 'port_conflict');
      }, 3000);
      
      return result;
      
    } catch (error) {
      this.logger.error('Demo 2 failed:', error.message);
      throw error;
    }
  }

  /**
   * Demo 3: Memory Issue Self-Healing
   * Simulates a deployment failure due to insufficient memory
   */
  async demoMemoryHealing() {
    this.logger.info('🚀 DEMO 3: Memory Issue Self-Healing');
    this.logger.info('Deploying memory-intensive application...');
    
    try {
      const result = await this.orchestrator.deploy('https://github.com/demo/memory-heavy-app', {
        name: 'demo-memory-healing',
        environment: 'development'
      });
      
      // Simulate memory exhaustion failure
      setTimeout(() => {
        this.simulateDeploymentFailure(result.deploymentId, 'memory_exhausted');
      }, 7000);
      
      return result;
      
    } catch (error) {
      this.logger.error('Demo 3 failed:', error.message);
      throw error;
    }
  }

  /**
   * Demo 4: Build Error Self-Healing
   * Simulates a deployment failure due to build configuration issues
   */
  async demoBuildErrorHealing() {
    this.logger.info('🚀 DEMO 4: Build Error Self-Healing');
    this.logger.info('Deploying application with build configuration issues...');
    
    try {
      const result = await this.orchestrator.deploy('https://github.com/demo/build-error-app', {
        name: 'demo-build-healing',
        environment: 'development'
      });
      
      // Simulate build failure
      setTimeout(() => {
        this.simulateDeploymentFailure(result.deploymentId, 'build_failed');
      }, 4000);
      
      return result;
      
    } catch (error) {
      this.logger.error('Demo 4 failed:', error.message);
      throw error;
    }
  }

  /**
   * Simulate deployment failure for demo purposes
   */
  async simulateDeploymentFailure(deploymentId, failureType) {
    this.logger.warn(`❌ Simulating ${failureType} failure for deployment ${deploymentId}`);
    
    const failureScenarios = {
      dependency_missing: {
        logs: [
          { level: 'error', message: 'npm ERR! 404 Not Found - GET https://registry.npmjs.org/missing-package', timestamp: new Date().toISOString() },
          { level: 'error', message: 'npm ERR! 404  \'missing-package@^1.0.0\' is not in the npm registry.', timestamp: new Date().toISOString() },
          { level: 'error', message: 'Module not found: Error: Can\'t resolve \'missing-package\'', timestamp: new Date().toISOString() }
        ],
        status: 'FAILED',
        error: 'Build failed due to missing dependency'
      },
      
      port_conflict: {
        logs: [
          { level: 'error', message: 'Error: listen EADDRINUSE: address already in use :::3000', timestamp: new Date().toISOString() },
          { level: 'error', message: 'Port 3000 is already in use', timestamp: new Date().toISOString() },
          { level: 'error', message: 'Application failed to start', timestamp: new Date().toISOString() }
        ],
        status: 'FAILED',
        error: 'Port conflict detected'
      },
      
      memory_exhausted: {
        logs: [
          { level: 'error', message: 'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory', timestamp: new Date().toISOString() },
          { level: 'error', message: 'Out of memory: Kill process 1234 (node) score 900 or sacrifice child', timestamp: new Date().toISOString() },
          { level: 'error', message: 'Process exited with code 137 (SIGKILL)', timestamp: new Date().toISOString() }
        ],
        status: 'FAILED',
        error: 'Memory exhaustion'
      },
      
      build_failed: {
        logs: [
          { level: 'error', message: 'TypeScript error in src/app.ts(15,23): Property \'nonExistentProperty\' does not exist on type \'Request\'', timestamp: new Date().toISOString() },
          { level: 'error', message: 'Build failed with 1 error', timestamp: new Date().toISOString() },
          { level: 'error', message: 'npm run build exited with code 1', timestamp: new Date().toISOString() }
        ],
        status: 'FAILED',
        error: 'Build compilation failed'
      }
    };
    
    const scenario = failureScenarios[failureType];
    if (!scenario) {
      this.logger.error('Unknown failure type:', failureType);
      return;
    }
    
    // Emit failure event to trigger self-healing
    this.orchestrator.monitor.emit('deployment:failed', {
      deploymentId,
      error: scenario.error,
      logs: scenario.logs,
      status: scenario.status,
      stage: 'runtime',
      timestamp: Date.now()
    });
  }

  /**
   * Setup event handlers to demonstrate self-healing process
   */
  setupEventHandlers() {
    // Self-healing analysis events
    this.orchestrator.monitor.on('self_healing:analysis_complete', (data) => {
      this.logger.info('🔍 ANALYSIS COMPLETE:', {
        deploymentId: data.deploymentId,
        failureType: data.failureType,
        confidence: `${(data.confidence * 100).toFixed(1)}%`,
        errorsFound: data.logAnalysis.totalErrors,
        fixableIssues: data.configAnalysis.fixable
      });
    });
    
    // Self-healing completion events
    this.orchestrator.monitor.on('self_healing:completed', (data) => {
      if (data.success) {
        this.logger.info('✅ SELF-HEALING SUCCESSFUL:', {
          deploymentId: data.deploymentId,
          appliedFix: data.appliedFix.description,
          healingTime: `${(data.healingTime / 1000).toFixed(1)}s`,
          newDeploymentId: data.redeployResult.deploymentId
        });
        
        this.logger.info('🎉 WOW FACTOR DEMONSTRATED: Autonomous recovery completed!');
      } else {
        this.logger.error('❌ SELF-HEALING FAILED:', {
          deploymentId: data.deploymentId,
          reason: data.message,
          healingTime: `${(data.healingTime / 1000).toFixed(1)}s`
        });
      }
    });
    
    // Recovery events
    this.orchestrator.monitor.on('recovery:self_healed', (data) => {
      this.logger.info('🔄 RECOVERY COMPLETED:', {
        deploymentId: data.deploymentId,
        method: 'self-healing',
        success: data.healingResult.success
      });
    });
    
    // Deployment events
    this.orchestrator.on('workflow:completed', (data) => {
      this.logger.info('📦 DEPLOYMENT COMPLETED:', {
        workflowId: data.workflowId,
        deploymentId: data.result.deploymentId,
        status: data.result.status
      });
    });
    
    this.orchestrator.on('workflow:failed', (data) => {
      this.logger.error('💥 DEPLOYMENT FAILED:', {
        workflowId: data.workflowId,
        error: data.error
      });
    });
  }

  /**
   * Run comprehensive self-healing demo
   */
  async runFullDemo() {
    this.logger.info('🎬 Starting Self-Healing Deployment System Demo');
    this.logger.info('This demo showcases the "WOW factor" - intelligent autonomous recovery');
    this.logger.info('═'.repeat(80));
    
    try {
      // Demo 1: Dependency healing
      await this.demoDependencyHealing();
      await this.sleep(15000); // Wait for healing to complete
      
      this.logger.info('─'.repeat(80));
      
      // Demo 2: Port conflict healing
      await this.demoPortConflictHealing();
      await this.sleep(10000);
      
      this.logger.info('─'.repeat(80));
      
      // Demo 3: Memory healing
      await this.demoMemoryHealing();
      await this.sleep(12000);
      
      this.logger.info('─'.repeat(80));
      
      // Demo 4: Build error healing
      await demoBuildErrorHealing();
      await this.sleep(10000);
      
      this.logger.info('═'.repeat(80));
      this.logger.info('🏆 DEMO COMPLETED: Self-Healing System demonstrated successfully!');
      
      // Show healing statistics
      const stats = this.orchestrator.monitor.getSelfHealingStats();
      this.logger.info('📊 HEALING STATISTICS:', stats);
      
    } catch (error) {
      this.logger.error('Demo failed:', error.message);
      throw error;
    }
  }

  /**
   * Interactive demo mode
   */
  async runInteractiveDemo() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    
    this.logger.info('🎮 Interactive Self-Healing Demo');
    this.logger.info('Choose a failure scenario to demonstrate:');
    this.logger.info('1. Dependency Issue');
    this.logger.info('2. Port Conflict');
    this.logger.info('3. Memory Exhaustion');
    this.logger.info('4. Build Error');
    this.logger.info('5. Run All Scenarios');
    
    const choice = await question('Enter your choice (1-5): ');
    
    switch (choice) {
      case '1':
        await this.demoDependencyHealing();
        break;
      case '2':
        await this.demoPortConflictHealing();
        break;
      case '3':
        await this.demoMemoryHealing();
        break;
      case '4':
        await this.demoBuildErrorHealing();
        break;
      case '5':
        await this.runFullDemo();
        break;
      default:
        this.logger.info('Invalid choice. Running dependency healing demo...');
        await this.demoDependencyHealing();
    }
    
    rl.close();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
module.exports = { SelfHealingDemo };

// Run demo if called directly
if (require.main === module) {
  const demo = new SelfHealingDemo();
  
  // Check if interactive mode is requested
  const isInteractive = process.argv.includes('--interactive');
  
  if (isInteractive) {
    demo.runInteractiveDemo().catch(console.error);
  } else {
    demo.runFullDemo().catch(console.error);
  }
}