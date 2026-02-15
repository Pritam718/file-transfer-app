/**
 * File Transfer Interfaces
 * Defines types and interfaces for file transfer operations
 */

export interface TransferMetadata {
  fileName: string;
  fileSize: number;
  totalFiles: number;
  currentFile: number;
}

export interface ConnectionInfo {
  ip: string;
  port: number;
  code: string;
  hostname?: string;
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

export interface ConnectionStatus {
  connected: boolean;
  mode: 'sender' | 'receiver';
}

export interface ConnectionLostInfo {
  mode: 'sender' | 'receiver';
  reason: string;
}

export interface DiscoveredService {
  name: string;
  host: string;
  addresses: string[];
  port: number;
  hostname: string;
}
