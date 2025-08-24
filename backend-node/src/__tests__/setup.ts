import { supabase } from '../config/database';

// Mock Supabase for testing
jest.mock('../config/database', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test teardown
afterAll(() => {
  jest.restoreAllMocks();
});
