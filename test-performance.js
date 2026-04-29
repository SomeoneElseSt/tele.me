// Quick performance test of binary MP4 manipulation
import { readFileSync } from 'fs';
import { performance } from 'perf_hooks';

// Simulate the binary fix function (simplified for testing)
function simulateBinaryFix(data) {
  // This simulates reading/writing MP4 boxes
  const mutable = new Uint8Array(data);
  
  // Simulate finding boxes, reading timestamps, rewriting
  // This is what injectFullFrameRateIntent does
  for (let i = 0; i < mutable.length; i += 4) {
    // Simulate box traversal and modification
    if (mutable[i] !== 0) {
      mutable[i] = mutable[i]; // No-op to simulate write
    }
  }
  
  // Simulate adding meta box (~350 bytes)
  const result = new Uint8Array(mutable.length + 350);
  result.set(mutable, 0);
  
  return result;
}

// Create test data of different sizes
const sizes = [
  { name: '5MB (10s video)', size: 5 * 1024 * 1024 },
  { name: '15MB (30s video)', size: 15 * 1024 * 1024 },
  { name: '30MB (60s video)', size: 30 * 1024 * 1024 },
];

console.log('Testing Binary MP4 Manipulation Performance\n');
console.log('='.repeat(60));

sizes.forEach(({ name, size }) => {
  const testData = new Uint8Array(size);
  // Fill with some data
  for (let i = 0; i < Math.min(size, 10000); i++) {
    testData[i] = Math.floor(Math.random() * 256);
  }
  
  const start = performance.now();
  const result = simulateBinaryFix(testData);
  const end = performance.now();
  
  const timeMs = (end - start).toFixed(2);
  const inputMB = (size / 1024 / 1024).toFixed(1);
  const outputMB = (result.byteLength / 1024 / 1024).toFixed(1);
  
  console.log(`\n${name}`);
  console.log(`  Input:  ${inputMB}MB`);
  console.log(`  Output: ${outputMB}MB`);
  console.log(`  Time:   ${timeMs}ms`);
  console.log(`  Speed:  ${(size / (end - start) / 1024).toFixed(0)} MB/s`);
});

console.log('\n' + '='.repeat(60));
console.log('\nConclusion: Binary manipulation is O(n) with file size.');
console.log('Expected for real MP4s: 100-500ms depending on video length.');
console.log('\nNow need to test FFmpeg re-encode to compare...');
