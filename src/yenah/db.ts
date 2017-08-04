
import * as Mongo from 'mongodb';
import * as bcrypt from 'bcrypt';

import { dbg } from '../services/logger'
import {
    CollectionId,
    AgentItemIdentifier, IndirectionItemIdentifier, UserItemIdentifier,
    EntityOptions, AgentOptions, CellDao, SpaceRef,
    PositionGauge, PilotableAbsIdDao
} from './shared/concept'
import {
    QueryFilter, AdminInformations
} from './shared/messaging'
import {
    AbsEntityIdentifier, TransactionManager, ZoneAbsDao, FurnitureIdAbsDao, AgentIdAbsDao,
    PilotedRelToAbsDictionary, AbsAgentIdentifier, YeanhUserSession
} from './engine'
import {
    AsyncPersistor, UserDao, UpdateResult, InsertResult, InsertZoneDao,
    SaveZoneDao, SaveByIdDao, SavePosDao, IndirectionSaveDao,
    IndirectionIdDao
} from './persistor'
import { MessageType, XLoginRequest, ErrMsg, XRegistrationRequest, UserSessionAck, UserOptions } from "../services/shared/messaging";

// not used (aim is to sync db.ts with concept.ts changes, to remember to change MongoPositionQuery if PositionGauge changes in concept)
export interface _MongoPositionQuery extends PositionGauge {
    posX: { $gte: number, $lte: number },
    posY: { $gte: number, $lte: number }
}

interface MongoPositionQuery {
    "varAttr.posX": { $gte: number, $lte: number }
    "varAttr.posY": { $gte: number, $lte: number }
}

export interface MongoPilotableDao extends PilotableAbsIdDao {
    _id: Mongo.ObjectID
}

interface MongoAgentIdDao extends AgentOptions {
    _id: Mongo.ObjectID
}

interface MongoFurnitureIdDao extends EntityOptions {
    _id: Mongo.ObjectID
}

interface MongoIndirectionIdDao extends IndirectionSaveDao {
    _id: Mongo.ObjectID
}

export class MongoPersistor extends AsyncPersistor {

    private tracks: Mongo.Collection
    private sessions: Mongo.Collection
    private users: Mongo.Collection
    private indirections: Mongo.Collection
    private agents: Mongo.Collection
    private furnitures: Mongo.Collection
    private cells: Mongo.Collection
    private dbConnection: Mongo.Db

    connect(mongoUrl: string): Promise<MongoPersistor> {

        return new Promise<MongoPersistor>((resolve, reject) => {

            Mongo.MongoClient.connect(mongoUrl).then((mdb) => {

                //  TODO (1) : if (mongo version >= 3.2 useLookup { 
                // this.getPilotedRelList = this.getPilotedRelListLookup;
                /*
                var adminDb = db.admin();
                    adminDb.serverStatus(function(err, info) {
                        console.log(info.version);
                    })
                */


                this.dbConnection = mdb;
                this.tracks = mdb.collection('tracks');
                this.sessions = mdb.collection('sessions');
                this.users = mdb.collection('users');
                this.indirections = mdb.collection('indirections');
                this.agents = mdb.collection('agents');
                this.furnitures = mdb.collection('furnitures');
                this.cells = mdb.collection('cells');

                this.users.createIndex({ "name": 1 }, { unique: true })
                this.users.createIndex({ "mail": 1 }, { unique: true })

                // TODO (0) : session expiration
                /*var expir = new Date();
        expir.setDate(expir.getDate() + 5);
        this.generateCredential(expir); */

                resolve(this);

            }).catch(function (err) {
                dbg.error('Error connecting to Mongo. Message:\n' + err);
                reject(err);
                throw (err); // Promises used in callbacks does not catch
            })
        })
    }

    close() {
        this.dbConnection.close();
    }

    transactionStart(): Promise<TransactionManager> {

        return new Promise<TransactionManager>((resolve) => {
            resolve(); // TODO (1) if pending transaction, reject or queue ?
        });
    }

    transactionEnd() {
        // TODO (1)
    }

