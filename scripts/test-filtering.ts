import { test } from 'node:test';
import assert from 'node:assert';
import { filterCountries, COUNTRIES } from '../src/utils/country-data';

test('filterCountries returns all countries for empty query', () => {
  const result = filterCountries('');
  assert.strictEqual(result.length, COUNTRIES.length);
  assert.deepStrictEqual(result, COUNTRIES);
});

test('filterCountries returns correct matches for case-insensitive query', () => {
  const result = filterCountries('united');
  // United States, United Kingdom, United Arab Emirates
  assert.ok(result.some(c => c.name === 'United States'));
  assert.ok(result.some(c => c.name === 'United Kingdom'));
  assert.ok(result.some(c => c.name === 'United Arab Emirates'));
  // Should not contain unrelated
  assert.ok(!result.some(c => c.name === 'Canada'));
});

test('filterCountries returns correct matches for single letter', () => {
    const result = filterCountries('z');
    // New Zealand, Brazil, Switzerland, Czech Republic, etc?
    // Let's check specific ones
    assert.ok(result.some(c => c.name === 'New Zealand'));
    assert.ok(result.some(c => c.name === 'Brazil'));
});

test('filterCountries returns empty array for no match', () => {
  const result = filterCountries('xyz_no_match_at_all');
  assert.strictEqual(result.length, 0);
});
