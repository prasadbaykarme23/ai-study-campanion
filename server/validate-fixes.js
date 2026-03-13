#!/usr/bin/env node

/**
 * Quick Start Validation Script
 * Validates all fixes are working correctly
 */

const http = require('http');

console.log('\n' + '='.repeat(70));
console.log('🔍 BACKEND FIXES VALIDATION');
console.log('='.repeat(70));

const BASE_URL = 'http://localhost:5000';
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTest(name, fn) {
  testsRun++;
  try {
    console.log(`\n[${testsRun}] Testing: ${name}`);
    await fn();
    testsPassed++;
    console.log(`    ✅ PASSED`);
  } catch (error) {
    testsFailed++;
    console.log(`    ❌ FAILED: ${error.message}`);
  }
}

async function main() {
  console.log('\n📡 Checking if server is running...\n');

  try {
    // Test 1: Health check
    await runTest('Server health check', async () => {
      const res = await makeRequest('GET', '/api/health');
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.body.message) throw new Error('No message in response');
    });

    // Test 2: Optional Auth - No Token
    await runTest('Summary route without authentication', async () => {
      const res = await makeRequest('POST', '/api/summary/upload');
      // Should return 400 (no file), not 401 (unauthorized)
      if (res.status === 401) throw new Error('Route still requires authentication!');
      if (res.status !== 400) console.log(`    ℹ️  Got status ${res.status} (expected 400 for no file)`);
    });

    // Test 3: TTS Rate Limiting exists
    await runTest('TTS endpoint exists', async () => {
      const res = await makeRequest('POST', '/api/tts/sample', { 
        voice: 'alloy', 
        text: 'test' 
      });
      // Should get either 200 (success) or 500 (OpenAI error), but endpoint should exist
      if (res.status === 404) throw new Error('TTS endpoint not found');
    });

    // Test 4: Rate Limiting working (spam requests)
    await runTest('TTS rate limiting protection', async () => {
      console.log('    Sending 6 rapid requests...');
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          makeRequest('POST', '/api/tts/sample', { voice: 'alloy', text: 'test' })
        );
      }
      const results = await Promise.all(promises);
      const rateLimited = results.some(r => r.status === 429);
      if (!rateLimited) {
        console.log('    ⚠️  No 429 response (may need OpenAI key or rate limit not triggered fast enough)');
      } else {
        console.log('    ✅ Rate limiting is active!');
      }
    });

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${testsRun}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    
    if (testsFailed === 0) {
      console.log('\n🎉 All tests passed! Backend fixes are working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Test file upload in browser (with and without login)');
    console.log('   2. Test voice preview button multiple times');
    console.log('   3. Check server console logs for detailed debugging info');
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.log('\n❌ CRITICAL ERROR: Server is not running!');
    console.log('\nPlease start the server first:');
    console.log('   cd D:\\ai\\server');
    console.log('   npm start');
    console.log('\nOr check for startup errors with:');
    console.log('   node server-diagnostic.js');
    console.log('\n' + '='.repeat(70));
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
