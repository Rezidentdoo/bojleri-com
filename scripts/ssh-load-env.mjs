#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

export function loadSshEnv() {
  const path = join(root, ".ssh.env");
  if (!existsSync(path)) {
    throw new Error("Nedostaje .ssh.env — kopiraj iz .ssh.env.example");
  }

  const vars = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
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

  const required = ["SSH_HOST", "SSH_USER", "SSH_PORT", "SSH_REMOTE_DIR"];
  for (const key of required) {
    if (!vars[key]) throw new Error(`${key} nije podešen u .ssh.env`);
  }

  return vars;
}