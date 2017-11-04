import { dbg } from '../../services/logger'
import { Constants, ActId, FailId, EntityInterface, FurnitureInterface, AgentInterface, Cell, Target, Damage } from './concept'
import { Zone } from "./zone";

interface Costs {
    qt: number,
    energy: number
}

export class ActionReport {

    // now: number
    fails: FailId[]
    costs: Costs
    all: boolean

    constructor(/*now: number, */checkAll = false, fails?: FailId[], costs?: Costs) {
        // this.now = now;
        this.all = checkAll;
        this.fails = fails || [];
        this.costs = costs || { qt: 0, energy: 0 }
    }

    toString() {
        return 'fails:' + this.fails.length + ' costs:' + this.costs;
    }
}

export class CoreAction {

    actId: ActId
    zone: Zone
    target: Target

    defaultQtCost = 10;
    defaultEnergyCost = 1;

    constructor(actId: ActId, zone: Zone, target: Target) {

        this.actId = actId;
        this.zone = zone;
        this.target = target;
    }

    protected checkRangeIs1(ctx: ActionReport): boolean {

        if (this.target.getD2A(this.zone.originX, this.zone.originY) !== 1) {
            ctx.fails.push(FailId.RangeIs1);
            return ctx.all;
        }

        return true;
    }

    protected getCosts(): Costs {
        return {
            qt: this.defaultQtCost,
            energy: this.defaultEnergyCost
        }
    }

    protected checkActorQtEnergyCosts(ctx: ActionReport): boolean {

        let costs = this.getCosts()

        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;

        if (ctx.costs.qt > this.zone.actor.getModifiedQt().value) {
            ctx.fails.push(FailId.Qt);
        }

        if (ctx.costs.energy > this.zone.actor.getModifiedEnergy().value) {
            ctx.fails.push(FailId.Energy);
        }

        if (ctx.fails.length) {
            return ctx.all;
        }

        return true;
    }

    // abstract  check: (ctx: ActionContext) => ActionContext
    check(ctx: ActionReport): ActionReport {
        ctx.fails.push(FailId.NoAct);
        return ctx;
    }

    doAction(ctx: ActionReport): ActionReport {
        ctx.fails.push(FailId.NoAct);
        return ctx;
    }


    /* checkArray() {
        let checks: { (fails?: FailId[]): boolean }[] = [];
        let globalSuccess = true;

        for (let i in checks) {
            let success = checks[i]();
            if (!success && !fails) {
                  return false; // return on first fail
            }
            globalSuccess = success;
        }

        return globalSuccess; 
    }*/
}

/*
TODO (5) : class Objective ? ex : movto => aim to increase posX  eat : aim to decrease hunger

see UNL

AoA : ActOnAgent
AoC : ActOnCell
AoF : ActOnFurniture

use : PREHENSIL AoF (use inHand) AoA (use inHand on ...) ~ attack if it's a weapon
equip : PREHENSIL AoF (set as inHand)
desequip : PREHENSIL (uset as inHand, but put where ??? ) Meta => auto-consequence of (throw(), lay(), put()) + object broken
throw : PREHENSIL AoC (throw in cell) AoA (throw on ...) (AoF throw inHand, but where ???) ~ attack
give : PREHENSIL AoA (give to ...) AoF (give inHand sousentendu to the one at reach)
take; pick : PREHENSIL AoF (pick up) AoA => AoF AoC giving direction of sousentendu ?
lay : PREHENSIL AoC (lay on cell) AoF (lay sousentendu in front of self)
put : PREHENSIL AoF (put in inventory) AoA ~ give  AoC ~ lay
steal

attack : AoA (attack ... with what ?? => attack(weapon))
        AoF : try to broke ?
        AoC : give direction of attack ? 
destroy AoF

move to (walk, run, swim, fly, ...)
jump to (over ? over hole, over obstacle)

class MetaAction
build : move take move lay ex: builde Nest

eat : graze, eat inHand, eat (nearby food)
"mobile mouth" => bring mouth to meal
prehension => "fixed mouth" => bring meal to mouth
*/


export class ActOnCell extends CoreAction {

    target: Cell

    protected checkCellCanWelcome(ctx: ActionReport, entity: EntityInterface): boolean {

        if (!this.target.canWelcome(entity)) {
            ctx.fails.push(FailId.CannotWelcome);
            return ctx.all;
        }

        return true;
    }
}

export class ActMoveTo extends ActOnCell {

