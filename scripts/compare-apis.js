require('dotenv').config();
const axios = require('axios');

const VEHICLE_NUMBER = process.argv[2] || 'GJ03MR4048';
const APICLUB_KEY = process.env.APICLUB_API_KEY;
const SUREPASS_TOKEN = process.env.SUREPASS_TOKEN;

// Use UAT URL for APIclub (Production requires IP whitelisting)
const APICLUB_URL = process.env.APICLUB_ENV === 'prod'
  ? 'https://prod.apiclub.in/api'
  : 'https://uat.apiclub.in/api';
const SUREPASS_URL = 'https://kyc-api.surepass.io/api/v1';

async function testSurepass() {
  console.log('\n' + '='.repeat(60));
  console.log('SUREPASS RC-FULL API');
  console.log('='.repeat(60));

  try {
    const response = await axios.post(
      SUREPASS_URL + '/rc/rc-full',
      { id_number: VEHICLE_NUMBER },
      {
        headers: {
          'Authorization': 'Bearer ' + SUREPASS_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data.success) {
      console.log('\nStatus: SUCCESS');
      console.log('\nFields:');
      const data = response.data.data;
      Object.keys(data).sort().forEach(function(key) {
        const value = data[key];
        let display;
        if (value === null) display = 'null';
        else if (value === '') display = '(empty)';
        else if (typeof value === 'object') display = JSON.stringify(value);
        else display = String(value).substring(0, 60);
        console.log('  ' + key + ': ' + display);
      });
      return data;
    } else {
      console.log('\nStatus: FAILED -', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('\nStatus: ERROR -', error.response?.data?.message || error.message);
    return null;
  }
}

async function testApiclub(endpoint, name) {
  console.log('\n' + '='.repeat(60));
  console.log('APICLUB ' + name + ' (' + (process.env.APICLUB_ENV || 'UAT') + ')');
  console.log('='.repeat(60));

  try {
    const response = await axios.post(
      APICLUB_URL + '/v1/' + endpoint,
      { vehicleId: VEHICLE_NUMBER },
      {
        headers: {
          'x-api-key': APICLUB_KEY,
          'Content-Type': 'application/json',
          'Referer': 'motopsy.com'
        },
        timeout: 30000
      }
    );

    if (response.data.code === 200) {
      console.log('\nStatus: SUCCESS');
      console.log('\nFields:');
      const data = response.data.response;
      Object.keys(data).sort().forEach(function(key) {
        const value = data[key];
        let display;
        if (value === null) display = 'null';
        else if (value === '') display = '(empty)';
        else if (typeof value === 'object') display = JSON.stringify(value);
        else display = String(value).substring(0, 60);
        console.log('  ' + key + ': ' + display);
      });
      return data;
    } else {
      console.log('\nStatus: FAILED -', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('\nStatus: ERROR -', error.response?.data?.message || error.message);
    return null;
  }
}

async function main() {
  console.log('================================================================');
  console.log('     API COMPARISON TEST - PRODUCTION');
  console.log('     Vehicle: ' + VEHICLE_NUMBER);
  console.log('================================================================');

  // Test all APIs
  const surepassData = await testSurepass();
  const rcInfoData = await testApiclub('rc_info', 'RC_INFO');
  const rcLiteData = await testApiclub('rc_lite', 'RC_LITE');
  const rcLiteV2Data = await testApiclub('rc_lite_v2', 'RC_LITE_V2');

  // Comparison summary
  console.log('\n' + '='.repeat(60));
  console.log('FIELD COMPARISON SUMMARY');
  console.log('='.repeat(60));

  // Map APIclub fields to Surepass equivalents
  const fieldMapping = {
    'license_plate': 'rc_number',
    'brand_name': 'maker_description',
    'brand_model': 'maker_model',
    'chassis_number': 'vehicle_chasi_number',
    'engine_number': 'vehicle_engine_number',
    'class': 'vehicle_category',
    'gross_weight': 'vehicle_gross_weight',
    'cylinders': 'no_cylinders',
    'seating_capacity': 'seat_capacity',
    'owner_count': 'owner_number',
    'norms': 'norms_type',
    'insurance_expiry': 'insurance_upto',
    'insurance_policy': 'insurance_policy_number',
    'is_financed': 'financed'
  };

  // Reverse mapping
  const reverseMapping = {};
  Object.keys(fieldMapping).forEach(function(k) {
    reverseMapping[fieldMapping[k]] = k;
  });

  const surepassFields = [
    'rc_number', 'registration_date', 'owner_name', 'father_name',
    'present_address', 'permanent_address', 'mobile_number',
    'vehicle_chasi_number', 'vehicle_engine_number',
    'maker_description', 'maker_model', 'body_type', 'fuel_type', 'color',
    'vehicle_category', 'vehicle_category_description',
    'cubic_capacity', 'vehicle_gross_weight', 'no_cylinders', 'seat_capacity',
    'financer', 'financed', 'insurance_company', 'insurance_policy_number', 'insurance_upto',
    'manufacturing_date', 'manufacturing_date_formatted',
    'fit_up_to', 'registered_at', 'latest_by',
    'tax_upto', 'tax_paid_upto', 'pucc_number', 'pucc_upto',
    'permit_number', 'permit_type', 'permit_valid_upto',
    'national_permit_number', 'national_permit_upto',
    'owner_number', 'rc_status', 'noc_details',
    'blacklist_status', 'non_use_status', 'masked_name', 'variant'
  ];

  function hasValue(data, field) {
    if (!data) return '?';
    const val = data[field];
    if (val === null || val === undefined) return '-';
    if (val === '') return '-';
    if (val === '1900-01-01') return '-';
    return 'Y';
  }

  function padRight(str, len) {
    str = String(str);
    while (str.length < len) str += ' ';
    return str;
  }

  console.log('\n| Field                      | Surepass | rc_info | rc_lite | rc_lite_v2 |');
  console.log('|----------------------------|----------|---------|---------|------------|');

  surepassFields.forEach(function(field) {
    const sVal = hasValue(surepassData, field);

    // Find equivalent APIclub field
    const apiclubField = reverseMapping[field] || field;

    const rcInfoVal = hasValue(rcInfoData, apiclubField) === 'Y' ? 'Y' : hasValue(rcInfoData, field);
    const rcLiteVal = hasValue(rcLiteData, apiclubField) === 'Y' ? 'Y' : hasValue(rcLiteData, field);
    const rcLiteV2Val = hasValue(rcLiteV2Data, apiclubField) === 'Y' ? 'Y' : hasValue(rcLiteV2Data, field);

    console.log('| ' + padRight(field, 26) + ' | ' + padRight(sVal, 8) + ' | ' + padRight(rcInfoVal, 7) + ' | ' + padRight(rcLiteVal, 7) + ' | ' + padRight(rcLiteV2Val, 10) + ' |');
  });

  // APIclub extra fields
  console.log('\n--- APIclub EXTRA fields (not in Surepass) ---');
  const extraFields = ['rto', 'rto_name', 'state', 'vehicle_age'];
  extraFields.forEach(function(field) {
    const rcInfoVal = rcInfoData && rcInfoData[field] ? rcInfoData[field] : '-';
    const rcLiteVal = rcLiteData && rcLiteData[field] ? rcLiteData[field] : '-';
    const rcLiteV2Val = rcLiteV2Data && rcLiteV2Data[field] ? rcLiteV2Data[field] : '-';
    console.log('  ' + field + ': rc_info=' + rcInfoVal + ', rc_lite=' + rcLiteVal + ', rc_lite_v2=' + rcLiteV2Val);
  });
}

main().catch(console.error);