    getNow() {
        // TODO (0) : store/load timestamp at shutdown/failed
        return Date.now();
    }

    // For tests
    getDummyIdentifier(seed?: number): UserItemIdentifier {
        // return new UserItemIdentifier(Mongo.ObjectID.createFromTime(seed !== undefined ? seed : Date.now() / 1000).toHexString());
        return Mongo.ObjectID.createFromTime(seed !== undefined ? seed : Date.now() / 1000).toHexString();
    }

    insertTrack(track: any) {
        this.tracks.insert(track);
    }

    getUserFromLogin(cmd: XLoginRequest): Promise<UserDao> {

        return new Promise<UserDao>((resolve, reject) => {

            this.users.find({ mail: cmd.login })
                .limit(1)
                .project({ _id: true, hash: true, name: true })
                .next(function (err, userDoc) {

                    dbg.log('getUserFromLogin > find err:' + err + ' user:' + userDoc);
                    dbg.log(JSON.stringify(userDoc));

                    if (err === null && userDoc && userDoc._id && userDoc.name) {

                        bcrypt.compare(cmd.password, userDoc.hash, function (err, res) {
                            if (res) {
                                let userDao: UserDao = {
                                    iId: userDoc._id.toHexString(),
                                    name: userDoc.name
                                }
                                resolve(userDao);
                            }
                            else {
                                console.error('getUserFromLogin > bcrypt failed err:' + err + ' res: ' + res + ' user:' + userDoc);
                                reject(ErrMsg.LoginError); // PasswordError
                            }
                        });
                    }
                    else {
                        console.error('getUserFromLogin > mongo failed err:' + err + ' user:' + userDoc);
                        reject(ErrMsg.LoginError); // Login error
                    }
                });
        });
    }



    /*   generateCredential(expiration: Date): Promise<string> {
   
           let invitationCode = Math.round(Math.random() * 10000).toString(); // TODO (5) : code generator
           console.log('generateCredential > invitationCode: ' + invitationCode + ' expiration: ' + expiration);
   
           return new Promise<string>((resolve, reject) => {
               this.users.insertOne({ invitationCode: invitationCode, expiration: expiration }, (err, result: Mongo.InsertOneWriteOpResult) => {
                   if (err === null && result && result.insertedId) {
                       console.log('generateCredential > OK ' + result.insertedId);
                       resolve(result.insertedId.toHexString());
                   }
                   else {
                       console.log('generateCredential > err ' + err);
                       console.error(err);
                       reject(err.toString());
                   }
               });
           });
       } */

    createUser(userReg: XRegistrationRequest): Promise<UserSessionAck> {

        // TODO (1) : if (credential.expiration <= Date.now() ) or  {credential.expiration: {$lt: Date.now()} }
        //  return this.users.findOneAndReplace({ invitationCode: userReg.code }, { mail: userReg.mail });

        // TODO (2) : checkPasswordStrenght()

        return new Promise<UserSessionAck>((resolve, reject) => {

            // TODO (1) : hash birthdate
            bcrypt.hash(userReg.password, 4, (err, hash) => { // TODO (1) : saltRound, err

                if (err) {
                    dbg.error(err);
                    reject(err);
                    return;
                }

                interface UserPrivateDocument extends UserOptions {
                    mail: string,
                    hash: string
                }
                let userDocument: UserPrivateDocument = {
                    name: userReg.name,
                    mail: userReg.mail,
                    hash: hash
                }

                // TODO (1) : check invitation code, reject(ErrMsg.InvalidCode);
                //  this.users.findOneAndReplace({ invitationCode: userReg.code }, { mail: userReg.mail }, (err, res) => {

                this.users.insertOne(userDocument, (err: Mongo.WriteError, res) => {
                    if (err === null && res.result.ok && res.insertedCount === 1) {
                        dbg.log('createUser > OK ' + userDocument);
                        let userAck: UserSessionAck = { type: MessageType.User, userOptions: { name: userDocument.name } };
                        resolve(userAck);
                    }
                    else {
                        dbg.log(err);

                        // https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/
                        // example : { WriteError({"code":11000,"index":0,"errmsg":"E11000 duplicate key error collection: yenah.users index: name_1 dup key: { : \"test\" }","op":{"name":"test","mail":"test@test.fr","hash":"$2a$04$rgeUX7eSraGrtaW7S1Lp0O/0XR9Wya0K5.vuv.kFlIsJGoGcz0DMm","_id":"59589321bed74e09da709bcc"}})
                        if (err.code === 11000) {
                            
                            if (err.errmsg.indexOf('index: name') !== -1) {
                                reject(ErrMsg.DuplicateName);
                                return;
                            }
                            else if (err.errmsg.indexOf('index: mail') !== -1) {
                                reject(ErrMsg.DuplicateMail);
                                return;
                            }
                            
                        }

                        dbg.error(err); 

                        reject(ErrMsg.DatabaseError);
                    }
                })

            }); // bcrypt password

        });
    }

