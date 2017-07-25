
// TODO (5) : shared configuration file 
export const websocketProtocolVersion = 'yh1';
export const XJsonUrl = '/req?json=';
export const cookieExpiration = 86400000; // 1 day * 24h * 60min * 60s * 1000ms*/

export interface UserOptions {
  name: string
}

export enum MessageType {
  Error, Registration, Login, SessionCheck, User, ReqPilot, SetPilot, Zone, Action, Admin // TODO (0) : enum extends ??
}
export enum ToStringId {
  UnkownCommand, ServerError, DatabaseError, SessionError, LoginError,
  InvalidCaptcha, InvalidCode, InvalidMail, DuplicateName
  // RequestFailed, Disconnected, UserNotFound
}

export interface c2s_ChannelMessage {
  type: MessageType
}

export interface s2c_ChannelMessage {
  type: MessageType
  // toStringId?: ToStringId
}

export interface ErrorMessage extends s2c_ChannelMessage {
  type: MessageType.Error
  toStringId: ToStringId
}

export const ErrMsg = {  // : { [index: string]: ErrorMessage } // TODO (0) ErrMsg() ?
  UnkownCommand: { type: MessageType.Error, toStringId: ToStringId.UnkownCommand },
  ServerError: { type: MessageType.Error, toStringId: ToStringId.ServerError },
  DatabaseError: { type: MessageType.Error, toStringId: ToStringId.DatabaseError },
  SessionError: { type: MessageType.Error, toStringId: ToStringId.SessionError },
  LoginError: { type: MessageType.Error, toStringId: ToStringId.LoginError },
  InvalidCaptcha: { type: MessageType.Error, toStringId: ToStringId.InvalidCaptcha },
  InvalidCode: { type: MessageType.Error, toStringId: ToStringId.InvalidCode },
  InvalidMail: { type: MessageType.Error, toStringId: ToStringId.InvalidMail },
  DuplicateName: { type: MessageType.Error, toStringId: ToStringId.DuplicateName }
}

/*

export var ServerErrorMessage: ErrorMessage = {
  type: MessageType.Error,
  toStringId: ToStringId.ServerError
}

export var  */


export interface SessionCheckRequest extends c2s_ChannelMessage {
  type: MessageType.SessionCheck
  sessionId: string
  doClose: boolean
}

export interface UserSessionAck extends s2c_ChannelMessage {
  type: MessageType.User
  userOptions: UserOptions
  sessionId?: string
  closed?: boolean
}

export interface XRegistrationRequest extends c2s_ChannelMessage {
  type: MessageType.Registration
  name: string
  mail: string
  password: string
  date: Date
  response: string // CAPTCHA response
}

export interface XLoginRequest extends c2s_ChannelMessage {
  type: MessageType.Login
  login: string
  password: string
}
