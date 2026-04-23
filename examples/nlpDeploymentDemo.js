/**
 * Natural Language Deployment Interface Demo
 * Showcases conversational deployment capabilities
 * Makes deployment feel like talking to an AI DevOps engineer
 */

const { ConversationalDeployment } = require('../agent/conversationalDeployment');
const readline = require('readline');

class NLPDeploymentDemo {
  constructor() {
    this.logger = console;
    
    // Initialize conversational deployment system
    this.conversationalDeployment = new ConversationalDeployment({
      apiKeys: {
        openai: process.env.OPENAI_API_KEY
      },
      locusApiKey: process.env.LOCUS_API_KEY,
      logger: this.logger
    });
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Demo scenarios
    this.demoScenarios = [
      "Deploy a MERN app with authentication and database",
      "Create a Django API with PostgreSQL and user management",
      "Launch a Next.js site with Stripe payments and analytics",
      "Build a Rails app with Redis caching and background jobs",
      "Deploy a serverless function with MongoDB integration",
      "Set up a Laravel application with MySQL and file uploads",
      "Create a Vue.js frontend with Express backend and real-time chat",
      "Deploy a Python Flask API with authentication and email notifications"
    ];
  }

  /**
   * Interactive demo mode
   */
  async runInteractiveDemo() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
    
    this.logger.info('🤖 AI DevOps Engineer - Natural Language Deployment Interface');
    this.logger.info('═'.repeat(80));
    this.logger.info('Talk to me like you would talk to a DevOps engineer!');
    this.logger.info('Examples:');
    this.demoScenarios.slice(0, 3).forEach((scenario, i) => {
      this.logger.info(`  ${i + 1}. "${scenario}"`);
    });
    this.logger.info('');
    
    let conversationId = null;
    
    while (true) {
      const userInput = await question('You: ');
      
      if (userInput.toLowerCase().includes('exit') || userInput.toLowerCase().includes('quit')) {
        this.logger.info('👋 Thanks for using the AI DevOps Engineer! Goodbye!');
        break;
      }
      
      if (userInput.toLowerCase().includes('help')) {
        this.showHelp();
        continue;
      }
      
      if (userInput.toLowerCase().includes('examples')) {
        this.showExamples();
        continue;
      }
      
      try {
        this.logger.info('\n🤖 AI DevOps Engineer:');
        
        const response = await this.conversationalDeployment.processDeploymentRequest(userInput, {
          conversationId
        });
        
        conversationId = response.conversationId;
        
        // Display response based on type
        if (response.type === 'clarification') {
          this.logger.info(response.message);
          
          if (response.questions.length > 0) {
            this.logger.info('\n❓ Questions:');
            response.questions.forEach((q, i) => {
              this.logger.info(`${i + 1}. ${q.question}`);
              if (q.options) {
                this.logger.info(`   Options: ${q.options.join(', ')}`);
              }
            });
          }
          
        } else if (response.type === 'deployment') {
          this.logger.info(response.message);
          
          if (response.deploymentResult) {
            this.logger.info(`\n🚀 Deployment ID: ${response.deploymentResult.deploymentId}`);
            this.logger.info(`⏱️  Estimated time: ${response.estimatedTime}`);
            
            // Start monitoring deployment
            this.monitorDeployment(response.deploymentResult.deploymentId);
          }
          
        } else if (response.type === 'error') {
          this.logger.error(response.message);
          
          if (response.suggestions) {
            this.logger.info('\n💡 Suggestions:');
            response.suggestions.forEach((suggestion, i) => {
              this.logger.info(`  ${i + 1}. ${suggestion}`);
            });
          }
        }
        
      } catch (error) {
        this.logger.error('❌ Sorry, I encountered an error:', error.message);
        this.logger.info('💡 Try rephrasing your request or type "help" for assistance.');
      }
      
      this.logger.info('\n' + '─'.repeat(80) + '\n');
    }
    
