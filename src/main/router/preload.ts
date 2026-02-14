/**
 * Preload script for secure IPC communication
 * Runs in renderer context with Node.js access
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { ElectronAPI } from '../types/electron';

// IPC Channels - inlined to avoid module resolution issues in sandboxed preload
const IPC_CHANNELS = {
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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File transfer operations
  startSender: () => ipcRenderer.invoke(IPC_CHANNELS.START_SENDER),
  stopSender: () => ipcRenderer.invoke(IPC_CHANNELS.STOP_SENDER),
  connectToSender: (ip: string, port: number, code: string, saveDir?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECT_RECEIVER, ip, port, code, saveDir),
  disconnectReceiver: () => ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT_RECEIVER),
  sendFiles: (filePaths: string[]) => ipcRenderer.invoke(IPC_CHANNELS.SEND_FILES, filePaths),

  // File system operations
  selectFiles: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILES),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_SAVE_DIR),

  // Get file path from File object (for drag and drop)
  getFilePathFromFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (error) {
      console.error('Failed to get file path:', error);
      return null;
    }
  },

  // Network info
  getLocalIP: () => ipcRenderer.invoke(IPC_CHANNELS.GET_LOCAL_IP),
  discoverServices: () => ipcRenderer.invoke(IPC_CHANNELS.DISCOVER_SERVICES),

  // Event listeners
  onConnectionStatus: (callback: (status: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.CONNECTION_STATUS, (_event, status) => callback(status));
  },
  onConnectionLost: (callback: (info: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.CONNECTION_LOST, (_event, info) => callback(info));
  },
  onFileProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TRANSFER_PROGRESS, (_event, progress) => callback(progress));
  },
  onFileReceived: (callback: (file: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.FILE_RECEIVED, (_event, file) => callback(file));
  },
  onTransferComplete: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.TRANSFER_COMPLETE, () => callback());
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TRANSFER_ERROR, (_event, error) => callback(error));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
} as ElectronAPI);
