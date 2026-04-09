/**
 * City Normalizer Test Cases
 * Run this to verify the city matching is working correctly
 */

import { CityNormalizer } from './city-normalizer';

// Test cases for city matching
const testCases = [
  // Direct matches
  { input: 'Casablanca', expected: 'Casablanca', confidence: 1.0 },
  { input: 'Kenitra', expected: 'Kenitra Ville', confidence: 1.0 },
  { input: 'Agadir', expected: 'Agadir', confidence: 1.0 },
  
  // Common misspellings
  { input: 'Knitra', expected: 'Kenitra Ville', confidence: 'high' },
  { input: 'Casa', expected: 'Casablanca', confidence: 'high' },
  { input: 'Marrakesh', expected: 'Marrakech', confidence: 'high' },
  { input: 'Fes', expected: 'Fes', confidence: 1.0 },
  { input: 'Tanger', expected: 'Tanger', confidence: 1.0 },
  
  // Arabic names
  { input: 'الدار البيضاء', expected: 'Casablanca', confidence: 'high' },
  { input: 'الرباط', expected: 'Rabat', confidence: 'high' },
  { input: 'مراكش', expected: 'Marrakech', confidence: 'high' },
  
  // With context
  { input: 'Je veux livrer à Knitra', expected: 'Kenitra Ville', confidence: 'high' },
  { input: 'Adresse: Casa, quartier Maarif', expected: 'Casablanca', confidence: 'high' },
  { input: 'Livraison à Marrakesh centre', expected: 'Marrakech', confidence: 'high' },
  
  // Edge cases
  { input: 'Paris', expected: null, confidence: 0 },
  { input: '', expected: null, confidence: 0 },
  { input: '123', expected: null, confidence: 0 },
];

console.log('🧪 Testing City Normalizer...\n');

testCases.forEach((testCase, index) => {
  const result = CityNormalizer.normalizeCity(testCase.input);
  
  const passed = result 
    ? (result.normalizedCity === testCase.expected && 
       (testCase.confidence === 1.0 ? result.confidence === 1.0 : result.confidence > 0.6))
    : testCase.expected === null;
  
  console.log(`Test ${index + 1}: "${testCase.input}"`);
  console.log(`  Expected: ${testCase.expected || 'null'}`);
  console.log(`  Got: ${result ? `${result.normalizedCity} (${Math.round(result.confidence * 100)}%)` : 'null'}`);
  console.log(`  Shipping Fee: ${result?.shippingFee || 'N/A'} DH`);
  console.log(`  Return Fee: ${result?.returnFee || 'N/A'} DH`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
});

// Test shipping fee lookup
console.log('📦 Testing Shipping Fee Lookup...\n');

const shippingTests = [
  'Casablanca', // Should be 20 DH
  'Kenitra Ville', // Should be 35 DH  
  'Agadir', // Should be 35 DH
  'Dakhla', // Should be 45 DH
  'Knitra', // Should match to Kenitra Ville (35 DH)
];

shippingTests.forEach(city => {
  const result = CityNormalizer.normalizeCity(city);
  console.log(`"${city}" -> Shipping: ${result?.shippingFee || 'N/A'} DH, Return: ${result?.returnFee || 'N/A'} DH`);
});

console.log('\n🎯 City Normalizer test complete!');
