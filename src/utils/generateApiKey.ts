import crypto from "crypto";

export function generateApiKey() {
  return `sk_live_${crypto.randomBytes(32).toString("hex")}`;
}