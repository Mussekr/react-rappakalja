import { vi } from 'vitest';

/**
 * Creates a mock pg-promise db object.
 * Each method is a vi.fn() that can be configured per test.
 * The tx() method executes the callback with the mock itself as the transaction
 * context, so transaction-wrapped code uses the same mocks.
 */
export function createMockDb() {
    const mock = {
        one: vi.fn(),
        oneOrNone: vi.fn(),
        none: vi.fn(),
        any: vi.fn(),
        many: vi.fn(),
        query: vi.fn()
    };

    // tx runs the callback with the mock db so nested calls resolve correctly.
    // Returns a Promise so async/await in app code works.
    mock.tx = vi.fn(fn => Promise.resolve().then(() => fn(mock)));

    return mock;
}
