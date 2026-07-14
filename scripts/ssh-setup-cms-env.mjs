#!/usr/bin/env node
/**
 * Postavi CMS env na serveru (.env.production + .htaccess SetEnv) i restartuj app.
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadSshEnv } from "./ssh-load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const env = loadSshEnv();
const target = `${env.SSH_USER}@${env.SSH_HOST}`;
const REMOTE = env.SSH_REMOTE_DIR;
const HTACCESS = "/home/aqualand/bojleri.com/.htaccess";
const NODE = "/home/aqualand/nodevenv/bojleri.com/web/22/bin/node";

const key = env.SSH_KEY || join(homedir(), ".ssh", "bojleri_id_rsa");
const sshBase = ["-p", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
const scpBase = ["-P", env.SSH_PORT, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
if (existsSync(key)) {
  sshBase.push("-i", key, "-o", "IdentitiesOnly=yes");
  scpBase.push("-i", key, "-o", "IdentitiesOnly=yes");
}

function ssh(cmd) {
  const r = spawnSync("ssh", [...sshBase, target, cmd], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(r.stderr?.trim() || r.stdout?.trim() || "SSH failed");
  return r.stdout.trim();
}

function scp(local, remote) {
  const r = spawnSync("scp", [...scpBase, local, `${target}:${remote}`], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`scp failed: ${local}`);
}

function parseEnvProduction() {
  const path = join(ROOT, ".env.production");
  if (!existsSync(path)) throw new Error("Nedostaje .env.production");
  const vars = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const eq = t.indexOf("=");
    vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return vars;
}

function main() {
  const vars = parseEnvProduction();
  console.log("\n🔐 CMS env setup → server\n");

  console.log("1. Upload .env.production...");
  scp(join(ROOT, ".env.production"), `${REMOTE}/.env.production`);

  const patchScript = join(ROOT, "scripts/.htaccess-patch.mjs");
  writeFileSync(
    patchScript,
    `import fs from "fs";
const path = ${JSON.stringify(HTACCESS)};
const setEnv = ${JSON.stringify(vars)};
let text = fs.readFileSync(path, "utf8");
const begin = "# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS CONFIGURATION BEGIN";
const end = "# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS CONFIGURATION END";
const lines = Object.entries(setEnv).map(([k, v]) => "SetEnv " + k + " " + v);
const block = begin + "\\n<IfModule Litespeed>\\n" + lines.join("\\n") + "\\n</IfModule>\\n" + end;
const i = text.indexOf(begin);
const j = text.indexOf(end);
if (i < 0 || j < 0) throw new Error("htaccess markers missing");
fs.writeFileSync(path, text.slice(0, i) + block + text.slice(j + end.length));
console.log("htaccess ok");
`,
  );

  console.log("2. Update .htaccess SetEnv...");
  scp(patchScript, `${REMOTE}/scripts/.htaccess-patch.mjs`);
  ssh(`${NODE} ${REMOTE}/scripts/.htaccess-patch.mjs`);

  console.log("3. Restart Node app...");
  ssh(`mkdir -p ${REMOTE}/tmp && touch ${REMOTE}/tmp/restart.txt`);

  console.log("\n✅ CMS env podešen.\n");
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
}