import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import { useSocket } from './hooks/useSocket';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';

function Answer() {
    const [answered, setAnswered] = useState(0);
    const [serverCurrentRound, setServerCurrentRound] = useState('');
    const [author, setAuthor] = useState('');
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const getSession = useCallback(() => {
        api.json('/api/session').then(json => {
            if (!json || Object.keys(json).length === 0 || !json.active) {
                navigate('/');
            } else if (json.master) {
                // This player was promoted to master
                navigate('/game');
            } else {
                setAnswered(json.answered);
                setServerCurrentRound(json.servercurrentround);
                setAuthor(json.author);
            }
        });
    }, [navigate]);

    useSocket({
        'round:advanced': () => getSession(),
        'game:ended': () => navigate('/'),
        'master:changed': () => getSession()
    });

    useEffect(() => {
        getSession();
    }, [getSession]);

    const sendAnswer = () => {
        if (answer.trim()) {
            api.post('/api/answer', { currentRound: serverCurrentRound, answer })
                .then(() => {
                    setAnswer('');
                    getSession();
                })
                .catch(() => setError('Failed to submit answer'));
        } else {
            setError('The answer is empty!');
        }
    };

    const logout = () => {
        if (confirm('Are you sure you want to leave?')) {
            api.post('/api/session/del').then(() => navigate('/'));
        }
    };

    if (String(answered) === String(serverCurrentRound)) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-lg text-gray-600">Waiting for the next round...</p>
                    <p className="mt-1 text-sm text-gray-400">The master is reviewing answers</p>
                    <Button variant="outline" onClick={logout} className="mt-6">
                        Leave game
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Round {serverCurrentRound}
                </CardTitle>
                <p className="text-sm text-gray-500">Playing as <span className="font-semibold">{author}</span></p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
                    )}
                    <div>
                        <label htmlFor="answerField" className="mb-1 block text-sm font-medium text-gray-700">
                            Your answer
                        </label>
                        <Textarea
                            id="answerField"
                            rows={3}
                            value={answer}
                            onChange={ev => setAnswer(ev.target.value)}
                            placeholder="Type your answer..."
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={sendAnswer} className="flex-1">Send</Button>
                        <Button variant="outline" onClick={logout}>Leave</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default Answer;
