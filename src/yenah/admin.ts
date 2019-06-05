
import { dbg } from "../services/logger";
import { YeanhUserSession, YenahServerEngine, AbsEntityIdentifier } from "./engine";
import { ErrMsg, AdminRequest, AdminActId, MessageType } from "../services/shared/messaging";
import { MongoPersistor } from "./db";
import { YenahCollectionId } from "./shared/concept";
import { UnitTester } from "./tests/unittests";
import { IntegrationTester } from "./tests/tests";
import { YenahAdminActId, AdminWorldEditRequest, AdminWorldEditAck } from "./shared/messaging";
import { AsyncPersistorYenah } from "./persistor";

// TODO (2) : Mongo -> Generic persistor
// TODO (0) : YeanAdminDispatcher extends BaseAdminDispatcher

export class AdminDispatcher {

    mongoTestURL = "mongodb://localhost:27017/yenahtest"; // TODO (4) : in configuration ?

    constructor(private engine: YenahServerEngine) {

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
            this.engine.getDb().adminDropCollections([YenahCollectionId.User, YenahCollectionId.Session, YenahCollectionId.Indirection]);
        }
        else if (cmd.adminActId === AdminActId.UnitTests) {

            dbg.admin('UnitTests');
            this.doUnitTests();
        }
        else if (cmd.adminActId === AdminActId.IntegrationTests) {

            dbg.admin('IntegrationTests');
            this.doIntegrationTests();
        }
        else if (cmd.adminActId === YenahAdminActId.ResetWorld) {

            dbg.admin('ResetWorld');
            this.resetWorld();
        }
        else if (cmd.adminActId === YenahAdminActId.EditWorld) {

            dbg.admin('Edit World');
            this.editWorld(cmd, user);
        }
        else {

            dbg.error('dispatchWsAdminCommand > Unknown type ' + cmd.type);
            user.send(ErrMsg.UnkownCommand);
        }
    }

    doUnitTests() {

        let unit = new UnitTester();
        unit.doTests();

    }

    doIntegrationTests() {

        // TODO (1) : stop all other admin command possibilities during tests 
        let currentDB = this.engine.getDb();
        let simulator: IntegrationTester;
        let db = new MongoPersistor();

        db.connect(this.mongoTestURL)
            .then(() => {
                dbg.info('Connected to Test MongoDB at: ' + this.mongoTestURL);

                this.engine.setDb(db);
                simulator = new IntegrationTester(this.engine);

                db.adminDropCollections([
                    YenahCollectionId.Indirection,
                    YenahCollectionId.Session,
                    YenahCollectionId.Agent,
                    YenahCollectionId.Furniture,
                    YenahCollectionId.Cell
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

    resetWorld() {

        dbg.admin('Reset world ');

        let db = <AsyncPersistorYenah>this.engine.getDb();

        db.adminDropCollections([
            YenahCollectionId.Indirection,
            YenahCollectionId.Session,
            YenahCollectionId.Agent,
            YenahCollectionId.Furniture,
            YenahCollectionId.Cell
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

                dbg.log('db.simu > Inserted ' + count)

                // TODO (1) : Promise, finally { set currentDb back }
                // simulator.simulate(db);
            })
            .catch((e) => {
                dbg.error('db.simu.catch > ' + e)
            })
    }

    editWorld(cmd: AdminRequest, user: YeanhUserSession) {

        dbg.admin('Edit world ')

        // TODO (1) : validiate client message
        let req: AdminWorldEditRequest = <AdminWorldEditRequest>cmd

        let db = <AsyncPersistorYenah>this.engine.getDb()

        if (req.radius && req.originX && req.originY) {
            let editorId = new AbsEntityIdentifier(YenahCollectionId.Cell, req.radius.toString()) // TODO (3) : message with radius (for now use actor iid)

            db.getZoneFromLocation(req.originX, req.originY, req.radius, editorId, 0)
                .then((zone) => {
                    let ack: AdminWorldEditAck = {
                        type: MessageType.Admin,
                        adminActId: YenahAdminActId.EditWorld,
                        zone: zone
                    }
                    user.send(ack)
                })
        }
        else if (req.zone) {
            dbg.admin('populate world ')
            dbg.log(req.zone)

         /*   let zoneDao: SaveZoneDao = {
                isSaveZoneDao: true,
                cells: []
            }

            for (let cell of req.zone) {

                let cellDao: CellDao = {
                    cellType: cell.cellType,
                    posX: cell.posX,
                    posY: cell.posY,
                    // ,vegetation?: number // TODO (1) : vegetation editor
                }
                let posDao: SavePosDao = {

                    absPosX: cell.posX,
                    absPosY: cell.posY,
                    gist: cellDao

                };
                (<SavePosDao[]>zoneDao.cells).push(posDao)


            } */

            //db.saveZoneDao(zoneDao)
            db.populate(req.zone)

        }
        else {
            dbg.error('AdminWorldEditRequest format error')
        }
    }
}


