
interface ChannelOptions {
    wsUri?: string,
    protocol?: string,
    socket?: WebSocket,
    requireAuth?: boolean, // TODO (5) : deprecated
    confirmRedirection?: boolean
}

// class Channel : client-server interactions 
class Channel {

    socket: WebSocket

    constructor(options: ChannelOptions) {

        if (window.location.protocol === "file:") {
            ui.addInfo(i18n.detector.file_protocol, true, 10000);
            console.log('file:// => no socket');
            return;
        }

        if (options.socket) {
            this.socket = options.socket;
        } else {

            if (!options.wsUri) {
                options.wsUri = 'ws://localhost:8080/';
            }

            console.info('Channel > Connecting WebSocket to ' + options.wsUri);

            try {
                this.socket = new WebSocket(options.wsUri, options.protocol);
            }
            catch (e) {
                ui.addInfo(i18n.detector.websocket, true, 10000);
                console.error(e);
                return;
            }
        }

        this.socket.onmessage = (event) => { this.onChannelMessage(event) };
        this.socket.onopen = (event) => { this.onChannelOpen(event) };
        this.socket.onclose = (event) => { this.onChannelClose(event) };
        // TODO (2) : onerror ?
    }

    onChannelOpen(_event: Event) {

       // ui.setConnectedState('websocket_connected');
        ui.addInfo(i18n.websocket_connected);

        let sessionId = getUserSessionId();

        console.log('Channel.onOpen > sessionId ' + sessionId);

        if (sessionId) {
            //let req: SessionCheckRequest = { type: MessageType.SessionCheck, sessionId: sessionId };
            this.socket.send(sessionId); // at first time do not send a message, just a string
        }
        else {
            let confirmRedirection = true; // TODO (2) : DRY configuration
            redirect('index.html', ToStringId.SessionError, confirmRedirection);  // switchToScene(ui.loginScene); 
            throw 'no session id';
        }
    }

    onChannelClose(event: CloseEvent) {

        // TODO (5) : manage fail
        // if close on init => timouted retries ?
        // if close on server's demand, ok (invalid session)

        //if (!gracefully) {
        console.warn('Engine.onChannelClose > Channel closed ungracefully ' + performance.navigation.type);
        console.warn('close code:' + event.code);
        ui.addInfo(i18n.websocket_disconnected, true, 2000); // TODO (2) : ui.addCommand(<a href ... >, no timeout) or redirect + message ?
       /* if (window.performance && performance.navigation.type == 1) {
            console.log('==== page reloaded, skip logout ====' + performance.navigation.type);
        } */
    /*    else {
            setUserAuth(false);
            redirect('index.html', ToStringId.Disconnected, true);
        } */
        //}
    }

    onChannelMessage(event: MessageEvent) {

        ui.setConnectedState('message_received');

        // TODO (3) : binary message

        try {
            var o: s2c_ChannelMessage = JSON.parse(event.data);

            console.info('Channel.onSocketMessage > type:' + MessageType[o.type] + ' ' + event.data  );

            if (o.type === MessageType.Error) { 
                if ((<ErrorMessage>o).toStringId) {
                    console.info(i18n.x_messages[(<ErrorMessage>o).toStringId]);
                    ui.addInfo(i18n.x_messages[(<ErrorMessage>o).toStringId], true, 10000);
                }
                this.socket.close();
                return;
            }

            this.decode(o);
        } catch (e) {
            console.error(e);
            alert(i18n.x_messages[ToStringId.ServerError]);
        }
    }

    // filter messages from server, unwinding arrays to objects and objects to entity instances
    decode(m: s2c_ChannelMessage): void {

        ui.stopSplash();

        if (m.type === MessageTypeYenah.Zone) {
            G_engine.onZoneGist((<ZoneAck>m).zoneGist);
        }
        else if (m.type === MessageTypeYenah.ReqPilot) {

            console.log('ui.pendingScene 0 > ' + ui.pendingScene);
            let pilotMsg = <PilotAck>m;
            if (pilotMsg.piloted) {
                G_engine.onPilotedPool(pilotMsg.piloted);
            }
            if (pilotMsg.pilotable !== undefined) {		
                ui.beingsScene.refreshPilotable(pilotMsg.pilotable);
            }
            console.log('ui.pendingScene 1 > ' + ui.pendingScene);
        }
        else if (m.type === MessageType.User) {
            ui.setUser(<UserSessionAck>m);
            if (G_engine) { // if not in admin
                let pilotReq: PilotRequest = { type: MessageTypeYenah.ReqPilot,
                    piloted: { limit: 20 }
                    }; // on startup, send a piloted request // TODO : limit/filter
                this.send(pilotReq);
            }
        }
        else if (m.type === MessageTypeYenah.SetPilot) {
            console.log('setPilot ack');
            console.log(m);
            let pilotReq: PilotRequest = { type: MessageTypeYenah.ReqPilot,
                 piloted: { limit: 20 },
                 pilotable: { limit: 20 } 
                }; // on piloted change, send a piloted/pilotable request // TODO : limit/filter
            this.send(pilotReq);
        }
        else if (m.type === MessageType.Admin) {
            dispatchAdminAck(<AdminRequest>m); // AdminRequest ~ AdminAck
        }
        else {
            console.error('Unknown message type ' + m.type);
        }
    }

    send(m: c2s_ChannelMessage) {
        // TODO (1) : block sending or allow multiple messages ?
        console.log('Channel > send : ' + JSON.stringify(m));
        ui.setConnectedState('request_pending');
        this.socket.send(JSON.stringify(m));
    }
}

function report(msg: string) {
    // TODO (3): G_engine.send report...
    console.error(msg);
}
