#!/usr/bin/env node
/**
 * Izvozi produkcijske podatke iz Vercel Blob u lokalne fajlove.
 * Ne menja ništa na Vercelu — samo čita (read-only).
 *
 * Upotreba:
 *   node scripts/export-vercel-blob.mjs
 *   node scripts/export-vercel-blob.mjs --env .env.production.local
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { get, head, list } from "@vercel/blob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const JSON_BLOBS = [
  { blob: "cms/products.json", local: "src/data/products.json" },
  { blob: "cms/site-settings.json", local: "src/data/site-settings.json" },
  { blob: "cms/orders.json", local: "src/data/orders.json" },
];

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    throw new Error(`Env fajl ne postoji: ${envPath}`);
  }

  const vars = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupFile(src, backupDir) {
  if (!existsSync(src)) return false;
  const dest = join(backupDir, src.replace(root + "/", ""));
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  return true;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadBlob(blobPath, token) {
  for (const access of ["public", "private"]) {
    try {
      const result = await get(blobPath, { token, access });
      if (!result?.stream) continue;
      const bytes = await streamToBuffer(result.stream);
      if (bytes.length > 0) return bytes;
    } catch {
      // probaj sledeći access mod
    }
  }
  throw new Error(
    `Ne mogu da preuzmem ${blobPath}. Ako vidiš "store suspended" — Blob je suspendovan na Vercelu.`,
  );
}

async function fetchBlobJson(blobPath, token) {
  const meta = await head(blobPath, { token });
  const bytes = await downloadBlob(blobPath, token);
  const text = bytes.toString("utf-8");
  return { text, meta };
}

async function downloadBinary(blobPath, token, destPath) {
  const bytes = await downloadBlob(blobPath, token);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, bytes);
  return bytes.length;
}

async function listAllBlobs(prefix, token) {
  const blobs = [];
  let cursor;

  do {
    const page = await list({ prefix, token, limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return blobs;
}

async function main() {
  const envArg = process.argv.find((a) => a.startsWith("--env="))?.split("=")[1] || ".env.production.local";
  const envPath = join(root, envArg);
  const env = loadEnvFile(envPath);
  const token = env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error(`BLOB_READ_WRITE_TOKEN nije podešen u ${envArg}`);
  }

  const backupDir = join(root, "backups", `pre-export-${timestamp()}`);
  mkdirSync(backupDir, { recursive: true });
  console.log(`\n📦 Backup lokalnih fajlova → ${backupDir.replace(root + "/", "")}`);

  for (const { local } of JSON_BLOBS) {
    const full = join(root, local);
    if (backupFile(full, backupDir)) {
      console.log(`  ✓ backup: ${local}`);
    }
  }

  const manifest = {
    exported_at: new Date().toISOString(),
    source: "vercel-blob",
    env_file: envArg,
    backup_dir: backupDir.replace(root + "/", ""),
    json: {},
    media: { count: 0, total_bytes: 0, files: [] },
  };

  console.log("\n📥 Izvoz JSON podataka sa Vercel Blob-a...");

  for (const { blob, local } of JSON_BLOBS) {
    const dest = join(root, local);
    try {
      const { text, meta } = await fetchBlobJson(blob, token);
      const parsed = JSON.parse(text);
      const count = Array.isArray(parsed) ? parsed.length : 1;
      writeFileSync(dest, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
      manifest.json[blob] = {
        local,
        bytes: text.length,
        items: count,
        url: meta.url,
        ok: true,
      };
      console.log(`  ✓ ${blob} → ${local} (${count} stavki, ${text.length} bajtova)`);
    } catch (err) {
      manifest.json[blob] = {
        local,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      console.log(`  ⚠ ${blob} — preskočeno (${err instanceof Error ? err.message : err})`);
    }
  }

  console.log("\n🖼  Izvoz slika (cms/media/)...");
  const mediaBlobs = await listAllBlobs("cms/media/", token);
  const mediaRoot = join(root, "public/uploads/cms-media");

  for (const blob of mediaBlobs) {
    const filename = blob.pathname.replace("cms/media/", "");
    const dest = join(mediaRoot, filename);
    try {
      const size = await downloadBinary(blob.pathname, token, dest);
      manifest.media.files.push({
        pathname: blob.pathname,
        local: `public/uploads/cms-media/${filename}`,
        bytes: size,
      });
      manifest.media.total_bytes += size;
      manifest.media.count++;
    } catch (err) {
      console.log(`  ⚠ ${blob.pathname} — greška: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`  ✓ ${manifest.media.count} slika (${(manifest.media.total_bytes / 1024 / 1024).toFixed(2)} MB)`);

  const manifestPath = join(root, "backups", "export-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

  console.log("\n✅ Izvoz završen.");
  console.log(`   Manifest: backups/export-manifest.json`);
  console.log(`   Backup:   ${manifest.backup_dir}`);
  console.log("\nℹ️  Vercel produkcija nije dirana — ovo je samo lokalna kopija.\n");
}

main().catch((err) => {
  console.error("\n❌ Greška:", err instanceof Error ? err.message : err);
  process.exit(1);
});