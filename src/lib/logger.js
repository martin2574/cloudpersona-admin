import os from "os";
import pino from "pino";

export function maskEmail(email) {
  if (!email) return "[empty]";
  const [local, domain] = email.split("@");
  if (!domain) return "[invalid]";
  return `${local[0]}***@${domain}`;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: { service: "admin", pid: process.pid, hostname: os.hostname() },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: [
    "*.password", "*.secret", "*.apiToken",
    'req.headers["x-admin-secret"]',
    "req.headers.authorization",
    "req.headers.cookie",
  ],
});
