

/* interface UIDefinition {

    selectedTile: Tile | null;
    selectedCard: Card
    hoverCard: Card
    infoBox: Card

    setSize(width: number, heigth: number): void;
    setConnected(): void;
    selectZone(zoneIid: number): void;
    addInfo(info: string): void;
    empty(card: Card): void;
} */

class HtmlUI {

    pendingScene?: Scene | Zone3DLoader | string
    mainScene: MainScene
    beingsScene: BeingsScene
    protected infoBox: HTMLElement
    protected activeScene: Scene
    protected container: HTMLElement

    constructor(container: HTMLElement) {

        this.container = container;

        this.infoBox = <HTMLElement>document.getElementById('info_box');
        this.mainScene = new MainScene(container);
        this.beingsScene = new BeingsScene();

        this.switchToScene(this.mainScene);
    }

    //  abstract setSize(width: number, height: number): void
    //  abstract setActorCardTile(zone3D: Zone3D | null): void
    //  abstract setCellTargetCard(zone: RelZone, cell: Cell): void
    //  abstract mouseup(event: MouseEvent): void

    //  mouseup(event: MouseEvent) { }

    static empty(he: HTMLElement) {
        while (he.firstChild) {
            he.removeChild(he.firstChild);
        }
    }

    setSize(width: number, height: number) {

        this.container.style.width = width.toString();
        this.container.style.height = height.toString();
    }

    addInfo(info: string, isError = false, timeoutMs = 1000) {

        let infoLine: HTMLParagraphElement | undefined = document.createElement('p');
        infoLine.textContent = info;
        if (isError) {
            infoLine.className = 'error_message';
        }

        infoLine.onclick = (e) => {
            if (infoLine) {
                console.log('remove click ' + infoLine.textContent);
                this.infoBox.removeChild(infoLine);
                infoLine = undefined;
            }
        };

        setTimeout(() => {
            if (infoLine) {
                // console.log('remove timeout ' + infoLine.textContent);
                this.infoBox.removeChild(infoLine);
                infoLine = undefined;
            }
        }, /*this.infoBox.children.length * 1000 +*/ timeoutMs);

        this.infoBox.appendChild(infoLine);
    }

    setUser(m: UserSessionAck) {
        this.setConnectedState('user_connected');
        if (window.performance && performance.navigation.type === performance.navigation.TYPE_RELOAD) { //  
            this.addInfo(i18n.welcome_name(m.userOptions.name), false, 2000); // TODO (5) : welcome_again 
        }
        else {
            this.addInfo(i18n.welcome_name(m.userOptions.name), false, 5000);
        }
    }

    setConnectedState(state: string) {


        //  console.log('TODO Set ConnectedState ' + state);

        /* if (this.animationId !== undefined) {
             window.cancelAnimationFrame(this.animationId);
             this.animationId = undefined;
         } */
        //   this.userCard.visible = true;
        //   this.redraw(); // TODO (1) : staticRedraw or requestAnim ? => needRedraw
    }

    startSplash(pendingScene: Scene | Zone3DLoader | string) {

        console.log('start splash');
        this.pendingScene = pendingScene;
    }

    stopSplash() {
        console.log('stop splash');
    }

    switchToMainScene() {
        this.switchToScene(this.mainScene);
    }

    switchToBeingScene() {
        this.switchToScene(this.beingsScene);
    }

    protected switchToScene(scene: Scene) {

        // TODO (1) : block mouse events ? 

        if (this.activeScene) {
            this.activeScene.inactivate();
        }

        this.activeScene = scene;
        if (scene) {
            scene.activate();
        }
        else {
            console.error('ui.switchToScene > No scene');
        }
    }

    viewReports(zone: RelZone) {

    }
}



// class HtmlCard extends HTMLDivElement implements Card { }

class HtmlActionButton {

    button: HTMLButtonElement
    actView: ActionViewer

    constructor(container: HTMLElement, action: ActionViewer) {
        this.button = document.createElement('button');
        this.actView = action;
        this.button.addEventListener('click', () => {
            console.log('trigger action ' + action.caption);
            action.triggerAction();
        })
        container.appendChild(this.button);
    }

    /* get text(): string | null {
         return this.button.textContent;
     }
 
     set text(text: string | null) {
         this.button.textContent = text;
     } */

