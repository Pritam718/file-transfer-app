/**
 * Type definitions for Electron API exposed to renderer
 */

export interface ElectronAPI {
  // File transfer operations
  startSender: (
    transferType
  ) => Promise<{ ip: string; port: number; code: string; hostname?: string }>;
  stopSender: (transferType) => Promise<void>;
  connectToSender: (
    ip: string,
    port: number,
    code: string,
    saveDir?: string
  ) => Promise<{ success: boolean; saveDir: string }>;
  disconnectReceiver: () => Promise<void>;
  sendFiles: (filePaths: string[]) => Promise<{ success: boolean }>;

  // File system operations
  selectFiles: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  selectFolder: () => Promise<{ canceled: boolean; folderPath: string }>;
  getFilePathFromFile: (file: File) => string | null;
  readFile: (filePaths: string[]) => Promise<string[]>;
  readFileAsBuffer: (filePath: string) => Promise<Buffer>;
  readFileChunk: (
    filePath: string,
    offset: number,
    length: number
  ) => Promise<{ chunk: Buffer; bytesRead: number; hasMore: boolean }>;
  getFileSize: (filePath: string) => Promise<number>;
  saveReceivedFile: (
    fileName: string,
    buffer: Uint8Array,
    saveDir?: string
  ) => Promise<{ success: boolean; path: string }>;
  initFileStream: (
    fileName: string,
    saveDir?: string
  ) => Promise<{ success: boolean; path: string }>;
  appendFileChunk: (
    fileName: string,
    chunk: Uint8Array,
    saveDir?: string
  ) => Promise<{ success: boolean }>;
  finalizeFile: (fileName: string, saveDir?: string) => Promise<{ success: boolean; path: string }>;

  // Network info
  getLocalIP: () => Promise<string>;
  discoverServices: () => Promise<any[]>;

  // Event listeners
  onConnectionStatus: (callback: (status: ConnectionStatus) => void) => void;
  onConnectionLost: (callback: (info: ConnectionLostInfo) => void) => void;
  onFileProgress: (callback: (progress: FileProgress) => void) => void;
  onFileReceived: (callback: (file: ReceivedFile) => void) => void;
  onTransferComplete: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;

  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

export interface ConnectionStatus {
  connected: boolean;
  mode: 'sender' | 'receiver';
}

export interface ConnectionLostInfo {
  mode: 'sender' | 'receiver';
  reason: string;
}

export interface FileProgress {
  fileName: string;
  progress: number;
  sentBytes?: number;
  receivedBytes?: number;
  totalBytes: number;
  currentFile: number;
  totalFiles: number;
}

export interface ReceivedFile {
  fileName: string;
  fileSize: number;
  savePath: string;
  currentFile: number;
  totalFiles: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
