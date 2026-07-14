#!/usr/bin/env node
/**
 * Uklanja cron za automatsko ažuriranje cena sa servera.
 * Usage: npm run ssh:disable-price-cron
 */
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadSshEnv } from "./ssh-load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = loadSshEnv();
const target = `${env.SSH_USER}@${env.SSH_HOST}`;
const key = env.SSH_KEY || join(homedir(), ".ssh", "bojleri_id_rsa");
const sshBase = ["-p", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
if (existsSync(key)) sshBase.push("-i", key, "-o", "IdentitiesOnly=yes");

function ssh(cmd) {
  const result = spawnSync("ssh", [...sshBase, target, cmd], { encoding: "utf-8" });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || "SSH failed");
  return result.stdout.trim();
}

console.log("\n🔧 Uklanjanje cron-a za automatske cene...\n");
ssh(
  `(crontab -l 2>/dev/null | grep -v 'scripts/run-sync.mjs' | grep -v 'api/cron/sync-catalog' | grep -v 'bojleri-catalog-sync' || true) | crontab -`,
);
console.log("Preostali cron:");
console.log(ssh("crontab -l 2>/dev/null | grep -E 'bojleri|sync|format-all' || echo '(nema)'"));
console.log("\n✅ Cron za cene uklonjen. Cene se sada menjaju ručno (CMS / Excel).\n");