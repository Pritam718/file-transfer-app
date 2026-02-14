/**
 * File Transfer App - Configuration
 * Uses values from constants and environment variables
 */

import { APP_INFO, WINDOW, NETWORK } from './constants';

// Environment variables with fallbacks
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_NAME: process.env.APP_NAME || APP_INFO.NAME,
  API_URL: process.env.API_URL || '',
  PORT: parseInt(process.env.PORT || String(NETWORK.DEFAULT_PORT), 10),
  SECRET_KEY: process.env.SECRET_KEY || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;

// Application configuration using constants
export const APP_CONFIG = {
  name: ENV.APP_NAME,
  version: APP_INFO.VERSION,
  description: APP_INFO.DESCRIPTION,
  author: APP_INFO.AUTHOR,
  window: {
    width: WINDOW.DEFAULT_WIDTH,
    height: WINDOW.DEFAULT_HEIGHT,
    minWidth: WINDOW.MIN_WIDTH,
    minHeight: WINDOW.MIN_HEIGHT,
  },
  network: {
    defaultPort: ENV.PORT,
    minPort: NETWORK.MIN_PORT,
    maxPort: NETWORK.MAX_PORT,
    timeout: NETWORK.CONNECTION_TIMEOUT,
  },
};

export const PATHS = {
  assets: '../public/assets',
  pages: './renderer/pages',
};
