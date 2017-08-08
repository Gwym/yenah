
import { dbg, LoggerParts } from '../services/logger'

import { CoreAction, ActionReport } from './shared/action'
import {
    Constants, EntityIdentifier, AgentIdentifier, UserItemIdentifier, AgentItemIdentifier, TransientIdentifier,
    IndirectionItemIdentifier, IndirectEntityIdentifier, ActId, World,
    AgentOptions, EntityOptions, AgentIdRelOptions, PilotableAbsIdDao, PilotableTransientIdDao, CellDao, FurnitureIdDao, AgentIdOptions,
    EntityBase, Agent, Furniture, Target, EntityInterface
} from './shared/concept';
import { UserOptions, MessageType, ToStringId, c2s_ChannelMessage, s2c_ChannelMessage, ErrMsg } from '../services/shared/messaging'
import {
    Dispatcher, UserSession
} from '../services/dispatcher';
import {
    ZoneRequest, ZoneAck, ActionRequest, PilotRequest, PilotAck, SetPilotRequest, SetPilotAck,
    QueryFilter, AdminRequest
} from './shared/messaging';
import {
    AsyncPersistor, IndirectionDictionary, IndirectionSaveDao, IndirectionIdDao, SaveZoneDao, SaveByIdDao, SavePosDao, SaveByIdFullDao, SaveByIdVarDao, BulkSaveResult
} from "./persistor";

import { AdminDispatcher } from "./admin";
import { ZoneDao, Zone, RelZoneDao } from "./shared/zone";

export class TransactionManager {
    // TODO (1) : TransactionManager : memory reads watcher ?
}

// Add dummy values to let the compiler detect signature difference between rel and abs
export class AbsEntityIdentifier extends EntityIdentifier {
    isAbsolute = true
}

export class AbsAgentIdentifier extends AgentIdentifier {
    isAbsolute = true
}

export interface FurnitureIdAbsDao extends EntityOptions {
    gId: AbsEntityIdentifier
}

export interface AgentIdAbsDao extends AgentOptions {
    gId: AbsEntityIdentifier
}

export interface ZoneAbsDao extends ZoneDao {

    //    actorId: string // FIXME (1) : Mongo dependent
    originX: number
    originY: number
}

export abstract class AbsEntity extends EntityBase {
    gId: AbsEntityIdentifier
}

export class AbsFurniture extends Furniture {
    gId: AbsEntityIdentifier
}

export class AbsAgent extends Agent {
    gId: AbsAgentIdentifier
}

export class AbsZone extends Zone {

    actor: AbsAgent

    toRelativeDao(absToRel: IndirectionDictionary): RelZoneDao {

        let relFurnitures: FurnitureIdDao[] = [];
        let relAgents: AgentIdOptions[] = [];
        let relCells: CellDao[] = [];

        let absActor = this.actor.clone(); // ~ clone actor, as he will be modified by self observation
        let absActorSgid = absActor.gId.toIdString();

        for (let furniture of this.furniturePool.values()) {
            let absId = furniture.gId.toIdString();
            let relIdDao = absToRel[absId];
            if (!relIdDao) { throw 'absZoneToRelZoneDao > No indirection for furniture ' + absId }
            furniture.asRelativeEntity(absActor, relIdDao.indId);
            relFurnitures.push(furniture.toIdDao());
        }

        for (let agent of this.agentPool.values()) {
            let absId = agent.gId.toIdString();
            let relIdDao = absToRel[absId];
            if (!relIdDao) { throw 'absZoneToRelZoneDao > No indirection for agent ' + absId }
            agent.asRelativeEntity(absActor, relIdDao.indId);
            relAgents.push(agent.toIdDao());
        }

        for (let cell of this.cellPool.values()) {
            cell.asRelativeEntity(absActor);
            relCells.push(cell.toDao());
        }

        let relActor = absToRel[absActorSgid];
        if (!relActor) { throw 'absZoneToRelZoneDao > No indirection for actor ' + absActorSgid }

        let relZoneDao: RelZoneDao = {
            actorGId: new IndirectEntityIdentifier(relActor.indId),
            snapshotDH: this.snapshotDH,
            originX: 0,
            originY: 0,
            furnitures: relFurnitures,
            agents: relAgents,
            cells: relCells
        }

        return relZoneDao;
    }

