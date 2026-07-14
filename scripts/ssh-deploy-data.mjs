#!/usr/bin/env node
/**
 * Deploy products.json, site-settings.json i uploads/cms-media na server.
 * Usage: npm run ssh:deploy-data
 */
import { spawnSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadSshEnv } from "./ssh-load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const env = loadSshEnv();
const target = `${env.SSH_USER}@${env.SSH_HOST}`;
const REMOTE = env.SSH_REMOTE_DIR;

const key = env.SSH_KEY || join(homedir(), ".ssh", "bojleri_id_rsa");
const sshBase = ["-p", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
const scpBase = ["-P", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];

if (existsSync(key)) {
  sshBase.push("-i", key, "-o", "IdentitiesOnly=yes");
  scpBase.push("-i", key, "-o", "IdentitiesOnly=yes");
}

const rsyncSsh = [
  "ssh",
  "-p",
  env.SSH_PORT,
  "-o",
  "BatchMode=yes",
  "-o",
  "StrictHostKeyChecking=accept-new",
  ...(existsSync(key) ? ["-i", key, "-o", "IdentitiesOnly=yes"] : []),
].join(" ");
const rsyncBase = ["-avz", "-e", rsyncSsh];

function ssh(cmd) {
  const result = spawnSync("ssh", [...sshBase, target, cmd], { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "SSH failed");
  }
  return result.stdout.trim();
}

function rsync(local, remote) {
  const result = spawnSync("rsync", [...rsyncBase, local, `${target}:${remote}`], {
    encoding: "utf-8",
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`rsync failed: ${local}`);
}

function deployMediaArchive() {
  const archive = join(ROOT, "cms-media-deploy.tar.gz");
  const pack = spawnSync("tar", ["-czf", archive, "-C", join(ROOT, "public/uploads"), "cms-media"], {
    encoding: "utf-8",
    stdio: "inherit",
  });
  if (pack.status !== 0) throw new Error("tar pack failed");

  scp(archive, `${REMOTE}/cms-media-deploy.tar.gz`);
  ssh(`mkdir -p ${REMOTE}/public/uploads && tar -xzf ${REMOTE}/cms-media-deploy.tar.gz -C ${REMOTE}/public/uploads && rm -f ${REMOTE}/cms-media-deploy.tar.gz`);

  if (existsSync(archive)) unlinkSync(archive);
}

function scp(local, remote) {
  const result = spawnSync("scp", [...scpBase, local, `${target}:${remote}`], { encoding: "utf-8" });
  if (result.status !== 0) throw new Error(`scp failed: ${local}`);
}

function main() {
  console.log(`\n📤 Deploy data → ${target}:${REMOTE}\n`);

  console.log("1. products.json + site-settings.json...");
  scp(join(ROOT, "src/data/products.json"), `${REMOTE}/src/data/products.json`);
  scp(join(ROOT, "src/data/site-settings.json"), `${REMOTE}/src/data/site-settings.json`);

  console.log("2. uploads/cms-media/...");
  const rsyncCheck = spawnSync("ssh", [...sshBase, target, "command -v rsync"], { encoding: "utf-8" });
  if (rsyncCheck.status === 0) {
    rsync(join(ROOT, "public/uploads/cms-media/"), `${REMOTE}/public/uploads/cms-media/`);
  } else {
    console.log("   rsync nije na serveru — šaljem tar arhivu...");
    deployMediaArchive();
  }

  console.log("3. Verify on server...");
  const out = ssh(
    `find ${REMOTE}/public/uploads/cms-media -type f | wc -l && wc -c ${REMOTE}/src/data/products.json`,
  );
  console.log(out);

  console.log("\n✅ Data deploy završen. Restartuj Node app u cPanel-u ako keš ne osveži odmah.\n");
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
}