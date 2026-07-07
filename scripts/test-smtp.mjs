#!/usr/bin/env node
/**
 * Test SMTP slanja za bojleri.com (čita .env.local ili .env.selfhosted).
 *
 * Upotreba:
 *   SMTP_PASS=tvoja-lozinka npm run test:smtp
 *   npm run test:smtp   # ako je SMTP_PASS već u .env.local
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env.selfhosted"));

const UNLIMITED_MAIL_HOST = "185.119.88.60";

function deriveMailHost(email) {
  const domain = email.split("@")[1]?.trim();
  return domain ? `mail.${domain}` : "";
}

const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS;
let host = process.env.SMTP_HOST?.trim() || deriveMailHost(user || "");
if (host === "mail.bojleri.com" || host === "bojleri.com") {
  host = UNLIMITED_MAIL_HOST;
}
const tlsServername = process.env.SMTP_TLS_SERVERNAME?.trim() || "mail.bojleri.com";
const port = Number(process.env.SMTP_PORT || 587);
const secure =
  process.env.SMTP_SECURE === "true" ||
  (process.env.SMTP_SECURE !== "false" && port === 465);
const to = process.env.SMTP_TEST_TO || user;

if (!user || !pass || !host) {
  console.error("\n❌ Postavi SMTP_USER, SMTP_PASS i SMTP_HOST u .env.local\n");
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  tls: { servername: tlsServername },
});

try {
  const info = await transport.sendMail({
    from: process.env.ORDER_FROM_EMAIL || `"bojleri.com test" <${user}>`,
    to,
    subject: "SMTP test — bojleri.com",
    text: "SMTP radi ispravno. Porudžbine sa sajta mogu da šalju email.",
    html: "<p>SMTP radi ispravno. Porudžbine sa sajta mogu da šalju email.</p>",
  });
  console.log(JSON.stringify({ ok: true, messageId: info.messageId, to, host }, null, 2));
} catch (error) {
  console.error("\n❌ SMTP greška:", error instanceof Error ? error.message : error);
  process.exit(1);
}