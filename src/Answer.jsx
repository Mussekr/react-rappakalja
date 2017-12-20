import React, { Component } from 'react';
import api from './utils/api';
import { browserHistory } from 'react-router';

class Answer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            answered: 0,
            currentRound: 0,
            answer: ''
        };
        this.getSession = this.getSession.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.onChange = this.onChange.bind(this);
        this.sendAnswer = this.sendAnswer.bind(this);
        this.getError = this.getError.bind(this);
    }
    getSession = () => {
        api.json('/api/session').then(json => {
            if(!json.active) {
                browserHistory.push('/');
            } else if (json.master) {
                browserHistory.push('/game');
            } else {
                this.setState(json);
            }
        });
    }
    componentDidMount() {
        this.getSession();
        this.loadInterval = setInterval(this.getSession, 5000);
    }
    componentWillUnmount() {
        clearInterval(this.loadInterval);
    }
    onChange = ev => {
        this.setState({answer: ev.target.value});
    }
    sendAnswer = () => {
        if(this.state.answer) {
            const data = {
                currentRound: this.state.servercurrentround,
                answer: this.state.answer
            };
            api.post('/api/answer', data).then(() => this.getSession()).catch(err => this.setState({error: err}));
        } else {
            this.setState({error: true});
        }
    }
    getError = () => {
        if(this.state.error) {
            return 'The answer is empty! Fill!';
        } else {
            return null;
        }
    }
    logout() {
        if(confirm('Are you sure?')) {
            api.post('/api/session/del').then(() => browserHistory.push('/'));
        }
    }
    render() {
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
}

export default Answer;
