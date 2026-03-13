require('dotenv').config();
const OpenAI = require('openai');

async function testAPIConnection() {
  console.log('='.repeat(60));
  console.log('API CONNECTION DIAGNOSTIC TEST');
  console.log('='.repeat(60));
  
  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY_TEXT || process.env.OPENAI_API_KEY || '').trim();
  
  console.log('\n📋 Configuration:');
  console.log('  GROQ_API_KEY:', groqKey ? `${groqKey.substring(0, 10)}... (${groqKey.length} chars)` : 'NOT SET');
  console.log('  OPENAI_API_KEY_TEXT:', openaiKey ? `${openaiKey.substring(0, 10)}... (${openaiKey.length} chars)` : 'NOT SET');
  
  // Test 1: Groq API
  if (groqKey) {
    console.log('\n🧪 Test 1: Testing Groq API connection...');
    const groqClient = new OpenAI({
      apiKey: groqKey,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 10000,
    });
    
    try {
      const response = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Connection successful!" if you receive this.' }
        ],
        max_tokens: 20,
      });
      
      console.log('  ✅ SUCCESS: Groq API is working!');
      console.log('  Response:', response.choices[0].message.content);
    } catch (error) {
      console.log('  ❌ FAILED: Groq API connection error');
      console.log('  Error type:', error.constructor.name);
      console.log('  Error message:', error.message);
      console.log('  Error code:', error.code);
      console.log('  Error status:', error.status);
      
      if (error.message.includes('Connection') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log('\n  🔍 Diagnosis: Network connectivity issue');
        console.log('  Possible causes:');
        console.log('    - No internet connection');
        console.log('    - Firewall blocking api.groq.com');
        console.log('    - Proxy configuration needed');
        console.log('    - DNS resolution failure');
      } else if (error.status === 401) {
        console.log('\n  🔍 Diagnosis: Invalid API key');
        console.log('  Solution: Check your GROQ_API_KEY in .env file');
      }
    }
  }
  
  // Test 2: OpenAI API (fallback)
  if (openaiKey) {
    console.log('\n🧪 Test 2: Testing OpenAI API connection (fallback)...');
    const openaiClient = new OpenAI({
      apiKey: openaiKey,
      timeout: 10000,
    });
    
    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Connection successful!" if you receive this.' }
        ],
        max_tokens: 20,
      });
      
      console.log('  ✅ SUCCESS: OpenAI API is working!');
      console.log('  Response:', response.choices[0].message.content);
    } catch (error) {
      console.log('  ❌ FAILED: OpenAI API connection error');
      console.log('  Error type:', error.constructor.name);
      console.log('  Error message:', error.message);
      console.log('  Error code:', error.code);
      console.log('  Error status:', error.status);
      
      if (error.status === 401) {
        console.log('\n  🔍 Diagnosis: Invalid API key');
        console.log('  Solution: Check your OPENAI_API_KEY_TEXT in .env file');
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATIONS:');
  console.log('='.repeat(60));
  console.log('1. If Groq fails but OpenAI works:');
  console.log('   → Comment out or remove GROQ_API_KEY to use OpenAI instead');
  console.log('\n2. If both fail with network errors:');
  console.log('   → Check your internet connection');
  console.log('   → Check firewall/antivirus settings');
  console.log('   → Try using a VPN if behind a restrictive network');
  console.log('\n3. If both fail with 401 errors:');
  console.log('   → Verify your API keys are correct and active');
  console.log('   → Check billing status on respective platforms');
  console.log('='.repeat(60));
}

testAPIConnection().catch(console.error);
