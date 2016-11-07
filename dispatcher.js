"use strict";
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var server_1 = require("./server");
(function (Command) {
    Command[Command["SendRegistrationMail"] = 0] = "SendRegistrationMail";
})(exports.Command || (exports.Command = {}));
var Command = exports.Command;
var Status;
(function (Status) {
    Status[Status["Error"] = 0] = "Error";
    Status[Status["Ok"] = 1] = "Ok";
})(Status || (Status = {}));
var DispMsg;
(function (DispMsg) {
    DispMsg[DispMsg["UnkownCommand"] = 0] = "UnkownCommand";
    DispMsg[DispMsg["InvalidCaptcha"] = 1] = "InvalidCaptcha";
    DispMsg[DispMsg["InvalidCode"] = 2] = "InvalidCode";
    DispMsg[DispMsg["InvalidMail"] = 3] = "InvalidMail";
    DispMsg[DispMsg["RequestFailed"] = 4] = "RequestFailed";
})(DispMsg || (DispMsg = {}));
var Registration = (function () {
    function Registration() {
    }
    Registration.prototype.registrationSequence = function (cmd, callback) {
        var _this = this;
        console.log(" ---- start registration sequence ----");
        var code = cmd.code;
        var dstMail = cmd.mail;
        return Promise.resolve()
            .then(function () {
            return _this.checkCaptcha(cmd.response);
        })
            .then(function () {
            return _this.checkCode(code);
        })
            .then(function () {
            return _this.sendRegistrationMail(dstMail);
        })
            .then(function () {
            console.log(" ---- registration sequence done  ----");
            callback({ status: Status.Ok });
        })
            .catch(function (e) {
            console.error(e);
            console.log(" ---- registration sequence failed  ----");
            callback(e);
        });
    };
    Registration.prototype.checkCaptcha = function (response) {
        console.log('Checking Captcha');
        return new Promise(function (resolve, reject) {
            var postData = querystring.stringify({
                secret: server_1.env.captchaSecret,
                response: response
            });
            var postOptions = {
                hostname: 'www.google.com',
                path: '/recaptcha/api/siteverify',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            console.log('POST https captcha request');
            console.log(postData);
            var req = https.request(postOptions, function (res) {
                console.log('statusCode:', res.statusCode);
                res.setEncoding('utf8');
                var rawData = '';
                res.on('data', function (chunk) { rawData += chunk; console.log('chunck ' + chunk); });
                res.on('end', function (arg) {
                    console.log('end ' + arg);
                    console.log(rawData);
                    var captchAck = JSON.parse(rawData);
                    console.log(captchAck);
                    if (captchAck.success === true) {
                        resolve();
                    }
                    else {
                        console.error('captcha failed');
                        reject({ status: Status.Error, message: DispMsg.InvalidCaptcha });
                    }
                });
            });
            req.write(postData);
            req.end();
            req.on('error', function (e) {
                console.error(e);
                reject({ status: Status.Error, message: e.message });
            });
        });
    };
    Registration.prototype.checkCode = function (code) {
        console.log('Checking code');
        return new Promise(function (resolve, reject) {
            if (isNaN(parseInt(code))) {
                console.info('sendRegistrationMail > invalid code');
                reject({ status: Status.Error, message: DispMsg.InvalidCode });
            }
            else {
                console.log('code ok');
                resolve();
            }
        });
    };
    Registration.prototype.sendRegistrationMail = function (dstMail) {
        console.log('Sending registration mail');
        return new Promise(function (resolve, reject) {
            if (typeof dstMail !== 'string') {
                console.info('sendRegistrationMail > invalid mail');
                reject({ status: Status.Error, message: DispMsg.InvalidMail });
                return;
            }
            var password = Math.round(Math.random() * 10000).toString();
            var uri = server_1.env.mailServer + '?sec=' + encodeURIComponent(server_1.env.mailSecret)
                + '&dst=' + encodeURIComponent(dstMail)
                + '&kind=1&lang=1&pwd=' + encodeURIComponent(password);
            console.log(uri);
            http.get(uri, function (res) {
                var statusCode = res.statusCode;
                res.setEncoding('utf8');
                var rawData = '';
                res.on('data', function (chunk) { rawData += chunk; });
                res.on('end', function () {
                    console.log(rawData);
                    var mailAck = JSON.parse(rawData);
                    console.log(mailAck);
                    if (mailAck.status === Status.Ok) {
                        resolve();
                    }
                    else {
                        console.error('sendmail failed');
                        reject(mailAck);
                    }
                });
            }).on('error', function (e) {
                console.error(e);
                reject({ status: Status.Error, message: e.message });
            });
        });
    };
    return Registration;
}());
exports.Registration = Registration;
exports.dispatchJsonCommand = function (jsonString, callback) {
    var cmd;
    var jsonString = decodeURIComponent(jsonString);
    console.log(jsonString);
    try {
        cmd = JSON.parse(jsonString);
    }
    catch (e) {
        console.error('dispatchJsonCommand >' + e.message);
        callback({ status: Status.Error, message: DispMsg.UnkownCommand });
    }
    if (cmd.command === Command.SendRegistrationMail) {
        var reg = new Registration();
        reg.registrationSequence(cmd, callback);
    }
    else {
        console.error('dispatchJsonCommand > Unknown command');
        callback({ status: Status.Error, message: DispMsg.UnkownCommand });
    }
};
//# sourceMappingURL=dispatcher.js.map