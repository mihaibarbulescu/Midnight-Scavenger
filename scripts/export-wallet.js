#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const SECURE_DIR = path.join(process.cwd(), 'secure');
const SEED_FILE = path.join(SECURE_DIR, 'wallet-seed.json.enc');
const EXPORT_STATE_FILE = path.join(SECURE_DIR, 'mnemonic-export-state.json');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 32 * 1024 * 1024;

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
}

function decrypt(encrypted, passphrase) {
  const salt = Buffer.from(encrypted.salt, 'hex');
  const key = deriveKey(passphrase, salt);
  const iv = Buffer.from(encrypted.iv, 'hex');
  const tag = Buffer.from(encrypted.tag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

function readExportState() {
  if (!fs.existsSync(EXPORT_STATE_FILE)) {
    return {
      available: false,
      createdAt: new Date(0).toISOString(),
      retrievedAt: null,
    };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(EXPORT_STATE_FILE, 'utf8'));
    return {
      available: Boolean(raw.available),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
      retrievedAt: typeof raw.retrievedAt === 'string' ? raw.retrievedAt : null,
    };
  } catch (error) {
    console.warn('[wallet:export] Failed to parse export state, assuming unavailable.');
    return {
      available: false,
      createdAt: new Date(0).toISOString(),
      retrievedAt: null,
    };
  }
}

function writeExportState(state) {
  fs.writeFileSync(EXPORT_STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

function askHidden(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return new Promise(resolve => {
    rl.stdoutMuted = true;
    rl.question(query, answer => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    rl._writeToOutput = stringToWrite => {
      if (rl.stdoutMuted) {
        rl.output.write('*');
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

async function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error('No wallet seed file found.');
    process.exit(1);
  }

  const state = readExportState();
  if (!state.available) {
    console.error('Mnemonic export has already been used or is unavailable.');
    process.exit(1);
  }

  console.log('This command will decrypt and display the wallet mnemonic once.');
  console.log('Ensure you are in a secure environment before continuing.');
  const confirmation = await askQuestion('Type "CONFIRM" to continue: ');
  if (confirmation.trim() !== 'CONFIRM') {
    console.log('Aborted.');
    process.exit(0);
  }

  const password = await askHidden('Enter wallet password: ');

  let encrypted;
  try {
    encrypted = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  } catch (error) {
    console.error('Failed to read encrypted wallet seed file.');
    process.exit(1);
  }

  let mnemonic;
  try {
    mnemonic = decrypt(encrypted, password);
  } catch (error) {
    console.error('Failed to decrypt wallet. Incorrect password?');
    process.exit(1);
  }

  writeExportState({
    available: false,
    createdAt: state.createdAt,
    retrievedAt: new Date().toISOString(),
  });

  console.log('\n================ WALLET MNEMONIC ================\n');
  console.log(mnemonic);
  console.log('\n=================================================\n');
  console.log('The mnemonic has been marked as retrieved and cannot be exported again.');
}

main().catch(error => {
  console.error('Unexpected error exporting wallet mnemonic:', error);
  process.exit(1);
});
