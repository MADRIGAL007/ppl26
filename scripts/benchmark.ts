import { performance } from 'perf_hooks';
import { filterCountries, COUNTRIES } from '../src/utils/country-data';

// Naive implementation (original code)
function naiveFilter(query: string): string[] {
    const q = query.toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c: any) => c.name.toLowerCase().includes(q));
}

const ITERATIONS = 100000;
const QUERIES = ['', 'united', 'a', 'norway', 'xyz_no_match'];

console.log(`Running benchmark with ${ITERATIONS} iterations per query set...`);
console.log(`Queries: ${JSON.stringify(QUERIES)}`);

// Warmup
for (let i = 0; i < 100; i++) {
    QUERIES.forEach(q => {
        naiveFilter(q);
        filterCountries(q);
    });
}

// Benchmark Naive
const startNaive = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    for (const q of QUERIES) {
        naiveFilter(q);
    }
}
const endNaive = performance.now();
const timeNaive = endNaive - startNaive;

// Benchmark Optimized
const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    for (const q of QUERIES) {
        filterCountries(q);
    }
}
const endOpt = performance.now();
const timeOpt = endOpt - startOpt;

console.log('--------------------------------------------------');
console.log(`Naive Implementation:    ${timeNaive.toFixed(2)} ms`);
console.log(`Optimized Implementation:  ${timeOpt.toFixed(2)} ms`);
console.log(`Improvement:             ${(timeNaive / timeOpt).toFixed(2)}x faster`);
console.log('--------------------------------------------------');
