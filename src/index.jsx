import './style.scss';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Answer from './Answer';
import Game from './Game';
import { Router, Route, browserHistory, IndexRoute } from 'react-router';
import PropTypes from 'prop-types';
import _ from 'lodash';
import api from './utils/api';
import 'whatwg-fetch';

class Index extends Component {
    render() {
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
}

Index.propTypes = {
    children: PropTypes.element.isRequired
};

class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {
            code: '',
            author: '',
            error: {}
        };
    }
    onChange = (field, value) => {
        this.setState({
            [field]: value
        });
    };
    join = () => {
        const data = {
            gameId: this.state.code,
            author: this.state.name
        };
        api.post('/api/join', data).then(() => {
            browserHistory.push('/answer');
        }).catch(err => this.setState({error: err}));
    };
    showError = () => {
        if(this.state.error.success === false) {
            return this.state.error.error;
        } else {
            return null;
        }
    }
    newGame = () => {
        api.post('/api/newgame').then(() => {
            browserHistory.push('/game');
        }).catch(err => this.setState({error: err}));
    }
    checkIfGameExist() {
        api.json('/api/session').then(json => {
            if(!_.isEmpty(json)) {
                if(json.master === true) {
                    browserHistory.push('/game');
                } else {
                    browserHistory.push('/answer');
                }
            }
        });
    }
    componentDidMount() {
        this.checkIfGameExist();
    }
    render() {
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
}

ReactDOM.render(
    <Router history={browserHistory}>
        <Route path="/" component={Index}>
            <IndexRoute component={Home} />
            <Route path="/answer" component={Answer} />
            <Route path="/game" component={Game} />
        </Route>
    </Router>
    , document.getElementById('app'));
