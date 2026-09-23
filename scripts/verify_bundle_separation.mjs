import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const userDistDir = path.join(rootDir, 'frontend', 'dist', 'user', 'assets');
const opsDistDir = path.join(rootDir, 'frontend', 'dist', 'operations', 'assets');

if (!fs.existsSync(userDistDir) || !fs.existsSync(opsDistDir)) {
  console.error('Error: Build artifacts not found. Please run npm run build first.');
  process.exit(1);
}

const userJsFiles = fs.readdirSync(userDistDir).filter((f) => f.endsWith('.js'));
const opsJsFiles = fs.readdirSync(opsDistDir).filter((f) => f.endsWith('.js'));

if (userJsFiles.length === 0 || opsJsFiles.length === 0) {
  console.error('Error: No JS bundles found in output directories.');
  process.exit(1);
}

const userBundle = fs.readFileSync(path.join(userDistDir, userJsFiles[0]), 'utf-8');
const opsBundle = fs.readFileSync(path.join(opsDistDir, opsJsFiles[0]), 'utf-8');

console.log('=== BUNDLE ISOLATION AUDIT ===');
console.log(`User bundle: ${userJsFiles[0]} (${(userBundle.length / 1024).toFixed(2)} KB)`);
console.log(`Operations bundle: ${opsJsFiles[0]} (${(opsBundle.length / 1024).toFixed(2)} KB)`);

let passed = true;

// 1. Critical Requirement: User bundle must NOT include Admin workspace components
const forbiddenInUser = [
  'AdminDashboard',
  'AdminStaffRoster',
  'AdminSchedules',
  'AdminAudit',
  'AdminReports',
  'AdminReadingInspection',
  'AdminDevicesWorkspace',
  'OperationalWorkspaceProvider',
];

console.log('\nChecking User Portal bundle for forbidden Admin modules...');
for (const term of forbiddenInUser) {
  if (userBundle.includes(term)) {
    console.error(`[FAIL] User bundle leaked Admin module: "${term}"`);
    passed = false;
  } else {
    console.log(`[PASS] Clean: "${term}" not in User bundle.`);
  }
}

// 2. Critical Requirement: Operations bundle must NOT include Employee camera workflow UI
const forbiddenInOps = [
  'MeterCamera',
  'Chạm để phóng to ảnh đối chiếu',
  'Đang nhận diện chỉ số',
  'btn-quick-dot',
];

console.log('\nChecking Operations Portal bundle for forbidden Employee camera UI modules...');
for (const term of forbiddenInOps) {
  if (opsBundle.includes(term)) {
    console.error(`[FAIL] Operations bundle leaked Employee camera UI module: "${term}"`);
    passed = false;
  } else {
    console.log(`[PASS] Clean: "${term}" not in Operations bundle.`);
  }
}

// 3. Verify HTML Entry Points Exist and Have Distinct Titles
const userHtml = fs.readFileSync(path.join(rootDir, 'frontend', 'dist', 'user', 'index.html'), 'utf-8');
const opsHtml = fs.readFileSync(path.join(rootDir, 'frontend', 'dist', 'operations', 'index.html'), 'utf-8');

if (!userHtml.includes('Cổng Nhân Viên Hiện Trường')) {
  console.error('[FAIL] User index.html missing expected title.');
  passed = false;
} else {
  console.log('[PASS] User Portal index.html title confirmed.');
}

if (!opsHtml.includes('Cổng Điều Hành & Quản Trị')) {
  console.error('[FAIL] Operations index.html missing expected title.');
  passed = false;
} else {
  console.log('[PASS] Operations Portal index.html title confirmed.');
}

if (userHtml.includes('manifest.webmanifest')) {
  console.log('[PASS] User Portal retains PWA manifest link.');
} else {
  console.error('[FAIL] User Portal missing PWA manifest link.');
  passed = false;
}

if (!opsHtml.includes('manifest.webmanifest')) {
  console.log('[PASS] Operations Portal clean: no PWA manifest link.');
} else {
  console.error('[FAIL] Operations Portal should not have PWA manifest link.');
  passed = false;
}

console.log('\n=== AUDIT RESULT ===');
if (passed) {
  console.log('ALL BUNDLE ISOLATION GATES PASSED! (Exit code 0)');
  process.exit(0);
} else {
  console.error('BUNDLE ISOLATION GATE FAILED! (Exit code 1)');
  process.exit(1);
}
