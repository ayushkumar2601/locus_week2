/**
 * Simple NLP Demo
 * Demonstrates the Natural Language Deployment Parser
 */

import { NLPDeploymentParser } from '../agent/nlpDeploymentParser.js';

async function runDemo() {
  console.log('🤖 Natural Language Deployment Parser Demo');
  console.log('═'.repeat(60));
  
  const parser = new NLPDeploymentParser({
    logger: console
  });
  
  const testCases = [
    "Deploy a MERN app with authentication and database",
    "Create a Django API with PostgreSQL and user management",
    "Launch a Next.js site with Stripe payments and analytics",
    "Build a simple React app for my portfolio"
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Input: "${testCase}"`);
    console.log('─'.repeat(50));
    
    try {
      const config = await parser.parseDeploymentRequest(testCase);
      
      console.log('✅ Parsed Successfully:');
      console.log(`  Stack: ${config.stack || 'Custom'}`);
      console.log(`  Language: ${config.language || 'Not specified'}`);
      console.log(`  Features: ${config.features.join(', ') || 'None'}`);
      console.log(`  Database: ${config.database?.type || 'None'}`);
      console.log(`  Infrastructure: ${config.infrastructure.size} (${config.infrastructure.memory}MB RAM)`);
      console.log(`  Confidence: ${(config.metadata.confidence * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error(`❌ Parsing failed: ${error.message}`);
    }
  }
  
  console.log('\n🏆 Demo completed!');
}

runDemo().catch(console.error);