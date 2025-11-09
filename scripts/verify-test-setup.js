/**
 * Script per verificare la configurazione dei test
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Verifica configurazione test...\n');

// Verifica .env
const envPath = join(projectRoot, '.env');
if (existsSync(envPath)) {
  console.log('✅ File .env trovato');
  const envContent = readFileSync(envPath, 'utf-8');
  
  const hasEmail = envContent.includes('TEST_USER_EMAIL');
  const hasPassword = envContent.includes('TEST_USER_PASSWORD');
  
  if (hasEmail && hasPassword) {
    console.log('✅ Credenziali test configurate in .env');
  } else {
    console.log('⚠️  .env manca TEST_USER_EMAIL o TEST_USER_PASSWORD');
  }
} else {
  console.log('❌ File .env non trovato');
}

// Verifica chrome-extension
const extensionPath = join(projectRoot, 'chrome-extension', 'manifest.json');
if (existsSync(extensionPath)) {
  console.log('✅ Chrome Extension trovata');
  try {
    const manifest = JSON.parse(readFileSync(extensionPath, 'utf-8'));
    console.log(`   Versione: ${manifest.version}`);
    console.log(`   Manifest V${manifest.manifest_version}`);
  } catch (e) {
    console.log('⚠️  Errore nel leggere manifest.json');
  }
} else {
  console.log('⚠️  Chrome Extension non trovata');
}

// Verifica test files
const testFiles = [
  'tests/auth.spec.ts',
  'tests/e2e/networking-flow.spec.ts',
  'tests/e2e/applications-flow.spec.ts',
  'tests/chrome-extension.spec.ts',
  'tests/helpers/auth-helper.ts',
];

console.log('\n📁 Verifica file test:');
testFiles.forEach(file => {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} mancante`);
  }
});

// Verifica GitHub workflows
const workflowsPath = join(projectRoot, '.github', 'workflows');
if (existsSync(workflowsPath)) {
  console.log('\n🔧 GitHub Workflows:');
  const workflows = ['ci.yml', 'test.yml'];
  workflows.forEach(workflow => {
    const workflowPath = join(workflowsPath, workflow);
    if (existsSync(workflowPath)) {
      console.log(`✅ ${workflow}`);
    } else {
      console.log(`❌ ${workflow} mancante`);
    }
  });
}

console.log('\n✨ Verifica completata!\n');