    getIndirectionsSaveDao(userIId: UserItemIdentifier): IndirectionSaveDao[] {
        let absIdentifiers: IndirectionSaveDao[] = [];

        // TODO (2) : for [furniturePool, agentPool]

        for (let furniture of this.furniturePool.values()) {
            let absId = furniture.gId;
            absIdentifiers.push({
                uId: userIId,
                oId: this.actor.gId.iId,
                tCId: absId.cId,
                tIId: absId.iId
            });
        }

        for (let agent of this.agentPool.values()) {
            let absId = agent.gId;
            absIdentifiers.push({
                uId: userIId,
                oId: this.actor.gId.iId,
                tCId: absId.cId,
                tIId: absId.iId
            });

        }
        return absIdentifiers;

    }

    toSaveDao(): SaveZoneDao {

        let saveDao: SaveZoneDao = { isSaveZoneDao: true };

        let agents: SaveByIdDao[] = [];
        let furnitures: SaveByIdDao[] = [];
        let cells: SavePosDao[] = [];

        // TODO (2) : for [furniturePool, agentPool ...]
        let entityPool: Map<string, EntityInterface> = this.furniturePool; // { [index: string]: EntityInterface }
        let daoPool = furnitures;

        for (let entity of entityPool.values()) {
            if (entity.varModified) {
                daoPool.push(<SaveByIdVarDao>{
                    iId: entity.gId.iId,
                    varAttr: entity.toVarDao()
                });
            }
            else if (entity.fullModified) {
                daoPool.push(<SaveByIdFullDao>{
                    iId: entity.gId.iId,
                    full: entity.toDao()
                });
            }
            else {
                // dbg.log('Skip unmodified furniture ' + entity);
            }
        }

        entityPool = this.agentPool;
        daoPool = agents;

        for (let entity of entityPool.values()) {
            if (entity.varModified) {
                daoPool.push(<SaveByIdVarDao>{
                    iId: entity.gId.iId,
                    varAttr: entity.toVarDao()
                });
            }
            else if (entity.fullModified) {
                daoPool.push(<SaveByIdFullDao>{
                    iId: entity.gId.iId,
                    full: entity.toDao()
                });
            }
            else {
                // dbg.log('Skip unmodified agent ' + entity);
            }
        }

        if (agents.length) {
            saveDao.agents = agents;
        }
        if (furnitures.length) {
            saveDao.furnitures = furnitures;
        }

        for (let cell of this.cellPool.values()) {
            if (cell.fullModified) {
                dbg.log('Store modified cell ' + cell);
                cells.push(<SavePosDao>{
                    absPosX: cell.posX,
                    absPosY: cell.posY,
                    gist: cell.toDao()
                });
            }
            else {
                // dbg.log('toSaveDao > Skip unmodified cell ' + cell);
            }
        }

        if (cells.length) {
            saveDao.cells = cells;
        }

        return saveDao;
    }
}


// Dictionary [index: actor.IndirectionId] : AgentIdAbsDao
export interface PilotedRelToAbsDictionary {
    [index: string]: AgentIdAbsDao | undefined
}

interface YenahUserOptions extends UserOptions {
    name: string
    iId: UserItemIdentifier
}

// Protects server from user by creating an indirection "number id to Target" : only number are allowed from client
// Avoid the user to know the real identity or position of game entities
export class YeanhUserSession extends UserSession {

    userOptions: YenahUserOptions

    transId2ItemId: AgentItemIdentifier[] | undefined                // [index: TransientIdentifier]: ItemIdentifier
    // itemId2TransId: { [index: string]: TransientIdentifier }    // [index: ItemIdentifier]: TransientIdentifier
    pilotedRelToAbs: PilotedRelToAbsDictionary | undefined

