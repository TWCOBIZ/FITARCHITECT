import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * FitArchitect Environment Readiness Checker
 * Run with: npx ts-node scripts/check-readiness.ts
 */

const REQUIRED_NODE_VERSION = 18;
const REQUIRED_NPM_VERSION = 8;
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'WGER_API_KEY',
  'OPEN_FOOD_FACTS_API_KEY',
  'OPENAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'STRIPE_SECRET_KEY',
];

function logStep(step: string) {
  console.log(`\n=== ${step} ===`);
}

function logSuccess(msg: string) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function logError(msg: string) {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
}

function checkVersion(cmd: string, required: number, name: string) {
  try {
    const version = execSync(cmd).toString().trim().replace(/^v/, '');
    const major = parseInt(version.split('.')[0], 10);
    if (major >= required) {
      logSuccess(`${name} version ${version} is compatible.`);
      return true;
    } else {
      logError(`${name} version ${version} is too old. Required: >= ${required}.x`);
      return false;
    }
  } catch (e) {
    logError(`Failed to check ${name} version.`);
    return false;
  }
}

function checkAndInstallDeps(dir: string): boolean {
  try {
    if (!fs.existsSync(path.join(dir, 'package.json'))) {
      logError(`No package.json found in ${dir}`);
      return false;
    }
    logStep(`Checking dependencies in ${dir}`);
    execSync('npm install', { cwd: dir, stdio: 'ignore' });
    logSuccess(`Dependencies installed in ${dir}`);
    return true;
  } catch (e) {
    logError(`Failed to install dependencies in ${dir}`);
    return false;
  }
}

function checkEnvFile(dir: string): boolean {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) {
    logError(`Missing .env file in ${dir}`);
    return false;
  }
  const envContent = fs.readFileSync(envPath, 'utf-8');
  let allPresent = true;
  for (const key of REQUIRED_ENV_VARS) {
    if (!envContent.includes(key + '=')) {
      logError(`Missing ${key} in ${dir}/.env`);
      allPresent = false;
    }
  }
  if (allPresent) logSuccess(`All required env vars present in ${dir}/.env`);
  return allPresent;
}

function checkPrismaStatus(): boolean {
  try {
    logStep('Checking Prisma migration status');
    const output = execSync('npx prisma migrate status', { encoding: 'utf-8' });
    if (output.includes('Database schema is up to date')) {
      logSuccess('Prisma schema is in sync with the database.');
      return true;
    } else {
      logError('Prisma schema is NOT in sync. Run migrations.');
      return false;
    }
  } catch (e) {
    logError('Failed to check Prisma migration status.');
    return false;
  }
}

async function runDevAllAndCheckBoot(): Promise<boolean> {
  return new Promise((resolve) => {
    logStep('Starting application with npm run dev:all');
    const proc = spawn('npm', ['run', 'dev:all'], { cwd: process.cwd(), shell: true });
    let output = '';
    let errorFound = false;
    const timer = setTimeout(() => {
      proc.kill();
      if (!errorFound) {
        logSuccess('npm run dev:all started without boot errors in 10 seconds.');
        resolve(true);
      }
    }, 10000);
    proc.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stdout.write(str);
      if (/error|failed|EADDRINUSE|ECONNREFUSED|Cannot|Unhandled/i.test(str)) {
        errorFound = true;
        clearTimeout(timer);
        proc.kill();
        logError('npm run dev:all failed to start. Check output above.');
        resolve(false);
      }
    });
    proc.stderr.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stderr.write(str);
      if (/error|failed|EADDRINUSE|ECONNREFUSED|Cannot|Unhandled/i.test(str)) {
        errorFound = true;
        clearTimeout(timer);
        proc.kill();
        logError('npm run dev:all failed to start. Check output above.');
        resolve(false);
      }
    });
    proc.on('exit', (code) => {
      if (!errorFound && code !== 0) {
        clearTimeout(timer);
        logError(`npm run dev:all exited with code ${code}`);
        resolve(false);
      }
    });
  });
}

async function testParqSubmitEndpoint() {
  try {
    logStep('Testing /parq/submit endpoint');
    const response = await axios.post('http://localhost:3001/parq/submit', {
      userId: 'test-user',
      answers: { test: true },
    }, { timeout: 5000 });
    if (response.status === 200) {
      logSuccess('/parq/submit endpoint responded successfully.');
      return true;
    } else {
      logError(`/parq/submit endpoint returned status ${response.status}`);
      return false;
    }
  } catch (e: any) {
    logError(`/parq/submit endpoint test failed: ${e.message}`);
    return false;
  }
}

function runLintAndTypeCheck(dir: string): boolean {
  try {
    logStep(`Running lint and type check in ${dir}`);
    execSync('npm run lint', { cwd: dir, stdio: 'ignore' });
    execSync('tsc --noEmit', { cwd: dir, stdio: 'ignore' });
    logSuccess(`Lint and type check passed in ${dir}`);
    return true;
  } catch (e) {
    logError(`Lint or type check failed in ${dir}`);
    return false;
  }
}

function checkGitStatus(): boolean {
  try {
    logStep('Checking git status');
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    if (status === '' && branch === 'main') {
      logSuccess('Git workspace is clean and on main branch.');
      return true;
    } else {
      if (status !== '') logError('Git workspace has uncommitted changes.');
      if (branch !== 'main') logError(`Not on main branch (current: ${branch}).`);
      return false;
    }
  } catch (e) {
    logError('Failed to check git status.');
    return false;
  }
}

async function main() {
  logStep('FitArchitect Environment Readiness Check');

  // Node/npm version
  checkVersion('node -v', REQUIRED_NODE_VERSION, 'Node.js');
  checkVersion('npm -v', REQUIRED_NPM_VERSION, 'npm');

  // Dependencies
  const clientDir = path.join(process.cwd(), 'client');
  const serverDir = path.join(process.cwd(), 'server');
  checkAndInstallDeps(clientDir);
  checkAndInstallDeps(serverDir);

  // .env files
  checkEnvFile(clientDir);
  checkEnvFile(serverDir);

  // Prisma
  checkPrismaStatus();

  // Start servers with dev:all
  await runDevAllAndCheckBoot();

  // Test endpoint
  await testParqSubmitEndpoint();

  // Lint/type check
  runLintAndTypeCheck(clientDir);
  runLintAndTypeCheck(serverDir);

  // Git status
  checkGitStatus();

  logStep('Readiness check complete. Review errors above if any.');
}

main(); 