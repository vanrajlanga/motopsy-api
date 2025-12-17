/**
 * Test script to verify the Surepass -> APIclub failsafe integration
 *
 * Usage:
 *   node scripts/test-failsafe.js
 *   node scripts/test-failsafe.js MH12DE1433
 *   FORCE_APICLUB=true node scripts/test-failsafe.js  # Force APIclub fallback
 */

require('dotenv').config();

const surepassService = require('../src/services/surepass.service');
const apiclubService = require('../src/services/apiclub.service');

const vehicleNumber = process.argv[2] || 'MH12DE1433';

async function testApiclubDirect() {
  console.log('\n=== Testing APIclub RC Direct ===');
  console.log(`Vehicle: ${vehicleNumber}`);
  console.log(`Environment: ${apiclubService.getEnvironment()}`);
  console.log(`Configured: ${apiclubService.isConfigured()}`);

  const result = await apiclubService.getRegistrationDetailsAsync(vehicleNumber);

  if (result.isSuccess) {
    console.log('\nAPIclub RC Response:');
    console.log(`  RC Number: ${result.value.rcNumber}`);
    console.log(`  Owner: ${result.value.ownerName}`);
    console.log(`  Brand: ${result.value.makerDescription}`);
    console.log(`  Model: ${result.value.makerModel}`);
    console.log(`  Fuel: ${result.value.fuelType}`);
    console.log(`  RC Status: ${result.value.rcStatus}`);
    console.log(`  Source: ${result.value._source}`);
  } else {
    console.log(`\nAPIclub RC Error: ${result.error}`);
  }

  return result;
}

async function testApiclubChallanDirect() {
  console.log('\n=== Testing APIclub Challan Direct ===');
  console.log(`Vehicle: ${vehicleNumber}`);

  const result = await apiclubService.getChallanDetailsAsync('TEST123', 'TEST456', vehicleNumber);

  if (result.isSuccess) {
    console.log('\nAPIclub Challan Response:');
    console.log(`  Total Challans: ${result.value.total}`);
    console.log(`  Pending: ${result.value.totalPending}`);
    console.log(`  Total Amount: ${result.value.totalAmount}`);
    console.log(`  Source: ${result.value._source}`);
    if (result.value.challans.length > 0) {
      console.log('\n  Challans:');
      result.value.challans.forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.challan_number} - ${c.challan_status} - Rs.${c.amount}`);
      });
    }
  } else {
    console.log(`\nAPIclub Challan Error: ${result.error}`);
  }

  return result;
}

async function testSurepassWithFailsafe() {
  console.log('\n=== Testing Surepass RC with Failsafe ===');
  console.log(`Vehicle: ${vehicleNumber}`);

  // If FORCE_APICLUB is set, temporarily break Surepass to test failsafe
  if (process.env.FORCE_APICLUB === 'true') {
    console.log('FORCE_APICLUB=true - Simulating Surepass failure...');
    const originalUrl = surepassService.apiUrl;
    surepassService.apiUrl = 'https://invalid-url.example.com';

    const result = await surepassService.getRegistrationDetailsAsync(vehicleNumber);

    // Restore original URL
    surepassService.apiUrl = originalUrl;

    if (result.isSuccess) {
      console.log('\nFailsafe Response (from APIclub):');
      console.log(`  RC Number: ${result.value.rcNumber}`);
      console.log(`  Owner: ${result.value.ownerName}`);
      console.log(`  Brand: ${result.value.makerDescription}`);
      console.log(`  Model: ${result.value.makerModel}`);
      console.log(`  Fuel: ${result.value.fuelType}`);
      console.log(`  RC Status: ${result.value.rcStatus}`);
      console.log(`  Source: ${result.value._source}`);
    } else {
      console.log(`\nFailsafe Error: ${result.error}`);
    }

    return result;
  }

  // Normal flow - try Surepass first, then APIclub if it fails
  const result = await surepassService.getRegistrationDetailsAsync(vehicleNumber);

  if (result.isSuccess) {
    console.log('\nResponse:');
    console.log(`  RC Number: ${result.value.rcNumber}`);
    console.log(`  Owner: ${result.value.ownerName}`);
    console.log(`  Brand: ${result.value.makerDescription}`);
    console.log(`  Model: ${result.value.makerModel}`);
    console.log(`  Fuel: ${result.value.fuelType}`);
    console.log(`  RC Status: ${result.value.rcStatus}`);
    console.log(`  Source: ${result.value._source}`);
  } else {
    console.log(`\nError: ${result.error}`);
  }

  return result;
}

async function testChallanWithFailsafe() {
  console.log('\n=== Testing Challan with Failsafe ===');
  console.log(`Vehicle: ${vehicleNumber}`);

  // Normal flow - try Surepass first, then APIclub if empty/fails
  const result = await surepassService.getChallanDetailsAsync('TEST123', 'TEST456', vehicleNumber);

  if (result.isSuccess) {
    console.log('\nChallan Response:');
    console.log(`  Total Challans: ${result.value.challans.length}`);
    console.log(`  Pending: ${result.value.totalPending}`);
    console.log(`  Total Amount: ${result.value.totalAmount}`);
    console.log(`  Source: ${result.value._source}`);
    if (result.value.challans.length > 0) {
      console.log('\n  Challans:');
      result.value.challans.slice(0, 3).forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.challan_number} - ${c.challan_status || c.status} - Rs.${c.amount}`);
      });
    }
  } else {
    console.log(`\nChallan Error: ${result.error}`);
  }

  return result;
}

async function main() {
  console.log('========================================');
  console.log('  RC & Challan Failsafe Test');
  console.log('========================================');

  // Test APIclub RC directly
  await testApiclubDirect();

  // Test APIclub Challan directly
  await testApiclubChallanDirect();

  // Test Surepass RC with failsafe
  await testSurepassWithFailsafe();

  // Test Challan with failsafe
  await testChallanWithFailsafe();

  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================\n');
}

main().catch(console.error);
