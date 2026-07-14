#!/usr/bin/env node
/**
 * Test SSH konekcije ka bojleri.com serveru.
 * Upotreba: npm run ssh:test
 */
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { loadSshEnv } from "./ssh-load-env.mjs";

const env = loadSshEnv();
const target = `${env.SSH_USER}@${env.SSH_HOST}`;
const sshArgs = [
  "-p",
  env.SSH_PORT,
  "-o",
  "BatchMode=yes",
  "-o",
  "ConnectTimeout=15",
  "-o",
  "StrictHostKeyChecking=accept-new",
];

if (env.SSH_KEY) {
  sshArgs.push("-i", env.SSH_KEY, "-o", "IdentitiesOnly=yes");
} else {
  const defaultKey = join(homedir(), ".ssh", "bojleri_id_rsa");
  if (existsSync(defaultKey)) {
    sshArgs.push("-i", defaultKey, "-o", "IdentitiesOnly=yes");
  }
}

console.log(`\n🔌 SSH test → ${target}:${env.SSH_PORT}`);
console.log(`   Remote dir: ${env.SSH_REMOTE_DIR}\n`);

const result = spawnSync(
  "ssh",
  [
    ...sshArgs,
    target,
    `echo OK && hostname && ls -la ${env.SSH_REMOTE_DIR}/package.json ${env.SSH_REMOTE_DIR}/server.js 2>/dev/null`,
  ],
  { encoding: "utf-8" },
);

if (result.status === 0) {
  console.log(result.stdout.trim());
  console.log("\n✅ SSH radi.\n");
  process.exit(0);
}

console.error(result.stderr?.trim() || result.stdout?.trim() || "SSH neuspešan");
console.error(`
❌ Konekcija nije uspela.

Proveri:
  1. cPanel → SSH Access → Enable (ili dodaj javni ključ)
  2. .ssh.env — SSH_HOST, SSH_USER, SSH_PORT
  3. SSH ključ: ssh-keygen -t ed25519 -f ~/.ssh/bojleri_id_rsa -N ""
     Javni ključ (~/.ssh/bojleri_id_rsa.pub) dodaj u cPanel → Manage SSH Keys → Authorize
  4. Ili postavi SSH_PASS i koristi ssh-copy-id (ručno)
`);
process.exit(1);