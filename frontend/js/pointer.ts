
// MouseEvent.buttons value (down, move)
const MouseLeftButtons = 1;
const MouseRightButtons = 2;
const MouseMiddelButtons = 4;

// MouseEvent.button value (up)
const MouseLeftButton = 0;
const MouseRightButton = 1;
const MouseMiddelButton = 2;

class Pointer {

    // defaut configuation : left click => drag (orbit camera)
    controls = { dragButton: MouseLeftButton, dragButtons: MouseLeftButtons, orbitSensibility: 3 }
    canvas: HTMLCanvasElement
    eventTarget: EventTarget
    engine: ClientEngine
    originX: number
    originY: number
    currentTheta = 0
    dragging = false

    raycaster: THREE.Raycaster

    constructor(engine: ClientEngine, canvas: HTMLCanvasElement, eventTarget: EventTarget) {
        this.canvas = canvas;
        this.eventTarget = eventTarget;
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
    }

    static toCardIdStr(id: TransientIdentifier | IndirectionItemIdentifier): string {
        return 'Card_' + id;
    }

    connectEventHandlers() {

        let mouse2D = new THREE.Vector2();

        this.eventTarget.addEventListener('mousemove', (event: MouseEvent) => {

            // ui.addInfo('mousemove ' + event.clientX + ' ' + event.clientY, false, 500 );

            event.preventDefault();

            // Mouse drag => Orbit camera
            if (event.buttons & this.controls.dragButtons) {

                if (!this.dragging) {
                    this.dragging = true;
                }

                // Note: draging amplitude is relative to document size, not to canvas size
                let deltaTheta = (this.originX - event.clientX) / window.innerWidth * this.controls.orbitSensibility;

                let theta = this.currentTheta + deltaTheta;
                var cam = this.engine.camera;
                cam.position.x = Math.cos(theta) * this.engine.cameraRadius;
                cam.position.y = Math.sin(theta) * this.engine.cameraRadius;
                this.engine.camera.lookAt(new THREE.Vector3());

                // console.log('MOV deltaX: ' + (this.originX - event.clientX) + ' deltatheta: ' + deltaTheta +
                //      ' theta : ' + this.currentTheta + 'rad => ' + (this.currentTheta * 180 / Math.PI) +
                //      '° pos:' + this.engine.camera.position.x + ' ' + this.engine.camera.position.y);

            }

            // Mouse hover => Select cell

            let scene = this.engine.activeZone3D;

            if (scene) {

                // mouse2D.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);
                mouse2D.set(((event.clientX - this.canvas.offsetLeft) / this.canvas.clientWidth) * 2 - 1,
                    - ((event.clientY - this.canvas.offsetTop) / this.canvas.clientHeight) * 2 + 1);

                this.raycaster.setFromCamera(mouse2D, this.engine.camera);

                var intersects = this.raycaster.intersectObjects(scene.intersectors);

                if (intersects.length > 0) {

                    var intersect = intersects[0];

                    scene.cursorTileSelector.position.copy(intersect.point).add(intersect.face.normal);
                    scene.cursorTileSelector.position.divideScalar(Tile.SIZE).round().multiplyScalar(Tile.SIZE);
                    scene.cursorTileSelector.position.z += Tile.SIZE / 2;

                    scene.cursorTileSelector.visible = true;
                    (<Tile>intersect.object).viewInHoverCard();
                }
                else {
                    scene.cursorTileSelector.visible = false;
                }
            }

            this.engine.renderOnce();

        }, false);

        this.eventTarget.addEventListener('mousedown', (event: MouseEvent) => {

            event.preventDefault();

            // Mouse drag => orbit camera

            if (!this.dragging && (event.buttons & this.controls.dragButtons)) {
                this.originX = event.clientX;
                this.originY = event.clientY;
                // machine.event(StartDrag);
            }

        }, false);

        this.eventTarget.addEventListener('mouseup', (event: MouseEvent) => {

            event.preventDefault();

            if (event.button === this.controls.dragButton) {

                if (this.dragging) {
                    this.dragging = false;
                    let deltaTheta = (this.originX - event.clientX) / window.innerWidth * this.controls.orbitSensibility
                    this.currentTheta += deltaTheta;
                    // machine.event(EndDrag);
                }
                else {
                    // ui.mouseup(event);
                    // machine.event(LeftClick);

                    // Mouse hover => Select cell

                    let scene = this.engine.activeZone3D;

                    if (scene) {

                        // mouse2D.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);
                        mouse2D.set(((event.clientX - this.canvas.offsetLeft) / this.canvas.clientWidth) * 2 - 1,
                            - ((event.clientY - this.canvas.offsetTop) / this.canvas.clientHeight) * 2 + 1);

                        this.raycaster.setFromCamera(mouse2D, this.engine.camera);

                        var intersects = this.raycaster.intersectObjects(scene.intersectors);

                        if (intersects.length > 0) {

                            var intersect = intersects[0];

                            scene.targetTileSelector.position.copy(intersect.point).add(intersect.face.normal);
                            scene.targetTileSelector.position.divideScalar(Tile.SIZE).round().multiplyScalar(Tile.SIZE);
                            scene.targetTileSelector.position.z += Tile.SIZE / 2;
                            scene.targetTileSelector.visible = true;
                            this.engine.renderOnce();

                            let tile: Tile = <Tile>intersect.object;
                            ui.mainScene.setCellTargetCard(tile.zone, tile.cell);
                        }
                    }
                }
            }
        }, false);

        this.eventTarget.addEventListener('wheel', (event: WheelEvent) => {

            event.preventDefault();

            if (event.deltaY < 0) {
                if (this.engine.camera.zoom < 32) {
                    this.engine.camera.zoom++;
                }
            }
            else if (this.engine.camera.zoom > 1) {
                this.engine.camera.zoom--;
            }

            this.engine.camera.updateProjectionMatrix();
            this.engine.renderOnce();

        }, false);


        // mousedown === touchstart mousemove === touchmove mouseup === touchend

        this.eventTarget.addEventListener('touchstart', (event: TouchEvent) => {
            ui.addInfo('touchstart '  + event.touches.length + ' ' + event.touches[ 0 ].pageX + ' ' + event.touches[ 0 ].pageY);
        });

        this.eventTarget.addEventListener('touchmove', (event: TouchEvent) => {
            ui.addInfo('touchmove ' + event.touches.length + ' ' + event.touches[ 0 ].pageX + ' ' + event.touches[ 0 ].pageY, false, 500 );
        });
    }




