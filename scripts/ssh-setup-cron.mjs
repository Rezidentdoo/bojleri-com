#!/usr/bin/env node
/**
 * Deploy run-sync.mjs and update crontab on production server.
 * Usage: npm run ssh:setup-cron
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadSshEnv } from "./ssh-load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function resolveCronSecret(sshEnv) {
  if (sshEnv.CRON_SECRET) return sshEnv.CRON_SECRET;
  const example = join(ROOT, ".env.production.selfhosted.example");
  if (!existsSync(example)) return "";
  const match = readFileSync(example, "utf-8").match(/^CRON_SECRET=(.+)$/m);
  return match?.[1]?.trim() || "";
}
const env = loadSshEnv();
const target = `${env.SSH_USER}@${env.SSH_HOST}`;
const REMOTE = env.SSH_REMOTE_DIR;

const sshBase = ["-p", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
const scpBase = ["-P", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];

if (env.SSH_KEY) {
  sshBase.push("-i", env.SSH_KEY, "-o", "IdentitiesOnly=yes");
  scpBase.push("-i", env.SSH_KEY, "-o", "IdentitiesOnly=yes");
} else {
  const defaultKey = join(homedir(), ".ssh", "bojleri_id_rsa");
  if (existsSync(defaultKey)) {
    sshBase.push("-i", defaultKey, "-o", "IdentitiesOnly=yes");
    scpBase.push("-i", defaultKey, "-o", "IdentitiesOnly=yes");
  }
}

function ssh(cmd) {
  const result = spawnSync("ssh", [...sshBase, target, cmd], { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "SSH failed");
  }
  return result.stdout.trim();
}

function scp(local, remote) {
  const result = spawnSync("scp", [...scpBase, local, `${target}:${remote}`], { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "SCP failed");
  }
}

function main() {
  console.log(`\n📅 Cron setup → ${target}\n`);

  console.log("1. Upload cron scripts...");
  for (const script of [
    "scripts/run-sync.mjs",
    "scripts/sync-content.mjs",
    "scripts/format-all-descriptions.mjs",
    "scraper/lib/extract.mjs",
    "src/lib/cms/format-product-description.mjs",
  ]) {
    const remotePath = script.startsWith("src/") ? `${REMOTE}/${script}` : `${REMOTE}/${script}`;
    if (script.startsWith("src/")) {
      ssh(`mkdir -p ${REMOTE}/src/lib/cms`);
    }
    if (script.startsWith("scraper/")) {
      ssh(`mkdir -p ${REMOTE}/scraper/lib`);
    }
    scp(join(ROOT, script), remotePath);
  }

  console.log("2. Detect Node binary...");
  const nodeBin =
    ssh(
      `test -x /home/aqualand/nodevenv/bojleri.com/web/22/bin/node && echo /home/aqualand/nodevenv/bojleri.com/web/22/bin/node || which node`,
    ) || "node";
  const npmBin = nodeBin.replace(/\/node$/, "/npm");

  console.log(`   Node: ${nodeBin}`);

  console.log("3. Install cron dependencies on server...");
  ssh(`cd ${REMOTE} && ${npmBin} install cheerio --save --omit=dev 2>&1 | tail -5`);

  const cronSecret = resolveCronSecret(env);
  const cronEnv = cronSecret ? `CRON_SECRET=${cronSecret} ` : "";
  // Slike, specifikacije i opisi — cene ručno (CMS / Excel).
  const cronLine = `0 1 * * * ${cronEnv}cd ${REMOTE} && ${nodeBin} scripts/run-sync.mjs >> /home/aqualand/cron-sync.log 2>&1`;
  const cronMarker = "# bojleri-content-sync";

  console.log("4. Update crontab...");
  ssh(
    `(crontab -l 2>/dev/null | grep -v 'api/cron/sync-catalog' | grep -v 'scripts/run-sync.mjs' | grep -v 'format-all-descriptions.mjs' | grep -v 'bojleri-catalog-sync' | grep -v '${cronMarker}'; echo '${cronMarker}'; echo '${cronLine}') | crontab -`,
  );

  console.log("5. Current crontab:");
  console.log(ssh("crontab -l | grep -E 'bojleri|run-sync|sync-catalog' || echo '(no matching lines)'"));

  console.log("\n6. Test run (sadržaj + opisi, --limit 2)...");
  const testOut = ssh(`cd ${REMOTE} && ${nodeBin} scripts/run-sync.mjs --limit 2`);
  console.log(testOut);

  console.log("\n✅ Cron podešen. Log: /home/aqualand/cron-sync.log\n");
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
}