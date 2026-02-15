import { LocalFileTransferService } from '../../src/main/services/localFileTransfer.service';

// Mock dependencies
jest.mock('../../src/main/utils/logger');

describe('LocalFileTransferService', () => {
  let service: LocalFileTransferService;
  let mockWindow: any;

  beforeEach(() => {
    mockWindow = {
      webContents: {
        send: jest.fn(),
      },
    };
    service = new LocalFileTransferService(mockWindow);
  });

  afterEach(() => {
    service.stopSender();
    service.disconnectReceiver();
  });

  describe('Sender Operations', () => {
    it('should start sender and return connection info', async () => {
      const result = await service.startSender();

      expect(result).toBeDefined();
      expect(result.port).toBeDefined();
      expect(result.port).toBeGreaterThan(0);
      expect(result.code).toBeDefined();
      expect(typeof result.code).toBe('string');
      expect(result.ip).toBeDefined();

      service.stopSender();
    });

    it('should create server with valid port', async () => {
      const result = await service.startSender();

      expect(result.port).toBeGreaterThan(0);
      expect(result.port).toBeLessThanOrEqual(65535);

      service.stopSender();
    });

    it('should stop sender without errors', async () => {
      await service.startSender();
      expect(() => service.stopSender()).not.toThrow();
    });

    it('should handle stopping non-running sender', () => {
      expect(() => service.stopSender()).not.toThrow();
    });
  });

  describe('Receiver Operations', () => {
    it('should disconnect receiver without errors', () => {
      expect(() => service.disconnectReceiver()).not.toThrow();
    });

    it('should handle multiple disconnect calls', () => {
      service.disconnectReceiver();
      expect(() => service.disconnectReceiver()).not.toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    it('should have mainWindow reference', () => {
      expect(service).toBeDefined();
    });

    it('should handle cleanup on multiple stop calls', async () => {
      await service.startSender();
      service.stopSender();
      service.stopSender(); // Should not throw

      service.disconnectReceiver();
      service.disconnectReceiver(); // Should not throw
    });
  });

  describe('Integration', () => {
    it('should start and stop sender successfully', async () => {
      const connectionInfo = await service.startSender();
      expect(connectionInfo.port).toBeGreaterThan(0);
      expect(connectionInfo.code).toBeDefined();

      service.stopSender();

      // Should be able to restart
      const connectionInfo2 = await service.startSender();
      expect(connectionInfo2.port).toBeGreaterThan(0);
      expect(connectionInfo2.code).toBeDefined();

      service.stopSender();
    });
  });
});
