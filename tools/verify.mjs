#!/usr/bin/env node
// usage: node tools/verify.mjs <sku-id> <key-file>
// Verifies encrypted item payload and encrypted HTML assets without printing keys, URLs, or asset paths.
import { webcrypto as crypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const [skuId, keyFile] = process.argv.slice(2);
if (!skuId || !keyFile) {
  console.error("usage: node tools/verify.mjs <sku-id> <key-file>");
  process.exit(1);
}
const key = readFileSync(keyFile, "utf8").trim();
const skus = JSON.parse(readFileSync(new URL("../skus.json", import.meta.url), "utf8"));
const sku = skus.find((s) => s.id === skuId);
if (!sku) throw new Error("sku not found");
const b64 = (s) => Uint8Array.from(Buffer.from(s, "base64"));
async function derive(salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(salt), iterations: 120000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
async function decrypt(enc) {
  const aes = await derive(enc.salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, aes, b64(enc.data));
  return Buffer.from(plain);
}
const listRaw = await decrypt(sku.enc);
const list = JSON.parse(listRaw.toString("utf8"));
const items = Array.isArray(list) ? list : list.items || [];
const result = { sku: skuId, items: items.length, assets: [] };
for (const item of items) {
  if (item.type !== "encrypted-html") continue;
  const enc = JSON.parse(readFileSync(new URL("../" + item.path, import.meta.url), "utf8"));
  const raw = await decrypt(enc);
  result.assets.push({ name: item.name, bytes: raw.length, sha256_12: createHash("sha256").update(raw).digest("hex").slice(0, 12), html: raw.toString("utf8", 0, 200).includes("<!DOCTYPE html>") || raw.toString("utf8", 0, 200).includes("<!doctype html>") });
}
console.log(JSON.stringify(result, null, 2));
