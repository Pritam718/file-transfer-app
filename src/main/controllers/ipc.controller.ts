/**
 * IPC Controller for file transfer operations
 * Handles all inter-process communication between renderer and main process
 */

import { BrowserWindow, dialog, ipcMain } from 'electron';
import { getLocalIPAddress } from '../lib/network.lib';
import { LocalFileTransferService } from '../services/localFileTransfer.service';
import { IPC_CHANNELS } from '../utils/constants';
import { logger } from '../utils/logger';

let localTransferService: LocalFileTransferService | null = null;

/**
 * Setup all IPC handlers
 */
export function setupIPCHandlers(mainWindow: BrowserWindow): void {
  localTransferService = new LocalFileTransferService(mainWindow);

  // Start sender mode
  ipcMain.handle(IPC_CHANNELS.START_SENDER, async (transferType) => {
    try {
      logger.loading('Starting sender mode...');
      const result = await localTransferService!.startSender();
      logger.success('Sender mode started successfully');
      return result;
    } catch (err: any) {
      logger.error('Failed to start sender:', err.message);
      throw err;
    }
  });

  // Stop sender mode
  ipcMain.handle(IPC_CHANNELS.STOP_SENDER, async (transferType) => {
    try {
      await localTransferService!.stopSender();
      return { success: true };
    } catch (err: any) {
      logger.error('Failed to stop sender:', err.message);
      throw err;
    }
  });

  // Connect to sender as receiver
  ipcMain.handle(
    IPC_CHANNELS.CONNECT_RECEIVER,
    async (_event, ip: string, port: number, code: string, saveDir?: string) => {
      try {
        logger.loading(`Connecting to sender at ${ip}:${port}...`);

        let finalSaveDir = saveDir;

        // Only ask for folder if not provided
        if (!finalSaveDir) {
          const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select folder to save received files',
          });

          if (result.canceled || result.filePaths.length === 0) {
            throw new Error('No save location selected');
          }

          finalSaveDir = result.filePaths[0];
        }

        await localTransferService!.connectToSender(ip, port, code, finalSaveDir);

        return { success: true, saveDir: finalSaveDir };
      } catch (err: any) {
        logger.error('Failed to connect to sender:', err.message);
        throw err;
      }
    }
  );

  // Disconnect receiver
  ipcMain.handle(IPC_CHANNELS.DISCONNECT_RECEIVER, async () => {
    try {
      await localTransferService!.disconnectReceiver();
      return { success: true };
    } catch (err: any) {
      logger.error('Failed to disconnect receiver:', err.message);
      throw err;
    }
  });

  // Send files
  ipcMain.handle(IPC_CHANNELS.SEND_FILES, async (_event, filePaths: string[]) => {
    try {
      logger.loading('Preparing to send files...');
      await localTransferService!.sendFiles(filePaths);
      return { success: true };
    } catch (err: any) {
      logger.error('Failed to send files:', err.message);
      throw err;
    }
  });

  // Select files to send
  ipcMain.handle(IPC_CHANNELS.SELECT_FILES, async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        title: 'Select files to transfer',
      });

      if (result.canceled) {
        return { canceled: true, filePaths: [] };
      }

      return { canceled: false, filePaths: result.filePaths };
    } catch (err: any) {
      logger.error('Failed to select files:', err.message);
      throw err;
    }
  });

  // Select folder for saving
  ipcMain.handle(IPC_CHANNELS.SELECT_SAVE_DIR, async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select folder to save files',
      });

      if (result.canceled) {
        return { canceled: true, folderPath: '' };
      }

      return { canceled: false, folderPath: result.filePaths[0] };
    } catch (err: any) {
      logger.error('Failed to select folder:', err.message);
      throw err;
    }
  });

  // Get local IP address
  ipcMain.handle(IPC_CHANNELS.GET_LOCAL_IP, () => {
    try {
      const ip = getLocalIPAddress();

      return ip;
    } catch (err: any) {
      logger.error('Failed to get local IP:', err.message);
      return 'localhost';
    }
  });

  // Discover file transfer services on network
  ipcMain.handle(IPC_CHANNELS.DISCOVER_SERVICES, async () => {
    try {
      logger.loading('Discovering file transfer services on network...');
      const services = await localTransferService!.discoverServices();
      logger.success(`Found ${services.length} service(s)`);
      return services;
    } catch (err: any) {
      logger.error('Failed to discover services:', err.message);
      logger.error('Stack trace:', err.stack);
      throw err; // Throw the error so the client can see it
    }
  });

  logger.success('IPC handlers registered successfully');
}

/**
 * Cleanup IPC handlers
 */
export function cleanupIPCHandlers(): void {
  if (localTransferService) {
    localTransferService.cleanup();
    localTransferService = null;
  }
}
