/**
 * Application Constants
 * Central location for all constant values used across the application
 */

// Application Information
export const APP_INFO = {
  NAME: 'File Transfer App',
  VERSION: '1.0.0',
  DESCRIPTION: 'A secure and fast file transfer application',
  AUTHOR: 'Gopinath Bhowmick',
} as const;

// Network Configuration
export const NETWORK = {
  DEFAULT_PORT: 5000,
  MIN_PORT: 1024,
  MAX_PORT: 65535,
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  TRANSFER_TIMEOUT: 300000, // 5 minutes
  CHUNK_SIZE: 64 * 1024, // 64KB
  MAX_RETRY_ATTEMPTS: 3,
} as const;

// File Transfer Configuration
export const FILE_TRANSFER = {
  MAX_FILE_SIZE: 10 * 1024 * 1024 * 1024, // 10GB
  SUPPORTED_PROTOCOLS: ['TCP'] as const,
  BUFFER_SIZE: 8192,
  PROGRESS_UPDATE_INTERVAL: 100, // milliseconds
} as const;

// Window Configuration
export const WINDOW = {
  DEFAULT_WIDTH: 1200,
  DEFAULT_HEIGHT: 800,
  MIN_WIDTH: 900,
  MIN_HEIGHT: 600,
} as const;

// IPC Channels
export const IPC_CHANNELS = {
  // Sender
  START_SENDER: 'start-sender',
  STOP_SENDER: 'stop-sender',
  SEND_FILES: 'send-files',

  // Receiver
  CONNECT_RECEIVER: 'connect-receiver',
  DISCONNECT_RECEIVER: 'disconnect-receiver',
  SELECT_SAVE_DIR: 'select-save-dir',

  // File system operations
  SELECT_FILES: 'select-files',

  READ_FILE: 'read-file',

  // Network
  GET_LOCAL_IP: 'get-local-ip',
  DISCOVER_SERVICES: 'discover-services',

  // Events
  TRANSFER_PROGRESS: 'transfer-progress',
  TRANSFER_COMPLETE: 'transfer-complete',
  TRANSFER_ERROR: 'transfer-error',
  CONNECTION_STATUS: 'connection-status',
  CONNECTION_LOST: 'connection-lost',
  FILE_RECEIVED: 'file-received',
} as const;

// UI Messages
export const MESSAGES = {
  SUCCESS: {
    SENDER_STARTED: 'Sender started successfully',
    SENDER_STOPPED: 'Sender stopped',
    RECEIVER_CONNECTED: 'Connected to sender',
    RECEIVER_DISCONNECTED: 'Disconnected from sender',
    FILE_TRANSFER_COMPLETE: 'File transfer completed',
  },
  ERROR: {
    SENDER_START_FAILED: 'Failed to start sender',
    SENDER_STOP_FAILED: 'Failed to stop sender',
    CONNECTION_FAILED: 'Connection failed',
    TRANSFER_FAILED: 'File transfer failed',
    INVALID_CONNECTION_CODE: 'Invalid connection code',
    NO_FILES_SELECTED: 'No files selected',
  },
  INFO: {
    CONNECTING: 'Connecting...',
    TRANSFERRING: 'Transferring files...',
    WAITING_FOR_CONNECTION: 'Waiting for connection...',
  },
} as const;

// File Size Units
export const FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;

// Logging Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  LOADING: 'loading',
  SUCCESS: 'success',
} as const;

// Environment
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

// Status Codes
export const STATUS_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

// Connection States
export const CONNECTION_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  TRANSFERRING: 'transferring',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

// Validation Rules
export const VALIDATION = {
  MIN_CONNECTION_CODE_LENGTH: 6,
  MAX_CONNECTION_CODE_LENGTH: 10,
  CONNECTION_CODE_PATTERN: /^[A-Z0-9]{6,10}$/,
  IP_ADDRESS_PATTERN: /^(\d{1,3}\.){3}\d{1,3}$/,
  PORT_PATTERN: /^\d{1,5}$/,
} as const;

// Timeouts & Intervals
export const TIMING = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
  AUTO_SAVE_INTERVAL: 5000,
  HEARTBEAT_INTERVAL: 10000,
  RECONNECT_DELAY: 3000,
} as const;

// Error Types
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TRANSFER_ERROR: 'TRANSFER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// Default Values
export const DEFAULTS = {
  SAVE_DIRECTORY: '',
  CONNECTION_CODE: '',
  IP_ADDRESS: 'localhost',
  PORT: NETWORK.DEFAULT_PORT,
} as const;
