import { jest } from '@jest/globals';

// Set test environment variables
process.env['NODE_ENV'] = 'test';
// Clear DATABASE_URL to force SQLite fallback for tests
delete process.env['DATABASE_URL'];
process.env['DATA_DIR'] = './test-data';

// Mock external dependencies that might not be available in test environment
jest.mock('geoip-lite', () => ({
  lookup: jest.fn((ip: string) => {
    if (ip === '127.0.0.1' || ip === '::1') return { country: 'XX' };
    return { country: 'US' };
  })
}));

// Mock nodemailer to avoid actual email sending
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn((mailOptions: any, callback: any) => {
      callback(null, { messageId: 'test-message-id' });
    })
  }))
}));

// Mock fs for testing
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs') as any;
  return {
    ...actualFs,
    existsSync: jest.fn((path: string) => {
      // Mock existence for common paths
      if (path.includes('index.html') || path.includes('static')) return true;
      return actualFs.existsSync(path);
    }),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(() => ['index.html', 'main.js']),
    readFileSync: jest.fn((path: string) => {
      if (path.includes('index.html')) return '<html><body>Test</body></html>';
      return actualFs.readFileSync(path);
    })
  };
});

// Global test setup
beforeAll(async () => {
  // Ensure clean test environment
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Cleanup
  jest.clearAllMocks();
});

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});