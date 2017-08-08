

// main.ts

// FIXME (0) : global interdependance => injection ? engine.onReady ?
var ui: HtmlUI;
//var G_regionRenderer: RegionRenderer;
var G_store: Store;
var G_channel: Channel;
var G_engine: ClientEngine;

/* window.addEventListener("beforeunload", function (e) {

    console.log('beforeunload' + performance.navigation.type);

  var confirmationMessage = "\o/";

  e.returnValue = confirmationMessage;     // Gecko, Chrome 34+
  return confirmationMessage;              // Gecko, WebKit, Chrome <34
}); */

function createChannel() {

    console.log('yenah > Protocol version: ' + websocketProtocolVersion);

    let loc = window.location;

    // if (loc.protocol === "https:") { ws_uri = "wss:"; } else { ws_uri = "ws:"; } ws_uri += "//" + loc.host + "/";

    let wsUri: string;
    if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
        wsUri = "ws://" + loc.host + "/";
    } else {
        wsUri = "ws://" + loc.hostname + ":8080/";
    }

    let sessionId = getUserSessionId();

    if (!sessionId) {
        console.log('createChannel > No sessionId ' + sessionId);
        let confirmRedirection = true; // TODO (2) : DRY configuration
        redirect('index.html', ToStringId.SessionError, confirmRedirection);  // switchToScene(ui.loginScene); 
        throw 'no session id';
    }

    G_channel = new Channel({ wsUri: wsUri, requireAuth: true, protocol: websocketProtocolVersion });
}

// called in yenah.html@onload
function createEngine() {

    let eventTarget: EventTarget;

    /* let canvas2D = <HTMLCanvasElement>document.getElementById('canvasUI');
 
     if (canvas2D) {
         ui = new CanvasUi(canvas2D);
         eventTarget = canvas2D;
     }
     else {
         ui = new HtmlUI(document.body);
         eventTarget = document;
     } */

    ui = new HtmlUI(document.body);
    eventTarget = document;

    ui.setSize(window.innerWidth, window.innerHeight);

    createChannel();

    // G_regionRenderer = new RegionRenderer();
    G_store = new Store();

    let canvasWebGl = <HTMLCanvasElement>document.getElementById('canvasWebGl');
    G_engine = new ClientEngine(canvasWebGl, eventTarget);

    // FIXME (0) : engine.onReady ? 
    /* console.log('initial piloted request');
    let requestPilot: PilotRequest = {
        type: MessageType.ReqPilot,
        piloted: { limit: 20 }
    };
    G_channel.send(requestPilot); */
}

// logger.ts

interface ClientLogger {
    log(s: any): void
    info(s: string): void
    warn(s: string): void
    error(a: any): void
    attr(s: string): void
    assert(test: boolean, msg: string): void

    // Utility functions
    // toStr(o: any): string // object to string
    // t2d(t: number): string // timestamp to string
}


// TODO (1) : remote dbg : error, assert, throw, catch...

var dbg: ClientLogger = {
    log(a: any) {
        console.log(a);
    },
    info(s: string) {
        console.info(s);
    },
    warn(s: string) {
        console.warn(s);
    },
    error(s: string) {
        console.error(s);
    },
    attr(s: string) {
        //console.log(s);
    },
    assert(test: boolean, msg: string) {
        console.assert(test, msg);
    }
}

// engine.ts

interface WorldUIDefinition {
    tileContructor: { [index: number]: typeof Tile }  // TileConstructorDictionary
    entity3DConstructor: { [index: number]: string /*typeof Entity3D*/ } // Entity3dConstructorDictionary
    cardUrl: (string | undefined)[]
    TileFactory: (zone: Zone, cell: Cell) => Tile
    ActionViewerFactory: (actId: ActId, zone: Zone, target: Target) => ActionViewer
    getModelUrl: (classId: ConceptClass) => string
    getCardUrl: (classId: ConceptClass) => string
}