    // #IFDEF PERSISTOR_SESSIONS

    /* 
       // MONGO > v3.2 
        getUserFromSession(sessionId: string): Promise<any[]> {
     
                 return this.sessions.aggregate([
                     { $match: { _id: Mongo.ObjectID.createFromHexString(sessionId) } },
                     { $limit: 1 },
                 { $lookup: {
                         from: 'users',
                         localField: 'user_id',
                         foreignField: '_id',
                         as: 'userDoc'
                     } }
                 ]).toArray();
     
         } */
    /*
        getUserFromSession(sessionId: string): Promise<UserDao> {
    
            return new Promise<UserDao>((resolve, reject) => {
    
                let sid: Mongo.ObjectID = Mongo.ObjectID.createFromHexString(sessionId);
    
                this.sessions.find({ _id: sid })
                    .limit(1)
                    .project({ user_id: true })
                    .next((errSession, documentSession) => {
    
                        console.log(documentSession);
    
                        if (errSession === null && documentSession && documentSession.user_id) {
                            this.users.find({ _id: documentSession.user_id })
                                .limit(1)
                                .project({ _id: true, name: true })
                                .next((errUser, documentUser) => {
    
                                    // TODO (0) : refresh session expiration
    
                                    if (errUser === null && documentUser) {
                                        resolve(documentUser);
                                    } else {
                                        console.log('getUserFromSession > mongo failed errUser:' + errUser + ' docUser:' + documentUser + ' documentSession.user_id:' + documentSession.user_id);
                                        reject(<s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.UserNotFound });
                                    }
                                });
                        }
                        else {
                            console.log('getUserFromSession > mongo failed errSession:' + errSession + ' docSession:' + documentSession);
                            reject(<s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.SessionError });
                        }
                    });
            });
        }
    */
    /*
        generateSessionId(userAbsIId: UserItemIdentifier): Promise<string> {
    
            // TODO (0) : cookieExpiration
            return new Promise<string>((resolve, reject) => {
                this.sessions.insertOne({ user_id: Mongo.ObjectID.createFromHexString(userAbsIId.toString()) }, (err, result: Mongo.InsertOneWriteOpResult) => {
                    if (err != null) {
                        console.error('generateSessionId > err:' + err);
                        reject(<s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.DatabaseError }); // TODO (5) : MongoError -> ClientError
                    }
                    else {
    
                        //  let ack: SessionAck = { type: MessageType.SessionCheck, sessionId: result.insertedId.toHexString() };
                        console.log('generateSessionId > sessionId:' + result.insertedId);
    
                        resolve(result.insertedId.toHexString());
                    }
                });
            });
        }
    */
    // #ENDIFDEF PERSISTOR_SESSIONS

