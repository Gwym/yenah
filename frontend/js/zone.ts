


/** class Zone3D : Zone 3D graphical wrapper */

class Zone3DLoader {

	actorId: AgentItemIdentifier
	actorName: string
	cardUrl: string
	miniCard: HTMLElement
	zone3D?: Zone3D

	constructor(actorGist: AgentIdRelOptions) {
		this.actorId = actorGist.indId;
		this.actorName = actorGist.name;
		this.cardUrl = WorldUI.getCardUrl(actorGist.classId);

		console.log('mainScene.refreshPiloted > minicard:' + this.actorName + ' url:' + this.cardUrl)

		this.miniCard = document.createElement('div');
		this.miniCard.style.backgroundImage = this.cardUrl;
		this.miniCard.addEventListener('click', () => {
			console.log('minicard click > ' + this.actorName);
			this.showZone();
		});

	}

	showZone() {

		console.log('Zone3DLoader.showZone ' + this.actorName);

		if (this.zone3D) {

			// TODO (4) : refresh button or refresh timeout 
			G_engine.switchToZone(this.zone3D);

		}
		else {
			this.load();
			ui.startSplash(this);
		}
	}


	load() {
		let requestZone: ZoneRequest = { type: MessageTypeYenah.Zone, actorId: this.actorId }
		G_channel.send(requestZone);
	}

	onZoneGist(zoneGist: RelZoneDao) {

		console.log('Zone3DLoader.onZoneGist > ' + zoneGist.actorGId);

		let zone = new RelZone(zoneGist);

		this.zone3D = new Zone3D(zone);

		if (ui.pendingScene === this) {
			G_engine.switchToZone(this.zone3D);
			// FIXME (1) : async render, on model onload end
			G_engine.renderOnce();
		}
	}


	/*	activate() {
			console.log('activate actor ' + this.actorId + ' point of view');
		}
	
		inactivate() {
			// TODO (5) : cancel loading
		} */
}

// class Zone3D : Actor's viewpoint (graphical wrapper)
class Zone3D extends THREE.Scene {

	//	actorId: string
	//	actorName: string
	//	actorTile: Tile
	zone: RelZone
	//	tilePool : { [index: string]: Tile } = {}; // TileDictionary
	intersectors: Tile[] = []
	targetTileSelector: THREE.LineSegments
	cursorTileSelector: THREE.LineSegments

