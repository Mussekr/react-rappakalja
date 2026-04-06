import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './utils/api';
import { useSocket } from './hooks/useSocket';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';

function Answer() {
    const [answered, setAnswered] = useState(0);
    const [serverCurrentRound, setServerCurrentRound] = useState('');
    const [author, setAuthor] = useState('');
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');
    const [aiAvailable, setAiAvailable] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPreview, setAiPreview] = useState('');
    const [questionType, setQuestionType] = useState('sana');
    const [question, setQuestion] = useState('');
    const [activeQuestion, setActiveQuestion] = useState(null);
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
        'round:advanced': () => { getSession(); setActiveQuestion(null); },
        'game:ended': () => navigate('/'),
        'master:changed': () => getSession(),
        'question:updated': (data) => {
            setActiveQuestion(data);
            if (data && data.question) setQuestion(data.question);
            if (data && data.questionType) setQuestionType(data.questionType);
        }
    });

    useEffect(() => {
        getSession();
        api.json('/api/ai/status').then(json => {
            if (json && json.available) setAiAvailable(true);
        }).catch(() => {});
        api.json('/api/question').then(json => {
            if (json && json.question) setActiveQuestion(json);
        }).catch(() => {});
    }, [getSession]);

    const generateAnswer = () => {
        if (!question.trim()) {
            setError('Syötä kysymys ensin!');
            return;
        }
        setAiLoading(true);
        setError('');
        api.post('/api/ai/generate', { questionType, question: question.trim() })
            .then(json => setAiPreview(json.answer))
            .catch(() => setError('AI-generointi epäonnistui. Yritä uudelleen.'))
            .finally(() => setAiLoading(false));
    };

    const acceptAiAnswer = () => {
        setAnswer(aiPreview);
        setAiPreview('');
    };

    const cancelAiAnswer = () => {
        setAiPreview('');
    };

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
                    {activeQuestion && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs font-medium uppercase text-gray-500">Kysymys</p>
                            <p className="mt-1 text-lg font-semibold">{activeQuestion.question}</p>
                        </div>
                    )}
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
                    )}
                    {aiAvailable && (
                        <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                            <p className="text-sm font-medium text-gray-700">AI-avustettu vastaus</p>
                            {!aiPreview ? (
                                <>
                                    <div className="flex gap-2">
                                        <select
                                            value={questionType}
                                            onChange={ev => setQuestionType(ev.target.value)}
                                            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                                        >
                                            <option value="sana">Sana</option>
                                            <option value="henkilö">Henkilö</option>
                                            <option value="elokuvakäsikirjoitus">Elokuvakäsikirjoitus</option>
                                            <option value="lyhenne">Lyhenne</option>
                                            <option value="laki">Laki</option>
                                        </select>
                                        <Input
                                            value={question}
                                            onChange={ev => setQuestion(ev.target.value)}
                                            placeholder="Syötä kysymys..."
                                            className="flex-1"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={generateAnswer}
                                        disabled={aiLoading}
                                    >
                                        {aiLoading ? 'Generoidaan...' : 'Generoi vastaus'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-gray-800">
                                        {aiPreview}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={acceptAiAnswer}>
                                            Hyväksy
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={generateAnswer}
                                            disabled={aiLoading}
                                        >
                                            {aiLoading ? 'Generoidaan...' : 'Uusi vastaus'}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={cancelAiAnswer}>
                                            Peruuta
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
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