    // Find all creatures with no user attached
    getPilotable(filter: QueryFilter): Promise<PilotableAbsIdDao[]> {

        let checkPilotedIds: AgentItemIdentifier[] = [];

        return new Promise<PilotableAbsIdDao[]>((resolve, reject) => {
            dbg.log('db > getPilotable : TODO (1) : filter parameters');

            this.agents.find({}) // ~ piloted: { $exists: false }
                .limit(filter.limit)
                //  .project(Projections.AgentDaoAsPilotable)  // TODO (0) : obsolete , no projection dev/prod = f(user option) project iid
                .toArray((err, candidates: MongoPilotableDao[]) => {
                    if (err) { dbg.error(err); reject(ErrMsg.ServerError); throw ErrMsg.ServerError } // FIXME (2) : throw or reject ?

                    // Convert Mongo _id to iId and build list
                    let candidate: MongoPilotableDao;
                    for (let idx = 0; idx < candidates.length; idx++) {
                        candidate = candidates[idx];
                        candidate.agentIId = candidate._id.toHexString();
                        delete candidate._id;
                        checkPilotedIds[idx] = candidate.agentIId;
                    }

                    // check for free creatures

                    this.indirections.find({ piloted: true, oId: { $in: checkPilotedIds } })
                        .toArray(function (err, alreadyPiloted: MongoIndirectionIdDao[]) {
                            if (err) { dbg.error(err); reject(ErrMsg.ServerError); throw ErrMsg.ServerError } // FIXME (2) : throw or reject ? 

                            let possibleCandidate: (MongoPilotableDao | undefined)[] = candidates;
                            let pilotables = [];

                            for (let pilotedInd of alreadyPiloted) {
                                let idx = checkPilotedIds.indexOf(pilotedInd.oId);
                                if (idx !== -1) {
                                    dbg.log('remove already piloted ' + pilotedInd.oId);
                                    possibleCandidate[idx] = undefined; // ~ candidates.splice(idx, 1) while keeping indexes
                                }
                            }

                            for (let c of possibleCandidate) {
                                if (c) {
                                    pilotables.push(c);
                                }
                            }

                            resolve(pilotables);
                        })
                })
        })
    }

     

    // TODO (2) : filter argument to select some piloted or groups (see getPilotedGroups)
    // getPiloted always need indirection, so we use indirections.piloted and not agents.pilot_id
    // WARNING : piloted agents may not be stable (ex : dead from poison in the meantime)
    getPilotedRelToAbsDictionary(userAbsIId: UserItemIdentifier): Promise<PilotedRelToAbsDictionary> {

        return new Promise<PilotedRelToAbsDictionary>((resolve, reject) => {

            let pilotedDic: PilotedRelToAbsDictionary = {};  // Rel to abs dictionary

            let query = { uId: userAbsIId, piloted: true }; // ~ " WHERE uId === userAbsIID AND oId === tIId "

            this.indirections.find(query).toArray((err, indirections: MongoIndirectionIdDao[]) => {

                if (err) {
                    reject(ErrMsg.ServerError);
                    throw err; // FIXME (1) : throw doesn't work in callbacks within promises ? => reject to catch
                }

                // Build abs to rel dictionary from list
                let idList = [];
                let absToRel: { [index: string]: string } = {}; // [index: abs]: rel 

                for (let indirection of indirections) { // TODO (1) : limit to 1000 or split
                    idList.push(Mongo.ObjectID.createFromHexString(indirection.oId.toString()));
                    absToRel[indirection.oId] = indirection._id.toHexString();
                }

                this.agents.find({ _id: { $in: idList } })
                    .toArray(function (err, actors: MongoAgentIdDao[]) {

                        if (err !== null) {
                            dbg.error(err);
                            dbg.error(actors);
                            reject(ErrMsg.ServerError);
                            throw err; // FIXME (1) : throw doesn't work in callbacks within promises ? => reject to catch
                        } else {

                            // Convert MongoAgentIdDao to AgentIdDao (_id => AbsIdentifier)
                            for (let actor of actors) {

                                let actorAbsIId = actor._id.toHexString();
                                let actorIndirectionId = absToRel[actorAbsIId];

                                (<AgentIdAbsDao><any>actor).gId = new AbsAgentIdentifier(actorAbsIId);
                                /* {
                                    cId: CollectionId.Agent,
                                    iId: actorAbsIId
                                }*/
                                delete actor._id;
                                dbg.log('indId:' + actorIndirectionId + ' => absId:' + (<AgentIdAbsDao><any>actor).gId.iId);
                                pilotedDic[actorIndirectionId] = <AgentIdAbsDao><any>actor;
                            }

                            resolve(pilotedDic);
                        }
                    });
            });
        });
    }

