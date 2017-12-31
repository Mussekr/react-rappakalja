const express = require('express');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const pgp = require('pg-promise')();
const randomize = require('randomatic');

const configPgp = {
    poolSize: 20, // max number of clients in the pool
    host: process.env.PGHOST || 'localhost'
};
const db = pgp(configPgp);

const app = express();

const env = process.env.NODE_ENV || 'development';
const secret = process.env.NODE_ENV === 'production' ? process.env.APP_SECRET : 'dev-secret';
if (!secret) {
    throw new Error('Unable to start in production mode with no APP_SECRET set!');
}

const forceSsl = function (req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    return next();
};

if (env === 'production') {
    app.use(forceSsl);
}

app.use(cookieSession({
    secret: secret,
    name: 'session'

}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/../public/'));

app.get('/api/game/:id', function(req, res) {
    db.oneOrNone('SELECT count(code) FROM games WHERE code = $1', [req.params.id])
    .then(data => {
        if(data.code === String(1)) {
            res.send({success: true, exist: true});
        } else {
            res.status(400).send({success: true, exist: false});
        }
    }).catch(err => res.status(500).send(err));
});

app.post('/api/newgame', function(req, res) {
    const code = randomize('A0', 5);
    if(req.session.gameId) {
        res.status(400).send({success: false, error: 'Cannot create new game, already one open'});
    } else {
        db.none('INSERT INTO games (code, currentround, active) VALUES ($1, $2, TRUE)', [code, 1])
        .then(() => {
            req.session.gameId = code;
            req.session.currentRound = 1;
            req.session.master = true;
            res.send({success: true, code: code});
        }).catch(err => res.status(500).send(err));
    }
});

app.post('/api/answer', function(req, res) {
    if(req.session.gameId) {
        db.none('INSERT INTO answers (gamecode, round, author, answer) VALUES ($1, $2, $3, $4)',
        [req.session.gameId, req.body.currentRound, req.session.author, req.body.answer])
        .then(() => {
            req.session.currentRound += 1;
            req.session.answered += 1;
            res.send({success: true});
        })
        .catch(err => res.status(500).send(err));
    } else {
        res.status(400).send({success: false, error: 'Game dont exist!'});
    }
});

app.post('/api/join', function(req, res) {
    db.oneOrNone('SELECT count(code) FROM games WHERE code = $1 AND active = TRUE', [req.body.gameId])
    .then(data => {
        if(data.count === String(1)) {
            db.one('SELECT currentround FROM games WHERE code = $1', [req.body.gameId])
            .then(data => {
                req.session.gameId = req.body.gameId;
                req.session.author = req.body.author;
                req.session.currentRound = data.currentround;
                req.session.answered = data.currentround - 1;
                res.send({success: true});
            });
        } else {
            res.status(400).send({success: false, error: 'Game not found!'});
        }
    }).catch(err => res.status(500).send(err));
});

app.get('/api/answers/:round', function(req, res) {
    if(req.session.master === true) {
        db.any('SELECT * FROM answers WHERE gamecode = $1 AND round = $2', [req.session.gameId, req.params.round])
        .then(data => res.send(data))
        .catch(err => res.status(500).send(err));
    } else {
        res.status(400).send({success: false, error: 'You are not game master!'});
    }
});

app.post('/api/nextround', function(req, res) {
    if(req.session.master) {
        db.none('UPDATE games SET currentround = currentround + 1 WHERE code = $1', [req.session.gameId])
        .then(() => res.send({success: true}))
        .catch(err => res.status(500).send(err));
    } else {
        res.status(400).send({success: false, error: 'You are not game master!'});
    }
});

app.get('/api/session', function(req, res) {
    if(!req.session.gameId) {
        res.send({});
        return;
    }
    db.oneOrNone('SELECT currentround as serverCurrentRound, active FROM games WHERE code = $1', [req.session.gameId]).then(data => {
        if(!data.active) {
            req.session = null;
        }
        return res.send(Object.assign(data, req.session));
    }).catch(err => res.status(500).send({success: false, err: err}));
});
app.post('/api/session/del', function(req, res) {
    if(req.session.master) {
        db.none('UPDATE games SET active = FALSE WHERE code = $1', [req.session.gameId]).then(() => {
            req.session = null;
            res.send({success: true});
        }).catch(err => res.status(500).send(err));
    } else {
        req.session = null;
    }
});

app.get('/api/*', function(req, res) {
    res.status(404).send({message: 'API endpoint not found'});
});

app.get('*', function(req, res) {
    res.sendFile('./public/index.html', {root: __dirname + '/../'});
});

app.listen(process.env.PORT || 8080);