var WorldUI: WorldUIDefinition = {
    tileContructor: [],
    entity3DConstructor: [],
    cardUrl: [],
    TileFactory: function (zone: Zone, cell: Cell): Tile {

        let tileConstructor = WorldUI.tileContructor[cell.cellType];

        if (!tileConstructor) {
            tileConstructor = Tile;
        }

        return new tileConstructor(zone, cell);
    },
    ActionViewerFactory: function (actId: ActId, zone: Zone, target: Target): ActionViewer {

        let actionConstructor = World.actionContructor[actId];

        if (!actionConstructor) {
            actionConstructor = CoreAction;
        }

        let action = new actionConstructor(actId, zone, target);
        return new ActionViewer(action);
    },
    getModelUrl(classId: ConceptClass): string {
        let url = WorldUI.entity3DConstructor[classId];
        if (!url) {
            dbg.error('WorldUI.getModelUrl > Missing ' + classId);
            url = 'indeterminate';
        }
        return '../models/' + url + '.json';
    },
    getCardUrl(classId: ConceptClass): string {
        let url = WorldUI.cardUrl[classId];
        if (!url) {
            dbg.error('WorldUI.getCardUrl > Missing ' + classId);
            url = 'indeterminate';
        }
        return 'url(../cardz/' + url + '.jpg)';

    }
}

WorldUI.tileContructor[CellType.InderteminateCell] = Tile;
WorldUI.tileContructor[CellType.CellEarth] = TileEarth;
WorldUI.tileContructor[CellType.CellSand] = TileSand;
WorldUI.tileContructor[CellType.CellShallowWater] = TileShallowWater;
WorldUI.tileContructor[CellType.CellDeepWater] = TileDeepWater;

// TODO (1) : load from configuration, load from persistor or implicit for (let cid of ConceptClass) { ... = cid + '.json'; cid + 'jpg'} ?

WorldUI.entity3DConstructor[ConceptClass.IndeterminateEntity] = 'indeterminate_entity';
WorldUI.entity3DConstructor[ConceptClass.Rock] = 'rock';
WorldUI.entity3DConstructor[ConceptClass.Slug] = 'slug';
WorldUI.entity3DConstructor[ConceptClass.Sheep] = 'sheep';
WorldUI.entity3DConstructor[ConceptClass.BarbarianF] = 'barbarian_f';


// TODO : (5) composite creatures
// full ? agents only (sparse) ? colors ? size ?  ...

WorldUI.cardUrl[ConceptClass.IndeterminateEntity] = 'indeterminate';
WorldUI.cardUrl[ConceptClass.Slug] = 'slug';
WorldUI.cardUrl[ConceptClass.Sheep] = 'sheep';
WorldUI.cardUrl[ConceptClass.BarbarianF] = 'barbarian_f';

// interface Zone3DDictionary { [index: string]: Zone3D | undefined }
interface Zone3DLoaderDictionary { [index: string]: Zone3DLoader }

// class Engine : World representation
class ClientEngine {

    cameraRadius = 50
    cameraZ = 50
    camera: THREE.OrthographicCamera

    public activeZone3D: Zone3D | null

    private pendingMessages: string[]
    private zone3DPool: Zone3DLoaderDictionary
    private requestAnimationId: number | undefined
    private renderer: THREE.WebGLRenderer

    private pointer: Pointer

    /*  static ActionFactory(actId: ActId, zone: Zone): ActionViewer {
   
           let actionConstructor = World.actionContructor[actId];
   
           let act = new actionConstructor(actId);
   
           let actionViewer = new ActionViewer(act);
   
           return actionViewer; // TODO (1) : mixin
       }
   
       static EntityFactory(entityGist: EntityGist): RelEntity {
   
           // TODO : (3) Entity (indeterminate) = f(actor visibility)
   
           let entityConstructor = World.entityConstructor[entityGist.entId];
   
           if (!entityConstructor) {
               entityConstructor = RelEntity;
           }
   
           return new entityConstructor(entityGist);
       } */