    setPilot(userAbsIId: UserItemIdentifier, setPilotAbsList: AgentItemIdentifier[]): Promise<Mongo.BulkWriteResult> {

        //  let agentIdList: Mongo.ObjectID[] = [];
        let actorList: IndirectionSaveDao[] = [];
        let indirection: IndirectionSaveDao;

        for (let agentId of setPilotAbsList) {
            dbg.log('setPilot > convert  agentId: ' + agentId);
            //   agentIdList.push(Mongo.ObjectID.createFromHexString(agentId));
            indirection = {
                uId: userAbsIId,
                oId: agentId,
                tCId: CollectionId.Agent,
                tIId: agentId,
                piloted: true
            }

            actorList.push(indirection);
        }

        return new Promise((resolve) => {
            this.memoriseIndirections(actorList)
                .then((bulkResult) => {
                    // set pilot_id in agents, to simplify getPilotable
                    dbg.log('setPilot > bulkResult:');
                    dbg.log(bulkResult);
                    resolve(bulkResult);
                    /*     if (set) {
                             return this.agents.updateMany({ _id: { $in: agentIdList }, pilot_id: { $exists: false } }, { $set: { pilot_id: pilot_id } });
                         }
                         else {
                             return this.agents.updateMany({ _id: { $in: agentIdList }, pilot_id: pilot_id }, { $unset: { pilot_id: true } });
                         }
                     })
                     .then((updateResult) => {
                         // TODO (0) : check result
                         dbg.log('setPilot > updateResult:');
                         dbg.log(updateResult.result);
                         resolve(updateResult); */

                })
            // .catch( () => { reject(); }
        })

    }

    /*   recallUserIndirections(userIId: ItemIdentifier, indIdentifiers: IndirectionIdentifier[]): Promise<IndirectionIdDao[]> {
   
           let query = { uId: userIId,  };
   
           if (indIdentifiers.length) {
               
               // TODO (1) :  return Promise([]) filter on id's : query._id : { $in: Mongo.ObjectID.createFromHexString(relIdentifiers...) }
           }
   
           for (let indId of indIdentifiers) {
   
           }
   
           return new Promise<IndirectionIdDao[]>((resolve, reject) => {
   
               this.indirections.find(query).toArray(function (err, docs: MongoIndirectionIdDao[]) {
                   if (err !== null) {
                       dbg.error(err);
                       dbg.error(docs);
                       reject(<s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.ServerError });
                       throw err; // FIXME (1) : throw doesn't work in callbacks within promises ? => reject to catch
                   } else {
                       for (let doc of docs) {
                           (<IndirectionIdDao><any>doc).indId = doc._id.toHexString();
                           delete doc._id;
                       }
                       resolve(<IndirectionIdDao[]><any[]>docs);
                   }
               });
           })
   
       } */

    // unset does not need the memoriseIndirections step (piloted creatures are kept in indirection memory)
    unsetPiloted(userAbsIId: UserItemIdentifier, unsetPilotedIndList: IndirectionItemIdentifier[]): Promise<UpdateResult> {

        let mongoUnsetPilotedList = [];

        for (let siid of unsetPilotedIndList) {
            mongoUnsetPilotedList.push(Mongo.ObjectID.createFromHexString(siid));
        }

        dbg.log(JSON.stringify({ uId: userAbsIId, piloted: true, _id: { $in: mongoUnsetPilotedList } }));

        return this.indirections.updateMany(
            { uId: userAbsIId, piloted: true, _id: { $in: mongoUnsetPilotedList } },
            { $unset: { piloted: true } }
        );



        // TODO (0) : unset pilotable_id in this.agents (used for getPilotable)
        // get reltoabs list from indirection and update agents
        // this.agents.updateMany({ _id: { $in: agentIdList }, pilot_id: pilot_id }, { $unset: { pilot_id: true } });
    }