    constructor(userOptions: YenahUserOptions) {
        super(userOptions);
        // this.userOptions = userOptions;
    }

    // ! modifies and return original list !
    pilotableAbsToTransient(absPilotableList: PilotableAbsIdDao[]): PilotableTransientIdDao[] {

        this.transId2ItemId = []; // TODO (1) : delete transient list (on session expiration ? on user disconnect ? on timeout ? )
        // this.itemId2TransId = {};

        for (let i = 0; i < absPilotableList.length; i++) {
            let item = absPilotableList[i];
            //  this.itemId2TransId[item.agentIId] = i;
            this.transId2ItemId[i] = item.agentIId;

            // PilotableDao => TransientDaoAsPilotable (agentIId: AbsAgentIdentifier => tId)
            delete item.agentIId;
            (<PilotableTransientIdDao><any>item).transId = i;
        }

        return <PilotableTransientIdDao[]><any>absPilotableList;
    }

    pilotableTransientToAbs(itemIds: TransientIdentifier[]) {

        if (!this.transId2ItemId) {
            // TODO (1) : monitor : client did not cache pilotable
            dbg.error('pilotableTransientToAbs > pilotable not cached');
            throw <s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.ServerError }; // TODO (0) : ServerErrorMessage
        }

        let items: AgentItemIdentifier[] = [];

        for (let itemId of itemIds) {

            if (typeof itemId !== 'number') {

                dbg.error('pilotableTransientToAbs > Invalid client request');
                // TODO (1) : monitor : client sent not a number
                throw <s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.ServerError };
            }
            if (this.transId2ItemId[itemId] !== undefined) {
                items.push(this.transId2ItemId[itemId]);
            }
            else {
                dbg.error('pilotableTransientToAbs > Unknown itemId: ' + itemId);
                throw <s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.ServerError };
            }
        }

        return items;
    }

    cachePilotedCorrelationTable(relToAbs: PilotedRelToAbsDictionary) {

        // FIXME (1) : (REF:MOD) One should not modifiy dic, or clone in cachePilotedCorrelationTable
        dbg.log('cachePilotedCorrelationTable > ');
        this.pilotedRelToAbs = relToAbs;
    }

    getActorAbsIdentifierFromRelId(relPilotedId: IndirectionItemIdentifier): AbsAgentIdentifier {

        if (!this.pilotedRelToAbs) {
            dbg.error('getActorItemIdentifierFromRelId > piloted not cached');
            throw <s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.ServerError };
        }

        let actorDao = this.pilotedRelToAbs[relPilotedId];

        if (!actorDao) {
            dbg.error('getActorItemIdentifierFromRelId > piloted not found from relId:' + relPilotedId);
            throw <s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.ServerError };
        }

        return actorDao.gId;
    }
}

// TODO (0) : obsolete, use another test database
export class TestUser extends YeanhUserSession {

    send(msg: s2c_ChannelMessage) {
        dbg.log('TestUser.send > ');

        dbg.log(msg);

        dbg.log(' <<< Simulation ok  >>> ');
    }

}

export class ServerEngine extends Dispatcher {

    // protected db: AsyncPersistor
    // TODO (1) : admin only on conditional compiling ? option ?
    protected adminDispatcher: AdminDispatcher = new AdminDispatcher(this);

    createSession(userOptions: YenahUserOptions): YeanhUserSession {

        let wsu: YeanhUserSession | undefined;

        do {
            wsu = new YeanhUserSession(userOptions);
            dbg.log('YenahServer.createSession > ' + wsu.sessionId);

            if (this.userSessions[wsu.sessionId]) {
                wsu = undefined;
            }
        }
        while (wsu === undefined)

        this.userSessions[wsu.sessionId] = wsu;

        return wsu;
    }