	constructor(zone: RelZone) {
		super()

		this.zone = zone

		let pointerCoord = false; // Tile selector as cube or arrowHelper TODO : (5) user options

		for (let cell of zone.cellPool.values()) {
			let tile = WorldUI.TileFactory(zone, cell)
			this.intersectors.push(tile)
			this.add(tile)
		}

		// TODO (2) : Fill missing cells with default terrain or populate all cells ins zone ?


		// Fill with entities
		this.fillEntities(zone.agentPool);
		this.fillEntities(zone.furniturePool);

		// finaly, set the actor of this zone
		/*	this.actorTile = tiles[relPosToId(0,0)];
			//	this.zone.actor = this.actorTile.cell.being;
			this.actorName = this.actorTile.cell.being.name;
			this.zone.setActorCell(this.actorTile.cell);
			
			console.assert(this.zone.actor._id === this.actorId); // The actor should be the being in cell [0,0] */

		// this.targetTileSelector = new THREE.Mesh(new THREE.EdgesGeometry( new THREE.BoxBufferGeometry(Tile.SIZE - 10, Tile.SIZE - 10 , Tile.SIZE -10), 90),
        /* this.targetTileSelector = new THREE.Mesh(new THREE.BoxBufferGeometry(Tile.SIZE - 10, Tile.SIZE - 10 , Tile.SIZE -10),
              new THREE.MeshBasicMaterial({
                  color: 0x00ff00,
                  wireframe: true
              })
          );*/

		this.targetTileSelector = new THREE.LineSegments(
			new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(Tile.SIZE * 0.9, Tile.SIZE * 0.9, Tile.SIZE * 0.9), 1),
			new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 }));
		this.targetTileSelector.position.z = Tile.SIZE / 2 - 5;
		this.targetTileSelector.visible = false;
		this.add(this.targetTileSelector);

		//let cursorBasicMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, opacity: 0.3, transparent: true });
		// let cursorBasicMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 1 });
		/*  let cursorPhongMaterial = new THREE.MeshPhongMaterial({
			  color: 0xff0000,
			  polygonOffset: true,
			  polygonOffsetFactor: 1, // positive value pushes polygon further away
			  polygonOffsetUnits: 1
		  }); */
		let boxGeometry = new THREE.BoxBufferGeometry(Tile.SIZE, Tile.SIZE, Tile.SIZE);
		this.cursorTileSelector = new THREE.LineSegments(
			new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(Tile.SIZE, Tile.SIZE, Tile.SIZE), 1), //boxGeometry,
			new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 1 }));
		if (pointerCoord) {
			let orig = new THREE.Vector3(-Tile.SIZE / 2, -Tile.SIZE / 2, -Tile.SIZE / 2);
			let arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), orig, Tile.SIZE, 0xff0000);
			(<THREE.LineBasicMaterial>arrow.line.material).linewidth = 2;
			this.cursorTileSelector.add(arrow);
			arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), orig, Tile.SIZE / 2, 0x00ff00);
			(<THREE.LineBasicMaterial>arrow.line.material).linewidth = 2;
			this.cursorTileSelector.add(arrow);
			arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), orig, Tile.SIZE / 2, 0x0000ff);
			(<THREE.LineBasicMaterial>arrow.line.material).linewidth = 2;
			this.cursorTileSelector.add(arrow);
		} else {
			this.cursorTileSelector.add(new THREE.LineSegments(
				new THREE.EdgesGeometry(boxGeometry, 1),
				new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })));
		}
		this.cursorTileSelector.visible = false;
		this.add(this.cursorTileSelector);


        /*this.cursorTileSelector = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(Tile.SIZE, Tile.SIZE, Tile.SIZE), 1),
            new THREE.LineDashedMaterial({ color: 0xff0000, linewidth: 2, scale: 10, dashSize: 10, gapSize: 10 }));
      //  (this.cursorTileSelector.geometry).computeLineDistances();
        this.cursorTileSelector.position.z = Tile.SIZE / 2;
        this.add(this.cursorTileSelector); */

		// x => Red, y: Lime, z: Blue
		this.add(new THREE.ArrowHelper(
			new THREE.Vector3(1, 0, 0),
			new THREE.Vector3(0, 0, 0),
			10, 0xff0000));
		this.add(new THREE.ArrowHelper(
			new THREE.Vector3(0, 1, 0),
			new THREE.Vector3(0, 0, 0),
			10, 0x00ff00));
		this.add(new THREE.ArrowHelper(
			new THREE.Vector3(0, 0, 1),
			new THREE.Vector3(0, 0, 0),
			10, 0x0000ff));

		// Lights // TODO : (4) sun position, ephemeris, lamps...
		var ambientLight = new THREE.AmbientLight(0xa0a0a0);
		// var ambientLight = new THREE.AmbientLight(0xffffff);
		this.add(ambientLight);

		var directionalLight = new THREE.DirectionalLight(0x808080);
		directionalLight.position.set(1, 0.75, 0.5).normalize();
		this.add(directionalLight);

		G_engine.renderOnce();
	}

	addEntity3D(entity: Entity3D) {

		console.log('addEntity ' + entity.name);
		this.add(entity);
	}

	fillEntities(pool: Map<string, EntityInterface>) {
		for (let entity of pool.values()) {

			// TODO : (1) entity.parentEntity.addEntity(entity);
			//	stringCellId = relPosToId(entity.relX, entity.relY);
			//	tile = tiles[stringCellId];
			//	tile.pushEntity(entity);

			let modelUrl = WorldUI.getModelUrl(entity.entType);

			console.log('Store> getModel ' + ConceptClass[entity.entType])

			G_store.getModel(modelUrl, (model: Entity3D) => {

				let scale = Tile.SIZE; // TODO : (3) scale = f(age)

				model.geometry.computeVertexNormals();
				model.scale.set(scale, scale, scale);

				model.geometry.computeBoundingBox();
				model.position.set(entity.posX * Tile.SIZE, entity.posY * Tile.SIZE, -model.geometry.boundingBox.min.y * scale);
				model.rotateY((2 - entity.theta) * Math.PI / 4);
				let bb = model.geometry.boundingBox;
				let po = model.position;
				console.log(ConceptClass[entity.entType] + ' : ' + po.x + ',' + po.y + ',' + po.z
					+ ' (' + bb.min.x + ',' + bb.min.y + ',' + bb.min.z + ') ' + ' (' + bb.max.x + ',' + bb.max.y + ',' + bb.max.z + ') ');
				model.name = ConceptClass[entity.entType]; // three.js scene debug

				this.addEntity3D(model);
			})

		}
	}

	/*	addIntersector(tile: Tile) {
	
			this.tilePool.push(tile);
			this.add(tile);
		}*/

	hoverItem(selectedItem: THREE.Mesh) {
		this.cursorTileSelector.visible = true;
		this.cursorTileSelector.position.x = selectedItem.position.x;
		this.cursorTileSelector.position.z = selectedItem.position.z;
	}

	focusItem(selectedItem: THREE.Mesh, _game: ClientEngine) {

		console.log('Scene.focusItem ' + selectedItem);
        /*   UI.empty('infoBoxContent');
           var cell = selectedItem.tile.cell;
   
           if (!cell) {
               console.error('no cell');
               return;
           }
   
           if (!cell.viewAsCard) {
               console.error('no viewAsCard in ' + cell.arrayMapping.jid);
               return;
           }
   
           if (!game.currentActiveZone) {
               console.error('no currentActiveZone in game');
               return;
           } 
   
   
           cell.viewAsCard(game.currentActiveZone); */

		// TODO : (2) save camera position
		// this.camera.fov = 40;
		// this.camera.updateProjectionMatrix();
        /* for (var tileId in this.tileMap) {
            if (this.tileMap[tileId] !== selectedItem) {
                this.tileMap[tileId].visible = false;
            }
        }*/
	}

	blurItem() {
		this.cursorTileSelector.visible = false;
	}

	activate() {
		console.log('Zone3D > activate zone3d ' + this.zone.actor.gId.iId);
		ui.mainScene.setActorCardTile(this);
		// TODO ui.mainscene.reset show cards
	}

	inactivate() {
		ui.mainScene.setActorCardTile(null);
		// TODO ui.mainscene.reset cards
	}
}
