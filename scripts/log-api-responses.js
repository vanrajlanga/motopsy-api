/**
 * API Response Logger Script
 * Logs detailed responses from Surepass and APIclub APIs
 *
 * Usage: node scripts/log-api-responses.js [VEHICLE_NUMBER]
 * Output: logs/api-comparison-{timestamp}.json
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const VEHICLE_NUMBER = process.argv[2] || 'GJ01HV6583';
const APICLUB_KEY = process.env.APICLUB_API_KEY;
const SUREPASS_TOKEN = process.env.SUREPASS_TOKEN;

// Use PRODUCTION URL for APIclub
const APICLUB_PROD_URL = 'https://prod.apiclub.in/api';
const SUREPASS_URL = 'https://kyc-api.surepass.io/api/v1';

const results = {
  timestamp: new Date().toISOString(),
  vehicle_number: VEHICLE_NUMBER,
  apis: {}
};

async function callApi(name, config) {
  console.log('Calling ' + name + '...');
  const startTime = Date.now();

  try {
    const response = await axios(config);
    const duration = Date.now() - startTime;

    return {
      success: true,
      status: response.status,
      duration_ms: duration,
      headers: {
        'content-type': response.headers['content-type'],
        'x-request-id': response.headers['x-request-id']
      },
      data: response.data
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      status: error.response?.status || null,
      duration_ms: duration,
      error: {
        message: error.message,
        code: error.code,
        response_data: error.response?.data || null
      }
    };
  }
}

async function testSurepassRcFull() {
  return callApi('Surepass RC-Full', {
    method: 'POST',
    url: SUREPASS_URL + '/rc/rc-full',
    headers: {
      'Authorization': 'Bearer ' + SUREPASS_TOKEN,
      'Content-Type': 'application/json'
    },
    data: { id_number: VEHICLE_NUMBER },
    timeout: 30000
  });
}

async function testSurepassChallan(chassisNumber, engineNumber) {
  return callApi('Surepass Challan', {
    method: 'POST',
    url: SUREPASS_URL + '/rc/rc-related/challan-details',
    headers: {
      'Authorization': 'Bearer ' + SUREPASS_TOKEN,
      'Content-Type': 'application/json'
    },
    data: {
      chassis_no: chassisNumber,
      engine_no: engineNumber,
      rc_number: VEHICLE_NUMBER
    },
    timeout: 30000
  });
}

async function testApiclubRcInfo() {
  return callApi('APIclub rc_info', {
    method: 'POST',
    url: APICLUB_PROD_URL + '/v1/rc_info',
    headers: {
      'x-api-key': APICLUB_KEY,
      'Content-Type': 'application/json',
      'Referer': 'motopsy.com'
    },
    data: { vehicleId: VEHICLE_NUMBER },
    timeout: 30000
  });
}

async function testApiclubRcLite() {
  return callApi('APIclub rc_lite', {
    method: 'POST',
    url: APICLUB_PROD_URL + '/v1/rc_lite',
    headers: {
      'x-api-key': APICLUB_KEY,
      'Content-Type': 'application/json',
      'Referer': 'motopsy.com'
    },
    data: { vehicleId: VEHICLE_NUMBER },
    timeout: 30000
  });
}

async function testApiclubRcLiteV2() {
  return callApi('APIclub rc_lite_v2', {
    method: 'POST',
    url: APICLUB_PROD_URL + '/v1/rc_lite_v2',
    headers: {
      'x-api-key': APICLUB_KEY,
      'Content-Type': 'application/json',
      'Referer': 'motopsy.com'
    },
    data: { vehicleId: VEHICLE_NUMBER },
    timeout: 30000
  });
}

async function testApiclubChallan(chassisNumber, engineNumber) {
  return callApi('APIclub challan_info_v2', {
    method: 'POST',
    url: APICLUB_PROD_URL + '/v1/challan_info_v2',
    headers: {
      'x-api-key': APICLUB_KEY,
      'Content-Type': 'application/json',
      'Referer': 'motopsy.com'
    },
    data: {
      vehicleId: VEHICLE_NUMBER,
      chassis: chassisNumber || '',
      engine_no: engineNumber || ''
    },
    timeout: 30000
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('API Response Logger');
  console.log('Vehicle: ' + VEHICLE_NUMBER);
  console.log('Timestamp: ' + results.timestamp);
  console.log('='.repeat(60));
  console.log('');

  // Test Surepass RC-Full
  console.log('[1/6] Testing Surepass RC-Full...');
  results.apis.surepass_rc_full = await testSurepassRcFull();

  // Extract chassis and engine for challan APIs
  let chassisNumber = null;
  let engineNumber = null;

  if (results.apis.surepass_rc_full.success && results.apis.surepass_rc_full.data?.data) {
    chassisNumber = results.apis.surepass_rc_full.data.data.vehicle_chasi_number;
    engineNumber = results.apis.surepass_rc_full.data.data.vehicle_engine_number;
    console.log('    Chassis: ' + chassisNumber);
    console.log('    Engine: ' + engineNumber);
  }

  // Test Surepass Challan
  console.log('[2/6] Testing Surepass Challan...');
  results.apis.surepass_challan = await testSurepassChallan(chassisNumber, engineNumber);

  // Test APIclub rc_info
  console.log('[3/6] Testing APIclub rc_info (PRODUCTION)...');
  results.apis.apiclub_rc_info = await testApiclubRcInfo();

  // If Surepass failed, try to get chassis/engine from APIclub
  if (!chassisNumber && results.apis.apiclub_rc_info.success && results.apis.apiclub_rc_info.data?.response) {
    chassisNumber = results.apis.apiclub_rc_info.data.response.chassis_number;
    engineNumber = results.apis.apiclub_rc_info.data.response.engine_number;
    console.log('    Chassis (from APIclub): ' + chassisNumber);
    console.log('    Engine (from APIclub): ' + engineNumber);
  }

  // Test APIclub rc_lite
  console.log('[4/6] Testing APIclub rc_lite (PRODUCTION)...');
  results.apis.apiclub_rc_lite = await testApiclubRcLite();

  // Test APIclub rc_lite_v2
  console.log('[5/6] Testing APIclub rc_lite_v2 (PRODUCTION)...');
  results.apis.apiclub_rc_lite_v2 = await testApiclubRcLiteV2();

  // Test APIclub Challan
  console.log('[6/6] Testing APIclub challan_info_v2 (PRODUCTION)...');
  results.apis.apiclub_challan = await testApiclubChallan(chassisNumber, engineNumber);

  // Create logs directory if not exists
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = 'api-comparison-' + VEHICLE_NUMBER + '-' + timestamp + '.json';
  const filepath = path.join(logsDir, filename);

  // Write results to file
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

  console.log('');
  console.log('='.repeat(60));
  console.log('Results saved to: ' + filepath);
  console.log('='.repeat(60));

  // Print summary
  console.log('');
  console.log('SUMMARY:');
  console.log('-'.repeat(40));

  Object.keys(results.apis).forEach(function(apiName) {
    const api = results.apis[apiName];
    const status = api.success ? 'SUCCESS' : 'FAILED';
    const statusCode = api.status || 'N/A';
    const duration = api.duration_ms + 'ms';
    console.log('  ' + apiName + ': ' + status + ' (' + statusCode + ') - ' + duration);
  });

  console.log('');
  console.log('Log file: ' + filename);
}

main().catch(function(err) {
  console.error('Script error:', err);
  process.exit(1);
});
