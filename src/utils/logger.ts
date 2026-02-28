const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const isTest = process.env.NODE_ENV === "test";
const isDevelopment = process.env.NODE_ENV !== "production";
const configuredLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (isTest ? "fatal" : isDevelopment ? "debug" : "info");
const minLevel = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= minLevel;
}

function formatEntry(level: LogLevel, context: Record<string, unknown>, msg?: string): string {
  return JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...context,
    ...(msg ? { msg } : {}),
  });
}

export interface Logger {
  trace(msg: string, ...args: unknown[]): void;
  trace(context: Record<string, unknown>, msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  debug(context: Record<string, unknown>, msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  info(context: Record<string, unknown>, msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  warn(context: Record<string, unknown>, msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  error(context: Record<string, unknown>, msg: string, ...args: unknown[]): void;
  fatal(msg: string, ...args: unknown[]): void;
  fatal(context: Record<string, unknown>, msg: string, ...args: unknown[]): void;
  child(context: Record<string, unknown>): Logger;
}

function createLogger(baseContext: Record<string, unknown> = {}): Logger {
  function log(level: LogLevel, args: unknown[]): void {
    if (!shouldLog(level)) {
      return;
    }

    const consoleFn =
      level === "fatal" || level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;

    const first = args[0];

    // logger.info({ key: "value" }, "message")
    if (typeof first === "object" && first !== null && !Array.isArray(first)) {
      const context = { ...baseContext, ...(first as Record<string, unknown>) };
      const msg = typeof args[1] === "string" ? args[1] : undefined;
      consoleFn(formatEntry(level, context, msg));

      return;
    }

    // logger.info("message") or logger.info("message", extra1, extra2)
    if (typeof first === "string") {
      if (args.length === 1) {
        consoleFn(formatEntry(level, baseContext, first));
      } else {
        consoleFn(formatEntry(level, baseContext, first), ...args.slice(1));
      }

      return;
    }

    consoleFn(formatEntry(level, baseContext), ...args);
  }

  return {
    trace: (...args: unknown[]) => log("trace", args),
    debug: (...args: unknown[]) => log("debug", args),
    info: (...args: unknown[]) => log("info", args),
    warn: (...args: unknown[]) => log("warn", args),
    error: (...args: unknown[]) => log("error", args),
    fatal: (...args: unknown[]) => log("fatal", args),
    child: (context: Record<string, unknown>) => createLogger({ ...baseContext, ...context }),
  };
}

export const logger: Logger = createLogger();

export interface LogContext {
  userId?: string;
  guildId?: string | null;
  channelId?: string;
  commandName?: string;
  interactionId?: string;
  [key: string]: unknown;
}

export function createChildLogger(context: LogContext): Logger {
  return createLogger(context);
}

export function logCommandExecution(
  commandName: string,
  userId: string,
  guildId?: string | null,
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
  guildId?: string | null,
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
