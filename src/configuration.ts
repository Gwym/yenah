
import * as fs from 'fs'

import { dbg } from './services/logger'
import { ConfigurationInterface } from './services/dispatcher'

export var configuration: ConfigurationInterface;

try {
  configuration = <ConfigurationInterface>JSON.parse(fs.readFileSync('configuration.json').toString());
  // FIXME (1) : set default value for each missing field if not set in conf file ?
}
catch (e) {  // file not found, parse error, ... => set default
  dbg.warn(e);
  dbg.log('no or bad configuration, using defaults');
  configuration = {
    httpIpAddress: '0.0.0.0',
    httpPort: 8080,
    fileServerPath:'./frontend',
    allowRegistration: false,
    doSendRegistrationMail: false,
    mailServer: '',
    mailSecret: '',
    mongoURL: '', // mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
    doCheckCaptcha: false,
    captchaSecret: '',
    doCheckInvitationCode: false,
    doCheckPasswordStrength: false
  }
}

/*// openshift hosting
configuration.httpIpAddress = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || configuration.httpIpAddress;
configuration.httpPort = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || configuration.httpPort;
configuration.mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL || configuration.mongoURL;
configuration.mongoURLLabel = '';
configuration.mailServer = process.env.OPENSHIFT_MAIL_SERVER || configuration.mailServer;
configuration.mailSecret = process.env.OPENSHIFT_MAIL_SECRET || configuration.mailSecret;
configuration.mailSecret = process.env.OPENSHIFT_CAPTCHA_SECRET || configuration.mailSecret;*/
/*
if ((!configuration.mongoURL || configuration.mongoURL.length === 0) && process.env.DATABASE_SERVICE_NAME) {

  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
    mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    configuration.mongoURLLabel = configuration.mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      configuration.mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    configuration.mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    configuration.mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
  }
  else {
    dbg.warn('MongoDB configuration error ' + mongoHost + ' ' + mongoPort + ' ' + mongoDatabase);
  }
}
*/
dbg.info(JSON.stringify(configuration));

