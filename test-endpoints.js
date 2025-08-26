const https = require('https');

// Test endpoints on deployed backend
const BASE_URL = 'https://msme-inventory-backend.vercel.app';

async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Testing: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ ${endpoint} - Status: ${res.statusCode}`);
          console.log(`   Response:`, JSON.stringify(jsonData, null, 2));
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          console.log(`❌ ${endpoint} - Failed to parse JSON:`, data);
          reject(e);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${endpoint} - Error:`, err.message);
      reject(err);
    });
  });
}

async function runTests() {
  console.log('🚀 Testing MSME Inventory Backend Endpoints\n');
  
  try {
    // Test root endpoint
    await testEndpoint('/');
    console.log('');
    
    // Test health endpoint
    await testEndpoint('/api/health');
    console.log('');
    
    // Test metrics endpoint
    await testEndpoint('/api/metrics');
    console.log('');
    
    // Test API info endpoint
    await testEndpoint('/api');
    console.log('');
    
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();