    // FIXME (0) : costs should be negative ?!
    protected getCosts(): Costs {

        let actorCell = this.zone.actorCell;
        let actor = this.zone.actor

        let outcost_T = actorCell.getMoveCostT(actor);
        let incost_T = this.target.getMoveCostT(actor);
        let outcost_E = actorCell.getMoveCostE(actor);
        let incost_E = this.target.getMoveCostE(actor);

        return { qt: (outcost_T + incost_T), energy: (outcost_E + incost_E) * Math.ceil(actor.getWeight() / Constants.GA_AGENT_MIN_COND) };
    }

    check(ctx: ActionReport): ActionReport {

        this.checkRangeIs1(ctx) &&
            this.checkCellCanWelcome(ctx, this.zone.actor) &&
            this.checkActorQtEnergyCosts(ctx);

        return ctx;
    }

    doAction(ctx: ActionReport): ActionReport {

        let actor = this.zone.actor;

        // TODO (2) : souvenirs
        dbg.log(actor.name
            + ' ' + actor.posX + ' ' + actor.posY
            + ' MOVETO ' + this.target.posX + ' ' + this.target.posY);

        actor.posX = this.target.posX;
        actor.posY = this.target.posY;

        let costs = this.getCosts()
        actor.modifyQt(-costs.qt)
        actor.modifyEnergy(-costs.energy)

        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;

        return ctx;
    }
}

export class ActTurnTo extends ActOnCell {

    protected getCosts(): Costs {

        let actorCell = this.zone.actorCell;
        let actor = this.zone.actor

        let outcost_T = 0;
        let outcost_E = 0;

        let newTheta = this.target.getA4A(actor.posX, actor.posY);
        let fractionOfTurn = Math.abs(actor.theta - newTheta);
        dbg.log('Turn fraction: ' + fractionOfTurn);

        if (fractionOfTurn > 4) { // only cost if more than quater of a turn
            outcost_T = actorCell.getMoveCostT(actor) / 16 * fractionOfTurn;
            outcost_E = actorCell.getMoveCostE(actor) / 16 * fractionOfTurn;
        }

        return { qt: (outcost_T), energy: (outcost_E) * Math.ceil(actor.getWeight() / Constants.GA_AGENT_MIN_COND) };
    }

    protected checkDirectionIsDifferent(ctx: ActionReport): boolean {
        
        let actor = this.zone.actor
        let newTheta = this.target.getA4A(actor.posX, actor.posY)

        if (actor.theta === newTheta) {
            ctx.fails.push(FailId.SameDirection)
            return false
        }
        return true
    }

    check(ctx: ActionReport): ActionReport {

        this.checkDirectionIsDifferent(ctx) &&
        this.checkActorQtEnergyCosts(ctx);

        return ctx;
    }

    doAction(ctx: ActionReport): ActionReport {

        let actor = this.zone.actor;

        let newTheta = this.target.getA4A(actor.posX, actor.posY);
        // TODO (2) : souvenirs
        dbg.log(actor.name
            + ' ' + actor.posX + ' ' + actor.posY
            + ' TURNTO ' + this.target.posX + ' ' + this.target.posY
            + ' th ' + actor.theta + ' => ' + newTheta);
        actor.theta = newTheta;

        let costs = this.getCosts()
        actor.modifyQt(-costs.qt)
        actor.modifyEnergy(-costs.energy);

        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;

        return ctx;
    }
}

abstract class ActOnFurniture extends CoreAction {

    target: FurnitureInterface
    costQt = 0
    costEnergy = 0

    protected checkCanContain(ctx: ActionReport, container: EntityInterface): boolean {

        if (!container.canContain(this.target)) {
            ctx.fails.push(FailId.CannotContain);
            return ctx.all;
        }

        return true;
    }

    /* checkCanBeBroken(): boolean {
         
         if (this.target.solidity) {
             return true;
         }
 
 
         return false;
     } */

}

// TODO (5) : Pick left or pick right for two handed, and what with "multi-handed" creatures ? 

export class ActPickUp extends ActOnFurniture {

    check(ctx: ActionReport): ActionReport {

        // FIXME (0) : allow for multiple beings on one cell
        // this.checkCellCanWelcome(ctx, this.zone.actor) &&
        // TODO (0) : check weight
        this.checkRangeIs1(ctx) &&
        
            this.checkActorQtEnergyCosts(ctx);

        return ctx;
    }