    dispatchWsCommand(cmd: c2s_ChannelMessage, user: YeanhUserSession): void {

        if (cmd.type === MessageType.Zone) {

            this.sendZoneGist((<ZoneRequest>cmd).actorId, user);
        }
        else if (cmd.type === MessageType.Action) {

            this.performAction(<ActionRequest>cmd, user);
        }
        else if (cmd.type === MessageType.ReqPilot) {

            this.pilotRequest(<PilotRequest>cmd, user);
        }
        else if (cmd.type === MessageType.SetPilot) {

            this.setPilot(<SetPilotRequest>cmd, user);
        }
        else if (cmd.type === MessageType.Admin) {
            // TODO (0) : if (user.isAdministrator) ... // access management : user or global ? 
            this.adminDispatcher.dispatchWsAdminCommand(<AdminRequest>cmd, user);
        }
        else {
            console.error('dispatchWsCommand > Unknown type ' + cmd.type);
            user.send(ErrMsg.UnkownCommand);
        }
    }

    // TODO (1) AbsToRel for furnitures too ?
    // FIXME (1) : (REF:MOD) One should not modifiy absDao, or clone in cachePilotedCorrelationTable
    absDaoToRelDao(indirectionId: IndirectionItemIdentifier, absDao: AgentIdAbsDao): AgentIdRelOptions {

        // ~ clone + absToRel : force cast from AgentDao to AgentIdRelDao and then set indId
        let relDao: AgentIdRelOptions = <AgentIdRelOptions>World.AgentFactory(absDao).toDao();
        relDao.indId = indirectionId;

        return relDao;
    }

    sendPilotedRelList(user: YeanhUserSession) {

        dbg.log(" ---- piloted sequence start  ----");

        this.db.getPilotedRelToAbsDictionary(user.userOptions.iId)
            .then((pilotedDic: PilotedRelToAbsDictionary) => {

                user.cachePilotedCorrelationTable(pilotedDic);

                let pilotedRelList: AgentIdRelOptions[] = [];

                // FIXME (1) : (REF:MOD) One should not modifiy dic entries, or clone in cachePilotedCorrelationTable

                for (let indId in pilotedDic) {
                    let absActor = pilotedDic[indId];
                    if (absActor) {
                        // let relActor = this.absDaoToRelDao(new IndirectionItemIdentifier(indId), absActor);
                        let relActor = this.absDaoToRelDao(indId, absActor);
                        pilotedRelList.push(relActor);
                    }
                    else {
                        throw 'piloted not found in indirection table';
                    }
                }

                dbg.log(" ---- piloted sequence done  ----");
                let ack: PilotAck = { type: MessageType.ReqPilot, piloted: pilotedRelList };
                user.send(ack);
            })
            .catch((e) => {
                console.error(e);
                dbg.log(" ---- piloted sequence failed  ----");
                user.send(e); // TODO (1) : type error i18n
            });

    }

    pilotRequest(pilotRequest: PilotRequest, user: YeanhUserSession) {

        if (pilotRequest.pilotable) {

            dbg.log(" ---- pilotable sequence start  ----");

            let pilotableFilter = monitor.checkFilter(pilotRequest.pilotable);

            this.db.getPilotable(pilotableFilter)
                .then((absPilotableList: PilotableAbsIdDao[]) => {


                    // FIXME (1) : as we prune for already piloted, there may be less pilotable than required => loop till wanted count
                    // FIXME (1) : pilotable may not be stable => load and stabilize()
                    // TODO (1) : project id db or filter attributes for "pilotable view" 

                    // convert abs _id to reliId 
                    let transPilotableList = user.pilotableAbsToTransient(absPilotableList)

                    // dbg.log(JSON.stringify(transPilotableList));
                    dbg.log(' ---- pilotable sequence done ' + transPilotableList.length + ' ----');
                    // let ack: PilotableAck = { type: MessageType.Pilotable, pilotable: agentGistArray };
                    let ack: PilotAck = { type: MessageType.ReqPilot, pilotable: transPilotableList };
                    user.send(ack);
                })
                .catch((e) => {
                    dbg.error(e);
                    dbg.log(" ---- pilotable sequence failed  ----");
                    user.send(e); // TODO (1) : type error i18n
                });
        }

        if (pilotRequest.piloted) {

            this.sendPilotedRelList(user);
        }
    }

