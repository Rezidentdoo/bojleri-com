import "server-only";

/** unlimited.rs shared mail server (mail.bojleri.com DNS može pokazivati pogrešno tokom migracije). */
const UNLIMITED_MAIL_HOST = "185.119.88.60";

export function resolveSmtpHost(configuredHost: string | undefined, smtpUser: string): string {
  const host = configuredHost?.trim() || "mail.bojleri.com";
  if (host === "mail.bojleri.com" || host === "bojleri.com") {
    return UNLIMITED_MAIL_HOST;
  }
  return host;
}

export function resolveTlsServername(smtpHost: string, smtpUser: string): string {
  const configured = process.env.SMTP_TLS_SERVERNAME?.trim();
  if (configured) return configured;

  const domain = smtpUser.split("@")[1]?.trim();
  const mailHost = domain ? `mail.${domain}` : "mail.bojleri.com";
  if (smtpHost === UNLIMITED_MAIL_HOST || smtpHost === mailHost) {
    return mailHost;
  }
  return mailHost;
}

export function getSmtpPort(): number {
  return Number(process.env.SMTP_PORT || 587);
}

export function isSmtpSecure(port: number): boolean {
  return (
    process.env.SMTP_SECURE === "true" ||
    (process.env.SMTP_SECURE !== "false" && port === 465)
  );
}