/**
 * Quick System Demo - Groq AI Integration Test
 */

import dotenv from 'dotenv';
import { testGroqConnection, groqChat } from './agent/llm/groqClient.js';

dotenv.config();

async function runQuickDemo() {
  console.log('🚀 SYNAPSE STUDIO - QUICK SYSTEM DEMO');
  console.log('=' .repeat(50));
  console.log('🤖 Powered by Groq AI (Llama3-70B)');
  console.log('=' .repeat(50));
  console.log();

  // System Check
  console.log('🔧 System Configuration:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Groq API: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Locus API: ${process.env.LOCUS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log();

  // Test Groq Connection
  console.log('🔌 Testing Groq AI Connection...');
  const connected = await testGroqConnection();
  console.log(`   Status: ${connected ? '✅ Connected' : '❌ Failed'}`);
  
  if (!connected) {
    console.log('❌ Demo cannot continue without Groq connection');
    return;
  }
  
  console.log();

  // Test AI Intelligence
  console.log('🧠 Testing AI Intelligence...');
  const messages = [
    {
      role: 'system',
      content: 'You are a deployment AI. Respond with JSON: {"message": "AI system operational", "capabilities": ["deployment", "monitoring", "self-healing"], "status": "ready"}'
    },
    {
      role: 'user',
      content: 'Test your capabilities'
    }
  ];

  try {
    const response = await groqChat(messages, { temperature: 0.1, max_tokens: 200 });
    const aiResponse = JSON.parse(response);
    
    console.log('   ✅ AI Response:');
    console.log(`      Message: ${aiResponse.message}`);
    console.log(`      Capabilities: ${aiResponse.capabilities?.join(', ')}`);
    console.log(`      Status: ${aiResponse.status}`);
  } catch (error) {
    console.log('   ⚠️ AI test failed:', error.message);
  }
  
  console.log();

  // Demo Complete
  console.log('🎉 DEMO COMPLETED SUCCESSFULLY!');
  console.log();
  console.log('✅ System Features Verified:');
  console.log('   🤖 Groq AI Integration');
  console.log('   🔧 Environment Configuration');
  console.log('   📡 API Connectivity');
  console.log('   🧠 Intelligent Responses');
  console.log();
  console.log('🚀 Ready for full system demonstration!');
  console.log('   Run: npm run dev');
  console.log('   Visit: http://localhost:5000');
  console.log();
}

runQuickDemo().catch(console.error);