import './style.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import Answer from './Answer';
import Game from './Game';
import api from './utils/api';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';

function Layout() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-2xl px-4 py-8">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Rappakalja</h1>
                    <p className="mt-1 text-sm text-gray-500">Lautapelin apuväline</p>
                </header>
                <Outlet />
            </div>
        </div>
    );
}

function Home() {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [mode, setMode] = useState('join'); // 'join' | 'create'
    const navigate = useNavigate();

    useEffect(() => {
        api.json('/api/session').then(json => {
            if (json && Object.keys(json).length > 0) {
                if (json.master === true) {
                    navigate('/game');
                } else {
                    navigate('/answer');
                }
            }
        });
    }, [navigate]);

    const join = () => {
        if (!name.trim()) {
            setError('Syötä nimesi');
            return;
        }
        if (!code.trim()) {
            setError('Syötä pelikoodi');
            return;
        }
        api.post('/api/join', { gameId: code.toUpperCase(), author: name })
            .then(() => navigate('/answer'))
            .catch(err => setError(err.error || 'Peliin liittyminen epäonnistui'));
    };

    const newGame = () => {
        if (!name.trim()) {
            setError('Syötä nimesi');
            return;
        }
        api.post('/api/newgame', { name })
            .then(() => navigate('/game'))
            .catch(err => setError(err.error || 'Pelin luominen epäonnistui'));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'join' ? 'Liity peliin' : 'Luo peli'}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            variant={mode === 'join' ? 'default' : 'outline'}
                            onClick={() => { setMode('join'); setError(''); }}
                            className="flex-1"
                        >
                            Liity peliin
                        </Button>
                        <Button
                            variant={mode === 'create' ? 'default' : 'outline'}
                            onClick={() => { setMode('create'); setError(''); }}
                            className="flex-1"
                        >
                            Uusi peli
                        </Button>
                    </div>

                    <div>
                        <label htmlFor="playerName" className="mb-1 block text-sm font-medium text-gray-700">
                            Nimesi
                        </label>
                        <Input
                            id="playerName"
                            placeholder="Syötä nimesi"
                            value={name}
                            onChange={ev => setName(ev.target.value)}
                        />
                    </div>

                    {mode === 'join' && (
                        <div>
                            <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-700">
                                Pelikoodi
                            </label>
                            <Input
                                id="code"
                                placeholder="esim. ABC12"
                                value={code}
                                onChange={ev => setCode(ev.target.value)}
                                className="uppercase"
                            />
                        </div>
                    )}

                    <Button
                        onClick={mode === 'join' ? join : newGame}
                        className="w-full"
                        size="lg"
                    >
                        {mode === 'join' ? 'Liity' : 'Luo peli'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

const root = createRoot(document.getElementById('app'));
root.render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="answer" element={<Answer />} />
                <Route path="game" element={<Game />} />
            </Route>
        </Routes>
    </BrowserRouter>
);
