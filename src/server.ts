"use strict"

import { dbg } from "./services/logger";
import { configuration } from './configuration'
import { MongoPersistor } from "./yenah/db";
import { ServerEngine } from './yenah/engine';
import { UnitTester } from "./yenah/tests/unittests";

(new MongoPersistor()).connect(configuration.mongoURL).then((persitor) => {
    dbg.info('Connected to MongoDB at: ' + configuration.mongoURL);

    new ServerEngine(configuration, persitor);

    // TODO (0) : separate tests from admin and from server
    try {
        let unit = new UnitTester();
        unit.doTests();
    }
    catch (err) {
        console.error(err);
    }
});




