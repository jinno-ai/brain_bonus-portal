#!/usr/bin/env node
// usage: node tools/encrypt-file.mjs <input-file> <key-file> <output-json>
// Encrypts an asset with AES-256-GCM using a PBKDF2-derived key.
// The input file, key file, and plaintext output must never be committed.
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [input, keyFile, output] = process.argv.slice(2);
if (!input || !keyFile || !output) {
  console.error("usage: node tools/encrypt-file.mjs <input-file> <key-file> <output-json>");
  process.exit(1);
}

const key = readFileSync(keyFile, "utf8").trim();
const plain = readFileSync(input);
const b64 = (buf) => Buffer.from(buf).toString("base64");
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(key), "PBKDF2", false, ["deriveKey"]);
const aes = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, plain);
writeFileSync(output, JSON.stringify({ v: 1, encoding: "identity", salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(data)) }));
console.log(JSON.stringify({ output, plainBytes: plain.length, encryptedBytes: new Uint8Array(data).length }));