    constructor(canvasWebGl: HTMLCanvasElement, eventTarget: EventTarget) {

        // TODO (1) : activer pilote ou afficher profil sur switchToScene
        // TODO (1) : viewReports ; DB stats => action cost ; autres actions ; page html init 0 piloted, n piloted, etc...');
        // TODO (2) : transformer les messages en ***Updater pour garder les symbols clean pour les objets réels

        // onServerMessage
        // tous les messages doivent comporter l'heure serveur, le numéro de message pour suivi des transactions ?
        // ou uniquement pour les messages de type zone ?
        // types de message :
        // chat (user-user) , Engine (user-universe) 

        // si on envoie un report de changement seul
        // (impossible de savoir si c'est la zone active chez le client ! utile d'envoyer le corps de 
        // zone uniquement si on l'a en cache ? ) non, envoyer mise à jour, événements, 
        // si la zone est active envoie une requête automatiquement pour obtenir le pointofview

        // this.pendingMessages = [];
        //  this.zonePool = [];
        this.zone3DPool = {};
        this.activeZone3D = null;
        // this.requestAnimationId = undefined;

        // this.container = document.getElementById("canvas_container");//
        // document.createElement('div');
        // document.body.appendChild(this.container);

        // this.renderer = new THREE.WebGLRenderer({ premultipliedAlpha: true });
        let cwgl = { canvas: canvasWebGl, context: canvasWebGl.getContext('webgl', { alpha: true }) };
        if (!cwgl.context) {
            ui.addInfo(i18n.detector.webgl, true, 10000);
            throw 'WebGl not supported';
        }

        this.renderer = new THREE.WebGLRenderer(cwgl);


        //  canvas: <HTMLCanvasElement>document.getElementById("three_canvas"),
        //  antialias: true
        // ,preserveDrawingBuffer : true
        // });

        // document.body.appendChild(this.renderer.domElement);
        // (<HTMLDivElement>document.getElementById('sceneContainer')).appendChild(this.renderer.domElement)

        this.renderer.setPixelRatio(window.devicePixelRatio);
        let canvasSizeX = window.innerWidth;
        let canvasSizeY = window.innerHeight;
        this.renderer.setSize(canvasSizeX, canvasSizeY);

        this.pointer = new Pointer(this, canvasWebGl, eventTarget);

        // this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera = new THREE.OrthographicCamera(canvasSizeX / - 2,
            canvasSizeX / 2,
            canvasSizeY / 2,
            canvasSizeY / - 2,
            1, 2000);
        this.camera.zoom = 8;
        this.camera.updateProjectionMatrix();

        this.pointer.currentTheta = Math.PI / 4; // initial angle of view
        var x = Math.round(Math.cos(this.pointer.currentTheta) * this.cameraRadius);
        var y = Math.round(Math.sin(this.pointer.currentTheta) * this.cameraRadius);
        this.camera.position.set(x, y, this.cameraZ);
        this.camera.up = new THREE.Vector3(0, 0, 1);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        window.addEventListener('resize', () => { this.onWindowResize(); });

        this.pointer.connectEventHandlers();

        // this.startAnimation(); // TODO : render in onmove, etc or anim ?
        // this.renderOnce();
    }


    onWindowResize() {

        console.log('onWindowResize ' + window.innerWidth + ' ' + window.innerHeight);
        // this.camera.aspect = window.innerWidth / window.innerHeight; // perspective only

        ui.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        let canvasSizeX = window.innerWidth;
        let canvasSizeY = window.innerHeight;
        this.renderer.setSize(canvasSizeX, canvasSizeY);

        this.camera.left = canvasSizeX / - 2;
        this.camera.right = canvasSizeX / 2;
        this.camera.top = canvasSizeY / 2;
        this.camera.bottom = canvasSizeY / - 2;

        this.camera.updateProjectionMatrix();
        this.renderOnce();
    }

    startAnimation() {
        if (this.requestAnimationId) {
            console.error('Engine.startAnimation > Animation pending');
        } else {
            this.animate();
        }
    }

    stopAnimation() {
        if (this.requestAnimationId) {
            window.cancelAnimationFrame(this.requestAnimationId);
            delete this.requestAnimationId;
        } else {
            console.warn('Engine.stopAnimation > No animation');
        }
    }

    private animate() {

        this.requestAnimationId = requestAnimationFrame(() => { this.animate() });

        if (this.activeZone3D) {
            this.renderer.render(this.activeZone3D, this.camera);
        } else {
            console.warn('engine.animate > no scene3D');
        }
    }

    renderOnce() {
        if (this.activeZone3D) {
            // dbg.log('renderOnce');
            this.renderer.render(this.activeZone3D, this.camera);
        }
        // else { dbg.log('Engine.renderOnce > no activeZone3D '); } 
    }

    onPilotedPool(pilotedPool: AgentIdRelOptions[]) {

        this.zone3DPool = {};

        if (pilotedPool.length === 0) {
            console.log('TODO : onPilotedPoool > No piloted zone, switch to scene beings only if firsttime or display message ');
            // if (firstTime)  { ui.addInfo(i18n.choose_creatures, false, 15000); }
        } else {
            console.log('onPilotedPool > zones:' + pilotedPool.length);
            for (let agentRelGist of pilotedPool) {
                let scene3DLoader = new Zone3DLoader(agentRelGist);
                this.zone3DPool[agentRelGist.indId] = scene3DLoader;
            }
        }

        ui.mainScene.refreshPiloted(this.zone3DPool);
        // TODO (5) : refresh only if active or pending ?
        ui.beingsScene.refreshPiloted(this.zone3DPool);
    }

    switchToZone(newZone: Zone3D) {
        // if same zone, do nothing
        if (this.activeZone3D === newZone) {
            console.log('Engine.switchToZone > Zone is already active : ' + this.activeZone3D.zone.actor.name);
            return;
        }

        ui.switchToMainScene();

        // in all other cases, inactivate current zone to reload
        if (this.activeZone3D) {
            this.activeZone3D.inactivate();
        }

        this.activeZone3D = newZone;
        this.activeZone3D.activate();
    }

    onZoneGist(zoneGist: RelZoneDao) {

        let zone3DLoader = this.zone3DPool[zoneGist.actorGId.iId];
        if (zone3DLoader) {
            zone3DLoader.onZoneGist(zoneGist);
        }
        else {
            report('Engine.onZoneGist > No loader ' + zoneGist.actorGId.iId);
        }
    }



    tick() {
        // for (let entities of zone) {
        // entity.update();
        // entiy.live();
        // flatten actor.action * targets.reactions 
        // actScore[i] = action.heuristic(context, actor, target); // get best action and do it
        // }
    }
}

