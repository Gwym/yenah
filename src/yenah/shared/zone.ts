import { dbg } from "../../services/logger";
import { SpaceRef, TimeRef, ActorRef, AgentIdOptions, FurnitureIdDao, CellDao, IndirectEntityIdentifier, AgentInterface, Cell, FurnitureInterface, CellIdentifier, World, Agent, Constants, CollectionId, ItemIdentifier, EntityInterface, AttributeEventInterface } from "./concept";


export interface ZoneDao extends SpaceRef, TimeRef, ActorRef {
    agents: AgentIdOptions[]
    furnitures: FurnitureIdDao[]
    cells: CellDao[]
}

export interface RelZoneDao extends ZoneDao {   // implements EntityManager
    actorGId: IndirectEntityIdentifier
    /*
    //   defaultTerrainType: CellType
    // entities: EntityDao[]
    agents: AgentIdDao[]
    furnitures: FurnitureIdDao[]
    cells: CellDao[] */
}

// class Zone : Actor's viewpoint
export abstract class Zone implements TimeRef, SpaceRef {

    actorOriginalUpdateDH: number // cache value for client side only
    snapshotDH: number

    originX: number // originX and originY ~ const 0 for RelZone
    originY: number

    actor: AgentInterface
    actorCell: Cell
    cellPool: Map<string, Cell>// { [index: string]: Cell | undefined } // index : CellIdentifier().toIdString() 
    furniturePool: Map<string, FurnitureInterface> // { [index: string]: FurnitureInterface } // index: FurnitureItemIdentifier
    agentPool: Map<string, AgentInterface> // { [index: string]: AgentInterface } // index: AgentItemIdentifier

    /*   abstract fillMissingCells(): void
       abstract getCell(targetSelector: CellTargetSelector): CoreCell */

    constructor(zoneDao: ZoneDao) { // needs to set originX and originY before constructor }

        this.snapshotDH = zoneDao.snapshotDH;
        this.originX = zoneDao.originX ? zoneDao.originX : 0;
        this.originY = zoneDao.originY ? zoneDao.originY : 0;

        this.cellPool = new Map<string, Cell>();
        this.furniturePool = new Map<string, FurnitureInterface>();
        this.agentPool = new Map<string, AgentInterface>();

        let stringCellId: string;
        let cell: Cell | undefined;

        for (let i = 0; i < zoneDao.cells.length; i++) {

            let cellGist = zoneDao.cells[i];
            stringCellId = new CellIdentifier(cellGist.posX, cellGist.posY).toIdString();
            this.cellPool.set(stringCellId, World.CellFactory(cellGist));
        }

        // fillMissing is used to filter furnitures and agents on distance (circle radius) because database query is a square zone
        this.fillMissingCells();

        // Fill with agents
        for (let i = 0; i < zoneDao.agents.length; i++) {

            let agentDao: AgentIdOptions = zoneDao.agents[i];
            stringCellId = new CellIdentifier(agentDao.varAttr.posX, agentDao.varAttr.posY).toIdString();

            cell = this.cellPool.get(stringCellId);

            if (cell) {

                let agent = World.AgentFactory(agentDao);
                this.agentPool.set(agent.gId.iId, agent);
                cell.setBeing(agent);

                if (agent.gId.iId === zoneDao.actorGId.iId) {
                    this.actorCell = cell;
                    this.actor = agent;
                }
            }
            else {
                // TODO (1) : do not create all cells, but dynamicaly create required ones ? radius pb.
                dbg.log('skip agent not in circular zone');
            }
        }

        // Fill with furnitures
        for (let i = 0; i < zoneDao.furnitures.length; i++) {

            let furnitureDao: FurnitureIdDao = zoneDao.furnitures[i];
            stringCellId = new CellIdentifier(furnitureDao.varAttr.posX, furnitureDao.varAttr.posY).toIdString();

            let cell = this.cellPool.get(stringCellId);

            if (cell) {
                let furniture = World.FurnitureFactory(furnitureDao);
                this.furniturePool.set(furniture.gId.iId, furniture);
                // TODO : (1) entity.parentEntity.addToInventory(entity);
                cell.pushFurniture(furniture);
            }
            else {
                // TODO (1) : do not create all cells, but dynamicaly create required ones ? radius pb.
                dbg.log('skip agent not in circular zone');
            }
        }

        // stabilize zone

        console.assert(this.actor instanceof Agent, 'CoreZone.init > Invalid actor in gist ' + zoneDao.actorGId); // The actor should be in zonegist.agents
        this.actorOriginalUpdateDH = this.actor.updateDH;

        // TODO (2) : Ephemeris, Sun position for directional light
    }


