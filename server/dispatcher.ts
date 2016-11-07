"use strict"

import * as http from 'http';
import * as https from 'https';
import * as querystring from 'querystring';

import { env, HttpStatusCode } from "./server";

export enum Command { SendRegistrationMail }
enum Status { Error, Ok }
enum DispMsg { UnkownCommand, InvalidCaptcha, InvalidCode, InvalidMail, RequestFailed }

// TODO (3) : DRY server/client configuration
interface jsonXRequest {
    command: Command,
    mail: string,
    code: string,
    response: string
}

export interface jsonXResponse {
    status: Status,
    message?: string | DispMsg
}

interface jsonAck {
    status: Status
}

interface captchaResponse {
    success: true | false,
    challenge_ts: string,  // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
    hostname: string,         // the hostname of the site where the reCAPTCHA was solved
    'error-codes'?: any[]        // optional
}

export class Registration {

    registrationSequence(cmd: jsonXRequest, callback: (ack: jsonXResponse) => void) {

        console.log(" ---- start registration sequence ----");

        var code = cmd.code;
        var dstMail = cmd.mail;

        return Promise.resolve()
            .then(() => {
                return this.checkCaptcha(cmd.response);
            })
            .then(() => {
                return this.checkCode(code);
            })
            .then(() => {
                return this.sendRegistrationMail(dstMail);
            })
            .then(() => {
                console.log(" ---- registration sequence done  ----");
                callback({ status: Status.Ok });
            })
            .catch((e) => {
                console.error(e);
                console.log(" ---- registration sequence failed  ----");
                callback(e);
            });
    }

    private checkCaptcha(response: string) {

        console.log('Checking Captcha');
        return new Promise((resolve, reject) => {

            var postData = querystring.stringify({
                secret: env.captchaSecret,
                response: response
                //,remoteip: remoteIp, // optional
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

                // TODO : check statusCode else resume ? 

                res.setEncoding('utf8');
                var rawData = '';
                res.on('data', (chunk: string) => { rawData += chunk; console.log('chunck ' + chunk);} );
                res.on('end', (arg: any) => {

                    console.log('end ' + arg);
                    console.log(rawData);
                    var captchAck: captchaResponse = JSON.parse(rawData);
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
            req.on('error', (e: NodeError) => {
                console.error(e); // TODO : req.resume ?
                reject({ status: Status.Error, message: e.message });
            });
        });
    }

    private checkCode(code: string) {

        console.log('Checking code');
        return new Promise((resolve, reject) => {
            // TODO (0) : check code from database, generate password
            if (isNaN(parseInt(code))) {
                console.info('sendRegistrationMail > invalid code'); // TMP
                reject({ status: Status.Error, message: DispMsg.InvalidCode });
            }
            else {
                console.log('code ok');
                resolve();
            }
        });
    }

    private sendRegistrationMail(dstMail: string) {

        console.log('Sending registration mail');
        return new Promise((resolve, reject) => {

            if (typeof dstMail !== 'string') {  // TODO (1) : email checker
                console.info('sendRegistrationMail > invalid mail'); // TMP
                reject({ status: Status.Error, message: DispMsg.InvalidMail });
                return;
            }

            var password = Math.round(Math.random() * 10000).toString(); // TODO (0) : password generator

            var uri = env.mailServer + '?sec=' + encodeURIComponent(env.mailSecret)
                + '&dst=' + encodeURIComponent(dstMail)
                + '&kind=1&lang=1&pwd=' + encodeURIComponent(password);

            console.log(uri); // TMP

            // TODO (0) : https.request
            // var lib = uri.indexOf('https') === 0 ? https : http;

            http.get(uri, (res) => {
                const statusCode = res.statusCode;
                res.setEncoding('utf8');
                var rawData = '';

                res.on('data', (chunk: string) => { rawData += chunk } );
                res.on('end', () => {
                    console.log(rawData);
                    var mailAck: jsonXResponse = JSON.parse(rawData);
                    console.log(mailAck);

                    if (mailAck.status === Status.Ok) {
                        resolve();
                    }
                    else {
                        console.error('sendmail failed');
                        reject(mailAck);
                    }
                });

            }).on('error', (e: NodeError) => {
                console.error(e);
                reject({ status: Status.Error, message: e.message });
            });
        });
    }
}

export var dispatchJsonCommand = function (jsonString: string, callback: (ack: jsonXResponse) => void): void {

    var cmd: jsonXRequest;
    var jsonString = decodeURIComponent(jsonString);
    console.log(jsonString);

    try {
        cmd = JSON.parse(jsonString);
    }
    catch(e) {
        console.error('dispatchJsonCommand >' + e.message);
        callback( { status: Status.Error, message: DispMsg.UnkownCommand } );
    }

    if (cmd.command === Command.SendRegistrationMail) {

        var reg = new Registration();
        reg.registrationSequence(cmd, callback);
    }
    else {
        console.error('dispatchJsonCommand > Unknown command');
        callback( { status: Status.Error, message: DispMsg.UnkownCommand } );
    }
};




