
// CANVAS UI DEPRECATED, USE HTML UI (scene.ts)
/*
interface relativeCanvasElement {

    // new(context: CanvasRenderingContext2D): relativeCanvasElement;
    draw(x: number, y: number, maxWidth: number): void;
}

interface absoluteCanvasElement {
    // new(context: CanvasRenderingContext2D, offsetLeft: number, offsetTop: number): absoluteCanvasElement;
    draw(now: number): void;
}

class CanvasText implements relativeCanvasElement {

    w: number
    private fontSize: number // ~ h
    textFillStyle = 'rgb(0,0,0)'
    private _text: string
    private context: CanvasRenderingContext2D

    constructor(context: CanvasRenderingContext2D, text?: string, fontSize = 14) {
        this.context = context;
        this.text = text || '';
        this.fontSize = fontSize;
    }

    get text(): string {
        return this._text;
    }

    set text(text: string) {
        let textSize = this.context.measureText(text);
        this.w = textSize.width;
        this._text = text;
    }

    draw(x: number, y: number, maxWidth: number) {
        let ctx = this.context;
        ctx.fillStyle = this.textFillStyle;
        ctx.font = this.fontSize + 'px sans-serif';
        ctx.fillText(this.text, x, y + this.fontSize, maxWidth);
    }
}

class CanvasButton implements absoluteCanvasElement {

    // disabled = false
    offsetLeft: number
    offsetTop: number
    width = 200
    height = 30
    actView: ActionViewer
    private context: CanvasRenderingContext2D
    private _text: CanvasText

    constructor(context: CanvasRenderingContext2D, offsetLeft: number, offsetTop: number, action: ActionViewer) {
        this.context = context;
        this.actView = action;
        this._text = new CanvasText(context);
        //  this.text = action.caption; // FIXME : dynamic name ?
        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
    }

    get text(): string {
        return this._text.text;
    }

    set text(text: string) {
        this._text.text = text;
    }

    draw(now: number) {

        let costs = { qt: 0, energy: 0 };
        let actCtx = this.actView.action.check(new ActionReport(true, [], costs));

        let ctx = this.context;
        let help = i18n.acts_costs(costs.qt, costs.energy);

        if (actCtx.fails.length) {  // ~ if (this.disabled) {
            ctx.fillStyle = '#ff8888';
            this._text.textFillStyle = 'silver';
            // button.disabled = true;
            // button.title = act.checkFails.join(';');
            console.log('createActionButton > action ' + ActId[this.actView.action.actId] + ' (' + this.actView.caption + ') will fail : ' + actCtx.fails.join(' ; '));
            for (let id of actCtx.fails) {
                if (id !== FailId.Energy && id !== FailId.Qt) {
                    help += ' ' + i18n.acts_fails[id];
                }
            }
        } else {
            ctx.fillStyle = '#88ee88';
            this._text.textFillStyle = 'black';
            console.log('createActionButton > action set ' + this.actView.caption);
        }

        ctx.fillRect(this.offsetLeft, this.offsetTop, this.width, this.height);
        this.text = this.actView.caption + ' ' + help;
        this._text.draw(this.offsetLeft + 10, this.offsetTop + 5, this.width); // TODO (1) : center size dependent textAlign = 'center'
    }
}

class CanvasButtonSet {

    private width = 200
    private height = 60
    private _offsetLeft: number
    get offsetLeft(): number {
        return this._offsetLeft;
    }
    set offsetLeft(value: number) {
        this._offsetLeft = value;
        for (let b of this.buttons) {
            b.offsetLeft = value + 10;
        }
    }
    private offsetTop: number
    private context: CanvasRenderingContext2D
    private buttons: CanvasButton[]
    //  private tile: Tile | null = null
    private cell: Cell | null = null
    private entity: Furniture | null = null

    constructor(context: CanvasRenderingContext2D, offsetLeft: number, offsetTop: number) {

        this.context = context;
        this.buttons = [];
        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
    }

    setCell(zone: RelZone, cell: Cell | null) {

        this.cell = cell;
        this.buttons = [];

        if (cell) {
            let action: ActionViewer;

            let target: Cell = cell;
            let button: CanvasButton;

            for (let actionConstructorId of zone.actor.actions) {
                if (target.reactions.indexOf(actionConstructorId) !== -1) {
                    action = WorldUI.ActionViewerFactory(actionConstructorId, zone, target);
                    button = new CanvasButton(this.context, this._offsetLeft, this.offsetTop, action);
                    this.buttons.push(button);
                }
                else {
                    console.log(actionConstructorId + ' is not in' + target.reactions + ' ' + target);
                }
            }
        }
        // else {}

    }

    setEntity(zone: RelZone, entity: Furniture | null) {

        this.entity = entity;
        this.buttons = [];

        if (entity) {
            let action: ActionViewer;

            let target: Furniture = entity;
            let button: CanvasButton;

            for (let actionConstructorId of zone.actor.actions) {
                if (target.reactions.indexOf(actionConstructorId) !== -1) {
                    action = WorldUI.ActionViewerFactory(actionConstructorId, zone, target);
                    button = new CanvasButton(this.context, this._offsetLeft, this.offsetTop, action);
                    this.buttons.push(button);
                }
                else {
                    console.log(actionConstructorId + ' is not in' + target.reactions + ' ' + target);
                }
            }
        }
        // else {}

    }

    draw(now: number) {

        let context = this.context;

        context.fillStyle = '#ff0000';

        context.fillRect(this.offsetLeft, this.offsetTop, this.width, this.height);

        console.log('viewActions (CanvasButtonSet.draw)');

        for (let b of this.buttons) {

             let act = b.action;
            if (act.check()) {
                console.log('TODO: BUILD SERVER MESSAGE');
                // action.message = action.buildMessage(zone.iid, target);
            }

            if (act.checkFails.length) { // FIXME: dynamic changes (ex : qt regain will enable button) => startAnimation ? refresh on timer ?
                // button.disabled = true;
                // button.title = act.checkFails.join(';');
                console.log('createActionButton > action will fail ' + act.caption + ' : ' + act.checkFails.join(' ; '));
            }
            else {
                console.log('createActionButton > action set ' + act.caption);
            } 
            b.draw(now);
        }
    }

    mouseup(event: MouseEvent) {
        //    console.log('Target.buttonset.mouseup > ' + event.clientX + ' ' + event.clientY);
        let x = event.clientX, y = event.clientY;
        let now = Date.now();

        for (let b of this.buttons) {
            if (x >= b.offsetLeft && y >= b.offsetTop
                && x <= (b.offsetLeft + b.width) && y <= (b.offsetTop + b.height)) {
                console.log('Target.buttonset.mouseup > HIT' + event.clientX + ' ' + event.clientY);
                b.actView.triggerAction();
            }
        }
    }
}

abstract class CanvasCard implements absoluteCanvasElement {

    visible = false
    static width = 200
    height = 300
    //  scale = 1
    protected context: CanvasRenderingContext2D
    protected _offsetLeft: number
    get offsetLeft(): number {
        return this._offsetLeft;
    }
    set offsetLeft(value: number) {
        this._offsetLeft = value;
        this.actionsViewer.offsetLeft = value;
        // TODO (1) : for of childs += delta ?
    }
    protected offsetTop: number
    protected actionsViewer: CanvasButtonSet

    constructor(context: CanvasRenderingContext2D, offsetLeft: number, offsetTop: number) {
        this.context = context;
        this.actionsViewer = new CanvasButtonSet(context, offsetLeft, offsetTop + 90); // TODO (1) :  this.x, this.y + 3 * lineSpace, this.tile
        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
    }

    abstract draw(now: number): void;

    mouseup(event: MouseEvent) {
        this.actionsViewer.mouseup(event);
    }
}

class UserCanvasCard extends CanvasCard {

    static width = 100
    height = 50

    draw() {
        let ctx = this.context;
        let width = ActorCanvasCard.width;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.offsetLeft, this.offsetTop, UserCanvasCard.width, this.height);
        // this.text.draw(context, this.x, this.y, this.w); // FIXME : margin, padding
        console.log('fillRect ' + this.offsetLeft + ' ' + this.offsetTop + ' ' + UserCanvasCard.width + ' ' + this.height);
    }
}

class ActorCanvasCard extends CanvasCard {

    private zone3D: Zone3D | null = null
    private actorName: CanvasText
    private actorCond: CanvasText
    private actorQt: CanvasText
    private actorEnergy: CanvasText
    private actorMoves: CanvasText
    private inventory: CanvasText

    constructor(context: CanvasRenderingContext2D, offsetLeft: number, offsetTop: number) {
        super(context, offsetLeft, offsetTop);

        this.actorName = new CanvasText(context);
        this.actorCond = new CanvasText(context);
        this.actorQt = new CanvasText(context);
        this.actorEnergy = new CanvasText(context);
        this.actorMoves = new CanvasText(context);
        this.inventory = new CanvasText(context);
    }

    draw(now: number) {
        if (this.zone3D) {
            let ctx = this.context;
            let width = ActorCanvasCard.width;
            ctx.strokeStyle = 'lime';
            ctx.fillStyle = '#eeaaff';
            ctx.fillRect(this.offsetTop, this.offsetTop, width, this.height);

            let actor = this.zone3D.zone.actor;

            this.actorName.text = this.zone3D.zone.actor.name;
            let cond = actor.getModifiedCond()
            this.actorCond.text = i18n.conds_titles.cond(actor.getModifiedCond().value, cond.maximum, cond.slope);
            let qt = actor.getModifiedQt()
            this.actorQt.text = i18n.conds_titles.qt(qt.value, qt.maximum, qt.slope);
            let energy = actor.getModifiedEnergy()
            this.actorEnergy.text = i18n.conds_titles.energy(energy.value, energy.maximum, energy.slope);
            this.actorMoves.text = i18n.characs.move_earth + ' ' + actor.moveEarth
                + ' ' + i18n.characs.move_water + ' ' + actor.moveAir
                + (actor.moveAir ? ' ' + i18n.characs.move_air + ' ' + actor.moveAir : '');
            this.inventory.text = i18n.furnitures + ' ' + this.zone3D.zone.actorCell.inventory.length;

            let lineSpace = 20; // fontSize + padding + margin // FIXME this.w should include padding, margin
            this.actorName.draw(this._offsetLeft, this.offsetTop, width);
            this.actorCond.draw(this._offsetLeft, this.offsetTop + 2 * lineSpace, width);
            this.actorQt.draw(this._offsetLeft, this.offsetTop + 3 * lineSpace, width);
            this.actorEnergy.draw(this._offsetLeft, this.offsetTop + 4 * lineSpace, width);
            this.actorMoves.draw(this._offsetLeft, this.offsetTop + 5 * lineSpace, width);
            this.inventory.draw(this._offsetLeft, this.offsetTop + 6 * lineSpace, width);
            // this.actionsViewer.draw(); // this.x, this.y + 3 * lineSpace, this.tile
        }
    }

    setZone(zone3D: Zone3D | null) {

        this.zone3D = zone3D;
        if (zone3D) {
            // this.actionsViewer.setTile(zone3D.actorTile);
            this.actionsViewer.setCell(zone3D.zone, zone3D.zone.actorCell);
            this.visible = true;
        }
        else {
            //  this.actionsViewer.setTile(null);
            this.visible = false;
        }
    }
}

abstract class TargetCanvasCard extends CanvasCard {

    private inventory: CanvasText

    drawInventory() {
        // TODO
        //   onclick = function () { ui.setEntityTargetCard(zone, entity); } 
    }
}

class TargetCellCanvasCard extends TargetCanvasCard {

    private cell: Cell | null = null
    private terrainName: CanvasText
    private distanceToActor: CanvasText

    constructor(context: CanvasRenderingContext2D, offsetLeft: number, offsetTop: number) {
        super(context, offsetLeft, offsetTop);

        this.terrainName = new CanvasText(context);
        this.distanceToActor = new CanvasText(context);
    }

    draw(now: number) {
        let context = this.context;

        let width = TargetCellCanvasCard.width;
        context.clearRect(this._offsetLeft, this.offsetTop, width, this.height);

        if (this.cell) {

            let cell = this.cell;

            context.strokeStyle = 'lime';
            context.fillStyle = '#00ff00aa';
            context.fillRect(this._offsetLeft, this.offsetTop, width, this.height);
            context.strokeRect(this._offsetLeft, this.offsetTop, width, this.height);

            let terrainName = i18n.terrain_names[cell.cellType] || i18n.terrain_names[CellType.InderteminateCell];
            this.terrainName.text = terrainName + ' ' + i18n.vegetation(cell.vegetation, Constants.MAX_VEGETATION);
            this.distanceToActor.text = i18n.distance(cell.getD2A());

            let lineSpace = 30; // fontSize + padding + margin // FIXME this.w should include padding, margin
            this.terrainName.draw(this._offsetLeft, this.offsetTop, width);
            this.distanceToActor.draw(this._offsetLeft, this.offsetTop + lineSpace, width);
            this.actionsViewer.draw(now); // this.x, this.y + 3 * lineSpace, this.tile
            this.drawInventory();
        }
        else {
            context.strokeStyle = 'silver';
            context.strokeRect(this._offsetLeft, this.offsetTop, width, this.height);
        }
    }

    setCell(zone: RelZone, cell: Cell | null) {

        this.cell = cell;
        // this.actionsViewer.setTile(tile);
        this.actionsViewer.setCell(zone, cell);
        this.visible = cell !== null;
    }
}

class TargetEntityCanvasCard extends TargetCanvasCard {

    private entity: Furniture | null = null
    private entityName: CanvasText
    private distanceToActor: CanvasText
    // private inventory: CanvasText

    constructor(context: CanvasRenderingContext2D, offsetLeft: number, offsetTop: number) {
        super(context, offsetLeft, offsetTop);

        this.entityName = new CanvasText(context);
        this.distanceToActor = new CanvasText(context);
        // this.inventory = new CanvasText(context);
    }

    draw(now: number) {
        let context = this.context;

        let width = TargetCellCanvasCard.width;
        context.clearRect(this._offsetLeft, this.offsetTop, width, this.height);

        if (this.entity) {

            let cell = this.entity;

            context.strokeStyle = 'lime';
            context.fillStyle = '#00ff00aa';
            context.fillRect(this._offsetLeft, this.offsetTop, width, this.height);
            context.strokeRect(this._offsetLeft, this.offsetTop, width, this.height);

            this.entityName.text = 'TODO OBJECT CLASS NAME ?'; //this.entity.name;
            this.distanceToActor.text = i18n.distance(cell.getD2A());

            let lineSpace = 30; // fontSize + padding + margin // FIXME this.w should include padding, margin
            this.entityName.draw(this._offsetLeft, this.offsetTop, width);
            this.distanceToActor.draw(this._offsetLeft, this.offsetTop + lineSpace, width);
            this.actionsViewer.draw(now); // this.x, this.y + 3 * lineSpace, this.tile
            this.drawInventory();
        }
        else {
            context.strokeStyle = 'silver';
            context.strokeRect(this._offsetLeft, this.offsetTop, width, this.height);
        }
    }



    setEntity(zone: RelZone, entity: Furniture | null) {

        this.entity = entity;
        // this.actionsViewer.setTile(tile);
        this.actionsViewer.setEntity(zone, entity);
        this.visible = entity !== null;
    }
}

// TODO (3) : merge ui and mainscene
class CanvasUi extends HtmlUI {

    // sceneActorPointOfView : (3D) view for agents with perception
    // profil : caractéristiques, actions connues, expertise en armes =>
    // sceneActorProfile
    // messagerie userMessage
    // messagerie agentMessage (events ?)
    // inventaire => sceneAgentInventory
    // echange => sceneTradeFurnitures
    // echange d'information => sceneTradeInformation
    // quete/objectifs (mémoire personnelle)
    // métiers, expertise par métier
    // groupes, compagnie, guildes, egregores
    // carte (automapping)

    // splashScene: SplashScene
    // loginScene: LoginScene
    private logo: HTMLImageElement
    private logoOffsetX = 0
    private logoOffsetY = 0
    private logoRotation = 0
    private animationId: number | undefined
    private context: CanvasRenderingContext2D
    //  private hoverCard: CanvasCard
    //  private infoBox: CanvasCard
    //   private userCard: UserCanvasCard
    private actorCard: ActorCanvasCard
    private targetCard: TargetCanvasCard | null = null
    private canvas: HTMLCanvasElement

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);

        let padding = 10;

        this.canvas = canvas;
        this.context = <CanvasRenderingContext2D>canvas.getContext("2d");
        if (!this.context) {
            this.addInfo(i18n.detector.canvas, true, 10000);
            throw 'canvas 2D not supported';
        }
        console.log(this.context.globalCompositeOperation);

        this.logo = new Image();
        this.logo.src = 'logo_splash.png';
        this.logo.onload = () => {
            console.log('logo onload > ' + this.logo.width + ' ' + this.logo.height);
            this.startSplash('firstTime');
            // window.requestAnimationFrame(() => this.splash);

            //setInterval(() => { this.splash(); }, 1000);
        }

        //   this.userCard = new UserCanvasCard(this.context, (canvas.width - UserCanvasCard.width) / 2, 0);
        this.actorCard = new ActorCanvasCard(this.context, padding, padding);
        // this.targetCard = new TargetCanvasCard(this.context, canvas.width - padding - TargetCanvasCard.width, padding); // FIXME: need width before creating => offsetRight ?
        //   this.hoverCard = new CanvasCard(this.context, 0,0);
        //   this.infoBox = new CanvasCard(this.context,0,0);


         let devicePixelRatio = window.devicePixelRatio || 1;
         let backingStoreRatio = this.context.webkitBackingStorePixelRatio ||
                             this.context.mozBackingStorePixelRatio ||
                             this.context.msBackingStorePixelRatio ||
                             this.context.oBackingStorePixelRatio ||
                             this.context.backingStorePixelRatio || 1;
 
         let ratio = devicePixelRatio / backingStoreRatio;
         console.log('ratio: ' + ratio + ' device:' + devicePixelRatio + ' backing:' + backingStoreRatio) 

        // this.loginScene = new LoginScene();
        this.redraw();
    }

    setSize(width: number, height: number) {

        this.canvas.width = width;
        this.canvas.height = height;

        //  this.userCard.offsetLeft = (width - UserCanvasCard.width) /2;
        if (this.targetCard) {
            this.targetCard.offsetLeft = width - 10 - TargetCanvasCard.width;
        }

        this.logoOffsetX = Math.round(width / 2);
        this.logoOffsetY = Math.round(height / 2);

        this.redraw();
    }

    redraw() {

        let now = Date.now();

        // clear();
        // for (let e of this.elements) { e.draw(this.context); }
        if (this.actorCard.visible) {
            this.actorCard.draw(now);
        }
        if (this.targetCard && this.targetCard.visible) {
            this.targetCard.draw(now);
        }
           if (this.userCard.visible) {
               console.log('draw user' );
               this.userCard.draw();
           }
         if (this.hoverCard.visible) {
            this.hoverCard.draw(this.context);
        } 
    }

    mouseup(event: MouseEvent) {
        console.log('ui.mouseup > ' + event.clientX + ' ' + event.clientY);
        if (event.clientX > this.canvas.width / 2) {
            if (this.targetCard) {
                this.targetCard.mouseup(event);
            }
        }
        else {
            this.actorCard.mouseup(event);
        }
    }

    setCellTargetCard(zone: RelZone, cell: Cell) {
        let padding = 10;
        this.targetCard = new TargetCellCanvasCard(this.context, this.canvas.width - padding - TargetCanvasCard.width, padding); // FIXME: need width before creating => offsetRight ?
        (<TargetCellCanvasCard>this.targetCard).setCell(zone, cell);
        this.redraw(); // TODO (1) : staticRedraw or requestAnim ? => needRedraw
    }

    setEntityTargetCard(zone: RelZone, entity: Furniture) {
         if (this.targetCard) {
             this.targetCard.visible = false;
             // TODO : back button, save current cell/entity ?
         } 
        let padding = 10;
        this.targetCard = new TargetEntityCanvasCard(this.context, this.canvas.width - padding - TargetCanvasCard.width, padding); // FIXME: need width before creating => offsetRight ?
        (<TargetEntityCanvasCard>this.targetCard).setEntity(zone, entity);
        this.redraw(); // TODO (1) : staticRedraw or requestAnim ? => needRedraw
    }

    setActorCardTile(zone3D: Zone3D | null) {
        this.actorCard.setZone(zone3D);
        this.redraw(); // TODO (1) : staticRedraw or requestAnim ? => needRedraw
    }

    startSplash(pendingScene: Scene | Zone3DLoader | string) {

        super.startSplash(pendingScene);
        this.animationId = window.requestAnimationFrame(() => { this.splashStep() });
    }

    private splashStep() {

        let ctx = this.context;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.translate(this.logoOffsetX, this.logoOffsetY);
        ctx.rotate(this.logoRotation += 0.05);
        ctx.drawImage(this.logo, -this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
        ctx.restore();

        this.animationId = window.requestAnimationFrame(() => { this.splashStep() });
    }

    stopSplash() {
        console.log('stop splash ' + this.animationId);
        if (this.animationId !== undefined) {
            window.cancelAnimationFrame(this.animationId);
            this.animationId = undefined;
        }
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.redraw();
    }
}
*/