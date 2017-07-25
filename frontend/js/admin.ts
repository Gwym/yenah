

function adminMode() {

    ui = new AdminUI(document.body);

    let eventTarget: EventTarget = document;

    ui.setSize(window.innerWidth, window.innerHeight);

    createChannel();

    /*
    
    // G_regionRenderer = new RegionRenderer();
        G_store = new Store();
    
        let canvasWebGl = <HTMLCanvasElement>document.getElementById('canvasWebGl');
        G_engine = new ClientEngine(canvasWebGl, eventTarget); */

}


class AdminUI extends HtmlUI {

    constructor(container: HTMLElement) {
        super(container);

        let panel = document.createElement('div');
        panel.className = 'admin_panel';
        this.addAction(panel, AdminActId.Information);
        this.addAction(panel, AdminActId.CreateUser);
        this.addAction(panel, AdminActId.DeleteUsers);
        this.addAction(panel, AdminActId.ResetWorld);
        this.addAction(panel, AdminActId.UnitTests);
        this.addAction(panel, AdminActId.IntegrationTests);
        container.appendChild(panel);

        panel = document.createElement('div');
        panel.className = 'result_panel';
        container.appendChild(panel);
    }

    addAction(container: HTMLDivElement, actId: AdminActId) {

        let requestButton = document.createElement('input');
        requestButton.type = 'button';
        requestButton.value = AdminActId[actId];
        requestButton.onclick = function () {
            let act = new AdminAction(actId);
            act.triggerAction();
        }
        container.appendChild(requestButton);

    }

}

class AdminAction {

    constructor(public actId = AdminActId.Information) {

    }

    triggerAction() {

        console.log('triggerAction ' + this.actId);

        let message: AdminRequest = {
            type: MessageType.Admin,
            adminActId: this.actId,
        }
        G_channel.send(message);
    }
}

function dispatchAdminAck(m: s2c_ChannelMessage) {
    console.log('admin message');
    console.log(m);

}