    setPilot(setPilotMsg: SetPilotRequest, user: YeanhUserSession) {
        dbg.log(" ---- setPilot sequence start  ----");

        // TODO (0) : monitor/fink check lists to be only valid hex strings

        if (setPilotMsg.pilotableToSet && setPilotMsg.pilotableToSet.length) {

            // validity check for agentList and conversion to server abs ids
            let pilotedAbsList = user.pilotableTransientToAbs(setPilotMsg.pilotableToSet);

            this.db.setPilot(user.userOptions.iId, pilotedAbsList).then((res) => {
                dbg.log('result ok: ' + res.ok + ' nInserted:' + res.nInserted + ' nModified:' + res.nModified);

                if (res.ok) { // (res.modifiedCount === setPilotMsg.agentList.length) {

                    let ack: SetPilotAck = { type: MessageType.SetPilot, pilotableToSet: setPilotMsg.pilotableToSet };
                    user.send(ack);
                }
                else {
                    dbg.error('setPilotable > failed ' + ' req:' + setPilotMsg.pilotableToSet + ' mod:' + res.nModified);
                    dbg.log(setPilotMsg);
                    dbg.log(res);
                    user.send(ErrMsg.DatabaseError);
                }
            }).catch((e) => {
                dbg.error(e);
                dbg.log(" ---- setPilotable sequence failed  ----");
                user.send(e); // TODO(1) : type error i18n
            })
        }

        if (setPilotMsg.pilotedToUnset && setPilotMsg.pilotedToUnset.length) {

            let modificationCount = setPilotMsg.pilotedToUnset.length;

            this.db.unsetPiloted(user.userOptions.iId, setPilotMsg.pilotedToUnset).then((res) => {
                dbg.log('result ok: ' + res.result.ok + ' nModified:' + res.modifiedCount);

                if (res.result.ok && modificationCount === res.modifiedCount) {

                    let ack: SetPilotAck = { type: MessageType.SetPilot, pilotedToUnset: setPilotMsg.pilotedToUnset };
                    user.send(ack);
                }
                else {
                    dbg.error('unsetPiloted > failed ' + ' req:' + setPilotMsg.pilotedToUnset + ' done:' + res.modifiedCount);
                    dbg.log(setPilotMsg);
                    dbg.log(res);
                    user.send(ErrMsg.DatabaseError);
                }
            }).catch((e) => {
                dbg.error(e);
                dbg.log(" ---- unsetPiloted sequence failed  ----");
                user.send(e); // TODO(1) : type error i18n
            })
        }
    }

    preloadZone(actorIndirectId: IndirectionItemIdentifier, wsSession: YeanhUserSession): Promise<AbsZone> {

        let viewradius = Constants.MAX_VISION_RADIUS;
        let actorGid = wsSession.getActorAbsIdentifierFromRelId(actorIndirectId);
        // We do not use the cached piloted dao, as actor dao may have changed (moveact, death, ...)
        // TODO (0) : death management ; here  (dao -> actor + check) ? in pilotable ? in getZone. Stabilise before sending ?
        // option "fantôme" => risque de remplir la base
        // option remplacement => risque de collisions

        return new Promise<AbsZone>((resolve, reject) => {

            let snapshotDH = this.db.getNow();

            this.db.getActorPosition(actorGid.iId)
                .then((actorPosition) => {
                    dbg.log('preloadZone > actorIndirectId: ' + actorIndirectId + ' x:' + actorPosition.originX + ' y: ' + actorPosition.originY, LoggerParts.Filename);
                    return this.db.getZoneFromLocation(actorPosition.originX, actorPosition.originY, viewradius, actorGid, snapshotDH);
                })
                .then((azDao) => {
                    let az = new AbsZone(azDao);
                    resolve(az);
                })
                .catch((e) => {
                    dbg.error(e);
                    reject(e)
                }) // catch by upper level
        })
    }

