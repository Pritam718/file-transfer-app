/**
 * Preload script for secure IPC communication
 * Runs in renderer context with Node.js access
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  ConnectionLostInfo,
  ConnectionStatus,
  ElectronAPI,
  FileProgress,
  ReceivedFile,
} from '../types/electron';

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
  READ_FILE: 'read-file',
  READ_FILE_AS_BUFFER: 'read-file-as-buffer',
  READ_FILE_CHUNK: 'read-file-chunk',
  GET_FILE_SIZE: 'get-file-size',
  SAVE_RECEIVED_FILE: 'save-received-file',
  INIT_FILE_STREAM: 'init-file-stream',
  APPEND_FILE_CHUNK: 'append-file-chunk',
  FINALIZE_FILE: 'finalize-file',

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
  startSender: (transferType?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_SENDER, transferType),
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

  // Read file - get stream URLs (for media playback)
  readFile: (filePaths: string[]) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePaths),

  // Read file as buffer (for remote transfer)
  readFileAsBuffer: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE_AS_BUFFER, filePath),

  // Read file chunk (for streaming remote transfer)
  readFileChunk: (filePath: string, offset: number, length: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE_CHUNK, filePath, offset, length),

  // Get file size
  getFileSize: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_FILE_SIZE, filePath),

  // Save received file (for remote transfer)
  saveReceivedFile: (fileName: string, buffer: Uint8Array, saveDir?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_RECEIVED_FILE, fileName, buffer, saveDir),

  // Streaming file write for large files
  initFileStream: (fileName: string, saveDir?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.INIT_FILE_STREAM, fileName, saveDir),
  appendFileChunk: (fileName: string, chunk: Uint8Array, saveDir?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.APPEND_FILE_CHUNK, fileName, chunk, saveDir),
  finalizeFile: (fileName: string, saveDir?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.FINALIZE_FILE, fileName, saveDir),

  // Network info
  getLocalIP: () => ipcRenderer.invoke(IPC_CHANNELS.GET_LOCAL_IP),
  discoverServices: () => ipcRenderer.invoke(IPC_CHANNELS.DISCOVER_SERVICES),

  // Event listeners
  onConnectionStatus: (callback: (status: ConnectionStatus) => void) => {
    ipcRenderer.on(IPC_CHANNELS.CONNECTION_STATUS, (_event, status) =>
      callback(status as ConnectionStatus)
    );
  },
  onConnectionLost: (callback: (info: ConnectionLostInfo) => void) => {
    ipcRenderer.on(IPC_CHANNELS.CONNECTION_LOST, (_event, info) =>
      callback(info as ConnectionLostInfo)
    );
  },
  onFileProgress: (callback: (progress: FileProgress) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TRANSFER_PROGRESS, (_event, progress) =>
      callback(progress as FileProgress)
    );
  },
  onFileReceived: (callback: (file: ReceivedFile) => void) => {
    ipcRenderer.on(IPC_CHANNELS.FILE_RECEIVED, (_event, file) => callback(file as ReceivedFile));
  },
  onTransferComplete: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.TRANSFER_COMPLETE, () => callback());
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TRANSFER_ERROR, (_event, error) => callback(String(error)));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
} as ElectronAPI);
