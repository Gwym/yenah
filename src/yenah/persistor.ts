
import {
    ItemIdentifier, UserItemIdentifier, AgentItemIdentifier, IndirectionItemIdentifier, EntityIdentifier, EntityOptions, AgentOptions, CellDao, EntityVarOptions,
    CollectionId, PilotableAbsIdDao, SpaceRef
} from './shared/concept';
import { AbsEntityIdentifier, PilotedRelToAbsDictionary, YeanhUserSession, ZoneAbsDao } from './engine'

import { UpdateWriteOpResult, InsertWriteOpResult, BulkWriteResult } from 'mongodb'; // TODO (5) : generic result
import { XLoginRequest, XRegistrationRequest, UserSessionAck, QueryFilter } from '../services/shared/messaging'
import { UserAsyncManager } from "../services/dispatcher";

export interface IndirectionSaveDao /* ~ extends AbsIdentifier */ {
    uId: UserItemIdentifier // user (pilot) absolute iid
    oId: AgentItemIdentifier // observer's absolute iid (AgentIid)
    tCId: CollectionId // target absolute collection  Id
    tIId: ItemIdentifier // target absolute iid
    // piloted ~ pseudo index field, optimisation to avoid query like "find(d.oId === d.tIId)" that would use mongo's javascript
    piloted?: boolean
    // updateDH: number // TODO (2) : auto delete souvenirs after X time or creature's mind responsability ?
}

export interface IndirectionIdDao extends IndirectionSaveDao {
    indId: IndirectionItemIdentifier // IndirectionIdentifier //_id: ItemIdentifier // Mongo.ObjectID.toHex, target relative iid
}

export interface IndirectionDictionary { // "auto" dictionary : AbsIdentifier.toIdString() => AbsIdentifier
    [index: string]: IndirectionIdDao | undefined
}

export interface SaveByIdDao { // ~ abstract interface, full and varAttr are mutualy exclusive
    iId: ItemIdentifier
    full?: EntityOptions
    varAttr?: EntityVarOptions
}

export interface SaveByIdFullDao extends SaveByIdDao {
    full: EntityOptions
    varAttr: undefined
}

export interface SaveByIdVarDao extends SaveByIdDao {
    full: undefined
    varAttr: EntityVarOptions
}

export interface SavePosDao {
    absPosX: number,
    absPosY: number,
    gist: CellDao
}

export interface InsertZoneDao {
    agents?: AgentOptions[]
    furnitures?: EntityOptions[]
    cells?: CellDao[]
}

export interface SaveZoneDao {
    isSaveZoneDao: true // dummy value to let the compiler detect difference between {} and SaveZoneDao as all properties are optional
    agents?: SaveByIdDao[]
    furnitures?: SaveByIdDao[]
    cells?: SavePosDao[]
}

export interface UpdateResult extends UpdateWriteOpResult { }
export interface InsertResult extends InsertWriteOpResult { }
export interface BulkSaveResult extends BulkWriteResult { }

export interface UserDao {
    iId: UserItemIdentifier
    name: string
}

/*
export interface AsyncPersistorInterface extends UserAsyncManager {

}
*/

export abstract class AsyncPersistorYenah implements UserAsyncManager {

    static MAX_FILTER_LIMIT = 100 // FIXME (5) : MongoDb dependent  
    static DEFAULT_FILTER_LIMIT = 10 // TODO (5) check if DEFAULT_FILTER_LIMIT <= MAX_FILTER_LIMIT

    abstract getDummyIdentifier(seed?: number): UserItemIdentifier // get fake identifier for tests
    abstract insertTrack(track: any): void

    abstract getUserFromLogin(cmd: XLoginRequest): Promise<UserDao>
    abstract createUser(userReg: XRegistrationRequest): Promise<UserSessionAck>
// #IFDEF PERSISTOR_SESSIONS
//    abstract generateSessionId(userAbsIId: UserItemIdentifier): Promise<string>
//    abstract getUserFromSession(sessionId: string): Promise<UserDao> 
// #ENDIFDEF PERSISTOR_SESSIONS

    abstract getNow(): number
    // abstract getPiloted(pilotId: ItemIdentifier): Promise<AgentIdDao[]>
    abstract getPilotedRelToAbsDictionary(userAbsIId: UserItemIdentifier): Promise<PilotedRelToAbsDictionary>
    abstract getPilotable(filter: QueryFilter): Promise<PilotableAbsIdDao[]>
    abstract setPilot(userAbsIId: UserItemIdentifier, agentList: AgentItemIdentifier[]): Promise<BulkSaveResult>
    abstract unsetPiloted(userAbsIId: UserItemIdentifier, unsetPilotedRelList: IndirectionItemIdentifier[]): Promise<UpdateResult>
    abstract memoriseIndirections(absIdentifiers: IndirectionSaveDao[]): Promise<BulkSaveResult>
    abstract recallObserverIndirections(observerAbsId: AbsEntityIdentifier, relIdentifiers?: IndirectionItemIdentifier[]): Promise<IndirectionIdDao[]>
    // abstract recallPilotedIndirections(userAbsIId: ItemIdentifier): Promise<IndirectionIdDao[]>
    // abstract getZoneDao(actorSelector: AbsIdentifier): Promise<AbsZoneDao>
    abstract getActorPosition(actorIid: AgentItemIdentifier): Promise<SpaceRef>
    abstract getZoneFromLocation(originX: number, originY: number, radius: number, actorId: AbsEntityIdentifier, snapshotDH: number): Promise<ZoneAbsDao>
    abstract saveZoneDao(saveDao: SaveZoneDao): Promise<BulkSaveResult[]>
    abstract populate(data: InsertZoneDao): Promise<InsertResult[]>

    abstract adminDropCollections(collectionsToDrop: CollectionId[]): void
    abstract adminGetInformation(user: YeanhUserSession): void
    abstract adminCreateUserInvitation(user: YeanhUserSession): void

    static indirectionsListToRelDictionary(list: IndirectionIdDao[]): IndirectionDictionary {

        let dic: IndirectionDictionary = {};

        for (let indirection of list) {
            dic[indirection.indId] = indirection;
        }

        return dic;
    }

    static indirectionsListToAbsDictionary(list: IndirectionIdDao[]): IndirectionDictionary {

        let dic: IndirectionDictionary = {};
        let idStr: string;

        for (let indirection of list) {

            idStr = new EntityIdentifier(indirection.tCId, indirection.tIId.toString()).toIdString(); // TODO (3) : constructor (cid, Inditem ?)
            dic[idStr] = indirection;
        }

        return dic;
    }
}


// export class MemoryPersistor implements Persistor {    } // TODO (1) :  extends SyncPersistor for  simulator ?