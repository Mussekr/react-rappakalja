// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Game from '../Game';

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

describe('Game', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays game code and current round', async () => {
        // Route api.json calls by URL
        api.json.mockImplementation(url => {
            if (url === '/api/session') {
                return Promise.resolve({
                    master: true,
                    gameId: 'ABC12',
                    servercurrentround: 3,
                    playerId: 1,
                    answered: 0
                });
            }
            if (url.startsWith('/api/answers/')) {
                return Promise.resolve({ success: true, phase: 'answering', answers: [], masterAnswered: false, totalAnswers: 0 });
            }
            if (url === '/api/players') {
                return Promise.resolve({ success: true, players: [] });
            }
            return Promise.resolve({});
        });

        render(
            <MemoryRouter>
                <Game />
            </MemoryRouter>
        );

        expect(await screen.findByText(/ABC12/)).toBeInTheDocument();
        expect(await screen.findByText(/3/)).toBeInTheDocument();
    });

    it('navigates home when no session', async () => {
        api.json.mockResolvedValue({});

        render(
            <MemoryRouter>
                <Game />
            </MemoryRouter>
        );

        await vi.waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('shows master answer form in answering phase', async () => {
        api.json.mockImplementation(url => {
            if (url === '/api/session') {
                return Promise.resolve({
                    master: true,
                    gameId: 'ABC12',
                    servercurrentround: 1,
                    playerId: 1,
                    answered: 0
                });
            }
            if (url.startsWith('/api/answers/')) {
                return Promise.resolve({ success: true, phase: 'answering', answers: [], masterAnswered: false, totalAnswers: 0 });
            }
            if (url === '/api/players') {
                return Promise.resolve({ success: true, players: [{ id: 1, name: 'Alice', is_master: true }] });
            }
            return Promise.resolve({});
        });

        render(
            <MemoryRouter>
                <Game />
            </MemoryRouter>
        );

        expect(await screen.findByText('Sinun vuorosi vastata ensin!')).toBeInTheDocument();
    });

    it('navigates to /answer when master role is transferred away', async () => {
        api.json.mockResolvedValue({
            master: false,
            gameId: 'ABC12',
            servercurrentround: 2,
            playerId: 1
        });

        render(
            <MemoryRouter>
                <Game />
            </MemoryRouter>
        );

        await vi.waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/answer');
        });
    });
});
