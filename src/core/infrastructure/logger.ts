import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "cookie",
      "authorization",
      "DATABASE_URL",
      "OWNER_PASSWORD",
      "AUTH_SECRET",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});
