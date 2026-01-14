import { test } from 'node:test';
import assert from 'node:assert';
import { filterCountries, ALL_COUNTRIES } from '../src/utils/country-data';

test('filterCountries returns all countries for empty query', () => {
  const result = filterCountries('');
  assert.strictEqual(result.length, ALL_COUNTRIES.length);
  assert.deepStrictEqual(result, ALL_COUNTRIES);
});

test('filterCountries returns correct matches for case-insensitive query', () => {
  const result = filterCountries('united');
  // United States, United Kingdom, United Arab Emirates
  assert.ok(result.includes('United States'));
  assert.ok(result.includes('United Kingdom'));
  assert.ok(result.includes('United Arab Emirates'));
  // Should not contain unrelated
  assert.ok(!result.includes('Canada'));
});

test('filterCountries returns correct matches for single letter', () => {
    const result = filterCountries('z');
    // New Zealand, Brazil, Switzerland, Czech Republic, etc?
    // Let's check specific ones
    assert.ok(result.includes('New Zealand'));
    assert.ok(result.includes('Brazil'));
});

test('filterCountries returns empty array for no match', () => {
  const result = filterCountries('xyz_no_match_at_all');
  assert.strictEqual(result.length, 0);
});
