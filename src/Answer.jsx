import React from 'react';
import api from './utils/api';
import isEmpty from './utils/isEmpty';
import { browserHistory } from 'react-router';

const Answer = React.createClass({
    getInitialState: function() {
        return {
            answered: 0,
            currentRound: 0,
            answer: ''
        };
    },
    getSession: function() {
        api.json('/api/session').then(json => {
            if(isEmpty(json)) {
                browserHistory.push('/');
            } else {
                this.setState(json);
            }
        });
    },
    componentDidMount: function() {
        this.getSession();
        this.loadInterval = setInterval(this.getSession, 5000);
    },
    componentWillUnmount: function() {
        clearInterval(this.loadInterval);
    },
    onChange: function(ev) {
        this.setState({answer: ev.target.value});
    },
    sendAnswer: function() {
        if(this.state.answer) {
            const data = {
                currentRound: this.state.servercurrentround,
                answer: this.state.answer
            };
            api.post('/api/answer', data).then(() => this.getSession()).catch(err => this.setState({error: err}));
        } else {
            this.setState({error: true});
        }
    },
    getError: function() {
        if(this.state.error) {
            return 'The answer is empty! Fill!';
        } else {
            return null;
        }
    },
    logout: function() {
        api.post('/api/session/del').then(() => browserHistory.push('/'));
    },
    render: function() {
        if(String(this.state.answered) === this.state.servercurrentround) {
            return (
                <div><h3>Wait for next round!</h3> <button type="submit" onClick={this.logout} className="btn btn-default">Leave game</button></div>
            );
        } else {
            return (
                <div>
                    {this.getError()}
                    <div className="form-group">
                        <label htmlFor="player">Player name</label>
                        <p id="player" className="form-control-static">{this.state.author}</p>
                    </div>
                    <div className="form-group">
                        <label htmlFor="code">Answer</label>
                        <textarea className="form-control" rows="3" onChange={this.onChange}></textarea>
                    </div>
                    <button type="submit" onClick={this.sendAnswer} className="btn btn-default">Send</button>
                    <button type="submit" onClick={this.logout} className="btn btn-default">Leave game</button>
                </div>

            );
        }
    }
});

module.exports = Answer;