    /*   private static handleDrop(e: DragEvent) {
   
           let receptacle: HTMLElement = <HTMLElement>e.target;
   
           if (e.stopPropagation) {
               e.stopPropagation();
           }
           console.log('drop');
           console.log(e.dataTransfer.getData('text'));
   
           var el: HTMLElement = <HTMLElement>document.getElementById(e.dataTransfer.getData('text'));
   
           if (el && el.parentNode) {
               el.parentNode.removeChild(el);
               receptacle.appendChild(el);
               // receptacle.firstChild.insertBefore(el, receptacle.firstChild);
           }
   
           return false;
       } */

    // TODO (2) : multiple selection, checkbox on each card ?

    static makeDraggable(element: HTMLElement) {
        console.log('make draggable' + element.id);
        element.draggable = true;

        element.addEventListener('dragstart', function (e: DragEvent) {

            let card = <CardWrapper> this;
            let data: string;
            // console.log('dragstart ' + card.id + ' isPilotable: ' + card.isPilotable + ' id:' + card.id);
            card.style.opacity = '0.5';
            if (card.transId !== undefined) { // ~ if (card.isPilotable) {
                (<HTMLElement>document.getElementById('piloted')).className = 'pilotedHighlight';
                data = (<PilotableCardWrapper>card).transId.toString();
            }
            else if (card.indirectId !== undefined) { // ~ if (card.isPiloted) {
                (<HTMLElement>document.getElementById('pilotable')).className = 'pilotableHighlight';
                data = card.indirectId;
            }
            else {
                throw 'card (this) is not a valid CardWrapper';
            }

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', data);
        }, false);

        element.addEventListener('dragend', function (e: DragEvent) {

            let card: CardWrapper = <CardWrapper>this;
            //  console.log('dragend ' + card.id + ' isPilotable: ' + card.isPilotable);
            this.style.opacity = '';
            (<HTMLElement>document.getElementById('piloted')).className = 'pilotedStandard';
            (<HTMLElement>document.getElementById('pilotable')).className = 'pilotableStandard';
            // e.dataTransfer.clearData();  // FIXME firefox exception

        }, false);
    }

    // sceneBeing

