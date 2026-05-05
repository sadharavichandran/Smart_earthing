#!/usr/bin/env node

/**
 * Quick verification script for EarthGuard NetworkError fix
 * Run this to verify all fixes are in place
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════╗');
console.log('║  EarthGuard Network Error Fix Verification  ║');
console.log('╚════════════════════════════════════════════╝\n');

let passed = 0;
let total = 0;

function check(name, condition, details = '') {
  total++;
  const status = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${name}`);
  if (details) console.log(`      ${details}`);
  if (condition) passed++;
}

// 1. Check file modifications
console.log('\n📋 Checking File Modifications...\n');

const appJs = fs.readFileSync(path.join(__dirname, 'src/App.js'), 'utf8');
check('AbortController in storage', appJs.includes('AbortController'), 
  'Request cancellation implemented');
check('cancelPendingRequests method', appJs.includes('cancelPendingRequests'), 
  'Session cleanup ready');
check('Enhanced error handling', appJs.includes('Cannot connect to'), 
  'Diagnostic error messages added');

const serverJs = fs.readFileSync(path.join(__dirname, 'server/index.js'), 'utf8');
check('CORS OPTIONS handler', serverJs.includes("app.options('*'"), 
  'Preflight requests handled');
check('Expanded allowed origins', serverJs.includes('127.0.0.1'), 
  'Both localhost variants supported');
check('Fixed pool references', !serverJs.includes('const conn = await pool.getConnection()'), 
  'Using getPool() correctly');
check('Enhanced health endpoint', serverJs.includes('port: PORT'), 
  'Diagnostic info in health endpoint');

// 2. Check .env.local
console.log('\n📝 Checking Configuration Files...\n');

const envLocal = path.join(__dirname, '.env.local');
check('.env.local exists', fs.existsSync(envLocal), 
  'Frontend environment configured');

if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, 'utf8');
  check('API URL configured', envContent.includes('REACT_APP_API_URL'), 
    'Backend URL specified');
}

// 3. Syntax checks
console.log('\n✔️  Verifying Syntax...\n');

const { execSync } = require('child_process');

try {
  execSync('node -c src/App.js', { stdio: 'pipe' });
  check('App.js syntax', true, 'No syntax errors');
} catch (e) {
  check('App.js syntax', false, 'Syntax error found');
}

try {
  execSync('node -c server/index.js', { stdio: 'pipe' });
  check('server/index.js syntax', true, 'No syntax errors');
} catch (e) {
  check('server/index.js syntax', false, 'Syntax error found');
}

// 4. Documentation
console.log('\n📚 Documentation Files...\n');

check('FIX_SUMMARY.md exists', fs.existsSync(path.join(__dirname, 'FIX_SUMMARY.md')), 
  'Complete fix documentation');
check('NETWORK_ERROR_FIX.md exists', fs.existsSync(path.join(__dirname, 'NETWORK_ERROR_FIX.md')), 
  'Troubleshooting guide');

// Results
console.log('\n╔════════════════════════════════════════════╗');
console.log(`║  Results: ${passed}/${total} checks passed              ║`);
console.log('╚════════════════════════════════════════════╝\n');

if (passed === total) {
  console.log('✅ All fixes verified! Ready to test.\n');
  console.log('Next steps:');
  console.log('  1. Start backend:  npm run server');
  console.log('  2. Start frontend: npm start');
  console.log('  3. Test login flow');
} else {
  console.log(`❌ ${total - passed} check(s) failed. Review the output above.\n`);
}

process.exit(passed === total ? 0 : 1);
