/**
 * Logger utility for the application with color support
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

// ANSI color codes for terminal output
const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',

  // Foreground colors
  Black: '\x1b[30m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m',
  Gray: '\x1b[90m',

  // Background colors
  BgRed: '\x1b[41m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgCyan: '\x1b[46m',
};

export class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return Colors.Cyan;
      case LogLevel.WARN:
        return Colors.Yellow;
      case LogLevel.ERROR:
        return Colors.Red;
      case LogLevel.DEBUG:
        return Colors.Magenta;
      default:
        return Colors.White;
    }
  }

  private getIconForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.DEBUG:
        return '🔍';
      default:
        return '📝';
    }
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const color = this.getColorForLevel(level);
    const icon = this.getIconForLevel(level);

    // Format: [timestamp] [icon LEVEL] message
    const coloredTimestamp = `${Colors.Gray}[${timestamp}]${Colors.Reset}`;
    const coloredLevel = `${color}${Colors.Bright}[${icon} ${level}]${Colors.Reset}`;
    const coloredMessage = `${color}${message}${Colors.Reset}`;

    console.log(`${coloredTimestamp} ${coloredLevel} ${coloredMessage}`, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }

  debug(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, ...args);
    }
  }

  // Additional helper methods for success and progress
  success(message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const coloredTimestamp = `${Colors.Gray}[${timestamp}]${Colors.Reset}`;
    const coloredLevel = `${Colors.Green}${Colors.Bright}[✅ SUCCESS]${Colors.Reset}`;
    const coloredMessage = `${Colors.Green}${message}${Colors.Reset}`;

    console.log(`${coloredTimestamp} ${coloredLevel} ${coloredMessage}`, ...args);
  }

  loading(message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const coloredTimestamp = `${Colors.Gray}[${timestamp}]${Colors.Reset}`;
    const coloredLevel = `${Colors.Blue}${Colors.Bright}[⏳ LOADING]${Colors.Reset}`;
    const coloredMessage = `${Colors.Blue}${message}${Colors.Reset}`;

    console.log(`${coloredTimestamp} ${coloredLevel} ${coloredMessage}`, ...args);
  }
}

export const logger = Logger.getInstance();
