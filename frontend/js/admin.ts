

function adminMode() {

    ui = new AdminUI(document.body);

    // let eventTarget: EventTarget = document;

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

        this.addAction(panel, AdminActId.UnitTests);
        this.addAction(panel, AdminActId.IntegrationTests);

        this.addAction(panel, YenahAdminActId.ResetWorld);
        this.addWorldEditAction(panel);
        container.appendChild(panel);

        panel = document.createElement('div');
        panel.className = 'result_panel';
        container.appendChild(panel);
    }

    addAction(container: HTMLDivElement, actId: number) { // FIXME (1) : AdminActId, cannot extend enums

        let requestButton = document.createElement('input');
        requestButton.type = 'button';
        // FIXME (1) : cannot extend enums
        if (AdminActId[actId]) {
            requestButton.value = AdminActId[actId];
        }
        else {
            requestButton.value = YenahAdminActId[actId];
        }
        requestButton.onclick = function () {
            let act = new AdminAction(actId);
            act.triggerAction();
        }
        container.appendChild(requestButton);

    }

    addWorldEditAction(container: HTMLDivElement) {

        let requestButton = document.createElement('input');
        requestButton.type = 'button';
        // TODO (2) : admin i18n
        requestButton.value = 'Edit world zone';

        requestButton.onclick = function () {
            let act = new AdminWorldEditAction();
            act.triggerAction();
        }
        container.appendChild(requestButton);

        let cancelButton = document.createElement('input');
        cancelButton.type = 'button';
        // TODO (2) : admin i18n
        cancelButton.value = 'Cancel edit';

        cancelButton.onclick = function () {
            let tableId = 'map_editor_table'
            let tlb = document.getElementById(tableId)
            if (tlb) {
                (<Node>tlb.parentNode).removeChild(tlb)
            }
            let act = new AdminWorldEditAction();
            act.triggerAction();
        }
        container.appendChild(cancelButton);

    }

}

class AdminAction {

    constructor(public actId = AdminActId.Information) {

    }

    triggerAction() {

        console.log('triggerAction ' + this.actId);

        let message: AdminRequest = {
            type: MessageType.Admin,
            adminActId: this.actId
        }
        G_channel.send(message);
    }
}

class AdminWorldEditAction {

    constructor() {

    }

    triggerAction() {

        console.log('triggerAction world edit action ');

        let tableId = 'map_editor_table'
        let tlb = document.getElementById(tableId)
        if (tlb) {
            (<Node>tlb.parentNode).removeChild(tlb)
            console.log('todo edit')
        }

        let message: AdminWorldEditRequest = {
            type: MessageType.Admin,
            adminActId: YenahAdminActId.EditWorld,
            originX: 10,
            originY: 10,
            radius: 5
        }
        G_channel.send(message);
    }
}

function dispatchAdminAck(m: AdminRequest) {

    console.log('admin message');
    console.log(m);

    switch (m.adminActId) {

        case YenahAdminActId.EditWorld:

            let weZoneAck = (<AdminWorldEditAck>m).zone
            displayMapEditor(weZoneAck)

            break;


    }

}



function posToCellId(x: number, y: number) {
    return 'cell_' + x + '_' + y
}

function cellIdToPos(cellId: string): number[] {
    let values = cellId.split('_')
    return [parseInt(values[1]), parseInt(values[2])]
}

function displayMapEditor(zone: any) {

    console.log(zone);

    let radius = parseInt(zone.actorGId.iId)
    let oX = parseInt(zone.originX)
    let oY = parseInt(zone.originY)

    let td: HTMLTableDataCellElement
    let tr: HTMLTableRowElement
    let select: HTMLSelectElement
    let option: HTMLOptionElement

    let tableId = 'map_editor_table'
    let tlb = document.getElementById(tableId)
    let table: HTMLTableElement
    let container: HTMLDivElement = document.createElement('div')
    let sendBtn: HTMLButtonElement = document.createElement('button')
    sendBtn.value = 'send'
    container.appendChild(sendBtn)
    sendBtn.addEventListener('click', function () {
        console.log(table)

        /*  let zoneDao: SaveZoneDao = {
              isSaveZoneDao: true,
              cells: []
          }  */

          let cellDaoList: CellDao[] = []
          
          let insertZoneDao /*: InsertZoneDao*/ = {
              cells: cellDaoList
          }

        for (let r = 0, n = table.rows.length; r < n; r++) {
            for (let c = 0, m = table.rows[r].cells.length; c < m; c++) {
                let selectElement = <HTMLSelectElement>table.rows[r].cells[c].firstChild
                let options = selectElement.options
                if (options.selectedIndex > CellType.InderteminateCell) {

                    // data[selectElement.id] = options[options.selectedIndex].value

                    let cellType: CellType = parseInt(options[options.selectedIndex].value)
                    let [posX, posY] = cellIdToPos(selectElement.id)

                    let cellDao: CellDao = {
                        cellType: cellType,
                        posX: posX,
                        posY: posY
                        // ,vegetation?: number // TODO (1) : vegetation editor
                    }

                    insertZoneDao.cells.push(cellDao)
                }
            }
        }
        console.log(insertZoneDao)

        let message: AdminWorldEditRequest = {
            type: MessageType.Admin,
            adminActId: YenahAdminActId.EditWorld,
            zone: insertZoneDao
        }
        G_channel.send(message);

    })

    if (tlb) {
        table = <HTMLTableElement>tlb
    }
    else {
        table = document.createElement('table');
        table.id = tableId
    }

    for (let ix = oX - radius; ix <= oX + radius; ix++) {
        tr = document.createElement('tr')
        for (let iy = oY - radius; iy <= oY + radius; iy++) {

            td = document.createElement('td')
            select = document.createElement('select');
            let cid = posToCellId(ix, iy)
            select.id = cid
            console.log('create ' + cid)
            select.title = cid
            for (let type in CellType) {
                if (isNaN(parseInt(type))) {
                    option = document.createElement('option')
                    option.value = CellType[type]
                    option.textContent = type
                    select.appendChild(option)
                }
            }
            select.onchange = function (e) {
                console.log('on change  ' + (<HTMLOptionElement>e.target).value + ' ' + (<HTMLOptionElement>e.target).value);
                (<HTMLOptionElement>e.target).dataset.changed = 'true'
            }

            td.appendChild(select)
            tr.appendChild(td)
        }
        table.appendChild(tr)
    }

    container.appendChild(table)
    document.body.appendChild(container)

    for (let cell of zone.cells) {
        console.log(cell)
        let val = cell.cellType
        let cid = posToCellId(cell.posX, cell.posY)
        let sel = document.getElementById(cid)
        console.log('get' + cid + ' ' + sel)
        if (sel) {

            let opts = (<HTMLSelectElement>sel).options
            for (let opt, j = 0; opt = opts[j]; j++) {
                if (opt.value == val) {
                    (<HTMLSelectElement>sel).selectedIndex = j;
                    break;
                }
            }
        }
    }
}