    getActorPosition(actorIid: AgentItemIdentifier): Promise<SpaceRef> {

        let query = { _id: Mongo.ObjectID.createFromHexString(actorIid) };

        dbg.log('actorIid:' + actorIid + ' query : ' + JSON.stringify(query));

        return new Promise<SpaceRef>((resolve) => {

            this.agents.findOne(query, { fields: { 'varAttr.posX': true, 'varAttr.posY': true } })
                .then((mongoActorPosition) => {
                    resolve({
                        originX: mongoActorPosition.varAttr.posX,
                        originY: mongoActorPosition.varAttr.posY
                    });
                })
        })
    }

    // TODO (0) : extract zone creation from db,
    // step 1 : get cells, prune on visibility
    // step 2 : items, buildings, agents within limits, try to add to remaining cells and prune on visibility
    getZoneFromLocation(originX: number, originY: number, radius: number, actorId: AbsEntityIdentifier, snapshotDH: number): Promise<ZoneAbsDao> {

        // https://docs.mongodb.com/v2.2/core/read-operations/#subdocuments

        let query: MongoPositionQuery = {
            'varAttr.posX': { $gte: originX - radius, $lte: originX + radius },
            'varAttr.posY': { $gte: originY - radius, $lte: originY + radius }
        };

        let agents: AgentIdAbsDao[] = [];
        let furnitures: FurnitureIdAbsDao[] = [];

        // TODO (1) aggregate/lookup and/or lock/atomic transaction

        dbg.log('actorId:' + actorId + ' query : ' + JSON.stringify(query));

        return new Promise<ZoneAbsDao>((resolve, reject) => {

            this.furnitures.find(query).toArray() // TODO (2) : , { fields: Projections.MongoFurnitureIdDao }
                .then((resFurnitures: MongoFurnitureIdDao[]) => {
                    // Convert Mongo _id to AbsIdentifier { cId: CollectionId.Furniture, iId: furniture._id.toHexString() } 
                    for (let furniture of resFurnitures) {
                        (<FurnitureIdAbsDao><any>furniture).gId = new AbsEntityIdentifier(CollectionId.Furniture, furniture._id.toHexString());
                        delete furniture._id;
                        furnitures.push(<FurnitureIdAbsDao><any>furniture);
                    }
                    console.log('furnitures : ' + furnitures.length);

                    return this.agents.find(query).toArray(); //  TODO (2) : , { fields: Projections.MongoAgentIdDao }
                })
                .then((resAgents: MongoAgentIdDao[]) => {
                    // Convert Mongo _id to AbsIdentifier { cId: CollectionId.Agent, iId: agent._id.toHexString() }
                    for (let agent of resAgents) {
                        (<AgentIdAbsDao><any>agent).gId = new AbsAgentIdentifier(agent._id.toHexString());
                        delete agent._id;
                        agents.push(<AgentIdAbsDao><any>agent);
                    }
                    console.log('resAgents : ' + resAgents.length);

                    return this.cells.find(query).toArray(); //  TODO (2) : , { fields: Projections.CellDao }
                })
                .then((resCells: CellDao[]) => { // === MongoCellIdDao (Mongo _id is not used in cells) 
                    console.log('resCells : ' + resCells.length);

                    let ZoneDao: ZoneAbsDao = {
                        snapshotDH: snapshotDH,
                        actorGId: actorId,
                        originX: originX,
                        originY: originY,
                        //    defaultTerrainType: World.defaultCellType,
                        agents: agents,
                        furnitures: furnitures,
                        cells: resCells
                    };
                    resolve(ZoneDao);
                })
                .catch((e: any) => { reject(e) });
        });
    }

