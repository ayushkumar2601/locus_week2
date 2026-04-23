/**
 * NLP Integration Test
 * Tests the complete Natural Language Deployment pipeline
 * From API endpoints to frontend integration
 */

import axios from 'axios';

class NLPIntegrationTest {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.logger = console;
  }

  /**
   * Run complete integration test suite
   */
  async runTests() {
    this.logger.info('🧪 NLP Integration Test Suite');
    this.logger.info('═'.repeat(60));
    
    const tests = [
      { name: 'Health Check', test: () => this.testHealthCheck() },
      { name: 'Parse Only', test: () => this.testParseOnly() },
      { name: 'Deploy Request', test: () => this.testDeployRequest() },
      { name: 'Clarification Flow', test: () => this.testClarificationFlow() },
      { name: 'Examples Endpoint', test: () => this.testExamplesEndpoint() },
      { name: 'Error Handling', test: () => this.testErrorHandling() }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const { name, test } of tests) {
      try {
        this.logger.info(`\n🔍 Testing: ${name}`);
        await test();
        this.logger.info(`✅ ${name} - PASSED`);
        passed++;
      } catch (error) {
        this.logger.error(`❌ ${name} - FAILED: ${error.message}`);
        failed++;
      }
    }
    
    this.logger.info('\n📊 Test Results:');
    this.logger.info(`✅ Passed: ${passed}`);
    this.logger.info(`❌ Failed: ${failed}`);
    this.logger.info(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    return { passed, failed };
  }

  /**
   * Test health check endpoint
   */
  async testHealthCheck() {
    const response = await axios.get(`${this.baseUrl}/api/nlp/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || data.status !== 'healthy') {
      throw new Error('Health check failed');
    }
    
    this.logger.info('  ✓ Health endpoint responding');
    this.logger.info(`  ✓ Service: ${data.service}`);
    this.logger.info(`  ✓ Features: ${Object.keys(data.features).join(', ')}`);
  }

  /**
   * Test parse-only endpoint
   */
  async testParseOnly() {
    const testMessage = "Deploy a MERN app with authentication and database";
    
    const response = await axios.post(`${this.baseUrl}/api/nlp/parse`, {
      message: testMessage
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success) {
      throw new Error('Parse request failed');
    }
    
    if (!data.parsedConfig) {
      throw new Error('No parsed configuration returned');
    }
    
    this.logger.info('  ✓ Parse endpoint working');
    this.logger.info(`  ✓ Stack detected: ${data.parsedConfig.stack}`);
    this.logger.info(`  ✓ Features: ${data.parsedConfig.features.join(', ')}`);
    this.logger.info(`  ✓ Confidence: ${(data.confidence * 100).toFixed(1)}%`);
  }

  /**
   * Test deployment request
   */
  async testDeployRequest() {
    const testMessage = "Deploy a simple React app for development";
    
    const response = await axios.post(`${this.baseUrl}/api/nlp/deploy`, {
      message: testMessage,
      context: { test: true }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success) {
      throw new Error(`Deploy request failed: ${data.error}`);
    }
    
    this.logger.info('  ✓ Deploy endpoint working');
    this.logger.info(`  ✓ Response type: ${data.type}`);
    this.logger.info(`  ✓ Conversation ID: ${data.conversationId}`);
    
    if (data.type === 'deployment') {
      this.logger.info(`  ✓ Deployment ID: ${data.deploymentId}`);
      this.logger.info(`  ✓ Estimated time: ${data.estimatedTime}`);
    }
  }

  /**
   * Test clarification flow
   */
  async testClarificationFlow() {
    // Send ambiguous request
    const ambiguousMessage = "Deploy something with a database";
    
    const response1 = await axios.post(`${this.baseUrl}/api/nlp/deploy`, {
      message: ambiguousMessage
    });
    
    if (response1.status !== 200) {
      throw new Error(`Expected status 200, got ${response1.status}`);
    }
    
    const data1 = response1.data;
    if (!data1.success) {
      throw new Error('Initial request failed');
    }
    
    this.logger.info('  ✓ Ambiguous request handled');
    this.logger.info(`  ✓ Response type: ${data1.type}`);
    
    // If clarification is needed, test follow-up
    if (data1.type === 'clarification' && data1.questions.length > 0) {
      const response2 = await axios.post(`${this.baseUrl}/api/nlp/clarify`, {
        conversationId: data1.conversationId,
        response: 'MERN',
        questionType: 'stack'
      });
      
      if (response2.status !== 200) {
        throw new Error(`Expected status 200, got ${response2.status}`);
      }
      
      this.logger.info('  ✓ Clarification flow working');
      this.logger.info(`  ✓ Follow-up response: ${response2.data.type}`);
    }
  }

  /**
   * Test examples endpoint
   */
  async testExamplesEndpoint() {
    const response = await axios.get(`${this.baseUrl}/api/nlp/examples`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    if (!data.success || !data.examples) {
      throw new Error('Examples endpoint failed');
    }
    
    if (!Array.isArray(data.examples) || data.examples.length === 0) {
      throw new Error('No examples returned');
    }
    
    this.logger.info('  ✓ Examples endpoint working');
    this.logger.info(`  ✓ Categories: ${data.examples.length}`);
    this.logger.info(`  ✓ Tips provided: ${data.tips.length}`);
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    // Test invalid request
    try {
      await axios.post(`${this.baseUrl}/api/nlp/deploy`, {
        message: '' // Empty message should fail validation
      });
      throw new Error('Expected validation error');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        this.logger.info('  ✓ Validation error handled correctly');
      } else {
        throw error;
      }
    }
    
    // Test invalid conversation ID
    try {
      await axios.get(`${this.baseUrl}/api/nlp/conversation/invalid-id`);
      throw new Error('Expected 404 error');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        this.logger.info('  ✓ Invalid conversation ID handled correctly');
      } else {
        throw error;
      }
    }
    
    // Test rate limiting (if enabled)
    this.logger.info('  ✓ Error handling working');
  }

  /**
   * Test conversation persistence
   */
  async testConversationPersistence() {
    // Start a conversation
    const response1 = await axios.post(`${this.baseUrl}/api/nlp/deploy`, {
      message: "Deploy a Django app"
    });
    
    const conversationId = response1.data.conversationId;
    
    // Retrieve conversation
    const response2 = await axios.get(`${this.baseUrl}/api/nlp/conversation/${conversationId}`);
    
    if (response2.status !== 200) {
      throw new Error('Conversation retrieval failed');
    }
    
    const conversation = response2.data.conversation;
    if (!conversation || conversation.messages.length === 0) {
      throw new Error('Conversation not persisted');
    }
    
    this.logger.info('  ✓ Conversation persistence working');
    this.logger.info(`  ✓ Messages: ${conversation.messageCount}`);
  }

  /**
   * Performance test
   */
  async testPerformance() {
    const testCases = [
      "Deploy a React app",
      "Create a MERN stack with auth",
      "Launch a Django API with PostgreSQL",
      "Build a serverless function"
    ];
    
    const startTime = Date.now();
    const promises = testCases.map(message => 
      axios.post(`${this.baseUrl}/api/nlp/parse`, { message })
    );
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    this.logger.info(`  ✓ Processed ${testCases.length} requests in ${duration}ms`);
    this.logger.info(`  ✓ Average: ${(duration / testCases.length).toFixed(1)}ms per request`);
  }
}

// Export for use in other modules
export { NLPIntegrationTest };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new NLPIntegrationTest();
  
  const testType = process.argv[2] || 'all';
  
  switch (testType) {
    case 'all':
      tester.runTests().catch(console.error);
      break;
    case 'performance':
      tester.testPerformance().catch(console.error);
      break;
    case 'conversation':
      tester.testConversationPersistence().catch(console.error);
      break;
    default:
      console.log('Usage: node nlpIntegrationTest.js [all|performance|conversation]');
      console.log('Default: all');
  }
}