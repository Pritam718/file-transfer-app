/**
 * Remote File Transfer Service
 * This service coordinates remote transfers but delegates WebRTC/PeerJS to the renderer process
 * since WebRTC requires browser APIs not available in Node.js
 */

import { BrowserWindow } from 'electron';
import { ConnectionInfo, ConnectionStatus } from '../interfaces/localFileTransfer.interface';
import { IPC_CHANNELS } from '../utils/constants';
import { logger } from '../utils/logger';

class RemoteFileTransferService {
  private mainWindow: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
  }

  async startSender(): Promise<ConnectionInfo> {
    logger.info('Remote sender mode - PeerJS will run in renderer process');

    this.mainWindow?.webContents.send(IPC_CHANNELS.CONNECTION_STATUS, {
      connected: true,
      mode: 'sender',
    } as ConnectionStatus);

    // Return placeholder - actual PeerJS connection happens in renderer
    return {
      ip: 'REMOTE',
      port: 0,
      code: '', // Will be set by renderer
      hostname: 'Remote Transfer',
    };
  }

  async stopSender(): Promise<void> {
    logger.info('Remote sender stop requested');
    // Actual cleanup happens in renderer process
  }

  async connectToSender(ip: string, port: number, code: string, saveDir: string): Promise<void> {
    logger.info('Remote receiver mode - will be handled in renderer process');
    // Actual connection happens in renderer
  }

  disconnectReceiver(): void {
    logger.info('Remote receiver disconnect requested');
    // Actual cleanup happens in renderer process
  }

  async sendFiles(filePaths: string[]): Promise<void> {
    logger.info('Remote file send - handled in renderer process');
    // Actual file transfer happens via PeerJS in renderer
  }

  cleanup(): void {
    // Nothing to cleanup in main process
    logger.info('Remote transfer service cleanup');
  }
}

export default RemoteFileTransferService;