    // Note : docs.length should be > 0 (Mongo throws an exception if bulkOp.length === 0)
    private saveById(coll: Mongo.Collection, daos: SaveByIdDao[]): Promise<Mongo.BulkWriteResult> {

        let bulk = coll.initializeUnorderedBulkOp();
        // TODO (1) : limit to 1000 or split
        // http://stackoverflow.com/questions/38048052/get-inserted-ids-for-bulk-insert-mongoskin

        for (let dao of daos) {
            if (dao.varAttr) {
                bulk.find({ _id: Mongo.ObjectID.createFromHexString(dao.iId.toString()) }).update({ $set: { varAttr: dao.varAttr } });

            }
            else if (dao.full) {
                bulk.find({ _id: Mongo.ObjectID.createFromHexString(dao.iId.toString()) }).upsert().update({ $set: dao.full });
            }
            else {
                throw 'Invalid saveById dao collection';
            }
        }

        return bulk.execute();
    }

    private saveByPosition(coll: Mongo.Collection, docs: SavePosDao[]): Promise<Mongo.BulkWriteResult> {

        let bulk = coll.initializeUnorderedBulkOp();

        // TODO (1) : limit to 1000 or split
        // http://stackoverflow.com/questions/38048052/get-inserted-ids-for-bulk-insert-mongoskin

        for (let doc of docs) {
            bulk.find({ posX: doc.absPosX, posY: doc.absPosY }).upsert().update({ $set: doc.gist });
        }

        return bulk.execute();
    }

    saveZoneDao(saveDao: SaveZoneDao): Promise<Mongo.BulkWriteResult[]> {

        // TODO (5) :   updatemany ? insert ? , store writeresults, check and rollback

        let promises: Promise<Mongo.BulkWriteResult>[] = [];

        if (saveDao.agents && saveDao.agents.length) {
            promises.push(this.saveById(this.agents, saveDao.agents));
        }
        if (saveDao.furnitures && saveDao.furnitures.length) {
            promises.push(this.saveById(this.furnitures, saveDao.furnitures));
        }
        if (saveDao.cells && saveDao.cells.length) {
            promises.push(this.saveByPosition(this.cells, saveDao.cells));
        }

        dbg.log('db.saveZone > Saving ' + promises.length + ' doc(s)');

        return Promise.all(promises)
    }

