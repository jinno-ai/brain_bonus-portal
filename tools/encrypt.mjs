#!/usr/bin/env node
// usage: node tools/encrypt.mjs <items.json> <key>
// Prints { salt, iv, data } (base64) to paste into SKUS[].enc in index.html.
// The items JSON and the key must never be committed.
import { webcrypto as crypto } from "node:crypto";
import { readFileSync } from "node:fs";

const [file, key] = process.argv.slice(2);
if (!file || !key) {
  console.error("usage: node tools/encrypt.mjs <items.json> <key>");
  process.exit(1);
}

const b64 = (buf) => Buffer.from(buf).toString("base64");
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(key), "PBKDF2", false, ["deriveKey"]);
const aes = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const data = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv }, aes, new TextEncoder().encode(readFileSync(file, "utf8")));
console.log(JSON.stringify({ salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(data)) }, null, 2));
