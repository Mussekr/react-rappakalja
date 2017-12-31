import React, { Component } from 'react';
import api from './utils/api';
import { browserHistory } from 'react-router';
import PropTypes from 'prop-types';
import _ from 'lodash';

class Game extends Component {
    constructor(props) {
        super(props);
        this.state = {
            gameId: '',
            servercurrentround: '',
            answers: []
        };
    }
    getSession = () => {
        api.json('/api/session').then(json => {
            if(_.isEmpty(json)) {
                browserHistory.push('/');
            } else if(json.master === false) {
                browserHistory.push('/');
            } else {
                this.getAnswers(json.servercurrentround);
                this.setState(json);
            }
        });
    };
    getAnswers = round => {
        if(!round) {
            return;
        }
        api.json('/api/answers/' + round).then(json => {
            if(json.length !== this.state.answers.length) {
                this.setState({answers: json});
            }
        });
    };
    componentDidMount() {
        this.getSession();
        this.loadInterval = setInterval(() => this.getAnswers(this.state.servercurrentround), 3000);
    }
    componentWillUnmount() {
        clearInterval(this.loadInterval);
    }
    nextRound = () => {
        if(confirm('Are you sure?')) {
            api.post('/api/nextround').then(() => {
                this.getSession();
                this.setState({answers: []});
            });
        }
    };
    endGame() {
        if(confirm('Are you sure?')) {
            api.post('/api/session/del').then(() => browserHistory.push('/'));
        }
    }
    shuffleAnswers = () => {
        this.setState({answers: _.shuffle(this.state.answers)});
    };
    render() {
        const data = this.state.answers.map(answer => <AnswerBlock player={answer.author} answer={answer.answer} key={answer.id} />);
        return (
            <div>
                <h3>Room code: {this.state.gameId}</h3>
                <h3>Current round: {this.state.servercurrentround}</h3>
                <button onClick={this.shuffleAnswers} className="btn btn-default">Shuffle answers</button>
                <button type="submit" onClick={this.nextRound} className="btn btn-default">Next round</button>
                <button type="submit" onClick={this.endGame} className="btn btn-default">End game</button>
                <hr />
                {data}
            </div>
        );
    }
}

class AnswerBlock extends Component {
    render() {
        return (
            <div>
                <p className="lead">{this.props.player}</p>
                <p>{this.props.answer}</p>
                <hr />
            </div>
        );
    }
}

AnswerBlock.propTypes = {
    player: PropTypes.string.isRequired,
    answer: PropTypes.string.isRequired
};

export default Game;
