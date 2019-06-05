class ActionFail {

    name: string
    reason: string

    constructor(act: ActionViewer, reason: string) {
        this.name = act.caption;
        this.reason = reason;
    }

    toString() {
        return this.reason;
    }
}

class ActionViewer {
    caption: string
    hint: string
    //  help = ''
    //  message: c2s_ChannelMessage

    action: CoreAction  // TODO (5) : Mixin Action and ActionViewer ?

    constructor(act: CoreAction) {
        this.action = act;
        this.caption = i18n.acts_captions[act.actId];
        if (!this.caption) { 
            console.error('missing caption ' + act.actId );
            this.caption = 'act' + act.actId;
        }
        this.hint = i18n.acts_helps[act.actId];
    }

    triggerAction() {

        let report = this.action.check(new ActionReport());

        if (report.fails.length) {
            console.info('act failed ' + this.action.actId + ' fails:' + report.fails.join(';'));
            ui.addInfo('act failed  TODO (1) : i18n checkFails[0]');
        }
        else {
            console.log('trigger action ' + this.caption);

            // let message = this.action.BuildMessage();
            let act = this.action;

            let message: ActionRequest = {
                type: MessageTypeYenah.Action,
                actId: act.actId,
                actorId: act.zone.actor.gId.iId, // FIXME (0) : .indId !!
                // targetSelector: 
                expectedActorDH: act.zone.actorOriginalUpdateDH // FIXME (0) : unsync
            }

            if (act.target instanceof Cell) {

                // message.targetCellSelector = { x: act.target.gId.x, y: act.target.gId.y }
                message.targetCellSelector = { x: act.target.posX, y: act.target.posY }

            }
            else if (act.target instanceof EntityBase) {
                message.targetEntityId = act.target.gId.iId;  // FIXME (0) : .indId !!
            }
            else {
                throw 'unknown target';
            }

            G_channel.send(message);
        }
    }
}
