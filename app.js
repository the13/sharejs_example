var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');


var Duplex = require('stream').Duplex;
var livedb = require('livedb');
var browserChannel = require('browserchannel').server;
var sharejs = require('share');

var backend = livedb.client(livedb.memory());
backend.addProjection('_users', 'users', 'json0', {x:true});
var share = require('share').server.createClient({backend: backend});

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(browserChannel(function(session) {
    console.log('New session: ' + session.id +
      ' from ' + session.address +
      ' with cookies ' + session.headers.cookie);

    var stream = new Duplex({objectMode: 'yes'});
    stream._write = function (chunk, encoding, callback) {
        if ( session.state != 'closed' )
            session.send(chunk);
        callback();
    }
    stream._read = function () {};
    stream.headers = session.headers;
    stream.remoteAddress = session.address;

    session.on('message', function(data) {
        console.log(session.id + ' sent ' + JSON.stringify(data));
        stream.push(data);
    });

    session.on('close', function(reason) {
        console.log(session.id + ' disconnected (' + reason + ')');
        stream.push(null);
        stream.emit('close');
    });

    stream.on('end', function () {
        session.close();
    });

    share.listen(stream);
}));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
