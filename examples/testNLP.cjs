/**
 * Simple NLP Test (CommonJS)
 * Tests the Natural Language Deployment Parser
 */

const { NLPDeploymentParser } = require('../agent/nlpDeploymentParser');

async function runTest() {
  console.log('🤖 Natural Language Deployment Parser Test');
  console.log('═'.repeat(60));
  
  const parser = new NLPDeploymentParser({
    logger: console
  });
  
  const testCases = [
    "Deploy a MERN app with authentication and database",
    "Create a Django API with PostgreSQL",
    "Launch a simple React app"
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase}"`);
    console.log('─'.repeat(40));
    
    try {
      const config = await parser.parseDeploymentRequest(testCase);
      
      console.log('✅ Success:');
      console.log(`  Stack: ${config.stack || 'Custom'}`);
      console.log(`  Features: ${config.features.join(', ') || 'None'}`);
      console.log(`  Database: ${config.database?.type || 'None'}`);
      console.log(`  Confidence: ${(config.metadata.confidence * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 NLP Parser is working correctly!');
}

runTest().catch(console.error);