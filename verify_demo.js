/**
 * Demo Verification Script
 * Quickly verify all systems are operational before demo
 */

import dotenv from 'dotenv';
import { testGroqConnection } from './agent/llm/groqClient.js';

dotenv.config();

async function verifyDemo() {
  console.log('🔍 DEMO VERIFICATION CHECKLIST');
  console.log('=' .repeat(40));
  console.log();

  const checks = [];

  // 1. Environment Check
  console.log('1️⃣ Environment Configuration:');
  const nodeVersion = process.version;
  const hasGroqKey = !!process.env.GROQ_API_KEY;
  const hasLocusKey = !!process.env.LOCUS_API_KEY;
  
  console.log(`   Node.js: ${nodeVersion} ${nodeVersion >= 'v18' ? '✅' : '❌'}`);
  console.log(`   Groq API Key: ${hasGroqKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`   Locus API Key: ${hasLocusKey ? '✅ Present' : '❌ Missing'}`);
  
  checks.push(nodeVersion >= 'v18', hasGroqKey, hasLocusKey);
  console.log();

  // 2. AI Connection Test
  console.log('2️⃣ AI Integration Test:');
  try {
    const groqConnected = await testGroqConnection();
    console.log(`   Groq AI: ${groqConnected ? '✅ Connected' : '❌ Failed'}`);
    console.log(`   Model: llama-3.1-8b-instant`);
    checks.push(groqConnected);
  } catch (error) {
    console.log(`   Groq AI: ❌ Error - ${error.message}`);
    checks.push(false);
  }
  console.log();

  // 3. Server Status Check
  console.log('3️⃣ Development Server:');
  try {
    const response = await fetch('http://localhost:5000/health').catch(() => null);
    if (response && response.ok) {
      console.log('   Server: ✅ Running on http://localhost:5000');
      checks.push(true);
    } else {
      console.log('   Server: ⚠️ Not responding (may need to start)');
      console.log('   Run: npm run dev');
      checks.push(false);
    }
  } catch (error) {
    console.log('   Server: ⚠️ Not accessible');
    console.log('   Run: npm run dev');
    checks.push(false);
  }
  console.log();

  // 4. File System Check
  console.log('4️⃣ Required Files:');
  const fs = await import('fs');
  const requiredFiles = [
    'client/src/App.tsx',
    'server/index.ts',
    'agent/llm/groqClient.js',
    'services/locusService.js'
  ];

  let filesOk = true;
  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
    if (!exists) filesOk = false;
  }
  checks.push(filesOk);
  console.log();

  // Summary
  const allPassed = checks.every(check => check);
  console.log('📊 VERIFICATION SUMMARY:');
  console.log(`   Total Checks: ${checks.length}`);
  console.log(`   Passed: ${checks.filter(c => c).length}`);
  console.log(`   Failed: ${checks.filter(c => !c).length}`);
  console.log();

  if (allPassed) {
    console.log('🎉 ALL SYSTEMS GO! READY FOR DEMO!');
    console.log();
    console.log('🚀 DEMO INSTRUCTIONS:');
    console.log('   1. Open: http://localhost:5000');
    console.log('   2. Create account or login');
    console.log('   3. Test voice chat with AI');
    console.log('   4. Explore development environment');
    console.log('   5. Show deployment planning features');
    console.log();
  } else {
    console.log('⚠️ SOME ISSUES DETECTED');
    console.log();
    console.log('🔧 TROUBLESHOOTING:');
    if (!hasGroqKey) console.log('   - Add GROQ_API_KEY to .env file');
    if (!hasLocusKey) console.log('   - Add LOCUS_API_KEY to .env file');
    if (!checks[3]) console.log('   - Start server: npm run dev');
    if (!filesOk) console.log('   - Verify all project files are present');
    console.log();
  }

  return allPassed;
}

// Run verification
verifyDemo().catch(console.error);