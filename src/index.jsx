import './style.scss';
import React from 'react';
import ReactDOM from 'react-dom';

const Index = React.createClass({
    render: function() {
        return (
            <h1 className="red">It's working!</h1>
        );
    }
});

ReactDOM.render(<Index />, document.getElementById('app'));
