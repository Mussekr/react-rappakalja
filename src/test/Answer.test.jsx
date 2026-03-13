// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Answer from '../Answer';

// Mock the api module
vi.mock('../utils/api', () => ({
    default: {
        json: vi.fn(),
        post: vi.fn()
    }
}));

import api from '../utils/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('Answer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows answer form when player has not answered current round', async () => {
        api.json.mockResolvedValue({
            active: true,
            master: false,
            answered: 0,
            servercurrentround: 1,
            author: 'TestPlayer'
        });

        render(
            <MemoryRouter>
                <Answer />
            </MemoryRouter>
        );

        expect(await screen.findByText('TestPlayer')).toBeInTheDocument();
        expect(screen.getByLabelText('Your answer')).toBeInTheDocument();
    });

    it('shows waiting message when player has answered', async () => {
        api.json.mockResolvedValue({
            active: true,
            master: false,
            answered: 1,
            servercurrentround: '1',
            author: 'TestPlayer'
        });

        render(
            <MemoryRouter>
                <Answer />
            </MemoryRouter>
        );

        expect(await screen.findByText('Waiting for the next round...')).toBeInTheDocument();
    });

    it('navigates home when game is not active', async () => {
        api.json.mockResolvedValue({ active: false });

        render(
            <MemoryRouter>
                <Answer />
            </MemoryRouter>
        );

        // Wait for effect to run
        await vi.waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('navigates to /game when player is promoted to master', async () => {
        api.json.mockResolvedValue({
            active: true,
            master: true,
            answered: 0,
            servercurrentround: 2,
            author: 'TestPlayer'
        });

        render(
            <MemoryRouter>
                <Answer />
            </MemoryRouter>
        );

        await vi.waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game');
        });
    });
});
