import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import { useSocket } from './hooks/useSocket';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function AnswerCard({ player, answer }) {
    return (
        <Card className="mb-3">
            <CardContent className="pt-4">
                <p className="text-sm font-semibold text-gray-600">{player}</p>
                <p className="mt-1 text-gray-900">{answer}</p>
            </CardContent>
        </Card>
    );
}

function MasterAnswerForm({ round, onAnswered }) {
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');

    const submit = () => {
        if (!answer.trim()) {
            setError('Answer cannot be empty!');
            return;
        }
        api.post('/api/answer', { currentRound: round, answer }).then(() => {
            onAnswered();
        }).catch(() => setError('Failed to submit answer'));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Your turn to answer first!</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
                    )}
                    <div>
                        <label htmlFor="masterAnswer" className="mb-1 block text-sm font-medium text-gray-700">
                            Your answer
                        </label>
                        <Textarea
                            id="masterAnswer"
                            rows={3}
                            onChange={ev => setAnswer(ev.target.value)}
                            value={answer}
                            placeholder="Type your answer..."
                        />
                    </div>
                    <Button onClick={submit} className="w-full">Submit my answer</Button>
                </div>
            </CardContent>
        </Card>
    );
}

function NextMasterPicker({ players, currentPlayerId, onPick }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Choose the next master</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {players.map(p => (
                        <Button
                            key={p.id}
                            variant={p.id === currentPlayerId ? 'outline' : 'default'}
                            onClick={() => onPick(p.id)}
                        >
                            {p.id === currentPlayerId ? `${p.name} (me)` : p.name}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function Game() {
    const [gameId, setGameId] = useState('');
    const [serverCurrentRound, setServerCurrentRound] = useState('');
    const [answers, setAnswers] = useState([]);
    const [phase, setPhase] = useState('answering');
    const [players, setPlayers] = useState([]);
    const [playerId, setPlayerId] = useState(null);
    const [pickingNextMaster, setPickingNextMaster] = useState(false);
    const navigate = useNavigate();
    const currentRoundRef = useRef('');

    const getAnswers = useCallback(round => {
        if (!round) return;
        api.json('/api/answers/' + round).then(json => {
            setPhase(json.phase);
            if (json.phase === 'reveal') {
                setAnswers(prev => {
                    if (json.answers.length !== prev.length) {
                        return json.answers;
                    }
                    return prev;
                });
            }
        }).catch(() => {});
    }, []);

    const getPlayers = useCallback(() => {
        // API returns { success: true, players: [...] }
        api.json('/api/players').then(json => {
            if (json && json.players) {
                setPlayers(json.players);
            }
        }).catch(() => {});
    }, []);

    const getSession = useCallback(() => {
        api.json('/api/session').then(json => {
            if (!json || Object.keys(json).length === 0) {
                navigate('/');
            } else if (json.master === false) {
                // Master role was transferred — redirect to answer view
                navigate('/answer');
            } else {
                getAnswers(json.servercurrentround);
                setGameId(json.gameId);
                setServerCurrentRound(json.servercurrentround);
                setPlayerId(json.playerId);
                currentRoundRef.current = json.servercurrentround;
            }
        });
    }, [navigate, getAnswers]);

    useSocket({
        'answers:updated': () => getAnswers(currentRoundRef.current),
        'round:advanced': () => {
            setAnswers([]);
            setPhase('answering');
            getSession();
        },
        'players:updated': () => getPlayers(),
        'game:ended': () => navigate('/'),
        'master:changed': () => getSession()
    });

    useEffect(() => {
        getSession();
        getPlayers();
    }, [getSession, getPlayers]);

    const onMasterAnswered = () => {
        getSession();
    };

    const nextRound = () => {
        setPickingNextMaster(true);
    };

    const onPickNextMaster = (nextMasterId) => {
        api.post('/api/nextround', { nextMasterId }).then(() => {
            setPickingNextMaster(false);
            setAnswers([]);
            setPhase('answering');
            getSession();
            getPlayers();
        });
    };

    const endGame = () => {
        if (confirm('Are you sure you want to end the game?')) {
            api.post('/api/session/del').then(() => navigate('/'));
        }
    };

    const shuffleAnswers = () => {
        setAnswers(prev => shuffle(prev));
    };

    return (
        <div className="space-y-6">
            {/* Header info */}
            <Card>
                <CardContent className="flex items-center justify-between pt-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Room</span>
                            <Badge className="font-mono text-lg">{gameId}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm text-gray-500">Round</span>
                            <Badge variant="secondary">{serverCurrentRound}</Badge>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Players</p>
                        <div className="mt-1 flex flex-wrap justify-end gap-1">
                            {players.map(p => (
                                <Badge key={p.id} variant={p.is_master ? 'default' : 'secondary'}>
                                    {p.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Master answer phase */}
            {phase === 'answering' && (
                <MasterAnswerForm round={serverCurrentRound} onAnswered={onMasterAnswered} />
            )}

            {/* Reveal phase */}
            {phase === 'reveal' && !pickingNextMaster && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={shuffleAnswers}>Shuffle answers</Button>
                        <Button onClick={nextRound}>Next round</Button>
                        <Button variant="destructive" onClick={endGame}>End game</Button>
                    </div>
                    <div>
                        {answers.map(a => (
                            <AnswerCard player={a.author} answer={a.answer} key={a.id} />
                        ))}
                    </div>
                </div>
            )}

            {/* Next master picker */}
            {pickingNextMaster && (
                <NextMasterPicker
                    players={players}
                    currentPlayerId={playerId}
                    onPick={onPickNextMaster}
                />
            )}
        </div>
    );
}

export default Game;
