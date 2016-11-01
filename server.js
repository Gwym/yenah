"use strict";
var http = require('http');
var ws = require('ws');
var fileServer = require('node-static');
var mongodb = require('mongodb');
var HttpStatusCode;
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["Ok"] = 200] = "Ok";
    HttpStatusCode[HttpStatusCode["BadRequest"] = 400] = "BadRequest";
    HttpStatusCode[HttpStatusCode["MethodNotAllowed"] = 405] = "MethodNotAllowed";
    HttpStatusCode[HttpStatusCode["PayloadTooLarge"] = 413] = "PayloadTooLarge";
})(HttpStatusCode || (HttpStatusCode = {}));
var WebSocketServer = ws.Server;
var MongoClient = mongodb.MongoClient;
var env = {
    protocol: 'yh1',
    ipaddress: process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    port: process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    mongoURL: process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel: ''
};
var toStr = function (o) {
    var o_str = '';
    for (var k in o) {
        if (typeof o[k] === 'function') {
        }
        else {
            o_str += k + ' : ' + o[k] + ' \n';
        }
    }
    return o_str;
};
var file = new fileServer.Server('webapp', { cache: 0 });
var logger = {
    info: function (s) {
        console.log(s);
    },
    error: function (err) {
        console.error(err);
    }
};
var User = (function () {
    function User(name, login, password) {
        this.name = name;
        this.login = login;
        this.password_hash = password;
    }
    return User;
}());
var users = {
    find: function (login) {
        return new User('Test', 'test', 'test');
    }
};
console.log('mongoURL :' + env.mongoURL + ' ' + process.env.DATABASE_SERVICE_NAME);
console.log('server :' + env.ipaddress + ' ' + env.port);
if (env.mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(), mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'], mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'], mongoDatabase = process.env[mongoServiceName + '_DATABASE'], mongoPassword = process.env[mongoServiceName + '_PASSWORD'], mongoUser = process.env[mongoServiceName + '_USER'];
    if (mongoHost && mongoPort && mongoDatabase) {
        env.mongoURLLabel = env.mongoURL = 'mongodb://';
        if (mongoUser && mongoPassword) {
            env.mongoURL += mongoUser + ':' + mongoPassword + '@';
        }
        env.mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
        env.mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    }
    else {
        console.warn('MongoDB configuration error ' + mongoHost + ' ' + mongoPort + ' ' + mongoDatabase);
    }
}
var initDb = function (callback) {
    if (env.mongoURL == null) {
        console.error('MongoDB URL Error : null');
        return;
    }
    MongoClient.connect(env.mongoURL, function (err, conn) {
        if (err) {
            callback(err);
            return;
        }
        console.log('Connected to MongoDB at: %s', env.mongoURL);
    });
};
initDb(function (err) {
    console.log('Error connecting to Mongo. Message:\n' + err);
});
var server = http.createServer(function (req, res) {
    req.headers.url = req.url;
    req.headers.ip = req.socket.remoteAddress;
    var jsonString = '';
    if (req.method === 'GET') {
        (req.on('end', function () {
            file.serve(req, res, function (err, result) {
                if (err) {
                    console.log('not found : ' + req.url);
                    if (req.url === '/pagecount') {
                        res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
                        res.end('<!DOCTYPE html><html><head><head><body>pagecount : 0</body></html>');
                    }
                    else if (req.url === '/ready') {
                        res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
                        res.end('<!DOCTYPE html><html><head><head><body>pagecount : 0</body></html>');
                    }
                    else if (req.url.indexOf('/req?json=') === 0) {
                        var jsonString = decodeURIComponent(req.url.substring(10));
                        console.log(jsonString);
                        try {
                            JSON.parse(jsonString);
                            res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
                            res.end(jsonString);
                        }
                        catch (e) {
                            logger.error(e);
                            logger.info(req.url);
                            res.writeHead(HttpStatusCode.BadRequest, { 'Content-Type': 'text/plain' });
                            res.end();
                        }
                    }
                    else {
                        logger.info(toStr(req.headers));
                        console.log(err);
                        console.log(result);
                        logger.error(err);
                        res.writeHead(err.status, err.headers);
                        res.end('<!DOCTYPE html><html><head><head><body>404 : ressource not found.</body></html>');
                    }
                }
            });
        })).resume();
    }
    else {
        logger.error('Method not allowed ' + toStr(req.headers));
        res.writeHead(HttpStatusCode.MethodNotAllowed, { 'Content-Type': 'text/plain' });
        res.end();
    }
}).listen(env.port, env.ipaddress);
console.log('%s: Node server started on %s:%d', Date(), env.ipaddress, env.port);
var options = { server: server, clientTracking: true };
var wss = new WebSocketServer(options, function () {
    console.log('WS > listen callback ');
});
var ws_connection_counter = 0;
wss.on('connection', function (ws) {
    if (ws.protocol !== env.protocol) {
        console.log('WS > bad protocol, closing ' + toStr(ws));
        ws.close();
        return;
    }
    console.log('WS > clients ' + wss.clients.length);
    ws.once('message', function (message) {
        console.log('WS auth > received: %s', message);
        var u;
        try {
            u = JSON.parse(message);
            console.log(u);
            if (u.seq === 0 && u.pwd === users.find(u.login).password_hash) {
                ws.on('message', function (message) {
                    try {
                        u = JSON.parse(message);
                        console.log('WS > received: %s on %s', u, u.login);
                    }
                    catch (e) {
                        console.log('WS > error ' + e + ', closing ' + toStr(ws));
                        ws.close();
                    }
                });
                console.log('User  ' + u.login + ' connected');
                ws.send('welcome ' + users.find(u.login).name);
            }
            else {
                console.log('WS > wrong id or password ' + toStr(u) + ', closing ' + toStr(ws));
                ws.close();
            }
        }
        catch (e) {
            console.log('WS auth > error ' + e + ', closing ' + toStr(ws));
            ws.close();
        }
    });
    ws.send('who?');
});
//# sourceMappingURL=server.js.map