
import 'source-map-support/register'
import * as path from 'path'

export enum LoggerParts { None = 0, Filename = 1, Code = 2, All = 3 }

export interface Logger {
  log(s: any, parts?: LoggerParts): void
  info(s: string): void
  warn(s: string): void
  error(a: any): void
  attr(s: string): void
  admin(s: any, parts?: LoggerParts): void
  assert(test: boolean, msg: string): void

  // Utility functions
  toStr(o: any): string // object to string
  t2d(t: number): string // timestamp to string
}


function trace(a: any, parts = LoggerParts.All) {
  let stack = (new Error().stack);

  if (stack) {
    if (parts) {
      // https://github.com/v8/v8/wiki/Stack%20Trace%20API
      stack = stack.split('\n')[3];
      let basename = /at ([^(]*)\(([^:]*):(\d*):(\d*)/.exec(stack)
        || /at ()([^:]*):(\d*):(\d*)/.exec(stack);
      if (basename && basename.length === 5) {
        let p = path.parse(basename[2]);
        // TODO (1) : padding ?
        stack = (parts & LoggerParts.Filename ? p.name + ':' + basename[3] : '')
          + (parts & LoggerParts.Code ? ' > ' + (basename[1].length ? basename[1] : '') + '> ' : ' > ');
      }
    }
  }
  else {
    stack = '';
  }

  return stack + a;
}

// alternative to console.trace showing only one line
// TODO (2) : fileLogger or MongoDBLogger ?
// TODO (2) : LoggerPersistor and LoggerClient (=> socket)
export var dbg: Logger = {
  log(s: string, parts?: LoggerParts) {
    console.log(trace(s, parts));
  },
  info(s: string) {
    console.info(trace(s));
  },
  warn(s: string) {
    console.warn(trace(s));
  },
  error(a: any) {
    console.error(trace(a, LoggerParts.None));
  },
  attr(s: string) {
    console.log(s);
  },
  admin(s: string, parts?: LoggerParts) {
    console.log(trace(s, parts));
  },
  assert(test: boolean, msg: string) {
    if (test) {
      console.log('OK - (' + msg + ')');
    }
    else {
      console.assert(test, trace(msg));
    }
  },
  toStr(o: any) {
    var o_str = '';
    for (var k in o) {
      // o_str += typeof o[k] + ' \n';
      if (typeof o[k] === 'function') {
        // o_str += k + ' : ' + ('' + o[k]).substring(0,10) + ' \n';
      }
      else if (k === 'type') {
        o_str += k + ' : ' + o[k]; //+ ' ' + (MessageType[o[k]]) + ' \n';
      }
      else {
        o_str += k + ' : ' + o[k] + ' \n';
      }
    }
    return o_str;
  },
  t2d(t: number): string {
    var d = new Date();
    d.setTime(t);

    // return d.toString();
    return d.getDate()
      + '.' + (d.getMonth() + 1)
      + '.' + d.getFullYear()
      + ' ' + d.getHours()
      + ':' + d.getMinutes()
      + ':' + d.getSeconds()
      + '.' + d.getMilliseconds();
  }
}

