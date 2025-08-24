// Simple test script to verify backend connectivity
// Run this with: node test-backend.js

const testBackend = async () => {
  const baseUrl = 'http://localhost:4000';
  
  console.log('🧪 Testing Backend Connectivity...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test public products endpoint
    console.log('\n2. Testing public products endpoint...');
    const productsResponse = await fetch(`${baseUrl}/api/products/public`);
    const productsData = await productsResponse.json();
    console.log('✅ Public products:', productsData);
    
    // Test API info endpoint
    console.log('\n3. Testing API info endpoint...');
    const apiResponse = await fetch(`${baseUrl}/api`);
    const apiData = await apiResponse.json();
    console.log('✅ API info:', apiData);
    
    console.log('\n🎉 Backend is running correctly!');
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Backend is running on port 4000');
    console.log('   - Run: cd backend-node && npm run dev');
  }
};

testBackend();