    doAction(ctx: ActionReport): ActionReport {

        let actor = this.zone.actor;
        this.target.posX = actor.posX;
        this.target.posY = actor.posY;
        // this.target.parentId = actor._id;
        // TODO (2) : hand, backpack ... inventoryRef ?

        let costs = this.getCosts()
        actor.modifyQt(- costs.qt)
        actor.modifyEnergy(- costs.energy)

        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;

        return ctx;
    }

}

// TODO (1) : actFuniture on cell or ActCell on furniture ?

// throw toward, give to agent, lay on floor, put in inventory
/*class ActLayDown extends ActOnCell {

check(ctx: ActionContext): ActionContext {

        this.checkRangeIs1(ctx) ||
            this.checkCellCanWelcome(ctx, this.zone.actor.getFurnitureInHand()) ||
            this.checkActorQtEnergyCosts(ctx);

        return ctx;
    }

    doAction(ctx: ActionContext): ActionContext {

        l;
        this.target.posX = actor.posX;
        this.target.posY = actor.posY;
        this.target.parentId = actor._id;

        let costs = this.getCosts()
        actor.setQt(actor.getQt(ctx.now) - costs.qt, ctx.now);
        actor.setEnergy(actor.getEnergy(ctx.now) - costs.energy, ctx.now);

        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;

        return ctx;
    }

} */

abstract class ActOnAgent extends CoreAction {

    target: AgentInterface
    COD: FurnitureInterface // TODO (2) : cod ?

    checkCanReceive(): boolean {

        if (this.target.canReceive(this.COD)) {
            return true;
        }


        return false;
    }
}

// TODO (5) : pseudo action : "attack" = "destroy" (building) = "break" (furniture)
export class ActAttack extends ActOnAgent {

    checkCanAttack() {
        // TODO (0) : at least of attack must be > 0
        return true;
    }

    check(ctx: ActionReport): ActionReport {

        // TODO (0) : ranged attack in same act or different ?
        this.checkRangeIs1(ctx) &&
            this.checkCanAttack();

        return ctx;
    }

    doAction(ctx: ActionReport): ActionReport {

        let actor = this.zone.actor;

        let costs = this.getCosts()
        actor.modifyQt(- costs.qt)
        actor.modifyEnergy(-costs.energy)

        // TODO (5) : passive reaction, damage to weapon => other action on upper level ?
        // TODO (3) : clone on solidity and damages ?
        // let damages: Damage = actor.attack.clone();

        let totalDamages = 0;
        let tDefense = this.target.solidity;
        let damage: number;
        let defense : number | undefined;
        let damageMap = new Damage();
        for (var [k, val] of actor.attack) {
            dbg.log(k + " = " + val);
            defense = tDefense.get(k);
            if (defense === undefined) {
                defense = 0;
            }
            damage = Math.max(val - defense, 0);
            damageMap.set(k, damage);
            totalDamages += damage;
        }
        /*let damages: Damage = {
            cut: aattack.cut - tdef.cut,
            blunt: 0,
            fire: 0,
            acid: 0,
            elec: 0,
            poison: 0
        };*/


       //this.target.hurt();
       let happeningEvents = this.target.modifyCond(-totalDamages)
       dbg.log(happeningEvents.length)

        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;

        return ctx;
    }
}

// TODO (5) : pseudo action : give Furniture to Agent, implicit 'give the object in hand' to 'targetAgent'

export class ActGive extends ActOnAgent {

    check(ctx: ActionReport): ActionReport {

        // TODO (0) : check weight, check prehensil ?
        this.checkRangeIs1(ctx);

        return ctx;
    }

}

export class Opportunity {

    action: CoreAction

    constructor(action: CoreAction) {
        this.action = action;
    }


    // TODO (0) : client side only !!!
    /*   getActionRequest(): ActionRequest {
   
           let actionRequest: ActionRequest = {
               type: MessageType.Action,
               actId: this.action.actId,
               actorId: this.action.zone.actor.gId.iId,
               expectedUpdateDH: this.action.zone.updateDH
           }
           if (this.action.target.gId instanceof EntityIdentifier) {
               actionRequest.targetEntityId = this.action.target.gId.iId
           }
           else if (this.action.target.gId instanceof CellIdentifier) {
               actionRequest.targetCellSelector = { x: this.action.target.gId.x, y: this.action.target.gId.y }
           }
   
           return actionRequest;
       } */

    toString() {
        return ActId[this.action.actId] + '(' + this.action.actId + ') '; // + this.action.target.gId;
    }
}


