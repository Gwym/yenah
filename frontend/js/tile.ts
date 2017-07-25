"use strict";

function $(name: string) {

}

/* class RegionRenderer {

    region: CoreRegion = new CoreEarthRegion()

    
} */

// class Tile ~ CellRenderer : graphical wrapper for Cell
class Tile extends Entity3D {

    static SIZE = 10
    cell: Cell // TODO (2) : private, getter for attributes
    zone: RelZone
  //  private reactions: ActionViewer[]
  //  card: HTMLDivElement | null

  static Factory(zone: RelZone, cellGist: CellDao): Tile {

        let cell = World.CellFactory(cellGist);
       // scene3D.zone.pushCell(cell); // TODO (5) : only used for actorCell detection for now

        let tileConstructor = WorldUI.tileContructor[cellGist.cellType];

        if (!tileConstructor) {
            tileConstructor = Tile;
        }

        return new tileConstructor(zone, cell);
    }

    constructor(zone: RelZone,
        cell: Cell,
        texture: THREE.Texture = G_store.getTexture('textures/tile.png')
       // ,terrain?: string = i18n.terrain.indeterminate
    ) {

        let material = new THREE.MeshBasicMaterial({ map: texture });
        let geometry = new THREE.PlaneBufferGeometry(Tile.SIZE, Tile.SIZE);

        super(geometry, material);

       // this.card = null;
        this.cell = cell;
        this.zone = zone;
        this.position.set(cell.posX * Tile.SIZE, cell.posY * Tile.SIZE, 0);
        

     //   for (let actGist of cell.reactions) {
     //       this.reactions.push(ActionViewer.ActFactory(actGist, scene.zone, this.cell));
     //   }

    }

    viewInHoverCard() {
        // TODO (5) : viewInHoverCard, mobile hover howto ?
    }
}

class TileEarth extends Tile {

    constructor(zone: RelZone, cell: CellEarth) {

        let texture: THREE.Texture;

        if (cell.vegetation > 4) {
            texture = G_store.getTexture('textures/grass.jpg');
        }
        else {
            texture = G_store.getTexture('textures/soil.png');
        }

        super(zone, cell, texture);
    }
}

class TileSand extends Tile {

    constructor(zone: RelZone, cell: CellEarth) {

        let texture: THREE.Texture;

        texture = G_store.getTexture('textures/sand.png');

        super(zone, cell, texture);
    }
}

class TileShallowWater extends Tile {

    constructor(zone: RelZone, cell: CellShallowWater) {

        let texture: THREE.Texture;

        texture = G_store.getTexture('textures/shallowwater.png');

        super(zone, cell, texture);
    }
}

class TileDeepWater extends Tile {

    constructor(zone: RelZone, cell: CellShallowWater) {

        let texture: THREE.Texture;

        texture = G_store.getTexture('textures/deepwater.png');

        super(zone, cell, texture);
    }
}



