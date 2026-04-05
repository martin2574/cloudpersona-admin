import os from "node:os";
import pino, { type Logger } from "pino";

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "[empty]";
  const [local, domain] = email.split("@");
  if (!domain) return "[invalid]";
  return `${local[0]}***@${domain}`;
}

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: { service: "admin", pid: process.pid, hostname: os.hostname() },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: [
    "*.password",
    "*.secret",
    "*.apiToken",
    'req.headers["x-admin-secret"]',
    "req.headers.authorization",
    "req.headers.cookie",
  ],
});
