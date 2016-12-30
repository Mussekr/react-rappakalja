import React from 'react';
import api from './utils/api';
import isEmpty from './utils/isEmpty';
import { browserHistory } from 'react-router';

const Game = React.createClass({
    getInitialState: function() {
        return {
            gameId: '',
            servercurrentround: '',
            answers: []
        };
    },
    getSession: function() {
        api.json('/api/session').then(json => {
            if(isEmpty(json)) {
                browserHistory.push('/');
            } else if(json.master === false) {
                browserHistory.push('/');
            } else {
                this.setState(json);
            }
        });
    },
    getAnswers: function() {
        api.json('/api/answers/' + this.state.servercurrentround).then(json => this.setState({answers: json}));
    },
    componentDidMount: function() {
        this.getSession();
        this.getAnswers();
        this.loadInterval = setInterval(this.getAnswers, 3000);
    },
    componentWillUnmount: function() {
        clearInterval(this.loadInterval);
    },
    nextRound: function() {
        if(confirm('Are you sure?')) {
            api.post('/api/nextround').then(() => this.getSession());
        }
    },
    endGame: function() {
        if(confirm('Are you sure?')) {
            api.post('/api/session/del').then(() => browserHistory.push('/'));
        }
    },
    render: function() {
        const data = this.state.answers.map(answer => <AnswerBlock player={answer.author} answer={answer.answer} key={answer.id} />);
        return (
            <div>
                <h3>Room code: {this.state.gameId}</h3>
                <h3>Current round: {this.state.servercurrentround}</h3>
                <button type="submit" onClick={this.nextRound} className="btn btn-default">Next round</button>
                <button type="submit" onClick={this.endGame} className="btn btn-default">End game</button>
                <hr />
                {data}
            </div>
        );
    }
});

const AnswerBlock = React.createClass({
    propTypes: {
        player: React.PropTypes.string.isRequired,
        answer: React.PropTypes.string.isRequired
    },
    render: function() {
        return (
            <div>
                <p className="lead">{this.props.player}</p>
                <p>{this.props.answer}</p>
                <hr />
            </div>
        );
    }
});

module.exports = Game;
