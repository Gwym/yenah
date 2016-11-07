"use strict";
var fs = require('fs');
var http = require('http');
var ws = require('ws');
var fileServer = require('node-static');
var mongodb = require('mongodb');
var dispatcher_1 = require("./dispatcher");
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["Ok"] = 200] = "Ok";
    HttpStatusCode[HttpStatusCode["BadRequest"] = 400] = "BadRequest";
    HttpStatusCode[HttpStatusCode["MethodNotAllowed"] = 405] = "MethodNotAllowed";
    HttpStatusCode[HttpStatusCode["PayloadTooLarge"] = 413] = "PayloadTooLarge";
})(exports.HttpStatusCode || (exports.HttpStatusCode = {}));
var HttpStatusCode = exports.HttpStatusCode;
var WebSocketServer = ws.Server;
var MongoClient = mongodb.MongoClient;
try {
    exports.env = JSON.parse(fs.readFileSync('configuration.json').toString());
}
catch (e) {
    console.log(e);
    exports.env = {
        protocol: 'yh1',
        ipaddress: '0.0.0.0',
        port: 8080,
        mailServer: 'http://localhost/sendmail.php',
        mailSecret: 'secret',
        mongoURL: 'mongodb://localhost:27017/yenah',
        mongoURLLabel: '',
        captchaSecret: 'secret'
    };
}
exports.env.ipaddress = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || exports.env.ipaddress;
exports.env.port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || exports.env.port;
exports.env.mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL || exports.env.mongoURL;
exports.env.mongoURLLabel = '';
exports.env.mailServer = process.env.OPENSHIFT_MAIL_SERVER || exports.env.mailServer;
exports.env.mailSecret = process.env.OPENSHIFT_MAIL_SECRET || exports.env.mailSecret;
exports.env.mailSecret = process.env.OPENSHIFT_CAPTCHA_SECRET || exports.env.mailSecret;
if (exports.env.mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(), mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'], mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'], mongoDatabase = process.env[mongoServiceName + '_DATABASE'], mongoPassword = process.env[mongoServiceName + '_PASSWORD'], mongoUser = process.env[mongoServiceName + '_USER'];
    if (mongoHost && mongoPort && mongoDatabase) {
        exports.env.mongoURLLabel = exports.env.mongoURL = 'mongodb://';
        if (mongoUser && mongoPassword) {
            exports.env.mongoURL += mongoUser + ':' + mongoPassword + '@';
        }
        exports.env.mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
        exports.env.mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    }
    else {
        console.warn('MongoDB configuration error ' + mongoHost + ' ' + mongoPort + ' ' + mongoDatabase);
    }
}
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
console.log(toStr(exports.env));
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
var db;
var initDb = function (callback) {
    if (exports.env.mongoURL == null) {
        console.error('initDb > MongoDB URL Error : null');
        return;
    }
    MongoClient.connect(exports.env.mongoURL, function (err, conn) {
        if (err) {
            console.error('initDb > MongoDB Error : ');
            console.error(err);
            callback(err);
            return;
        }
        db = conn;
        console.log('Connected to MongoDB at: %s', exports.env.mongoURL);
    });
};
initDb(function (err) {
    console.log('Error connecting to Mongo. Message:\n' + err);
});
var server = http.createServer(function (req, res) {
    req.headers.url = req.url;
    req.headers.ip = req.socket.remoteAddress;
    try {
        var col = db.collection('tracks');
        col.insert({ date: Date.now(), req: req.headers });
    }
    catch (e) {
        console.error(e);
    }
    var jsonString = '';
    if (req.method === 'GET') {
        (req.on('end', function () {
            file.serve(req, res, function (err, result) {
                if (err) {
                    if (req.url === '/pagecount') {
                        res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
                        res.end('<!DOCTYPE html><html><head><head><body>pagecount : 0</body></html>');
                    }
                    else if (req.url === '/ready') {
                        console.log('ready');
                        res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
                        res.end('<!DOCTYPE html><html><head><head><body>pagecount : 0</body></html>');
                    }
                    else if (req.url.indexOf('/req?json=') === 0) {
                        dispatcher_1.dispatchJsonCommand(req.url.substring(10), function (ack) {
                            res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
                            res.end(JSON.stringify(ack));
                        });
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
}).listen(exports.env.port, exports.env.ipaddress);
console.log('%s: Node server started on %s:%d', Date(), exports.env.ipaddress, exports.env.port);
var options = { server: server, clientTracking: true };
var wss = new WebSocketServer(options, function () {
    console.log('WS > listen callback ');
});
var ws_connection_counter = 0;
wss.on('connection', function (ws) {
    if (ws.protocol !== exports.env.protocol) {
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