    sendZoneGist(actorIndirectId: IndirectionItemIdentifier, user: YeanhUserSession) {

        let absZone: AbsZone;
        let indirectionsAbsDic: IndirectionDictionary;

        // TODO (1) : zone request cache : { center, radius, dh }
        // TODO (1) : memorised zones cache ?

        this.preloadZone(actorIndirectId, user)
            .then((az) => {
                absZone = az;
                dbg.log('send zone x:' + absZone.originX + ' y:' + absZone.originY
                    + ' ax:' + absZone.actor.posX + ' ay:' + absZone.actor.posY
                    + ' th:' + absZone.actor.theta, LoggerParts.Filename);

                // TODO (0) : stabilize Zone (eg. apply states)  ?
                // TODO (1) : "Recovery style" https://developers.google.com/web/fundamentals/getting-started/primers/promises
                // return checkZoneStability() reject -> save ?
                if (!absZone.isStableUpTo(absZone.snapshotDH)) {
                    absZone.stabiliseAt(absZone.snapshotDH);
                    return this.db.saveZoneDao(absZone.toSaveDao());
                } else {
                    return new Promise<BulkSaveResult[]>((resolve) => { resolve([]) });
                }
            })
            .then((result) => {

                dbg.log('STEP SAVING : ' + result);

                return this.db.memoriseIndirections(absZone.getIndirectionsSaveDao(user.userOptions.iId));
            })
            .then((result) => {

                if (!result.ok) {
                    throw 'persistor error'; // TODO (0): log, i18n
                }

                // TODO (3) : Transactions
                // TODO (3) : $lookup (aggregation) + unwind, or use SQL DB ? ~ JOIN indirections.relId = agents.iId ... 
                // TODO (1) : recall(cmd.actorId, absIdentifiers) ;
                return this.db.recallObserverIndirections(absZone.actor.gId)
            })
            .then((indirections: IndirectionIdDao[]) => {

                indirectionsAbsDic = AsyncPersistor.indirectionsListToAbsDictionary(indirections);

                if (!indirectionsAbsDic[absZone.actor.gId.toIdString()]) {
                    throw 'getZoneGist > actor not found from rel actorId ' + absZone.actor.gId.toIdString();
                }

                dbg.log('sendZoneGist for actor ' + absZone.actor.name + ' now:' + absZone.actor.updateDH, LoggerParts.Filename);

                return absZone.toRelativeDao(indirectionsAbsDic);
            })
            .then((relZoneGist: RelZoneDao) => {

                let ack: ZoneAck = { type: MessageType.Zone, zoneGist: relZoneGist };
                user.send(ack);
            })
            .catch((e) => {
                dbg.error(e);
                if (e.type) {
                    user.send(e);
                }
                else {
                    // TODO (1) : type error, i18n
                    user.send(ErrMsg.ServerError);
                    dbg.warn('No error type for ' + e);
                }
            });
    }

