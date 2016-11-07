// node.js server for yenah

"use strict"

import * as fs from 'fs';
import * as http from 'http';
import * as url from 'url';
import * as ws from 'ws';
import * as fileServer from 'node-static';
import * as mongodb from 'mongodb';

import { dispatchJsonCommand, Registration, jsonXResponse } from "./dispatcher";

export enum HttpStatusCode { Ok = 200, BadRequest = 400, MethodNotAllowed = 405, PayloadTooLarge = 413 }

interface Configuration {
  ipaddress: string,
  port: number,
  mongoURL: string,
  mongoURLLabel: string,
  protocol: string,
  mailServer: string,
  mailSecret: string,
  captchaSecret: string
}

var WebSocketServer = ws.Server;
var MongoClient = mongodb.MongoClient;

export var env: Configuration;

try {
  env = <Configuration>JSON.parse(fs.readFileSync('configuration.json').toString());
}
catch (e) {  // file not found, parse error, ... => set default

  console.log(e);
  env = {
    protocol: 'yh1',
    ipaddress: '0.0.0.0',
    port: 8080,
    mailServer: 'http://localhost/sendmail.php',
    mailSecret: 'secret',
    mongoURL: null, // mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
    mongoURLLabel: '',
    captchaSecret: 'secret'
  }
}

// openshift hosting
env.ipaddress = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || env.ipaddress;
env.port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || env.port;
env.mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL || env.mongoURL;
env.mongoURLLabel = '';
env.mailServer = process.env.OPENSHIFT_MAIL_SERVER || env.mailServer;
env.mailSecret = process.env.OPENSHIFT_MAIL_SECRET || env.mailSecret;
env.mailSecret = process.env.OPENSHIFT_CAPTCHA_SECRET || env.mailSecret;

if (env.mongoURL == null && process.env.DATABASE_SERVICE_NAME) {

  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
    mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    env.mongoURLLabel = env.mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      env.mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    env.mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    env.mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
  }
  else {
    console.warn('MongoDB configuration error ' + mongoHost + ' ' + mongoPort + ' ' + mongoDatabase);
  }
}

var toStr = function (o: any) {
  var o_str = '';
  for (var k in o) {
    // o_str += typeof o[k] + ' \n';
    if (typeof o[k] === 'function') {
      // o_str += k + ' : ' + ('' + o[k]).substring(0,10) + ' \n';
    }
    else {
      o_str += k + ' : ' + o[k] + ' \n';
    }
  }
  return o_str;
}


console.log(toStr(env));

// index page
var file = new fileServer.Server('webapp', { /*indexFile: "index.html", */cache: 0 }); // set cache: 0 is for debugging purpose

// TODO (2) : fileLogger or MongoDBlogger
var logger = {
  info: function (s: string) {
    console.log(s);
  },
  error: function (err: string) {
    console.error(err);
  }
}

// persistence


class User {

  id: number;
  name: string;
  login: string;
  password_hash: string;

  constructor(name: string, login: string, password: string) {
    this.name = name;
    this.login = login;
    this.password_hash = password;     // TODO (0) : hash passwords, rolling id, mongo datastore
  }
}

interface IUserMessage {
  seq: number,
  pwd: string,
  login: string
}

var users = {
  find: function (login: string): User {
    return new User('Test', 'test', 'test');
  }
}


var db: mongodb.Db;

var initDb = function (callback: (err: any) => void) {

  if (env.mongoURL == null) {
    console.error('initDb > MongoDB URL Error : null');
    return;
  }


  MongoClient.connect(env.mongoURL, function (err, conn) {
    if (err) {
      console.error('initDb > MongoDB Error : ');
      console.error(err);
      callback(err);
      return;
    }

    db = conn;
    //   dbDetails.databaseName = db.databaseName;
    //   dbDetails.url = env.mongoURLLabel;
    //   dbDetails.type = 'MongoDB'; 

    console.log('Connected to MongoDB at: %s', env.mongoURL);
  });
};


