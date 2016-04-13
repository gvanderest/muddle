var React = require('react');
var ReactDOM = require('react-dom');
var Net = require('net');

var MuddleOutputLine = React.createClass({
    shouldComponentUpdate: function() {
        return !this.lineIsFinalized();
    },
    lineIsFinalized: function() {
        return !this.props.line.finalized;
    },
    ansiToHtml: function(rawInput) {
        var ESC = String.fromCharCode(27);

        var output = rawInput
            .replace(new RegExp(ESC + '\\[0m', 'g'), '<span class="reset">')

            .replace(new RegExp(ESC + '\\[0;30m', 'g'), '<span class="black">')
            .replace(new RegExp(ESC + '\\[0;31m', 'g'), '<span class="red">')
            .replace(new RegExp(ESC + '\\[0;32m', 'g'), '<span class="green">')
            .replace(new RegExp(ESC + '\\[0;33m', 'g'), '<span class="yellow">')
            .replace(new RegExp(ESC + '\\[0;34m', 'g'), '<span class="blue">')
            .replace(new RegExp(ESC + '\\[0;35m', 'g'), '<span class="magenta">')
            .replace(new RegExp(ESC + '\\[0;36m', 'g'), '<span class="cyan">')
            .replace(new RegExp(ESC + '\\[0;37m', 'g'), '<span class="lightgrey">')

            .replace(new RegExp(ESC + '\\[1;30m', 'g'), '<span class="grey">')
            .replace(new RegExp(ESC + '\\[1;31m', 'g'), '<span class="lightred">')
            .replace(new RegExp(ESC + '\\[1;32m', 'g'), '<span class="lightgreen">')
            .replace(new RegExp(ESC + '\\[1;33m', 'g'), '<span class="lightyellow">')
            .replace(new RegExp(ESC + '\\[1;34m', 'g'), '<span class="lightblue">')
            .replace(new RegExp(ESC + '\\[1;35m', 'g'), '<span class="lightmagenta">')
            .replace(new RegExp(ESC + '\\[1;36m', 'g'), '<span class="lightcyan">')
            .replace(new RegExp(ESC + '\\[1;37m', 'g'), '<span class="white">')
            ;

        var amountOfColors = (output.match(/<span/g) || []).length;

        for (var x = 0; x < amountOfColors; x++) {
            output += '</span>';
        }

        return output;
    },
    getHtml: function() {
        return {
            __html: this.props.line ? this.ansiToHtml(this.props.line.message) : ''
        };
    },
    render: function() {
        return React.createElement('div', {
            dangerouslySetInnerHTML: this.getHtml(),
            key: this.props.line ? this.props.line.id : Math.random(),
        }, null); //, this.props.line ? this.props.line.message : '');
    }
});

var Muddle = React.createClass({
    connect: function(hostname, port) {
        var self = this;
        this.socket = Net.connect(port, hostname, this.onConnect);
        this.socket.on('data', this.onSocketData);
        this.socket.on('end', this.onSocketDisconnect);
    },
    onSocketData: function(data) {
        this.handleOutput(data.toString());
    },
    onSocketDisconnect: function() {
        var self = this;
        this.handleOutput("** You have been disconnected.\n")
        this.handleOutput("** Reconnecting in " + this.state.reconnectSeconds + " seconds.\n")
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(function() {
            self.connect(self.state.hostname, self.state.port);
        }, this.state.reconnectSeconds * 1000);
    },
    handleOutput: function(message) {
        var self = this;
        var lastChar = message ? message[message.length - 1] : null;
        var endsWithNewline = lastChar === '\n' || lastChar === '\r';
        var lines = message.split('\n');

        lines.forEach(function(line, index) {
            line = line.replace(/[\r\n]/g, '');

            if (!line) {
                line = ' ';
            }
            var lastLine = index === lines.length - 1;
            var previousLastLine = self.state.output.length ? self.state.output[self.state.output.length - 1] : null;
            var finalized = !lastLine || endsWithNewline;

            // If the previous last line wasn't ending in a newline, append to it
            if (previousLastLine && !previousLastLine.finalized) {
                previousLastLine.message += line;
                previousLastLine.finalized = finalized;
            } else {
                self.uniqueId++;
                self.state.output.push({
                    id: self.uniqueId,
                    message: line,
                    finalized: finalized
                });
            }
        });

        this.setState({
            output: this.state.output
        });
    },
    handleInput: function(message) {
        //this.socket.send(message + '\n');
        this.socket.write(message + '\n');
    },
    componentDidMount: function() {
        this.output = [];
        this.uniqueId = 0;
        this.connect(this.state.hostname, this.state.port);
    },
    renderLines: function(lines) {
        if (!lines) {
            return [];
        }
        return lines.map(function(line) {
            return React.createElement(MuddleOutputLine, { line: line });
        });
    },
    getInitialState: function() {
        return {
            hostname: 'waterdeep.org',
            port: 4200,

            reconnectSeconds: 2,

            output: [],

            inputMessage: '',
            inputMessageHistory: [],
            inputHistoryLines: 10
        };
    },
    handleKeypress: function(e) {
        var message = e.target.value;
        if (e.keyCode === 13) {
            this.handleOutput('> ' + message + '\n');
            this.handleInput(message);
            this.selectAllInput();
        }
    },
    handleInputClick: function(e) {
        this.selectAllInput();
    },
    focusInput: function() {
        this.refs.input.focus();
    },
    selectAllInput: function() {
        this.refs.input.select();
    },
    componentDidUpdate() {
        var elem = this.refs.outputWindow;
        if (!elem) {
            return;
        }
        elem.scrollTop = elem.scrollHeight;
        this.focusInput();
    },
    render: function() {
        return React.createElement('div', { className: 'muddle', onClick: this.focusInput, onKeyDown: this.focusInput }, [
            React.createElement('table', { className: 'main-frame' }, [
                React.createElement('tbody', null, [
                    React.createElement('tr', null, [
                        React.createElement('td', null, [
                            React.createElement('div', { ref: 'outputWindow', className: 'output-window' }, [
                                this.renderLines(this.state.output),
                            ])
                        ])
                    ]),
                    React.createElement('tr', null, [
                        React.createElement('td', null, [
                            React.createElement('div', { className: 'input-window' }, [
                                React.createElement('input', { type: 'text', ref: 'input', onKeyUp: this.handleKeypress })
                            ])
                        ])
                    ])
                ])
            ])
        ]);
    }
});

ReactDOM.render(React.createElement(Muddle), document.getElementById('muddle'));
