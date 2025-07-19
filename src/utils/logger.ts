import type { Logger } from "pino";
import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

const pinoOptions: pino.LoggerOptions = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || "rabot",
  },
};

const transport = isDevelopment
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "HH:MM:ss.l",
        singleLine: false,
      },
    })
  : undefined;

export const logger: Logger = pino(pinoOptions, transport);

export interface LogContext {
  userId?: string;
  guildId?: string;
  channelId?: string;
  commandName?: string;
  interactionId?: string;
  [key: string]: unknown;
}

export function createChildLogger(context: LogContext): Logger {
  return logger.child(context);
}

export function logCommandExecution(
  commandName: string,
  userId: string,
  guildId?: string,
  channelId?: string,
  interactionId?: string,
): Logger {
  const context: LogContext = {
    commandName,
    userId,
    guildId,
    channelId,
    interactionId,
    event: "command_execution",
  };

  const childLogger = createChildLogger(context);
  childLogger.info("Command executed");

  return childLogger;
}

export function logError(error: Error | unknown, context: LogContext = {}): void {
  const errorObject =
    error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : { error: String(error) };

  logger.error(
    {
      ...context,
      ...errorObject,
      event: "error",
    },
    "An error occurred",
  );
}

export function logDatabaseQuery(
  operation: string,
  table: string,
  duration?: number,
  context: LogContext = {},
): void {
  logger.debug(
    {
      ...context,
      operation,
      table,
      duration,
      event: "database_query",
    },
    "Database query executed",
  );
}

export function logApiCall(
  service: string,
  endpoint: string,
  duration?: number,
  statusCode?: number,
  context: LogContext = {},
): void {
  const level = statusCode && statusCode >= 400 ? "warn" : "debug";

  logger[level](
    {
      ...context,
      service,
      endpoint,
      duration,
      statusCode,
      event: "api_call",
    },
    "API call made",
  );
}

export function logMigrationNotice(
  legacyCommand: string,
  slashCommand: string,
  userId: string,
  guildId?: string,
): void {
  logger.info(
    {
      legacyCommand,
      slashCommand,
      userId,
      guildId,
      event: "migration_notice",
    },
    "Migration notice shown",
  );
}

export default logger;
