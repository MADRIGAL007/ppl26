
// @ts-nocheck
const { performance } = require('perf_hooks');
import { getCardType } from './src/components/card-validation.utils';

const samples = [
    "4111111111111111", // Visa
    "5100000000000000", // Mastercard
    "340000000000000",  // Amex
    "6011000000000000", // Discover
    "3528000000000000", // JCB
    "30000000000000",   // Diners
    "9999999999999999"  // Unknown
];

const ITERATIONS = 1_000_000;

function benchmarkOld(iterations: number) {
    let cardType = 'unknown';
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        const num = samples[i % samples.length];

        // OLD LOGIC (Inline Regex)
        if (/^4/.test(num)) cardType = 'visa';
        else if (/^5[1-5]/.test(num) || /^2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d\d|7(?:[01]\d|20))/.test(num)) cardType = 'mastercard';
        else if (/^3[47]/.test(num)) cardType = 'amex';
        else if (/^6(?:011|5)/.test(num)) cardType = 'discover';
        else if (/^(?:2131|1800|35\d{3})/.test(num)) cardType = 'jcb';
        else if (/^3(?:0[0-5]|[68])/ .test(num)) cardType = 'diners';
        else cardType = 'unknown';
    }

    const end = performance.now();
    return end - start;
}

function benchmarkNew(iterations: number) {
    let cardType = 'unknown';
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        const num = samples[i % samples.length];
        cardType = getCardType(num);
    }

    const end = performance.now();
    return end - start;
}

console.log(`Running Benchmarks (${ITERATIONS} iterations)...`);

// Warmup
benchmarkOld(10000);
benchmarkNew(10000);

const oldDuration = benchmarkOld(ITERATIONS);
console.log(`Baseline (Inline Regex): ${oldDuration.toFixed(2)} ms`);
console.log(`Baseline Ops/sec: ${(ITERATIONS / (oldDuration / 1000)).toFixed(2)}`);

const newDuration = benchmarkNew(ITERATIONS);
console.log(`Optimized (Constants): ${newDuration.toFixed(2)} ms`);
console.log(`Optimized Ops/sec: ${(ITERATIONS / (newDuration / 1000)).toFixed(2)}`);

const improvement = ((oldDuration - newDuration) / oldDuration) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}%`);
