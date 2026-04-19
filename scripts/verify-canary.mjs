#!/usr/bin/env node
/**
 * verify-canary.mjs
 *
 * Reads .canary-manifest.json and re-computes SHA-256 for every listed file.
 * Exits non-zero (and prints a structured drift report) if anything changed,
 * was deleted, or has a different size on disk.
 *
 * Used by the weekly Canary Verify GitHub Action to detect tampering with
 * governance-critical files (edge functions, migrations, AOS spec).
 *
 * Run locally: `node scripts/verify-canary.mjs`
 *              `node scripts/verify-canary.mjs --json`   (machine-readable)
 *              `node scripts/verify-canary.mjs --update` (regenerate manifest)
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const MANIFEST_PATH = resolve(process.cwd(), ".canary-manifest.json");
const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const update = args.has("--update");

async function sha256(path) {
  const buf = await readFile(path);
  return { sha256: createHash("sha256").update(buf).digest("hex"), bytes: buf.length };
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`✗ manifest not found at ${MANIFEST_PATH}`);
    process.exit(2);
  }
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

async function regenerate(manifest) {
  const updated = [];
  for (const entry of manifest.files) {
    if (!existsSync(entry.path)) continue;
    const { sha256: h, bytes } = await sha256(entry.path);
    updated.push({ path: entry.path, sha256: h, bytes });
  }
  manifest.files = updated;
  manifest.generated_at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`✓ regenerated .canary-manifest.json (${updated.length} entries)`);
}

async function verify(manifest) {
  const drift = [];
  for (const entry of manifest.files) {
    if (!existsSync(entry.path)) {
      drift.push({ path: entry.path, kind: "missing", expected: entry.sha256 });
      continue;
    }
    const { sha256: actual, bytes } = await sha256(entry.path);
    if (actual !== entry.sha256) {
      drift.push({
        path: entry.path,
        kind: "modified",
        expected: entry.sha256,
        actual,
        expected_bytes: entry.bytes,
        actual_bytes: bytes,
      });
    }
  }
  return drift;
}

const manifest = await loadManifest();

if (update) {
  await regenerate(manifest);
  process.exit(0);
}

const drift = await verify(manifest);

if (asJson) {
  console.log(
    JSON.stringify(
      {
        ok: drift.length === 0,
        manifest_generated_at: manifest.generated_at,
        checked: manifest.files.length,
        drift_count: drift.length,
        drift,
      },
      null,
      2,
    ),
  );
} else if (drift.length === 0) {
  console.log(`✓ canary manifest verified — ${manifest.files.length} files match`);
  console.log(`  manifest generated_at: ${manifest.generated_at}`);
} else {
  console.error(`✗ canary drift detected — ${drift.length} of ${manifest.files.length} files differ\n`);
  for (const d of drift) {
    if (d.kind === "missing") {
      console.error(`  MISSING   ${d.path}`);
      console.error(`            expected sha256: ${d.expected}`);
    } else {
      console.error(`  MODIFIED  ${d.path}`);
      console.error(`            expected: ${d.expected} (${d.expected_bytes} bytes)`);
      console.error(`            actual:   ${d.actual} (${d.actual_bytes} bytes)`);
    }
  }
  console.error("\nIf this change is intentional, run: node scripts/verify-canary.mjs --update");
  console.error("and commit the updated .canary-manifest.json.");
}

process.exit(drift.length === 0 ? 0 : 1);
