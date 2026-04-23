/**
 * GitHub Integration Test
 * Tests the complete GitHub CI/CD pipeline
 * Simulates webhook events and validates deployment flow
 */

const crypto = require('crypto');

class GitHubIntegrationTest {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.logger = console;
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';
  }

  /**
   * Generate GitHub webhook signature
   */
  generateSignature(payload, secret) {
    return 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  /**
   * Create mock GitHub webhook payload
   */
  createMockWebhookPayload(eventType = 'push') {
    const basePayload = {
      repository: {
        id: 123456789,
        name: 'test-app',
        full_name: 'testuser/test-app',
        private: false,
        clone_url: 'https://github.com/testuser/test-app.git',
        ssh_url: 'git@github.com:testuser/test-app.git',
        default_branch: 'main',
        language: 'JavaScript',
        size: 1024
      },
      pusher: {
        name: 'testuser',
        email: 'test@example.com'
      }
    };

    if (eventType === 'push') {
      return {
        ...basePayload,
        ref: 'refs/heads/main',
        before: '0000000000000000000000000000000000000000',
        after: 'abcd1234567890abcd1234567890abcd12345678',
        head_commit: {
          id: 'abcd1234567890abcd1234567890abcd12345678',
          message: 'Add new feature',
          timestamp: new Date().toISOString(),
          author: {
            name: 'Test User',
            email: 'test@example.com'
          },
          committer: {
            name: 'Test User',
            email: 'test@example.com'
          },
          added: ['src/newfile.js'],
          removed: [],
          modified: ['package.json']
        },
        commits: [
          {
            id: 'abcd1234567890abcd1234567890abcd12345678',
            message: 'Add new feature',
            timestamp: new Date().toISOString(),
            author: {
              name: 'Test User',
              email: 'test@example.com'
            }
          }
        ]
      };
    }

    if (eventType === 'ping') {
      return {
        ...basePayload,
        zen: 'Responsive is better than fast.',
        hook_id: 12345678,
        hook: {
          type: 'Repository',
          id: 12345678,
          name: 'web',
          active: true,
          events: ['push', 'pull_request'],
          config: {
            content_type: 'json',
            insecure_ssl: '0',
            url: `${this.baseUrl}/api/github/webhook`
          }
        }
      };
    }

    return basePayload;
  }

  /**
   * Send webhook request
   */
  async sendWebhook(eventType, payload) {
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, this.webhookSecret);

    try {
      const response = await fetch(`${this.baseUrl}/api/github/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': eventType,
          'X-GitHub-Delivery': `12345678-1234-1234-1234-123456789012`,
          'X-Hub-Signature-256': signature,
          'User-Agent': 'GitHub-Hookshot/abc123'
        },
        body: payloadString
      });

      const responseData = await response.json();
      
      return {
        status: response.status,
        data: responseData
      };
    } catch (error) {
      throw new Error(`Webhook request failed: ${error.message}`);
    }
  }

  /**
   * Test webhook ping
   */
  async testPing() {
    this.logger.info('🏓 Testing webhook ping...');
    
    const payload = this.createMockWebhookPayload('ping');
    const response = await this.sendWebhook('ping', payload);
    
    if (response.status !== 200) {
      throw new Error(`Ping failed with status ${response.status}`);
    }
    
    if (!response.data.message || !response.data.message.includes('configured successfully')) {
      throw new Error('Ping response invalid');
    }
    
    this.logger.info('✅ Ping test passed');
    return response.data;
  }

  /**
   * Test push webhook
   */
  async testPushWebhook() {
    this.logger.info('🚀 Testing push webhook...');
    
    const payload = this.createMockWebhookPayload('push');
    const response = await this.sendWebhook('push', payload);
    
    if (response.status !== 200) {
      throw new Error(`Push webhook failed with status ${response.status}`);
    }
    
    if (!response.data.message || !response.data.message.includes('initiated')) {
      throw new Error('Push webhook response invalid');
    }
    
    this.logger.info('✅ Push webhook test passed');
    this.logger.info(`📝 Repository: ${response.data.repository}`);
    this.logger.info(`🌿 Branch: ${response.data.branch}`);
    this.logger.info(`📦 Commit: ${response.data.commit}`);
    
    return response.data;
  }

  /**
   * Test invalid signature
   */
  async testInvalidSignature() {
    this.logger.info('🔒 Testing invalid signature handling...');
    
    const payload = this.createMockWebhookPayload('push');
    const payloadString = JSON.stringify(payload);
    const invalidSignature = 'sha256=invalid_signature';

    try {
      const response = await fetch(`${this.baseUrl}/api/github/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'push',
          'X-GitHub-Delivery': `12345678-1234-1234-1234-123456789012`,
          'X-Hub-Signature-256': invalidSignature,
          'User-Agent': 'GitHub-Hookshot/abc123'
        },
        body: payloadString
      });

      if (response.status !== 401) {
        throw new Error(`Expected 401 status, got ${response.status}`);
      }
      
      const responseData = await response.json();
      if (!responseData.error || !responseData.error.includes('Invalid')) {
        throw new Error('Invalid signature not properly handled');
      }
      
      this.logger.info('✅ Invalid signature test passed');
      return true;
    } catch (error) {
      if (error.message.includes('Expected 401')) {
        throw error;
      }
      throw new Error(`Invalid signature test failed: ${error.message}`);
    }
  }

  /**
   * Test skip CI functionality
   */
  async testSkipCI() {
    this.logger.info('⏭️ Testing [skip ci] functionality...');
    
    const payload = this.createMockWebhookPayload('push');
    payload.head_commit.message = 'Update README [skip ci]';
    
    const response = await this.sendWebhook('push', payload);
    
    if (response.status !== 200) {
      throw new Error(`Skip CI test failed with status ${response.status}`);
    }
    
    if (!response.data.skipped || !response.data.message.includes('skip ci')) {
      throw new Error('Skip CI not working properly');
    }
    
    this.logger.info('✅ Skip CI test passed');
    return response.data;
  }

  /**
   * Test branch filtering
   */
  async testBranchFiltering() {
    this.logger.info('🌿 Testing branch filtering...');
    
    const payload = this.createMockWebhookPayload('push');
    payload.ref = 'refs/heads/feature-branch';
    
    const response = await this.sendWebhook('push', payload);
    
    if (response.status !== 200) {
      throw new Error(`Branch filtering test failed with status ${response.status}`);
    }
    
    if (!response.data.skipped || !response.data.message.includes('not in target branches')) {
      throw new Error('Branch filtering not working properly');
    }
    
    this.logger.info('✅ Branch filtering test passed');
    return response.data;
  }

  /**
   * Test deployments API
   */
  async testDeploymentsAPI() {
    this.logger.info('📋 Testing deployments API...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/github/deployments?limit=10`);
      
      if (response.status !== 200) {
        throw new Error(`Deployments API failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.deployments || !Array.isArray(data.deployments)) {
        throw new Error('Deployments API response invalid');
      }
      
      this.logger.info('✅ Deployments API test passed');
      this.logger.info(`📊 Found ${data.deployments.length} deployments`);
      
      return data;
    } catch (error) {
      throw new Error(`Deployments API test failed: ${error.message}`);
    }
  }

  /**
   * Test health endpoint
   */
  async testHealthEndpoint() {
    this.logger.info('🏥 Testing health endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/github/health`);
      
      if (response.status !== 200) {
        throw new Error(`Health endpoint failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'healthy') {
        throw new Error('Health endpoint reports unhealthy status');
      }
      
      this.logger.info('✅ Health endpoint test passed');
      this.logger.info(`🔧 Features: ${Object.keys(data.features).join(', ')}`);
      this.logger.info(`📊 Stats: ${data.stats.activeDeployments} active, ${data.stats.totalDeployments} total`);
      
      return data;
    } catch (error) {
      throw new Error(`Health endpoint test failed: ${error.message}`);
    }
  }

  /**
   * Run complete test suite
   */
  async runTests() {
    this.logger.info('🧪 GitHub Integration Test Suite');
    this.logger.info('═'.repeat(60));
    
    const tests = [
      { name: 'Health Endpoint', test: () => this.testHealthEndpoint() },
      { name: 'Webhook Ping', test: () => this.testPing() },
      { name: 'Invalid Signature', test: () => this.testInvalidSignature() },
      { name: 'Skip CI', test: () => this.testSkipCI() },
      { name: 'Branch Filtering', test: () => this.testBranchFiltering() },
      { name: 'Push Webhook', test: () => this.testPushWebhook() },
      { name: 'Deployments API', test: () => this.testDeploymentsAPI() }
    ];
    
    let passed = 0;
    let failed = 0;
    const results = [];
    
    for (const { name, test } of tests) {
      try {
        this.logger.info(`\n🔍 Testing: ${name}`);
        const result = await test();
        this.logger.info(`✅ ${name} - PASSED`);
        results.push({ name, status: 'passed', result });
        passed++;
      } catch (error) {
        this.logger.error(`❌ ${name} - FAILED: ${error.message}`);
        results.push({ name, status: 'failed', error: error.message });
        failed++;
      }
    }
    
    this.logger.info('\n📊 Test Results:');
    this.logger.info(`✅ Passed: ${passed}`);
    this.logger.info(`❌ Failed: ${failed}`);
    this.logger.info(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      this.logger.info('\n🎉 All tests passed! GitHub integration is working correctly.');
    } else {
      this.logger.info('\n⚠️ Some tests failed. Check the configuration and try again.');
    }
    
    return { passed, failed, results };
  }

  /**
   * Simulate complete deployment workflow
   */
  async simulateDeploymentWorkflow() {
    this.logger.info('🎬 Simulating complete deployment workflow...');
    this.logger.info('═'.repeat(60));
    
    try {
      // Step 1: Send push webhook
      this.logger.info('1️⃣ Sending push webhook...');
      const pushResult = await this.testPushWebhook();
      
      // Step 2: Wait for deployment to process
      this.logger.info('2️⃣ Waiting for deployment to process...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 3: Check deployment status
      this.logger.info('3️⃣ Checking deployment status...');
      const deploymentsResult = await this.testDeploymentsAPI();
      
      // Step 4: Find our deployment
      const ourDeployment = deploymentsResult.deployments.find(d => 
        d.repository === pushResult.repository && d.commit === pushResult.commit
      );
      
      if (ourDeployment) {
        this.logger.info(`4️⃣ Found deployment: ${ourDeployment.id}`);
        this.logger.info(`   Status: ${ourDeployment.status}`);
        this.logger.info(`   Duration: ${ourDeployment.duration || 'In progress'}s`);
        if (ourDeployment.url) {
          this.logger.info(`   URL: ${ourDeployment.url}`);
        }
      } else {
        this.logger.warn('4️⃣ Deployment not found in recent deployments');
      }
      
      this.logger.info('\n🏆 Deployment workflow simulation completed!');
      return { pushResult, deploymentsResult, ourDeployment };
      
    } catch (error) {
      this.logger.error('❌ Deployment workflow simulation failed:', error.message);
      throw error;
    }
  }
}

// Export for use in other modules
module.exports = { GitHubIntegrationTest };

// Run tests if called directly
if (require.main === module) {
  const tester = new GitHubIntegrationTest();
  
  const testType = process.argv[2] || 'all';
  
  switch (testType) {
    case 'all':
      tester.runTests().catch(console.error);
      break;
    case 'workflow':
      tester.simulateDeploymentWorkflow().catch(console.error);
      break;
    case 'ping':
      tester.testPing().catch(console.error);
      break;
    case 'push':
      tester.testPushWebhook().catch(console.error);
      break;
    default:
      console.log('Usage: node githubIntegrationTest.js [all|workflow|ping|push]');
      console.log('Default: all');
  }
}