    performAction(cmd: ActionRequest, user: YeanhUserSession) {

        dbg.log('ServerEngine.performAction > ' + cmd.actId + ' (' + ActId[cmd.actId] + ')');

        let absZone: AbsZone;
        let indirectionsRelDic: IndirectionDictionary;

        // TODO (1) : zone request cache : { center, radius, dh }
        // TODO (1) : memorised zones cache ?

        this.preloadZone(cmd.actorId, user)
            .then((az) => {
                absZone = az;
                dbg.log('perform on zone x:' + absZone.originX + ' y:' + absZone.originY
                    + ' ax:' + absZone.actor.posX + ' ay:' + absZone.actor.posY
                    + ' th:' + absZone.actor.theta, LoggerParts.Filename);

                // TODO (3) : Transactions
                return this.db.recallObserverIndirections(absZone.actor.gId)
            })
            .then((indirections: IndirectionIdDao[]) => {

                indirectionsRelDic = AsyncPersistor.indirectionsListToRelDictionary(indirections);

                if (!indirectionsRelDic[cmd.actorId]) {
                    throw 'performAction > actor not found from rel actorId ' + cmd.actorId;
                }

                // TODO (1)  : remove, this check should be useless, and we do not check updateDH for each item in zone because of "4D collision detection"
                // and push
                if (cmd.expectedActorDH !== absZone.actor.updateDH) {
                    throw 'CoreAction > unsync : updateDH expected: ' + cmd.expectedActorDH + ' current:' + absZone.actor.updateDH;
                }

                absZone.stabiliseAt(absZone.snapshotDH);

                // Get action target
                let target: Target;

                if (cmd.targetCellSelector !== undefined) {

                    target = absZone.getCellFromRelPos(
                        cmd.targetCellSelector.x,
                        cmd.targetCellSelector.y
                    );
                }
                else if (cmd.targetEntityId) {
                    let targetIndirection = indirectionsRelDic[cmd.targetEntityId];
                    if (targetIndirection) {
                        target = absZone.getEntity(targetIndirection.tCId, targetIndirection.tIId);
                    }
                    else {
                        throw 'Invalid target identifier : target not found ' + cmd.targetEntityId;
                    }
                }
                else {
                    throw 'Invalid target identifier : no target in ' + JSON.stringify(cmd);
                }

                let action: CoreAction = World.ActionFactory(cmd.actId, absZone, target);

                let actCtx: ActionReport = action.check(new ActionReport());
                if (actCtx.fails.length) {
                    console.error(actCtx);
                    throw (ErrMsg.ServerError); // TODO (0) : ErrMsg.ZoneChanged ? InvalidAction ? (should have been avoided on client side !)
                }
                else {
                    actCtx = action.doAction(new ActionReport());
                    dbg.log(actCtx);

                    // TODO (0) : death management is done after each atomic action ? or on read ?
                    if (!absZone.isStableUpTo(absZone.snapshotDH)) {
                        dbg.log('TODO death management');
                        absZone.stabiliseAt(absZone.snapshotDH);
                    }

                    return this.db.saveZoneDao(absZone.toSaveDao());

                    // TODO (1) : report, souvenirs
                }
            })
            .then((writeResults) => {
                // TODO (1) : check write ok
                dbg.log('writeResults', LoggerParts.Filename);
                dbg.log(writeResults, LoggerParts.Filename);

                // TODO (2) : common to getZoneGist
                // return db.getZoneDao(absActorIdentifier);


                this.sendZoneGist(cmd.actorId, user);
            })
            /*   .then((zoneDao: AbsZoneDao) => {
   
                   let absZone = new AbsZone(zoneDao);
   
                   return db.absZoneToRelZoneDao(absZone, user.iId, souvenirsAbsDic);
               })
               .then((relZoneGist: RelZoneDao) => {
   
                   let ack: ZoneAck = { type: MessageType.Zone, zoneGist: relZoneGist };
                   user.send(ack);
               }) */
            .catch((e) => {

                //db.transactionEnd();
                dbg.error(e);
                user.send(ErrMsg.ServerError); // TODO (1) : detailed type error, i18n
            });
    }
}

// TODO (1) : put check monitor in shared file messaging for client side filter pre-checks ?

class EngineMonitor {

    toRangedInteger(value: any) {

        if (typeof value === "number" &&
            isFinite(value) &&
            Math.floor(value) === value &&
            value > 0 &&
            value <= AsyncPersistor.MAX_FILTER_LIMIT) {
            return value;
        }
        else {
            //  TODO (1) : monitor.log( input failed );
            return AsyncPersistor.DEFAULT_FILTER_LIMIT;
        }
    }

    checkFilter(inFilter: any): QueryFilter {

        let filter: QueryFilter = {
            limit: this.toRangedInteger(inFilter.limit)
        }
        return filter;
    }
}


export var monitor = new EngineMonitor();

