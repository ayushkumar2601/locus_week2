/**
 * Agent Brain Demo
 * Demonstrates the central AI agent loop functionality
 * Shows observe → think → decide → act → reflect cycle
 */

import { AgentBrain } from '../agent/brain.js';

class AgentBrainDemo {
  constructor() {
    this.logger = console;
    
    // Initialize Agent Brain with demo configuration
    this.brain = new AgentBrain({
      logger: this.logger,
      loopInterval: 3000, // 3 seconds for demo
      maxConcurrentActions: 2,
      // Mock AI provider for demo
      aiProvider: {
        analyze: async (options) => {
          // Simulate AI thinking
          await new Promise(resolve => setTimeout(resolve, 500));
          return JSON.stringify([
            "System appears to be operating normally",
            "No critical issues detected in current observation",
            "Continuing monitoring for deployment requests and system changes"
          ]);
        }
      }
    });
    
    // Setup event listeners for demonstration
    this.setupEventListeners();
  }

  /**
   * Setup event listeners to show brain activity
   */
  setupEventListeners() {
    this.brain.on('brain:started', () => {
      this.logger.info('🧠 Agent Brain started - Beginning continuous cognitive loop');
    });

    this.brain.on('brain:observation', (observation) => {
      this.logger.info('👁️  OBSERVE:', {
        deployments: observation.deployments.length,
        errors: observation.errors.length,
        userInputs: observation.userInputs.length,
        systemHealth: observation.systemHealth.status
      });
    });

    this.brain.on('brain:thought', (thought) => {
      this.logger.info('🤔 THINK:', {
        reasoning: thought.reasoning.slice(0, 2), // Show first 2 reasoning steps
        confidence: thought.confidence,
        priority: thought.priority
      });
    });

    this.brain.on('brain:decision', (decision) => {
      this.logger.info('🎯 DECIDE:', {
        actions: decision.actions.map(a => a.type),
        priority: decision.priority,
        confidence: decision.confidence
      });
    });

    this.brain.on('brain:action', (actionResult) => {
      this.logger.info('⚡ ACT:', {
        totalActions: actionResult.totalActions,
        successful: actionResult.successfulActions,
        duration: `${actionResult.actionTime}ms`
      });
    });

    this.brain.on('brain:reflection', (reflection) => {
      this.logger.info('🔄 REFLECT:', {
        cycleTime: `${reflection.performance.cycleTime}ms`,
        successRate: `${reflection.outcomes.successRate.toFixed(1)}%`,
        learningPoints: reflection.learning.length
      });
    });

    this.brain.on('brain:error', (error) => {
      this.logger.error('🚨 Brain Error:', error.message);
    });

    this.brain.on('brain:stopped', () => {
      this.logger.info('🛑 Agent Brain stopped');
    });
  }

  /**
   * Run interactive demo
   */
  async runDemo() {
    this.logger.info('🎬 Agent Brain Demo Starting');
    this.logger.info('═'.repeat(60));
    this.logger.info('This demo shows the continuous AI agent loop:');
    this.logger.info('observe → think → decide → act → reflect');
    this.logger.info('');
    this.logger.info('The brain will run for 30 seconds, then stop automatically.');
    this.logger.info('Watch the cognitive cycle in action!');
    this.logger.info('═'.repeat(60));

    // Start the brain
    await this.brain.startAgentLoop();

    // Let it run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Stop the brain
    await this.brain.stopAgentLoop();

    this.logger.info('');
    this.logger.info('🏆 Demo completed! The Agent Brain successfully demonstrated:');
    this.logger.info('✅ Continuous observation of system state');
    this.logger.info('✅ AI-powered reasoning and decision making');
    this.logger.info('✅ Autonomous action execution');
    this.logger.info('✅ Learning and reflection from results');
    this.logger.info('✅ Event-driven architecture with real-time updates');
  }

