const axios = require('axios');

// APIclub UAT Configuration
const APICLUB_UAT_URL = 'https://uat.apiclub.in/api/v1/rc_info';

// Test with a sample vehicle number
async function testApiclub() {
  try {
    const API_KEY = process.env.APICLUB_API_KEY || 'YOUR_API_KEY_HERE';
    
    console.log('Testing APIclub UAT RC Verification API...\n');
    console.log('URL:', APICLUB_UAT_URL);
    console.log('API Key:', API_KEY ? API_KEY.substring(0, 15) + '...' : 'NOT SET');
    
    const response = await axios.post(
      APICLUB_UAT_URL,
      {
        vehicleId: 'MH12DE1433'  // Test vehicle number
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
          'Referer': 'docs.apiclub.in'
        }
      }
    );

    console.log('\n=== RAW RESPONSE ===');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.response) {
      console.log('\n=== RESPONSE FIELDS ===');
      const fields = Object.keys(response.data.response);
      fields.forEach(field => {
        const value = response.data.response[field];
        console.log(`  ${field}: ${value}`);
      });
    }
    
  } catch (error) {
    console.log('\n=== ERROR ===');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testApiclub();
