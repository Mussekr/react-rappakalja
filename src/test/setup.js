import '@testing-library/jest-dom';

// Mock socket.io-client for all tests
vi.mock('socket.io-client', () => ({
    io: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        connected: false
    }))
}));
