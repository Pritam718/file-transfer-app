/**
 * File Transfer Service using TCP sockets
 * Handles both sender and receiver modes with Bonjour/mDNS auto-discovery
 */

import Bonjour from 'bonjour-service';
import * as crypto from 'crypto';
import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { ConnectionInfo, TransferMetadata } from '../interfaces/localFileTransfer.interface';
import { formatFileSize, getLocalIPAddress } from '../lib/network.lib';
import { IPC_CHANNELS, NETWORK } from '../utils/constants';
import { logger } from '../utils/logger';

export class LocalFileTransferService {
  private server: net.Server | null = null;
  private client: net.Socket | null = null;
  private connectionCode: string = '';
  private port: number = 0;
  private mainWindow: BrowserWindow | null = null;
  private saveDirectory: string = '';
  private isReceiving: boolean = false;
  private receivingBuffer: Buffer = Buffer.alloc(0);
  private currentFileMetadata: TransferMetadata | null = null;
  private receivedBytes: number = 0;
  private dataBuffer: Buffer = Buffer.alloc(0);
  private messageDelimiter: string = '\x00\x00\x00\x00';
  private chunkSize: number = NETWORK.CHUNK_SIZE;
  private bonjour: Bonjour | null = null;
  private bonjourService: any = null;
  private fileSavedResolver: ((value: void) => void) | null = null;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.bonjour = new Bonjour();
  }

  /**
   * Generate a unique connection code
   */
  private generateConnectionCode(): string {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${code.slice(0, 3)}-${code.slice(3, 6)}`;
  }

  /**
   * Start sender mode - create TCP server
   */
  async startSender(): Promise<ConnectionInfo> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionCode = this.generateConnectionCode();
        this.server = net.createServer((socket) => {
          logger.info('Receiver attempting to connect...');

          let isAuthenticated = false;
          let authTimeout: NodeJS.Timeout | null = null;

          // Set timeout for authentication
          authTimeout = setTimeout(() => {
            if (!isAuthenticated) {
              logger.warn('Authentication timeout - disconnecting receiver');
              socket.destroy();
            }
          }, 10000); // 10 seconds to authenticate

          // Listen for authentication message
          const authHandler = (data: Buffer) => {
            try {
              const message = data.toString().trim();
              const lines = message.split('\n');

              for (const line of lines) {
                if (!line) continue;

                try {
                  const json = JSON.parse(line);

                  if (json.type === 'auth') {
                    // Clear auth timeout
                    if (authTimeout) {
                      clearTimeout(authTimeout);
                      authTimeout = null;
                    }

                    // Verify connection code
                    if (json.code === this.connectionCode) {
                      isAuthenticated = true;
                      socket.removeListener('data', authHandler);
                      logger.success('Receiver authenticated successfully!');

                      this.client = socket;

                      // Stop advertising to prevent additional connections
                      this.stopAdvertising();

                      // Send success acknowledgment to receiver
                      socket.write(JSON.stringify({ type: 'auth-success' }) + '\n');

                      this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_STATUS, {
                        connected: true,
                        mode: 'sender',
                      });

                      // Set up normal data handler for file transfers
                      socket.on('data', (data) => {
                        logger.info(`[SENDER] Received ${data.length} bytes from receiver`);
                        logger.info(
                          `[SENDER] Data preview: ${data.toString('utf8', 0, Math.min(100, data.length))}`
                        );
                        this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
                        this.processDataBuffer();
                      });
                    } else {
                      logger.error('Invalid connection code received');
                      socket.write(
                        JSON.stringify({
                          type: 'error',
                          message: 'Invalid connection code',
                        }) + '\n'
                      );
                      socket.destroy();
                      return;
                    }
                  }
                } catch (e) {
                  // Not a valid JSON message, ignore
                }
              }
            } catch (err: any) {
              logger.error('Error processing auth message:', err.message);
            }
          };

          socket.on('data', authHandler);

          socket.on('error', (err) => {
            if (authTimeout) clearTimeout(authTimeout);
            logger.error('Socket error:', err.message);
            if (isAuthenticated) {
              this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_ERROR, err.message);
              this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_LOST, {
                mode: 'sender',
                reason: 'Socket error: ' + err.message,
              });

              // Restart advertising to allow new connections
              this.startAdvertising();
            }
          });

          socket.on('close', () => {
            if (authTimeout) clearTimeout(authTimeout);
            if (isAuthenticated) {
              logger.warn('Receiver disconnected');
              this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_STATUS, {
                connected: false,
                mode: 'sender',
              });
              this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_LOST, {
                mode: 'sender',
                reason: 'Receiver disconnected from the server',
              });

              // Restart advertising to allow new connections
              this.startAdvertising();
            }
            this.client = null;
          });

          socket.on('end', () => {
            if (authTimeout) clearTimeout(authTimeout);
            if (isAuthenticated) {
              logger.info('Receiver ended connection gracefully');
            }
          });
        });

        this.server.listen(0, () => {
          const address = this.server?.address() as net.AddressInfo;
          this.port = address.port;
          const ip = getLocalIPAddress();

          logger.info(`Sender server started on ${ip}:${this.port}`);

          // Publish Bonjour service for auto-discovery
          try {
            const hostname = os.hostname();
            this.bonjourService = this.bonjour?.publish({
              name: hostname,
              type: 'file-transfer',
              port: this.port,
              txt: {
                hostname: hostname,
                version: '1.0.0',
              },
            });
            logger.success('Bonjour service published for auto-discovery');
          } catch (err: any) {
            logger.warn('Failed to publish Bonjour service:', err.message);
          }

          resolve({ ip, port: this.port, code: this.connectionCode, hostname: os.hostname() });
        });

        this.server.on('error', (err) => {
          logger.error('Server error:', err.message);
          reject(err);
        });
      } catch (err: any) {
        logger.error('Failed to start sender:', err.message);
        reject(err);
      }
    });
  }

  /**
   * Start advertising via Bonjour (allows new connections)
   */
  private startAdvertising(): void {
    if (this.bonjourService || !this.bonjour || !this.port) {
      return; // Already advertising or not ready
    }

    try {
      const hostname = os.hostname();
      this.bonjourService = this.bonjour.publish({
        name: hostname,
        type: 'file-transfer',
        port: this.port,
        txt: {
          hostname: hostname,
          version: '1.0.0',
        },
      });
      logger.success('Bonjour service re-published - now discoverable');
    } catch (err: any) {
      logger.warn('Failed to re-publish Bonjour service:', err.message);
    }
  }

  /**
   * Stop advertising via Bonjour (prevents new connections)
   */
  private stopAdvertising(): void {
    if (this.bonjourService) {
      this.bonjourService.stop();
      this.bonjourService = null;
      logger.info('Bonjour service unpublished - no longer discoverable');
    }
  }

  /**
   * Stop sender mode
   */
  stopSender(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.stopAdvertising();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    logger.info('Sender stopped');
  }

  /**
   * Discover available file transfer services on the network
   */
  discoverServices(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        const services: any[] = [];

        // Check if Bonjour is initialized
        if (!this.bonjour) {
          logger.warn('Bonjour not initialized, reinitializing...');
          this.bonjour = new Bonjour();
        }

        logger.info('Starting Bonjour discovery for file-transfer services...');
        const browser = this.bonjour.find({ type: 'file-transfer' });

        if (!browser) {
          logger.error('Failed to create Bonjour browser');
          resolve([]);
          return;
        }

        browser.on('up', (service: any) => {
          logger.info(`Discovered service: ${service.name} at ${service.host}:${service.port}`);
          services.push({
            name: service.name,
            host: service.host,
            addresses: service.addresses,
            port: service.port,
            hostname: service.txt?.hostname || service.name,
          });
        });

        browser.on('error', (err: any) => {
          logger.error('Bonjour browser error:', err.message);
        });

        // Stop searching after 3 seconds
        setTimeout(() => {
          try {
            browser.stop();
            logger.info(`Found ${services.length} file transfer service(s)`);
            resolve(services);
          } catch (err: any) {
            logger.error('Error stopping browser:', err.message);
            resolve(services);
          }
        }, 3000);
      } catch (err: any) {
        logger.error('Error in discoverServices:', err.message);
        reject(err);
      }
    });
  }

  /**
   * Connect to sender as receiver
   */
  async connectToSender(ip: string, port: number, code: string, saveDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.saveDirectory = saveDir;
        this.client = new net.Socket();
        let isResolved = false;

        this.client.connect(port, ip, () => {
          logger.success(`Connected to sender at ${ip}:${port}`);

          // Send connection code for verification
          this.client?.write(JSON.stringify({ type: 'auth', code }) + '\n');
        });

        this.client.on('data', (data) => {
          // Check for authentication response
          try {
            const message = data.toString();
            const lines = message.split('\n');

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const json = JSON.parse(line);

                // Handle error response (invalid code)
                if (json.type === 'error') {
                  logger.error('Authentication failed:', json.message);
                  this.mainWindow?.webContents.send(
                    IPC_CHANNELS.TRANSFER_ERROR,
                    'Invalid connection code. Please check the code and try again.'
                  );
                  this.client?.destroy();
                  if (!isResolved) {
                    isResolved = true;
                    reject(new Error('Invalid connection code'));
                  }
                  return;
                }

                // Handle success response
                if (json.type === 'auth-success' && !isResolved) {
                  isResolved = true;
                  logger.success('Authentication successful!');
                  this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_STATUS, {
                    connected: true,
                    mode: 'receiver',
                  });
                  resolve();
                  return;
                }
              } catch (e) {
                // Not a valid JSON message, might be file data
              }
            }
          } catch (e) {
            // Error parsing, continue processing
          }

          // Process file transfer data
          this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
          this.processDataBuffer();
        });

        this.client.on('error', (err) => {
          logger.error('Connection error:', err.message);
          this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_ERROR, err.message);
          this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_LOST, {
            mode: 'receiver',
            reason: 'Connection error: ' + err.message,
          });
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
        });

        this.client.on('close', () => {
          logger.warn('Disconnected from sender');
          this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_STATUS, {
            connected: false,
            mode: 'receiver',
          });
          this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_LOST, {
            mode: 'receiver',
            reason: 'Sender disconnected or connection was lost',
          });
        });

        this.client.on('end', () => {
          logger.info('Sender ended connection gracefully');
        });
      } catch (err: any) {
        logger.error('Failed to connect:', err.message);
        reject(err);
      }
    });
  }

  /**
   * Disconnect receiver
   */
  disconnectReceiver(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    logger.info('Receiver disconnected');
  }

  /**
   * Send files to connected receiver
   */
  async sendFiles(filePaths: string[]): Promise<void> {
    if (!this.client) {
      throw new Error('No receiver connected');
    }

    logger.loading(`Sending ${filePaths.length} file(s)...`);

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      await this.sendFile(filePath, i + 1, filePaths.length);
    }

    logger.success('All files sent successfully!');
    this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_COMPLETE);
  }

  /**
   * Send a single file
   */
  private async sendFile(filePath: string, currentFile: number, totalFiles: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = path.basename(filePath);
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;

        // Send metadata first
        const metadata: TransferMetadata = {
          fileName,
          fileSize,
          currentFile,
          totalFiles,
        };

        const metadataStr = JSON.stringify({ type: 'metadata', data: metadata });
        this.client?.write(Buffer.from(metadataStr + this.messageDelimiter));

        logger.info(
          `Sending file ${currentFile}/${totalFiles}: ${fileName} (${formatFileSize(fileSize)})`
        );

        // Send file data
        const readStream = fs.createReadStream(filePath);
        let sentBytes = 0;

        readStream.on('data', (chunk) => {
          sentBytes += chunk.length;
          const progress = Math.round((sentBytes / fileSize) * 100);

          this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_PROGRESS, {
            fileName,
            progress,
            sentBytes,
            totalBytes: fileSize,
            currentFile,
            totalFiles,
          });

          this.client?.write(chunk);
        });

        readStream.on('end', () => {
          // Send end marker and wait for receiver acknowledgment
          setTimeout(async () => {
            const endMarker = JSON.stringify({ type: 'file-end' });
            this.client?.write(Buffer.from(endMarker + this.messageDelimiter));
            logger.success(`File sent: ${fileName}, waiting for save confirmation...`);

            // Wait for receiver to save the file and send acknowledgment
            await new Promise<void>((resolveAck) => {
              this.fileSavedResolver = resolveAck;

              // Timeout after 30 seconds
              setTimeout(() => {
                if (this.fileSavedResolver === resolveAck) {
                  logger.warn(`File save acknowledgment timeout for ${fileName}`);
                  this.fileSavedResolver = null;
                  resolve();
                }
              }, 30000);
            });

            logger.info(`File confirmed saved: ${fileName}`);
            resolve();
          }, 100);
        });

        readStream.on('error', (err) => {
          logger.error(`Error reading file ${fileName}:`, err.message);
          reject(err);
        });
      } catch (err: any) {
        logger.error('Error sending file:', err.message);
        reject(err);
      }
    });
  }

  /**
   * Process accumulated data buffer
   */
  private processDataBuffer(): void {
    try {
      const delimiterBuffer = Buffer.from(this.messageDelimiter);
      logger.info(
        `[PROCESS] BufferSize: ${this.dataBuffer.length}, isReceiving: ${this.isReceiving}`
      );

      while (true) {
        if (this.isReceiving && this.currentFileMetadata) {
          // We're receiving file data, look for end marker
          logger.info(`[PROCESS] Mode: Receiving file data`);
          const delimiterIndex = this.dataBuffer.indexOf(delimiterBuffer);

          if (delimiterIndex !== -1) {
            // Found delimiter, take file data before it
            const fileData = this.dataBuffer.subarray(0, delimiterIndex);
            this.receivingBuffer = Buffer.concat([this.receivingBuffer, fileData]);
            this.receivedBytes += fileData.length;

            // Update progress
            const progress = Math.round(
              (this.receivedBytes / this.currentFileMetadata.fileSize) * 100
            );
            this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_PROGRESS, {
              fileName: this.currentFileMetadata.fileName,
              progress,
              receivedBytes: this.receivedBytes,
              totalBytes: this.currentFileMetadata.fileSize,
              currentFile: this.currentFileMetadata.currentFile,
              totalFiles: this.currentFileMetadata.totalFiles,
            });

            // Move buffer forward past delimiter
            this.dataBuffer = this.dataBuffer.subarray(delimiterIndex + delimiterBuffer.length);

            // Check if next message is file-end
            const nextDelimiterIndex = this.dataBuffer.indexOf(delimiterBuffer);
            if (nextDelimiterIndex !== -1) {
              const messageStr = this.dataBuffer.subarray(0, nextDelimiterIndex).toString();
              try {
                const json = JSON.parse(messageStr);
                if (json.type === 'file-end') {
                  this.saveReceivedFile();
                  this.dataBuffer = this.dataBuffer.subarray(
                    nextDelimiterIndex + delimiterBuffer.length
                  );
                }
              } catch (e) {
                // Not valid JSON, keep waiting
                break;
              }
            } else {
              // Wait for more data
              break;
            }
          } else {
            // No delimiter yet, accumulate file data
            this.receivingBuffer = Buffer.concat([this.receivingBuffer, this.dataBuffer]);
            this.receivedBytes += this.dataBuffer.length;

            const progress = Math.round(
              (this.receivedBytes / this.currentFileMetadata.fileSize) * 100
            );
            this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_PROGRESS, {
              fileName: this.currentFileMetadata.fileName,
              progress,
              receivedBytes: this.receivedBytes,
              totalBytes: this.currentFileMetadata.fileSize,
              currentFile: this.currentFileMetadata.currentFile,
              totalFiles: this.currentFileMetadata.totalFiles,
            });

            this.dataBuffer = Buffer.alloc(0);
            break;
          }
        } else {
          // Looking for control message (metadata or file-saved acknowledgment)
          logger.info(`[PROCESS] Mode: Looking for control message`);
          const delimiterIndex = this.dataBuffer.indexOf(delimiterBuffer);
          logger.info(`[PROCESS] Delimiter index: ${delimiterIndex}`);

          if (delimiterIndex !== -1) {
            const messageStr = this.dataBuffer.subarray(0, delimiterIndex).toString();
            logger.info(`[PROCESS] Found message: ${messageStr.substring(0, 200)}`);
            this.dataBuffer = this.dataBuffer.subarray(delimiterIndex + delimiterBuffer.length);

            try {
              const json = JSON.parse(messageStr);
              logger.info(`[PROCESS] Parsed JSON type: ${json.type}`);

              if (json.type === 'metadata') {
                // Start receiving a new file
                this.currentFileMetadata = json.data;
                this.receivingBuffer = Buffer.alloc(0);
                this.receivedBytes = 0;
                this.isReceiving = true;

                logger.info(
                  `Receiving file ${json.data.currentFile}/${json.data.totalFiles}: ${json.data.fileName} (${formatFileSize(json.data.fileSize)})`
                );
              } else if (json.type === 'file-saved') {
                // Receiver has saved the file successfully
                logger.info('Received file-saved acknowledgment from receiver');
                if (this.fileSavedResolver) {
                  this.fileSavedResolver();
                  this.fileSavedResolver = null;
                } else {
                  logger.warn('Received file-saved but no resolver waiting');
                }
              }
            } catch (e) {
              logger.warn('Failed to parse control message');
            }
          } else {
            // Wait for complete message
            break;
          }
        }
      }
    } catch (err: any) {
      logger.error('Error processing data buffer:', err.message);
    }
  }

  /**
   * Save received file to disk
   */
  private saveReceivedFile(): void {
    if (!this.currentFileMetadata) {
      logger.warn('[SAVE] No current file metadata');
      return;
    }

    try {
      logger.info(
        `[SAVE] Saving file: ${this.currentFileMetadata.fileName}, size: ${this.receivingBuffer.length}`
      );
      const savePath = path.join(this.saveDirectory, this.currentFileMetadata.fileName);
      fs.writeFileSync(savePath, this.receivingBuffer);

      logger.success(`File saved: ${this.currentFileMetadata.fileName}`);

      this.mainWindow?.webContents.send(IPC_CHANNELS.FILE_RECEIVED, {
        fileName: this.currentFileMetadata.fileName,
        fileSize: this.currentFileMetadata.fileSize,
        savePath,
        currentFile: this.currentFileMetadata.currentFile,
        totalFiles: this.currentFileMetadata.totalFiles,
      });

      if (this.currentFileMetadata.currentFile === this.currentFileMetadata.totalFiles) {
        logger.success('All files received!');
        this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_COMPLETE);
      }

      // Send acknowledgment to sender
      const ackMessage = JSON.stringify({ type: 'file-saved' });
      const ackBuffer = Buffer.from(ackMessage + this.messageDelimiter);
      logger.info(
        `[SEND-ACK] Sending acknowledgment: ${ackMessage}, buffer length: ${ackBuffer.length}`
      );
      logger.info(`[SEND-ACK] Client connected: ${this.client ? 'YES' : 'NO'}`);
      this.client?.write(ackBuffer);
      logger.info(`[SEND-ACK] Acknowledgment sent for ${this.currentFileMetadata.fileName}`);

      this.isReceiving = false;
      this.currentFileMetadata = null;
      this.receivingBuffer = Buffer.alloc(0);
      this.receivedBytes = 0;
    } catch (err: any) {
      logger.error('Error saving file:', err.message);
      this.mainWindow?.webContents.send(IPC_CHANNELS.TRANSFER_ERROR, err.message);
    }
  }

  /**
   * Cleanup on app exit
   */
  cleanup(): void {
    this.stopSender();
    this.disconnectReceiver();
    if (this.bonjour) {
      this.bonjour.destroy();
      this.bonjour = null;
    }
  }
}
