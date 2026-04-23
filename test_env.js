/**
 * Test ENV loading
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing ENV Loading...\n');

console.log('Core App:');
console.log('  PORT:', process.env.PORT);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  CLIENT_URL:', process.env.CLIENT_URL);

console.log('\nLocus API:');
console.log('  LOCUS_API_KEY:', process.env.LOCUS_API_KEY ? `${process.env.LOCUS_API_KEY.substring(0, 10)}...` : 'MISSING');
console.log('  LOCUS_API_URL:', process.env.LOCUS_API_URL);

console.log('\nAgent Config:');
console.log('  AGENT_LOOP_INTERVAL:', process.env.AGENT_LOOP_INTERVAL);
console.log('  MAX_CONCURRENT_ACTIONS:', process.env.MAX_CONCURRENT_ACTIONS);

console.log('\nDefaults:');
console.log('  DEFAULT_RUNTIME:', process.env.DEFAULT_RUNTIME);
console.log('  DEFAULT_BUILD_COMMAND:', process.env.DEFAULT_BUILD_COMMAND);
console.log('  DEFAULT_START_COMMAND:', process.env.DEFAULT_START_COMMAND);

// Critical check
if (!process.env.LOCUS_API_KEY) {
  console.log('\n❌ CRITICAL: LOCUS_API_KEY is missing!');
  process.exit(1);
} else {
  console.log('\n✅ ENV loading successful!');
}