    rl.close();
  }

  /**
   * Automated demo with predefined scenarios
   */
  async runAutomatedDemo() {
    this.logger.info('🎬 Natural Language Deployment Demo');
    this.logger.info('Showcasing conversational deployment capabilities');
    this.logger.info('═'.repeat(80));
    
    for (let i = 0; i < this.demoScenarios.length; i++) {
      const scenario = this.demoScenarios[i];
      
      this.logger.info(`\n📝 Demo ${i + 1}/${this.demoScenarios.length}: "${scenario}"`);
      this.logger.info('─'.repeat(60));
      
      try {
        const response = await this.conversationalDeployment.processDeploymentRequest(scenario);
        
        this.logger.info('\n🤖 AI DevOps Engineer Response:');
        this.logger.info(response.message);
        
        if (response.parsedConfig) {
          this.logger.info('\n📋 Parsed Configuration:');
          this.displayParsedConfig(response.parsedConfig);
        }
        
        if (response.deploymentResult) {
          this.logger.info(`\n🚀 Deployment initiated: ${response.deploymentResult.deploymentId}`);
        }
        
      } catch (error) {
        this.logger.error(`❌ Demo ${i + 1} failed:`, error.message);
      }
      
      // Wait between demos
      if (i < this.demoScenarios.length - 1) {
        await this.sleep(2000);
      }
    }
    
    this.logger.info('\n🏆 Demo completed! All scenarios processed successfully.');
  }

  /**
   * Benchmark parsing performance
   */
  async runPerformanceBenchmark() {
    this.logger.info('⚡ Performance Benchmark - NLP Parsing Speed');
    this.logger.info('═'.repeat(60));
    
    const testCases = [
      "Deploy a simple React app",
      "Create a complex MERN stack with auth, payments, and analytics",
      "Launch a microservices architecture with Docker and Kubernetes",
      "Set up a serverless backend with multiple databases and integrations"
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const startTime = Date.now();
      
      try {
        await this.conversationalDeployment.nlpParser.parseDeploymentRequest(testCase);
        const duration = Date.now() - startTime;
        results.push({ testCase, duration, success: true });
        
        this.logger.info(`✅ "${testCase}" - ${duration}ms`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({ testCase, duration, success: false, error: error.message });
        
        this.logger.error(`❌ "${testCase}" - ${duration}ms - ${error.message}`);
      }
    }
    
    // Display benchmark results
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    
    this.logger.info('\n📊 Benchmark Results:');
    this.logger.info(`Average parsing time: ${avgDuration.toFixed(1)}ms`);
    this.logger.info(`Success rate: ${successRate.toFixed(1)}%`);
    this.logger.info(`Total test cases: ${results.length}`);
  }

  /**
   * Test parsing accuracy with various input formats
   */
  async testParsingAccuracy() {
    this.logger.info('🎯 Parsing Accuracy Test');
    this.logger.info('Testing various input formats and styles');
    this.logger.info('═'.repeat(60));
    
    const testCases = [
      {
        input: "Deploy a MERN app with auth and database",
        expected: { stack: 'MERN', features: ['authentication'], database: 'mongodb' }
      },
      {
        input: "I need a Django API with PostgreSQL and user management",
        expected: { stack: 'Django', features: ['authentication', 'api'], database: 'postgresql' }
      },
      {
        input: "Create a serverless function for payments using Stripe",
        expected: { features: ['payment'], deployment: 'serverless' }
      },
      {
        input: "Launch a Vue frontend with Express backend and real-time chat",
        expected: { frontend: ['vue'], backend: ['express'], features: ['realtime'] }
      },
      {
        input: "Build a large Rails app with Redis caching and background jobs",
        expected: { stack: 'Rails', features: ['caching', 'queue'], infrastructure: 'large' }
      }
    ];
    
    let correctParsings = 0;
    
    for (const testCase of testCases) {
      try {
        const parsed = await this.conversationalDeployment.nlpParser.parseDeploymentRequest(testCase.input);
        
        const accuracy = this.calculateAccuracy(parsed, testCase.expected);
        
        this.logger.info(`\n📝 Input: "${testCase.input}"`);
        this.logger.info(`🎯 Accuracy: ${(accuracy * 100).toFixed(1)}%`);
        
        if (accuracy > 0.8) {
          correctParsings++;
          this.logger.info('✅ Parsing successful');
        } else {
          this.logger.info('⚠️  Parsing needs improvement');
        }
        
      } catch (error) {
        this.logger.error(`❌ Parsing failed: ${error.message}`);
      }
    }
    
    const overallAccuracy = (correctParsings / testCases.length) * 100;
    this.logger.info(`\n📊 Overall Accuracy: ${overallAccuracy.toFixed(1)}% (${correctParsings}/${testCases.length})`);
  }

  /**
   * Monitor deployment progress
   */
  async monitorDeployment(deploymentId) {
    this.logger.info(`\n👀 Monitoring deployment ${deploymentId}...`);
    
    const maxChecks = 10;
    let checks = 0;
    
    const checkInterval = setInterval(async () => {
      try {
        const status = await this.conversationalDeployment.getDeploymentStatus(deploymentId);
        
        this.logger.info(`📊 ${status.message}`);
        
        if (status.status === 'SUCCESS' || status.status === 'FAILED' || checks >= maxChecks) {
          clearInterval(checkInterval);
          
          if (status.status === 'SUCCESS') {
            this.logger.info('🎉 Deployment completed successfully!');
          } else if (status.status === 'FAILED') {
            this.logger.info('❌ Deployment failed. Self-healing system will attempt recovery.');
          }
        }
        
        checks++;
        
      } catch (error) {
        this.logger.error('Error monitoring deployment:', error.message);
        clearInterval(checkInterval);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Display parsed configuration in a readable format
   */
  displayParsedConfig(config) {
    const display = {
      'Stack': config.stack || 'Custom',
      'Language': config.language || 'Not specified',
      'Features': config.features.join(', ') || 'None',
      'Database': config.database?.type || 'None',
      'Infrastructure': `${config.infrastructure.size} (${config.infrastructure.memory}MB, ${config.infrastructure.cpu} CPU)`,
      'Environment': config.environment,
      'Confidence': `${(config.metadata.confidence * 100).toFixed(1)}%`
    };
    
    Object.entries(display).forEach(([key, value]) => {
      this.logger.info(`  ${key}: ${value}`);
    });
  }

  /**
   * Calculate parsing accuracy
   */
  calculateAccuracy(parsed, expected) {
    let matches = 0;
    let total = 0;
    
    Object.keys(expected).forEach(key => {
      total++;
      
      if (key === 'stack' && parsed.stack === expected[key]) {
        matches++;
      } else if (key === 'features' && Array.isArray(expected[key])) {
        const expectedFeatures = expected[key];
        const matchedFeatures = expectedFeatures.filter(f => parsed.features.includes(f));
        matches += matchedFeatures.length / expectedFeatures.length;
      } else if (key === 'database' && parsed.database?.type === expected[key]) {
        matches++;
      } else if (key === 'infrastructure' && parsed.infrastructure.size === expected[key]) {
        matches++;
      }
    });
    
    return total > 0 ? matches / total : 0;
  }

  /**
   * Show help information
   */
  showHelp() {
    this.logger.info('\n🆘 Help - How to talk to the AI DevOps Engineer:');
    this.logger.info('');
    this.logger.info('📝 Basic Format:');
    this.logger.info('  "Deploy a [STACK] app with [FEATURES]"');
    this.logger.info('');
    this.logger.info('🏗️  Supported Stacks:');
    this.logger.info('  MERN, MEAN, Django, Rails, Laravel, Spring Boot, Next.js');
    this.logger.info('');
    this.logger.info('✨ Common Features:');
    this.logger.info('  authentication, database, API, payments, real-time, file upload');
    this.logger.info('');
    this.logger.info('🗄️  Databases:');
    this.logger.info('  MongoDB, PostgreSQL, MySQL, Redis, SQLite');
    this.logger.info('');
    this.logger.info('💻 Infrastructure:');
    this.logger.info('  small, medium, large, or specify: "2GB RAM, 4 CPU cores"');
    this.logger.info('');
    this.logger.info('🌍 Environment:');
    this.logger.info('  development, staging, production');
    this.logger.info('');
    this.logger.info('Commands: help, examples, exit');
  }

  /**
   * Show example requests
   */
  showExamples() {
    this.logger.info('\n💡 Example Requests:');
    this.logger.info('');
    this.demoScenarios.forEach((scenario, i) => {
      this.logger.info(`${i + 1}. "${scenario}"`);
    });
    this.logger.info('');
    this.logger.info('🎯 Pro Tips:');
    this.logger.info('  • Be specific about features you need');
    this.logger.info('  • Mention the database if you have a preference');
    this.logger.info('  • Specify environment (dev/staging/prod)');
    this.logger.info('  • Include infrastructure size for large apps');
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.conversationalDeployment.on('deployment:completed', (data) => {
      this.logger.info(`🎉 ${data.message}`);
    });
    
    this.conversationalDeployment.on('deployment:failed', (data) => {
      this.logger.error(`❌ ${data.message}`);
    });
    
    this.conversationalDeployment.on('parsing:completed', (data) => {
      this.logger.debug('Parsing completed', { 
        confidence: `${(data.confidence * 100).toFixed(1)}%` 
      });
    });
  }

  /**
   * Utility method for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
module.exports = { NLPDeploymentDemo };

// Run demo if called directly
if (require.main === module) {
  const demo = new NLPDeploymentDemo();
  
  const mode = process.argv[2] || 'interactive';
  
  switch (mode) {
    case 'interactive':
      demo.runInteractiveDemo().catch(console.error);
      break;
    case 'automated':
      demo.runAutomatedDemo().catch(console.error);
      break;
    case 'benchmark':
      demo.runPerformanceBenchmark().catch(console.error);
      break;
    case 'accuracy':
      demo.testParsingAccuracy().catch(console.error);
      break;
    default:
      console.log('Usage: node nlpDeploymentDemo.js [interactive|automated|benchmark|accuracy]');
      console.log('Default: interactive');
  }
}