  /**
   * Simulate system activity for more interesting demo
   */
  async simulateActivity() {
    this.logger.info('🎭 Simulating system activity for demonstration...');

    // Simulate some deployments
    this.brain.systemState.deployments.set('demo-app-1', {
      id: 'demo-app-1',
      name: 'demo-react-app',
      status: 'running',
      health: 'healthy'
    });

    this.brain.systemState.deployments.set('demo-app-2', {
      id: 'demo-app-2',
      name: 'demo-api-server',
      status: 'failed',
      health: 'unhealthy'
    });

    // Simulate some user inputs
    this.brain.systemState.userInputs.push({
      id: 'nlp-1',
      type: 'nlp',
      message: 'Deploy a MERN app with authentication',
      timestamp: Date.now(),
      processed: false
    });

    this.brain.systemState.userInputs.push({
      id: 'github-1',
      type: 'github',
      data: { event: 'push', repository: 'user/repo' },
      timestamp: Date.now(),
      processed: false
    });

    // Simulate some errors
    this.brain.systemState.errors.push({
      id: 'error-1',
      message: 'Database connection timeout',
      severity: 'warning',
      timestamp: Date.now()
    });

    this.brain.systemState.errors.push({
      id: 'error-2',
      message: 'Critical memory leak detected',
      severity: 'critical',
      timestamp: Date.now()
    });

    this.logger.info('✅ System activity simulated - Brain should detect and respond');
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark() {
    this.logger.info('⚡ Agent Brain Performance Benchmark');
    this.logger.info('═'.repeat(50));

    const cycles = 5;
    const results = [];

    for (let i = 0; i < cycles; i++) {
      const cycleStart = Date.now();
      
      // Run one complete cycle manually
      const observation = await this.brain.observe();
      const thought = await this.brain.think(observation);
      const decision = await this.brain.decide(thought);
      const actionResult = await this.brain.act(decision);
      const reflection = await this.brain.reflect({
        observation,
        thought,
        decision,
        result: actionResult,
        cycleTime: Date.now() - cycleStart
      });

      results.push({
        cycle: i + 1,
        totalTime: Date.now() - cycleStart,
        observeTime: observation.timestamp - cycleStart,
        thinkTime: thought.thinkingTime,
        decideTime: decision.decisionTime,
        actTime: actionResult.actionTime,
        reflectTime: reflection.reflectionTime
      });

      this.logger.info(`Cycle ${i + 1}/${cycles} completed in ${Date.now() - cycleStart}ms`);
    }

    // Calculate averages
    const avgTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
    const avgThinkTime = results.reduce((sum, r) => sum + r.thinkTime, 0) / results.length;
    const avgDecideTime = results.reduce((sum, r) => sum + r.decideTime, 0) / results.length;
    const avgActTime = results.reduce((sum, r) => sum + r.actTime, 0) / results.length;

    this.logger.info('');
    this.logger.info('📊 Benchmark Results:');
    this.logger.info(`Average Total Cycle Time: ${avgTotalTime.toFixed(1)}ms`);
    this.logger.info(`Average Think Time: ${avgThinkTime.toFixed(1)}ms`);
    this.logger.info(`Average Decide Time: ${avgDecideTime.toFixed(1)}ms`);
    this.logger.info(`Average Act Time: ${avgActTime.toFixed(1)}ms`);
    this.logger.info(`Cycles per Second: ${(1000 / avgTotalTime).toFixed(2)}`);
  }
}

// Export for use in other modules
export { AgentBrainDemo };

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new AgentBrainDemo();
  
  const mode = process.argv[2] || 'demo';
  
  switch (mode) {
    case 'demo':
      demo.simulateActivity().then(() => demo.runDemo()).catch(console.error);
      break;
    case 'benchmark':
      demo.runBenchmark().catch(console.error);
      break;
    case 'activity':
      demo.simulateActivity().catch(console.error);
      break;
    default:
      console.log('Usage: node agentBrainDemo.js [demo|benchmark|activity]');
      console.log('Default: demo');
  }
}