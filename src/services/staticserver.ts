import * as path from 'path';
import * as http from 'http';
//import * as https from 'https';
import * as url from 'url';
import * as fs from 'fs';

import { dbg } from './logger'
import { HttpStatusCode } from './dispatcher'

export interface StaticServerOptions {
    headers?: { [index: string]: string }
    indexFile?: string
}

export class StaticServer {

    rootPath: string
    defaultIndexFile = '/index.html'
    resHeaders: { [index: string]: string } = {
        "Cache-Control": "max-age=2592000", // 1 month
        "server": "node"
    }

    static defaultMimeType = "application/octet-stream"
    static mimeTypes: { [index: string]: string } = {

        js: "application/javascript",
        ts: "application/typescript",
        json: "application/json",
        map: "application/json",
        pdf: "application/pdf",
        xml: "application/xml",
        zip: "application/zip",
        gif: "image/gif",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        svg: "image/svg+xml",
        tiff: "image/tiff",
        ico: "image/x-icon",
        mid: "audio/midi",
        mp3: "audio/mpeg3",
        ogg: "audio/ogg",
        wav: "audio/x-wav",
        mp4: "video/mp4",
        mpg: "video/mpeg",
        mpeg: "video/mpeg",
        avi: "video/x-msvideo",
        appcache: "text/cache-manifest",
        manifest: "text/cache-manifest",
        css: "text/css",
        csv: "text/csv",
        html: "text/html",
        txt: "text/plain",
        log: "text/plain",
        odp: "application/vnd.oasis.opendocument.presentation",
        ods: "application/vnd.oasis.opendocument.spreadsheet",
        ots: "application/vnd.oasis.opendocument.spreadsheet-template",
        odt: "application/vnd.oasis.opendocument.text"
    }

    headersTags = {
        "host": true,
        "connection": true,
        "user-agent": true,
        "accept-encoding": true,
        "accept-language": true, // "fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4",
        "if-modified-since": true, // "Sun, 30 Apr 2017 17:42:45 GMT",
        "url": true,
        "ip": true
    }

    constructor(rootPath = '.', options?: StaticServerOptions) {

        this.rootPath = path.normalize(path.resolve(rootPath));

        if (options) {

            if (options.indexFile) {
                this.defaultIndexFile = options.indexFile;
            }

            if (options.headers) {
                for (let item in options.headers) {
                    if (options.headers.hasOwnProperty(item)) {
                        this.resHeaders[item] = options.headers[item];
                    }
                }
            }
        }
    }

    getMime(pathname: string) {
        let ext = path.extname(pathname);
        if (ext.charAt(0) === '.')
            ext = ext.slice(1);

        if (ext.length && StaticServer.mimeTypes[ext]) {
            return StaticServer.mimeTypes[ext];
        }
        else {
            dbg.error('Unkonwn Mime ' + ext);
            return StaticServer.defaultMimeType;
        }
    }

    protected resolvePath(relPath: string) {
        return path.resolve(path.join(this.rootPath, relPath));
    }

    serve(req: http.IncomingMessage, res: http.ServerResponse) {

        let pathname: string;
        let p = new Promise<any>((resolve, reject) => {
            pathname = decodeURI(<string>url.parse(<string>req.url).pathname);
            // dbg.log('StaticServer.Serve > serving  URI ' + pathname);
            if (pathname === '/') {
                pathname = this.defaultIndexFile
            }
            pathname = this.resolvePath(pathname);

            // Make sure we're not trying to access a file outside of the root.
            if (pathname.indexOf(this.rootPath) !== 0) {
                dbg.log('reject Forbidden, outside of frontend root');
                reject({ status: HttpStatusCode.Forbidden });
            }
            else {
                fs.stat(pathname, (err, stat) => {
                    if (err) {
                        dbg.log('reject notfound');
                        reject({ status: HttpStatusCode.NotFound });
                        return;
                    }

                    if (stat.isFile()) {
                        // TODO (2) : client headers, gzip, cache
                        let reqHead = {
                            range: req.headers['range'],
                            match: req.headers['if-none-match'],
                            modified: Date.parse(<string>req.headers['if-modified-since']),
                            acceptEncoding: req.headers['accept-encoding']
                        }
                        if (reqHead.acceptEncoding && reqHead.acceptEncoding.indexOf("gzip") >= 0) {
                           // dbg.log('client accepts gzip', LoggerParts.Filename);
                           // TODO (1) : gzip cache
                        }

                        // dbg.log('StaticServer.Serve > Streaming ' + pathname);
                        // dbg.log(JSON.stringify(req.headers));
                        let resHeaders = Object.assign({}, this.resHeaders,
                            {
                                'Date': new (Date)().toUTCString(),
                                'Last-Modified': new (Date)(stat.mtime).toUTCString(),
                                'Content-Type': this.getMime(pathname),
                                'Content-Length': stat.size
                            });
                        res.writeHead(HttpStatusCode.Ok, resHeaders);
                        fs.createReadStream(pathname, { flags: 'r', mode: 0o666 })
                            .on('close', function () {
                                // dbg.log('StaticServer.Serve > Streaming ' + pathname, LoggerParts.Filename);
                                res.end();
                                resolve();
                            }).on('error', function (err) {
                                reject({ status: HttpStatusCode.InternalServerError });
                                dbg.log('StaticServer.Serve > Streaming error ' + err);
                            })
                            .pipe(res, { end: false });
                        return;
                    }
                    else if (stat.isDirectory()) {
                        dbg.log('reject Forbidden, no directory listing');
                        reject({ status: HttpStatusCode.Forbidden });
                    }
                    dbg.log('reject BadRequest ' + stat.isDirectory());
                    reject({ status: HttpStatusCode.BadRequest });
                });
            }
        });

        p.then(() => {

        }).catch((e) => {
            dbg.log('catch ' + e);
            console.error(e);
            let status = e.status ? e.status : HttpStatusCode.BadRequest;
            res.writeHead(status, e.headers);
            res.end();
        })
    }
}


