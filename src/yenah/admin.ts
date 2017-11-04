
import { dbg } from "../services/logger";
import { YeanhUserSession, ServerEngine } from "./engine";
import { ErrMsg, AdminRequest, AdminActId } from "../services/shared/messaging";
import { MongoPersistor } from "./db";
import { CollectionId } from "./shared/concept";
import { UnitTester } from "./tests/unittests";
import { IntegrationTester } from "./tests/tests";

// TODO (2) : Mongo -> Generic persistor

export class AdminDispatcher {

    mongoTestURL = "mongodb://localhost:27017/yenahtest"; // TODO (4) : in configuration ?

    constructor(private engine: ServerEngine) {

    }

    dispatchWsAdminCommand(cmd: AdminRequest, user: YeanhUserSession) {

        if (cmd.adminActId === AdminActId.Information) {

            dbg.admin('Information');
            this.engine.getDb().adminGetInformation(user);
        }
        else if (cmd.adminActId === AdminActId.CreateUser) {

            dbg.admin('CreateUser');
            this.engine.getDb().adminCreateUserInvitation(user);
        }
        else if (cmd.adminActId === AdminActId.DeleteUsers) {

            dbg.admin('DeleteUsers');
            this.engine.getDb().adminDropCollections([CollectionId.User, CollectionId.Session, CollectionId.Indirection]);
        }
        else if (cmd.adminActId === AdminActId.ResetWorld) {

            dbg.admin('ResetWorld');
            this.resetWorld();
        }
        else if (cmd.adminActId === AdminActId.UnitTests) {
            dbg.admin('UnitTests');
            this.doUnitTests();
        }
        else if (cmd.adminActId === AdminActId.IntegrationTests) {
            dbg.admin('IntegrationTests');
            this.doIntegrationTests();
        }
        else {
            dbg.error('dispatchWsAdminCommand > Unknown type ' + cmd.type);
            user.send(ErrMsg.UnkownCommand);
        }
    }

    resetWorld() {


        dbg.admin('Reset world ');

        let db = this.engine.getDb();

        db.adminDropCollections([
            CollectionId.Indirection,
            CollectionId.Session,
            CollectionId.Agent,
            CollectionId.Furniture,
            CollectionId.Cell
        ]);

        let simulator = new IntegrationTester(this.engine);

        simulator.populate(db)
            .then((insertResults) => {

                let count = 0;

                for (let insertResult of insertResults) {
                    if (insertResult.result.ok !== 1) {
                        throw 'db.simu > insert failed ' + insertResult;
                    }
                    else {
                        count += insertResult.insertedCount;
                    }
                }

                dbg.log('db.simu > Inserted ' + count);

                // TODO (1) : Promise, finally { set currentDb back }
                // simulator.simulate(db);
            })
            .catch((e) => {
                dbg.error('db.simu.catch > ' + e);
            });
    };


    doUnitTests() {

        let unit = new UnitTester();
        unit.doTests();

    }

    doIntegrationTests() {

        // TODO (1) : stop all other admin command possibilities during tests 
        let currentDB = this.engine.getDb();
        let simulator:IntegrationTester;
        let db = new MongoPersistor();

        db.connect(this.mongoTestURL)
            .then(() => {
                dbg.info('Connected to Test MongoDB at: ' + this.mongoTestURL);

                this.engine.setDb(db);
                simulator = new IntegrationTester(this.engine);

                db.adminDropCollections([
                    CollectionId.Indirection,
                    CollectionId.Session,
                    CollectionId.Agent,
                    CollectionId.Furniture,
                    CollectionId.Cell
                ]);
                return simulator.populate(db)
            })
            .then((insertResults) => {

                let count = 0;

                for (let insertResult of insertResults) {
                    if (insertResult.result.ok !== 1) {
                        throw 'db.simu > insert failed ' + insertResult;
                    }
                    else {
                        count += insertResult.insertedCount;
                    }
                }

                dbg.log('db.simu > Inserted ' + count);

                
                return simulator.simulate(db);
            })
            .then((simulationResult) => {

                // TODO (1) : simulationResultMessage, user.send(JSON.stringify(simulationResultMessage));
                dbg.log(JSON.stringify(simulationResult));

                // ~ Promise.finally 
                // TODO (5) : db.dropDatabase();
                db.close();
                dbg.info('test done setting original db');
                this.engine.setDb(currentDB);
            })
            .catch((e) => {
                dbg.error('db.simu.catch > ' + e);
                // ~ Promise.finally 
                // TODO (5) : db.dropDatabase();
                db.close();
                dbg.info('test done setting original db');
                this.engine.setDb(currentDB);
            });
    }
}


