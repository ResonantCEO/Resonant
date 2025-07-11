// Test script to verify decline message flow
const fetch = require('node-fetch');

async function testDeclineFlow() {
  // Test the decline endpoint directly
  const testBody = {
    status: 'rejected',
    declineMessage: 'Test decline message from script'
  };
  
  console.log('Testing PATCH /api/booking-requests/12 with body:', testBody);
  
  try {
    const response = await fetch('http://localhost:5000/api/booking-requests/12', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test won't work without authentication, but it shows the structure
      },
      body: JSON.stringify(testBody)
    });
    
    console.log('Response status:', response.status);
    const result = await response.text();
    console.log('Response body:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDeclineFlow();