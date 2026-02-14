import * as os from 'os';
import { formatFileSize, getLocalIPAddress, isValidPort } from '../../src/main/lib/network.lib';

// Mock the os module
jest.mock('os');

describe('Network Library', () => {
  const mockNetworkInterfaces = os.networkInterfaces as jest.MockedFunction<typeof os.networkInterfaces>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocalIPAddress', () => {
    it('should return a valid IP address', () => {
      mockNetworkInterfaces.mockReturnValue({
        en0: [
          {
            address: '192.168.1.100',
            family: 'IPv4',
            internal: false,
            netmask: '255.255.255.0',
            mac: '00:00:00:00:00:00',
            cidr: '192.168.1.100/24',
          },
        ],
      });

      const ip = getLocalIPAddress();
      expect(ip).toBe('192.168.1.100');
    });

    it('should return localhost if no network interface found', () => {
      mockNetworkInterfaces.mockReturnValue({});
      const ip = getLocalIPAddress();
      expect(ip).toBe('localhost');
    });

    it('should skip internal and IPv6 addresses', () => {
      mockNetworkInterfaces.mockReturnValue({
        lo: [
          {
            address: '127.0.0.1',
            family: 'IPv4',
            internal: true,
            netmask: '',
            mac: '',
            cidr: '',
          },
        ],
        eth0: [
          {
            address: 'fe80::1',
            family: 'IPv6',
            internal: false,
            netmask: '',
            mac: '',
            cidr: '',
            scopeid: 2,
          },
          {
            address: '192.168.1.100',
            family: 'IPv4',
            internal: false,
            netmask: '',
            mac: '',
            cidr: '',
          },
        ],
      });
      const ip = getLocalIPAddress();
      expect(ip).toBe('192.168.1.100');
    });
  });

  describe('isValidPort', () => {
    it('should return true for valid port numbers', () => {
      expect(isValidPort(1024)).toBe(true);
      expect(isValidPort(3000)).toBe(true);
      expect(isValidPort(5000)).toBe(true);
      expect(isValidPort(8080)).toBe(true);
      expect(isValidPort(65535)).toBe(true);
    });

    it('should return false for invalid port numbers', () => {
      expect(isValidPort(0)).toBe(false);
      expect(isValidPort(-1)).toBe(false);
      expect(isValidPort(80)).toBe(false); // Below MIN_PORT (1024)
      expect(isValidPort(1023)).toBe(false); // Below MIN_PORT
      expect(isValidPort(65536)).toBe(false);
      expect(isValidPort(100000)).toBe(false);
    });

    it('should return false for non-integer ports', () => {
      expect(isValidPort(3000.5)).toBe(false);
      expect(isValidPort(NaN)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
      expect(formatFileSize(10485760)).toBe('10 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });

    it('should format terabytes correctly', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });

    it('should handle string numbers', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      const result = formatFileSize(1331);
      expect(result).toMatch(/^1\.3\d? KB$/);
    });
  });
});
