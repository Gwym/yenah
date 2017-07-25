import { MessageType, ToStringId, c2s_ChannelMessage, s2c_ChannelMessage } from '../../services/shared/messaging'
import { 
    ActId, CellIdentifier, IndirectionItemIdentifier, AgentOptions, RelZoneDao, 
    AgentIdRelOptions, PilotableTransientIdDao, TransientIdentifier 
} from './concept'

export interface PilotRequest extends c2s_ChannelMessage {
    type: MessageType.ReqPilot
    piloted?: QueryFilter
    pilotable?: QueryFilter
}

export interface PilotAck extends s2c_ChannelMessage {
    type: MessageType.ReqPilot
    piloted?: AgentIdRelOptions[]
    pilotable?: PilotableTransientIdDao[]
}

export interface SetPilotRequest extends c2s_ChannelMessage {
    type: MessageType.SetPilot
    pilotableToSet?: TransientIdentifier[]
    pilotedToUnset?: IndirectionItemIdentifier[]
}

export interface SetPilotAck extends SetPilotRequest { } // ack signature === req signature

export interface ZoneRequest extends c2s_ChannelMessage {
    type: MessageType.Zone
    actorId: IndirectionItemIdentifier
}

export interface ZoneAck extends s2c_ChannelMessage {
    type: MessageType.Zone
    zoneGist: RelZoneDao
}

export interface ActionRequest extends c2s_ChannelMessage {
    type: MessageType.Action
    actId: ActId
    actorId: IndirectionItemIdentifier
    targetEntityId?: IndirectionItemIdentifier
    targetCellSelector?: { x: number, y: number }  // position relative to actor
    expectedActorDH: number
}

export enum AdminActId { Information, CreateUser, DeleteUsers, ResetWorld, UnitTests, IntegrationTests }

export interface AdminRequest extends c2s_ChannelMessage {
    type: MessageType.Admin
    adminActId: AdminActId
}

export interface AdminInformations extends s2c_ChannelMessage {
    tracks: number
    sessions: number
    users: number
    indirections: number
    agents: number
    furnitures: number
    cells: number
}

export interface QueryFilter {
    limit: number,
    filter?: {
        // TODO (2) : filters
    }
}

export function checkPasswordStrenght(pwd: string) {
    // at least six characters, containing one number, one lowercase and one uppercase letter
    var re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    return re.test(pwd);
}

