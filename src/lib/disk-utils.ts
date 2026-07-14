import { createHash } from "crypto";

export function hashContent(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function stableJson(data: unknown): string {
  return JSON.stringify(data);
}