    update(now: number) {

        let costs = { qt: 0, energy: 0 };
        let actCtx = this.actView.action.check(new ActionReport(true, [], costs));

        let help = i18n.acts_costs(costs.qt, costs.energy);

        if (actCtx.fails.length) {
            this.button.disabled = true;
            // this.title = act.checkFails.join(';');
            console.log('createActionButton > action ' + ActId[this.actView.action.actId] + ' (' + this.actView.caption + ') will fail : ' + actCtx.fails.join(' ; '));
            for (let id of actCtx.fails) {
                if (id !== FailId.Energy && id !== FailId.Qt) {
                    help += ' ' + i18n.acts_fails[id];
                }
            }
        } else {
            this.button.disabled = false;
            console.log('createActionButton > action set ' + this.actView.caption);
        }

        this.button.textContent = this.actView.caption;
        this.button.title = help;
    }
}

class HtmlActionViewer {

    private buttons: HtmlActionButton[] = []
    //  private tile: Tile | null = null
    //   private cell: Cell | null = null
    //   private entity: Furniture | null = null
    private container: HTMLElement
    private target: Target | undefined

    constructor(parent: HTMLElement) {
        this.container = document.createElement('div');
        parent.appendChild(this.container);
    }

    update(now: number) {

        for (let actButton of this.buttons) {
            actButton.update(now);
        }
    }

    setTarget(zone: RelZone, target: Target) {

        this.target = target;
        HtmlUI.empty(this.container);
        this.buttons = [];

        console.log('setTarget action ' + target);

        let now = Date.now();
        let action: ActionViewer;
        let button: HtmlActionButton;

        for (let actionConstructorId of zone.actor.actions) {
            if (target.reactions.indexOf(actionConstructorId) !== -1) {
                action = WorldUI.ActionViewerFactory(actionConstructorId, zone, target);
                button = new HtmlActionButton(this.container, action);
                this.container.appendChild(button.button);
                this.buttons.push(button);
                button.update(now);
            }
            else {
                // console.log(actionConstructorId + ' is not in' + target.reactions + ' ' + target);
            }
        }

    }

    unsetTarget() {

        console.log('unsetTarget ');

        this.target = undefined;
        HtmlUI.empty(this.container);
        this.buttons = [];
    }
}

// TODO (5) : document.registerElement
class HtmlCard {

    container: HTMLDivElement
    protected actionsViewer: HtmlActionViewer

    /*  constructor(parentNode: HTMLElement) {
          this.container = document.createElement('div');
          parentNode.appendChild(this.container);
          this.actionsViewer = new HtmlActionViewer(this.container);
      } */

    appendText(): HTMLParagraphElement {
        let p = document.createElement('p');
        this.container.appendChild(p);
        return p;
    }

    update(now: number) {
        this.actionsViewer.update(now);
    }
}

class ActorHtmlCard extends HtmlCard {

    private zone3D: Zone3D | null = null
    private actorName: HTMLParagraphElement
    private actorCond: HTMLParagraphElement
    private actorQt: HTMLParagraphElement
    private actorEnergy: HTMLParagraphElement
    private actorMoves: HTMLParagraphElement
    private inventory: HTMLParagraphElement

    constructor(parentNode: HTMLElement) {
        super();

        this.container = document.createElement('div');
        parentNode.appendChild(this.container);
        this.container.id = 'ActorCard';

        this.actorName = this.appendText();
        this.actorName.addEventListener('click', () => {
            console.log('hide actor card');
            this.setZone(null);
        })
        this.actorCond = this.appendText();
        this.actorQt = this.appendText();
        this.actorEnergy = this.appendText();
        this.actorMoves = this.appendText();
        this.inventory = this.appendText();

        this.actionsViewer = new HtmlActionViewer(this.container);
    }

    update(now: number) {
        if (this.zone3D) {
            let actor = this.zone3D.zone.actor;

            actor.stabiliseAt(now); // FIXME (0) : now = client now (dynamic) or server  zone.snapshotDH (static) ?
            this.actorName.textContent = actor.name + ' ' + new Date(actor.updateDH) + ' th:' + actor.theta;
            let cond = actor.getModifiedCond()
            this.actorCond.textContent = i18n.conds_titles.cond(actor.getModifiedCond().value, cond.maximum, cond.slope);
            let qt = actor.getModifiedQt()
            this.actorQt.textContent = i18n.conds_titles.qt(qt.value, qt.maximum, qt.slope);
            let energy = actor.getModifiedEnergy()
            this.actorEnergy.textContent = i18n.conds_titles.energy(energy.value, energy.maximum, energy.slope);
            this.actorMoves.textContent = i18n.characs.move_earth + ' ' + actor.moveEarth
                + ' ' + i18n.characs.move_water + ' ' + actor.moveAir
                + (actor.moveAir ? ' ' + i18n.characs.move_air + ' ' + actor.moveAir : '');
            this.inventory.textContent = i18n.furnitures + ' ' + this.zone3D.zone.actorCell.inventory.length;
        }
        super.update(now);
    }

