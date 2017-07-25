"use strict"

import { dbg } from "./services/logger";
import { configuration } from './configuration'
import { MongoPersistor } from "./yenah/db";
import { ServerEngine } from './yenah/engine';

(new MongoPersistor()).connect(configuration.mongoURL).then((persitor) => {
    dbg.info('Connected to MongoDB at: ' + configuration.mongoURL);

    let engine = new ServerEngine(configuration, persitor);
});




