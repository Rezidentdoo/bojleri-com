#!/usr/bin/env node
/**
 * Upload lokalnog .next build-a na server (bez npm run build na serveru).
 * Upotreba: npm run build && npm run ssh:deploy-next
 */
import { spawnSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadSshEnv } from "./ssh-load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = loadSshEnv();
const root = join(__dirname, "..");
const nextDir = join(root, ".next");

if (!existsSync(nextDir)) {
  console.error("❌ Nema .next foldera — prvo pokreni: npm run build");
  process.exit(1);
}

const target = `${env.SSH_USER}@${env.SSH_HOST}`;
const remote = env.SSH_REMOTE_DIR;
const key = env.SSH_KEY || join(homedir(), ".ssh", "bojleri_id_rsa");

const sshBase = ["-p", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
const scpBase = ["-P", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];

if (existsSync(key)) {
  sshBase.push("-i", key, "-o", "IdentitiesOnly=yes");
  scpBase.push("-i", key, "-o", "IdentitiesOnly=yes");
}

function ssh(cmd) {
  const result = spawnSync("ssh", [...sshBase, target, cmd], { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || "SSH failed");
  }
  return result.stdout.trim();
}

function scp(local, remotePath) {
  const result = spawnSync("scp", [...scpBase, local, `${target}:${remotePath}`], { stdio: "inherit" });
  if (result.status !== 0) throw new Error("scp failed");
}

function deployViaRsync() {
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

  const result = spawnSync(
    "rsync",
    ["-avz", "--delete", "-e", rsyncSsh, `${nextDir}/`, `${target}:${remote}/.next/`],
    { stdio: "inherit" },
  );
  return result.status === 0;
}

function deployViaTar() {
  const archive = join(root, "next-deploy.tar.gz");
  console.log("   Pakujem .next u tar (može potrajati)...");

  const pack = spawnSync("tar", ["-czf", archive, "-C", root, ".next"], { stdio: "inherit" });
  if (pack.status !== 0) throw new Error("tar pack failed");

  console.log("   Upload arhive...");
  scp(archive, `${remote}/next-deploy.tar.gz`);

  console.log("   Raspakujem na serveru...");
  ssh(`rm -rf ${remote}/.next && tar -xzf ${remote}/next-deploy.tar.gz -C ${remote} && rm -f ${remote}/next-deploy.tar.gz`);

  if (existsSync(archive)) unlinkSync(archive);
}

console.log("\n📤 Upload .next → server...");
console.log(`   ${nextDir} → ${target}:${remote}/.next/\n`);

const hasRsyncOnServer = spawnSync("ssh", [...sshBase, target, "command -v rsync"], { encoding: "utf-8" }).status === 0;

let ok = false;
if (hasRsyncOnServer) {
  ok = deployViaRsync();
}

if (!ok) {
  console.log("   rsync nije dostupan — koristim tar+scp...");
  deployViaTar();
}

console.log("🔄 Restart Node app...");
ssh(`mkdir -p ${remote}/tmp && touch ${remote}/tmp/restart.txt`);

console.log("✅ Deploy završen — bojleri.com na unlimited.rs.\n");