    isStableUpTo(newUpdateDH: number) {

        let isStable = true

        for (let agent of this.agentPool.values()) {
            if (agent.getNextCriticalEvent(newUpdateDH)) {
                isStable = false
                break
            }
        }

        if (isStable) {
            for (let furniture of this.furniturePool.values()) {
                if (furniture.getNextCriticalEvent(newUpdateDH)) {
                    isStable = false
                    break
                }
            }
        }
    }

    stabiliseAt(newUpdateDH: number): void {

        // FIXME : do not stabilise, but getNextEvent ... 
        // stabilise first ?

        // let currentSnapshotDH = this.snapshotDH
        // let nextEvent: AttributeEventInterface | undefined
        let nextEvents: AttributeEventInterface[]
        let events: AttributeEventInterface[] = []

        for (let furniture of this.furniturePool.values()) {
            nextEvents = furniture.stabiliseAt(newUpdateDH)
            if (nextEvents.length) {
                events.push(...nextEvents)
            }
        }

        for (let agent of this.agentPool.values()) {
            nextEvents = agent.stabiliseAt(newUpdateDH)
            if (nextEvents.length) {
                events.push(...nextEvents)
            }
        }

        // TODO (0) : cell stabilisation
        /*
        for (let cell of this.cellPool.values()) {
            cell.stabiliseUpTo(newUpdateDH);
        }
        }*/
    }

    fillMissingCells() {
        // Fill missing cells with default terrain

        let viewRadius = Constants.MAX_VISION_RADIUS;
        let cell: Cell | undefined;
        let cellId: string;

        for (let ix = -viewRadius; ix <= viewRadius; ix++) {
            for (let iy = -viewRadius; iy <= viewRadius; iy++) {

                if (Math.sqrt(ix * ix + iy * iy) <= viewRadius) {

                    cellId = new CellIdentifier(this.originX + ix, this.originY + iy).toIdString();
                    cell = this.cellPool.get(cellId);
                    if (!cell) {
                        cell = World.CellFactory({ cellType: World.defaultCellType, posX: this.originX + ix, posY: this.originY + iy });
                        this.cellPool.set(cellId, cell);
                    }
                }
            }
        }
    }

    // abstract getTarget(absId: AbsIdentifier): Target
    /*   getTarget(absId: AbsIdentifier): Target {
   
           let target: Target;
   
           if (absId.cId === CollectionId.Cell) {
               target = this.getCell(absId.iId); // FIXME : receive relcellid !!
           }
           else { // if (cmd.targetSelector.collId === CollectionId.Furniture || cmd.targetSelector.collId === CollectionId.Agent ) {
               target = this.getEntity(absId.iId);
           }
   
           // TODO (1) : getCOD 
   
           return target;
   
       } */

    getCellFromRelPos(relX: number, relY: number): Cell {

        let cellIdentifier = new CellIdentifier(relX + this.originX, relY + this.originY);
        let absCellIdentifier = cellIdentifier.toIdString();

        let cell = this.cellPool.get(absCellIdentifier);

        if (cell) {
            return cell;
        }

        throw 'cell not found ' + relX + ' ' + relY;
    }

    getEntity(cId: CollectionId, iId: ItemIdentifier): EntityInterface {

        let entity: EntityInterface | undefined;

        if (cId === CollectionId.Furniture) {
            entity = this.furniturePool.get(iId);
        }
        else if (cId === CollectionId.Agent) {
            entity = this.agentPool.get(iId);
        }

        if (entity === undefined) {
            throw 'entity no found cId:' + cId + ' iId:' + iId;
        }

        return entity;
    }
}

// Relative Zone
export class RelZone extends Zone {

    /*   getTarget(absId: AbsIdentifier): Target {
  
         let target : Target;
  
          if (absId.cId === CollectionId.Cell) {
                     target = this.getCell(absId.iId); // FIXME : receive relcellid !!
                 }
                 else { // if (cmd.targetSelector.collId === CollectionId.Furniture || cmd.targetSelector.collId === CollectionId.Agent ) {
                     target = this.getEntity(absId.iId);
                 }  
  
                 // TODO (1) : getCOD 
  
         return target;
  
     } */
}