interface AgentGIdRelDao extends AgentIdOptions, AgentIdRelOptions { }

function Imagination() {

    console.log('yenah > Imagination');

    let eventTarget: EventTarget;

    // let canvas2D = <HTMLCanvasElement>document.getElementById('canvasUI');

   //  if (canvas2D) { ui = new CanvasUi(canvas2D); eventTarget = canvas2D; }
   // else {
        ui = new HtmlUI(document.body);
        eventTarget = document;
  //  }

    ui.setSize(window.innerWidth, window.innerHeight);

    // G_regionRenderer = new RegionRenderer();
    G_store = new Store();

    // Channel creation
    let loc = window.location;

    // if (loc.protocol === "https:") { ws_uri = "wss:"; } else { ws_uri = "ws:"; } ws_uri += "//" + loc.host + "/";

    /*  let wsUri: string;
      if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
          wsUri = "ws://" + loc.host + "/";
      } else {
          wsUri = "ws://" + loc.hostname + ":8080/";
      }
      G_channel = new Channel({ wsUri: wsUri, requireAuth: true, protocol: yenahProtocolVersion }); */

    let canvasWebGl = <HTMLCanvasElement>document.getElementById('canvasWebGl');
    G_engine = new ClientEngine(canvasWebGl, eventTarget);

    setTimeout(function () { ui.stopSplash(); }, 1000);

    let createAgent = function (indId: string, name: string, classId: ConceptClass, posX: number, posY: number, direction: Direction): AgentGIdRelDao {

        let agent: AgentGIdRelDao = {
            indId: indId,
            gId: new IndirectEntityIdentifier(indId),
            classId: classId,
            name: name,
            varAttr: {
                posX: posX,
                posY: posY,
                qt: 10,
                energy: 10,
                stomach: 10,
                updateDH: 0,
                theta: direction,
                cond: 10
            }
        };

        return agent;
    }

    let pilotedz: AgentGIdRelDao[] = [
        createAgent('0', 'crea0', ConceptClass.Slug, 0, 0, Direction.W),
        createAgent('1', 'crea1', ConceptClass.Sheep, 1, 1, Direction.NW),
        createAgent('2', 'crea2', ConceptClass.BarbarianF, 2, 2, Direction.N)

    ];

    G_engine.onPilotedPool(pilotedz);

    for (let idx in pilotedz) {

        let zoneGist: RelZoneDao = {
            actorGId: pilotedz[idx].gId,
            snapshotDH: 0,
            originX: 0,
            originY: 0,
            agents: pilotedz,
            furnitures: [],
            cells: []
        }

        G_engine.onZoneGist(zoneGist);

    }

}