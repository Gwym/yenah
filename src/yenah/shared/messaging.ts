// TODO (4) : manage MTU ? (http://bousk.developpez.com/traductions/gafferongames/construire-son-protocole-jeu-reseau/fragmentation-reassemblage-paquets/)

import { c2s_ChannelMessage, s2c_ChannelMessage, QueryFilter } from '../../services/shared/messaging'
import { 
    ActId, IndirectionItemIdentifier, 
    AgentIdRelOptions, PilotableTransientIdDao, TransientIdentifier 
} from './concept'
import { RelZoneDao } from "./zone";

export enum MessageTypeYenah  {
    first = 7, // MessageType._last, // keep at last position ~ enum extends
    ReqPilot, SetPilot, Zone, Action
}

export interface PilotRequest extends c2s_ChannelMessage {
    type: MessageTypeYenah.ReqPilot
    piloted?: QueryFilter
    pilotable?: QueryFilter
}

export interface PilotAck extends s2c_ChannelMessage {
    type: MessageTypeYenah.ReqPilot
    piloted?: AgentIdRelOptions[]
    pilotable?: PilotableTransientIdDao[]
}

export interface SetPilotRequest extends c2s_ChannelMessage {
    type: MessageTypeYenah.SetPilot
    pilotableToSet?: TransientIdentifier[]
    pilotedToUnset?: IndirectionItemIdentifier[]
}

export interface SetPilotAck extends SetPilotRequest { } // ack signature === req signature

export interface ZoneRequest extends c2s_ChannelMessage {
    type: MessageTypeYenah.Zone
    actorId: IndirectionItemIdentifier
}

export interface ZoneAck extends s2c_ChannelMessage {
    type: MessageTypeYenah.Zone
    zoneGist: RelZoneDao
}

export interface ActionRequest extends c2s_ChannelMessage {
    type: MessageTypeYenah.Action
    actId: ActId
    actorId: IndirectionItemIdentifier
    targetEntityId?: IndirectionItemIdentifier
    targetCellSelector?: { x: number, y: number }  // position relative to actor
    expectedActorDH: number
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
/*
export enum AdminActId { Information, CreateUser, DeleteUsers, ResetWorld, UnitTests, IntegrationTests }

export interface AdminRequest extends c2s_ChannelMessage {
    type: MessageType.Admin
    adminActId: AdminActId
}


*/
/* export interface QueryFilter {
    limit: number,
    filter?: {
        // TODO (2) : filters
    }
}*/

