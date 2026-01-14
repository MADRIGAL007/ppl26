
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

const ITERATIONS = 1_000_000;
// Use process.cwd() to avoid __dirname issues in ESM/TS-Node mixed envs
const TEST_FILE = path.join(process.cwd(), 'benchmark_test_file.txt');

// Setup
fs.writeFileSync(TEST_FILE, 'benchmark');

console.log(`Running benchmark on file: ${TEST_FILE}`);

// 1. Measure fs.existsSync (Current Implementation)
const startFs = performance.now();
let foundFs = false;
for (let i = 0; i < ITERATIONS; i++) {
    foundFs = fs.existsSync(TEST_FILE);
}
const endFs = performance.now();
const durationFs = endFs - startFs;

// 2. Measure Cached Variable (Optimized Implementation)
const cachedPath = TEST_FILE; // Simulate pre-resolved path
const startCache = performance.now();
let foundCache = false;
for (let i = 0; i < ITERATIONS; i++) {
    foundCache = !!cachedPath; // Simulate checking if (validPath)
}
const endCache = performance.now();
const durationCache = endCache - startCache;

// Cleanup
if (fs.existsSync(TEST_FILE)) {
    fs.unlinkSync(TEST_FILE);
}

// Report
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`[Baseline] fs.existsSync: ${durationFs.toFixed(2)} ms`);
console.log(`[Optimized] Cached check: ${durationCache.toFixed(2)} ms`);
console.log(`Improvement: ${(durationFs / durationCache).toFixed(2)}x faster`);
