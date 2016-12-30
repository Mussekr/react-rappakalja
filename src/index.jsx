import './style.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import Answer from './Answer';
import Game from './Game';
import { Router, Route, browserHistory, IndexRoute } from 'react-router';
import api from './utils/api';
import isEmpty from './utils/isEmpty';
import 'whatwg-fetch';

const Index = React.createClass({
    propTypes: {
        children: React.PropTypes.element.isRequired
    },
    render: function() {
        return (
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-2">
                    </div>
                    <div className="col-md-8">
                        <div className="page-header">
                            <h1>
                                Rappakalja! <small>a help tool by <a href="http://github.com/mussekr" target="_blank">Mussekr</a></small>
                            </h1>
                        </div>
                        {this.props.children}
                    </div>
                    <div className="col-md-2">
                    </div>
                </div>
            </div>

        );
    }
});

const Home = React.createClass({
    getInitialState: function() {
        return {
            code: '',
            author: '',
            error: {}
        };
    },
    onChange: function(field, value) {
        this.setState({
            [field]: value
        });
    },
    join: function() {
        const data = {
            gameId: this.state.code,
            author: this.state.name
        };
        api.post('/api/join', data).then(() => {
            browserHistory.push('/answer');
        }).catch(err => this.setState({error: err}));
    },
    showError: function() {
        if(this.state.error.success === false) {
            return this.state.error.error;
        } else {
            return null;
        }
    },
    newGame: function() {
        api.post('/api/newgame').then(() => {
            browserHistory.push('/game');
        }).catch(err => this.setState({error: err}));
    },
    checkIfGameExist: function() {
        api.json('/api/session').then(json => {
            if(!isEmpty(json)) {
                browserHistory.push('/answer');
            }
        });
    },
    componentDidMount: function() {
        this.checkIfGameExist();
    },
    render: function() {
        return (
            <div>
                <div className="red">{this.showError()}</div>
                <div className="form-group">
                    <label htmlFor="code">Game code</label>
                    <input type="text" className="form-control" id="code" placeholder="Game code" onChange={ev => this.onChange('code', ev.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="code">Player name</label>
                    <input type="text" className="form-control" id="code" placeholder="Player name" onChange={ev => this.onChange('name', ev.target.value)} />
                </div>
                <button type="submit" onClick={this.join} className="btn btn-default">Join</button>
                <button type="submit" onClick={this.newGame} className="btn btn-default">Add new game</button>
            </div>
        );
    }
});

ReactDOM.render(
    <Router history={browserHistory}>
        <Route path="/" component={Index}>
            <IndexRoute component={Home} />
            <Route path="/answer" component={Answer} />
            <Route path="/game" component={Game} />
        </Route>
    </Router>
    , document.getElementById('app'));