    static makeDroppable(element: HTMLElement) {

        element.draggable = false;

        element.addEventListener('drop', function (e: DragEvent) {

            if (e.stopPropagation) { e.stopPropagation(); }
            if (e.preventDefault) e.preventDefault();

          //  let cardTransId: TransientIdentifier = parseInt(e.dataTransfer.getData('text/plain'));
            let cardId: string = e.dataTransfer.getData('text/plain');

            let destinationDeck = this;
            //  console.log('drop destination:' + destinationDeck.id + ' cardId: ' + cardId + ' target:' + (<HTMLElement>e.target).id);

            let card: CardWrapper = <CardWrapper>document.getElementById(cardId);
            if (card) {
                e.dataTransfer.dropEffect = 'move';

                let sourceDeck: HTMLElement = <HTMLElement>card.parentNode;
                if (sourceDeck) {

                    if (destinationDeck.id === 'piloted' && card.transId !== undefined) { // ~ && card.isPilotable

                        /*    console.log('transfer ' + card.id + ' (pilotable) from ' + sourceDeck.id + ' to ' + destinationDeck.id );
                            card.isPilotable = false;
                            card.className = 'pilotedCard';
                            sourceDeck.removeChild(card);
                            if (destinationDeck.firstChild) {
                                destinationDeck.insertBefore(card, this.firstChild);
                            }
                            else {
                                destinationDeck.appendChild(card);
                            } */
                        ui.switchToMainScene();
                        ui.startSplash(ui.beingsScene);
                        let requestSetPilot: SetPilotRequest = { type: MessageTypeYenah.SetPilot, pilotableToSet: [card.transId] };
                        G_channel.send(requestSetPilot);
                    }
                    else if (destinationDeck.id === 'pilotable' && card.indirectId !== undefined ) { // ~ && card.isPiloted

                        /*   console.log('transfer ' + card.id + ' (piloted) from ' + sourceDeck.id + ' to ' + destinationDeck.id );
                           card.isPilotable = true;
                           card.className = 'pilotableCard';
                           sourceDeck.removeChild(card);
                           if (destinationDeck.firstChild) {
                               destinationDeck.insertBefore(card, this.firstChild);
                           }
                           else {
                               destinationDeck.appendChild(card);
                           } */
                        ui.switchToMainScene();
                        ui.startSplash(ui.beingsScene);
                        let requestSetPilot: SetPilotRequest = { type: MessageTypeYenah.SetPilot, pilotedToUnset: [card.indirectId] };
                        G_channel.send(requestSetPilot);
                    }
                    /* else {
                         console.log('skip ' + card.id  + ' from ' + sourceDeck.id + ' to ' + destinationDeck.id );
                     } */

                }
                else {
                    console.error('drop > deck not found');
                    //   e.dataTransfer.dropEffect = 'none';
                }

            }
            else {
                console.error('drop > card not found');
                //  e.dataTransfer.dropEffect = 'none';
            }

            return false;
        }, false);

        element.addEventListener('dragover', function (e: DragEvent) {

            if (e.stopPropagation) { e.stopPropagation(); }
            if (e.preventDefault) e.preventDefault(); // allow to drop

            /*   let cardId = e.dataTransfer.getData('text/plain');
   
               let destinationDeck = this;
               console.log('dragover this:' + destinationDeck.id
                   + ' cardId: ' + cardId
                   + ' target:' + (<HTMLElement>e.target).id);
   
               let card: CardWrapper = <CardWrapper>document.getElementById(cardId);
               if (card) {
                   e.dataTransfer.dropEffect = 'move';
                   console.log('dragover card:' + card.id + ' isPilotable ' + card.isPilotable);
               }
               else {
                   e.dataTransfer.dropEffect = 'none';
               }
   */

            e.dataTransfer.dropEffect = 'move';
            // element.className = 'over'; 

            return false;
        }, false);

        element.addEventListener('dragenter', function (e: DragEvent) {

            if (e.stopPropagation) { e.stopPropagation(); }
            if (e.preventDefault) e.preventDefault();

            let element: HTMLElement = <HTMLElement>e.target;

            // element.className = 'over';
            //  e.dataTransfer.dropEffect = 'move';

            return false;
        }, false);

        element.addEventListener('dragleave', function (e: DragEvent) {

            if (e.stopPropagation) { e.stopPropagation(); }
            if (e.preventDefault) e.preventDefault();

            let element: HTMLElement = <HTMLElement>e.target;

            // element.className = 'over';
            //  e.dataTransfer.dropEffect = 'move';

            return false;
        }, false);

        element.addEventListener('dblclick', function (e) {

            let card: CardWrapper = <CardWrapper>e.target;

            ui.switchToMainScene();
            ui.startSplash(ui.beingsScene);

            if (card.transId !== undefined) {
                let requestSetPilot: SetPilotRequest = { type: MessageTypeYenah.SetPilot, pilotableToSet: [card.transId] };
                G_channel.send(requestSetPilot);
            }
            else if (card.indirectId !== undefined) {
                let requestSetPilot: SetPilotRequest = { type: MessageTypeYenah.SetPilot, pilotedToUnset: [card.indirectId] };
                G_channel.send(requestSetPilot);
            }
            else {
                throw 'card is not a valid CardWrapper';
            }
        })
    }
}

interface CardWrapper extends HTMLElement {
    // isPilotable: boolean | undefined
    transId?: TransientIdentifier
    indirectId?: IndirectionItemIdentifier 
}

interface PilotableCardWrapper extends CardWrapper {
    // isPilotable: true
    transId: TransientIdentifier
    indirectId: undefined
}

interface PilotedCardWrapper extends CardWrapper {
    // isPilotable: false
    transId: undefined
    indirectId: IndirectionItemIdentifier 
}

