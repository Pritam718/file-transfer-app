/**
 * Network utility library
 * Provides network-related helper functions
 */

import * as os from 'os';
import { FILE_SIZE_UNITS, NETWORK } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Get the local IPv4 address of the machine
 */
export function getLocalIPAddress(): string {
  try {
    const nets = os.networkInterfaces();

    for (const name of Object.keys(nets)) {
      const netInterface = nets[name];
      if (!netInterface) {
        continue;
      }

      for (const net of netInterface) {
        // Skip internal and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }

    logger.warn('No external IPv4 address found, using localhost');
    return 'localhost';
  } catch (err: any) {
    logger.error('Failed to get local IP:', err.message);
    return 'localhost';
  }
}

/**
 * Check if a port is valid
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= NETWORK.MIN_PORT && port <= NETWORK.MAX_PORT;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return `0 ${FILE_SIZE_UNITS[0]}`;
  }
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + FILE_SIZE_UNITS[i];
}