initDb(function (err: any) {
  console.log('Error connecting to Mongo. Message:\n' + err);
});

var server = http.createServer((req, res) => {

  req.headers.url = req.url;
  req.headers.ip = req.socket.remoteAddress;

  console.log(req.url);

 /* try {
    var col = db.collection('tracks');
    col.insert({ date: Date.now(), req: req.headers });
  }
  catch (e) {
    console.error(e);
  } */

  var jsonString = '';

  if (req.method === 'GET') {
    (req.on('end', function () {

      // TODO (1) : i18n, parse browser language, redirect

      file.serve(req, res, function (err: any, result: any) {
        if (err) {
          if (req.url === '/pagecount') { // deprecated
            res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
            res.end('<!DOCTYPE html><html><head><head><body>pagecount : 0</body></html>');
          }
          else if (req.url === '/ready') { // Openshift readinessProbe
            // TODO (1) : check mongodb
            console.log('ready');
            res.writeHead(HttpStatusCode.Ok, { 'Content-Type': 'text/html' });
            res.end('<!DOCTYPE html><html><head><head><body>pagecount : 0</body></html>');
          }
          else if (req.url.indexOf('/req?json=') === 0) {  // TODO (3) : DRY server/client configuration for '/req?json='

            dispatchJsonCommand(req.url.substring(10), (ack: jsonXResponse) => { // TODO (3) : DRY server/client configuration for 10
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
  /*  else if (req.method === 'POST') {
  
          req.on('data', function(data: string) {
              jsonString += data;
              if (jsonString.length > 1e6) {
                  jsonString = "";
                  res.writeHead(HttpStatusCode.PayloadTooLarge, {'Content-Type': 'text/plain'});
                  res.end();
                  req.abort();
              }
          });
  
          req.on('end', function() {
            try {
              var gist = JSON.parse(jsonString);
              // do something with post data...
            }
            catch(e) {
              logger.error(e);
              logger.info(jsonString);
              res.writeHead(HttpStatusCode.BadRequest, {'Content-Type': 'text/plain'});
              res.end();
            }
          });
  
    } */
  else {
    logger.error('Method not allowed ' + toStr(req.headers));
    res.writeHead(HttpStatusCode.MethodNotAllowed, { 'Content-Type': 'text/plain' });
    res.end();
  }

}).listen(env.port, env.ipaddress);

console.log('%s: Node server started on %s:%d', Date(), env.ipaddress, env.port);


// FIXE (0) : without cast, error Type 'Server' is not assignable to type 'Server'. Property 'maxHeadersCount' is missing in type 'Server'.
var options: ws.IServerOptions = { server: <http.Server>server, clientTracking: true };

var wss = new WebSocketServer(
  options, // TODO (2) : verifyClient
  function () {
    console.log('WS > listen callback ');
  });

var ws_connection_counter = 0; // TODO (2) : nodeObserver

wss.on('connection', function (ws) {

  if (ws.protocol !== env.protocol) {
    console.log('WS > bad protocol, closing ' + toStr(ws));

    ws.close();
    return;
  }

  // console.log('WS > connection ' + toStr(ws));
  console.log('WS > clients ' + wss.clients.length); // + ' ' + toStr(wss.clients[0]));

  ws.once('message', function (message: string) {

    console.log('WS auth > received: %s', message);

    var u: IUserMessage;

    try {

      u = JSON.parse(message);

      console.log(u);

      // check user id/pwd
      if (u.seq === 0 && u.pwd === users.find(u.login).password_hash) {

        ws.on('message', function (message: string) {

          try {

            u = JSON.parse(message);
            console.log('WS > received: %s on %s', u, u.login);
            // dispatch(user[ws.userID]) or ws.dispatch( ?=)

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

  }); // auth once

  ws.send('who?');
});