    adminDropCollections(collectionsToDrop: CollectionId[]) {

        // TODO (0) :  options { sessions: true, cells: true ... }
        // TODO (1) : disconnect users
        // this.users.drop(); 
        if (collectionsToDrop.indexOf(CollectionId.Session) !== -1) {
            this.sessions.drop(function (err, res) { dbg.log('db.dropCollections > drop sessions ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }
        if (collectionsToDrop.indexOf(CollectionId.Indirection) !== -1) {
            this.indirections.drop(function (err, res) { dbg.log('db.dropCollections > drop indirections ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }
        if (collectionsToDrop.indexOf(CollectionId.Cell) !== -1) {
            this.cells.drop(function (err, res) { dbg.log('db.dropCollections > drop cells ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }
        if (collectionsToDrop.indexOf(CollectionId.Agent) !== -1) {
            this.agents.drop(function (err, res) { dbg.log('db.dropCollections > drop agents ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }
        if (collectionsToDrop.indexOf(CollectionId.Furniture) !== -1) {
            this.furnitures.drop(function (err, res) { dbg.log('db.dropCollections > drop furnitures ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }
        if (collectionsToDrop.indexOf(CollectionId.User) !== -1) {
            this.users.drop(function (err, res) { dbg.log('db.dropCollections > drop users ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }


        /* 
        // FIXME (1) : non existing collection throws ns not found (breaking Promise sequence) => check if exists ?
        let promises = [];
 
         promises.push(this.sessions.drop());
         promises.push(this.cells.drop());
         promises.push(this.agents.drop());
         promises.push(this.furnitures.drop());
 
         console.log('db.drop > Droping ' + promises.length + ' collections(s)');
 
         return Promise.all(promises); */
    }

    populate(data: InsertZoneDao): Promise<InsertResult[]> {

        let promises: Promise<Mongo.InsertWriteOpResult>[] = [];

        if (data.agents && data.agents.length) {
            promises.push(this.agents.insertMany(data.agents));
        }
        if (data.furnitures && data.furnitures.length) {
            promises.push(this.furnitures.insertMany(data.furnitures));
        }
        if (data.cells && data.cells.length) {
            promises.push(this.cells.insertMany(data.cells));
        }

        console.log('db.populate > Inserting ' + promises.length + ' list(s)');

        return Promise.all(promises)
    }

    memoriseIndirections(absIdentifiers: IndirectionSaveDao[]): Promise<Mongo.BulkWriteResult> {

        if (absIdentifiers.length) {

            let bulk = this.indirections.initializeUnorderedBulkOp();

            // TODO (1) : limit to 1000 or split
            // http://stackoverflow.com/questions/38048052/get-inserted-ids-for-bulk-insert-mongoskin

            for (let item of absIdentifiers) {
                bulk.find({ uId: item.uId, oId: item.oId, tCId: item.tCId, tIId: item.tIId }).upsert().update({ $set: item });
            }

            return bulk.execute();
        }
        else {
            console.error('No indirection to save');
            return new Promise<Mongo.BulkWriteResult>((resolve) => { resolve() });
        }
    }

    recallObserverIndirections(observerAbsId: AbsEntityIdentifier, relIdentifiers?: IndirectionItemIdentifier[]): Promise<IndirectionIdDao[]> {

        let query = { oId: observerAbsId.iId };

        if (relIdentifiers) {
            // TODO (1) : filter on id's : query._id : { $in: Mongo.ObjectID.createFromHexString(relIdentifiers...) }
        }

        return new Promise<IndirectionIdDao[]>((resolve, reject) => {

            this.indirections.find(query).toArray(function (err, docs: MongoIndirectionIdDao[]) {
                if (err !== null) {
                    dbg.error(err);
                    dbg.error(docs);
                    reject(ErrMsg.ServerError);
                    throw err; // FIXME (1) : throw doesn't work in callbacks within promises ? => reject to catch
                } else {
                    for (let doc of docs) {
                        // (<IndirectionIdDao><any>doc).indId = new IndirectionItemIdentifier(doc._id.toHexString());
                        (<IndirectionIdDao><any>doc).indId = doc._id.toHexString();
                        delete doc._id;
                    }
                    resolve(<IndirectionIdDao[]><any[]>docs);
                }
            });
        })

    }

    /*   
      getPilotedGroups(userAbsIId: ItemIdentifier): Promise<number[]> {
  
          let query = { uId: userAbsIId, piloted: true };
  
          return this.indirections.distinct('group', query);
      } */

    adminGetInformation(user: YeanhUserSession): void {

        dbg.admin('AdminGetInformation ' + user.userOptions.name);

        let info: AdminInformations = {
            type: MessageType.Admin,
            tracks: 0,
            sessions: 0,
            users: 0,
            indirections: 0,
            agents: 0,
            furnitures: 0,
            cells: 0
        };

        let results: Promise<number>[] = [];

        /*  for (let collection in info) { 
              if (info.hasOwnProperty(collection)) {
                  results.push(this[collection].count({}));
              }
          } */

        results.push(this.tracks.count({}));
        results.push(this.sessions.count({}));
        results.push(this.users.count({}));
        results.push(this.indirections.count({}));
        results.push(this.agents.count({}));
        results.push(this.furnitures.count({}));
        results.push(this.cells.count({}));


        Promise.all(results).then(values => {

            info.tracks = values[0];
            info.sessions = values[1];
            info.users = values[2];
            info.indirections = values[3];
            info.agents = values[4];
            info.furnitures = values[5];
            info.cells = values[6];

            dbg.log('AdminGetInformation > ');

            user.send(info);
        }).catch(reason => {
            user.send(reason);
        });
    }

    adminCreateUserInvitation(user: YeanhUserSession) {

        dbg.admin('adminCreateUserInvitation ' + user.userOptions.name);

        user.send(ErrMsg.UnkownCommand);
        /*


        new Promise<number>((resolve, reject) => {

        }).then(
            
            user.send({}});
        }).catch(reason => {
            user.send({}});
        }); */
    }

}