    setZone(zone3D: Zone3D | null) {

        this.zone3D = zone3D;
        if (zone3D) {
            // this.actionsViewer.setTile(zone3D.actorTile);
            // this.actionsViewer.setTarget(zone3D.zone, zone3D.zone.actorCell);
            this.update(Date.now());
            this.container.style.visibility = 'visible';
        }
        else {
            //  this.actionsViewer.setTile(null);
            this.container.style.visibility = 'hidden';
        }
    }
}

class TargetCellHtmlCard extends HtmlCard {

    private cell?: Cell
    private terrainName: HTMLParagraphElement
    private distanceToActor: HTMLParagraphElement
    private inventoryLength: HTMLParagraphElement
    private beingCard: TargetEntityHtmlCard;

    constructor(parentNode: HTMLElement) {
        super();

        console.warn('NEW TARGETCELL');

        this.container = document.createElement('div');
        parentNode.appendChild(this.container);
        this.container.id = 'TargetCellCard';

        this.terrainName = this.appendText();
        this.terrainName.addEventListener('click', () => {
            console.log('hide target card');
            this.unsetCell();
        })
        this.distanceToActor = this.appendText();
        this.inventoryLength = this.appendText();
        this.actionsViewer = new HtmlActionViewer(this.container);
        this.beingCard = new TargetEntityHtmlCard(this.container);
    }

    update(now: number) {
        if (this.cell) {

            let cell = this.cell;

            let terrainName = i18n.terrain_names[cell.cellType] || i18n.terrain_names[CellType.InderteminateCell];
            this.terrainName.textContent = terrainName + ' ' + i18n.vegetation(cell.vegetation, Constants.MAX_VEGETATION);
            this.distanceToActor.textContent = i18n.distance(cell.getD2A()) + ' ' + i18n.theta[cell.getA4A()] + ' (' + cell.getA4A() + ')';
            this.inventoryLength.textContent = cell.inventory.length + ' ent(s) ; ' + (cell.being ? 1 : 0) + ' being';// TODO (0) i18n.

            //  this.drawInventory();
        }
        super.update(now);
    }

    setCell(zone: RelZone, cell: Cell) {

        this.cell = cell;
        // this.actionsViewer.setTile(tile);
        this.actionsViewer.setTarget(zone, cell);
        this.container.style.visibility = 'visible';
        if (cell.being) {
            this.beingCard.setEntity(zone, cell.being);
        }
        else {
            this.beingCard.unsetEntity();
        }

        this.update(Date.now());
    }

    unsetCell() {

        console.log('unset cell');

        this.cell = undefined;
        this.container.style.visibility = 'hidden';
        this.beingCard.unsetEntity();

        this.update(Date.now());
    }
}

class TargetEntityHtmlCard extends HtmlCard {

    private entity?: EntityInterface
    private entityName: HTMLParagraphElement

    constructor(parentNode: HTMLElement) {
        super();

        this.container = document.createElement('div');
        parentNode.appendChild(this.container);
        this.container.id = 'TargetEntityCard';

        this.entityName = this.appendText();
        this.actionsViewer = new HtmlActionViewer(this.container);
    }

    update(now: number) {
        if (this.entity) {
            this.entityName.textContent = this.entity instanceof Agent ? this.entity.name + ' (agent) ' : '(entTODO)';
        }
        super.update(now);
    }

    setEntity(zone: RelZone, entity: EntityInterface) {

        this.entity = entity;
        this.actionsViewer.setTarget(zone, entity);
        this.container.style.visibility = 'visible';
        this.update(Date.now());
    }

    unsetEntity() {
        this.entity = undefined;
        this.actionsViewer.unsetTarget();
        this.container.style.visibility = 'hidden';

        this.update(Date.now());

    }
}

