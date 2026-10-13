const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = html.slice(html.indexOf('async function decryptItems'), html.indexOf('function itemRow'));
const context = { crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, atob };
vm.createContext(context);
vm.runInContext(source, context);

async function encrypt(key, plain) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const base = await webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), 'PBKDF2', false, ['deriveKey']);
  const aes = await webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const data = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, aes, new TextEncoder().encode(plain));
  return Object.fromEntries(Object.entries({ salt, iv, data })
    .map(([name, bytes]) => [name, Buffer.from(bytes).toString('base64')]));
}

test('key transition preserves existing access without exposing updated content', async () => {
  const currentKey = 'fixture-current-key';
  const legacyKey = 'fixture-legacy-key';
  const currentItems = [{ name: 'Updated fixture' }];
  const legacyItems = [{ name: 'Existing fixture' }];
  const current = await encrypt(currentKey, JSON.stringify(currentItems));
  const legacy = await encrypt(legacyKey, JSON.stringify(legacyItems));
  const variants = [current, legacy];
  const normalize = value => JSON.parse(JSON.stringify(value));

  assert.deepEqual(normalize(await context.decryptItems(variants, currentKey)), currentItems);
  assert.deepEqual(normalize(await context.decryptItems(variants, legacyKey)), legacyItems);
  assert.deepEqual(normalize(await context.decryptItems(current, currentKey)), currentItems);
  await assert.rejects(context.decryptItems(current, legacyKey), { name: 'OperationError' });
  await assert.rejects(context.decryptItems(variants, 'fixture-wrong-key'), { name: 'OperationError' });
});

test('authenticated malformed content is an error, not a fallback to another version', async () => {
  const key = 'fixture-format-key';
  const malformed = await encrypt(key, 'invalid JSON');
  const valid = await encrypt(key, '[]');
  await assert.rejects(context.decryptItems([malformed, valid], key), { name: 'SyntaxError' });
  await assert.rejects(context.decryptItems([], key), { message: 'No encrypted content available' });
});
