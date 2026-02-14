import { APP_CONFIG } from '../../src/main/utils/config';

describe('Config', () => {
  describe('APP_CONFIG', () => {
    it('should have basic properties', () => {
      expect(APP_CONFIG.name).toBeDefined();
      expect(APP_CONFIG.version).toBeDefined();
      expect(APP_CONFIG.description).toBeDefined();
      expect(typeof APP_CONFIG.name).toBe('string');
      expect(typeof APP_CONFIG.version).toBe('string');
    });

    it('should have window property', () => {
      expect(APP_CONFIG.window).toBeDefined();
      expect(APP_CONFIG.window.width).toBeGreaterThan(0);
      expect(APP_CONFIG.window.height).toBeGreaterThan(0);
      expect(APP_CONFIG.window.minWidth).toBeGreaterThan(0);
      expect(APP_CONFIG.window.minHeight).toBeGreaterThan(0);
    });

    it('should have valid window dimensions', () => {
      expect(APP_CONFIG.window.width).toBeGreaterThanOrEqual(APP_CONFIG.window.minWidth);
      expect(APP_CONFIG.window.height).toBeGreaterThanOrEqual(APP_CONFIG.window.minHeight);
    });
  });
});
