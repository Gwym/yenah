"use strict";
class ActionReport {
    constructor(checkAll = false, fails, costs) {
        this.all = checkAll;
        this.fails = fails || [];
        this.costs = costs || { qt: 0, energy: 0 };
    }
    toString() {
        return 'fails:' + this.fails.length + ' costs:' + this.costs;
    }
}
class CoreAction {
    constructor(actId, zone, target) {
        this.defaultQtCost = 10;
        this.defaultEnergyCost = 1;
        this.actId = actId;
        this.zone = zone;
        this.target = target;
    }
    checkRangeIs1(ctx) {
        if (this.target.getD2A(this.zone.originX, this.zone.originY) !== 1) {
            ctx.fails.push(FailId.RangeIs1);
            return ctx.all;
        }
        return true;
    }
    getCosts() {
        return {
            qt: this.defaultQtCost,
            energy: this.defaultEnergyCost
        };
    }
    checkActorQtEnergyCosts(ctx) {
        let costs = this.getCosts();
        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;
        if (ctx.costs.qt > this.zone.actor.qt) {
            ctx.fails.push(FailId.Qt);
        }
        if (ctx.costs.energy > this.zone.actor.energy) {
            ctx.fails.push(FailId.Energy);
        }
        if (ctx.fails.length) {
            return ctx.all;
        }
        return true;
    }
    check(ctx) {
        ctx.fails.push(FailId.NoAct);
        return ctx;
    }
    doAction(ctx) {
        ctx.fails.push(FailId.NoAct);
        return ctx;
    }
}
class ActOnCell extends CoreAction {
    checkCellCanWelcome(ctx, entity) {
        if (!this.target.canWelcome(entity)) {
            ctx.fails.push(FailId.CannotWelcome);
            return ctx.all;
        }
        return true;
    }
}
class ActMoveTo extends ActOnCell {
    getCosts() {
        let actorCell = this.zone.actorCell;
        let actor = this.zone.actor;
        let outcost_T = actorCell.getMoveCostT(actor);
        let incost_T = this.target.getMoveCostT(actor);
        let outcost_E = actorCell.getMoveCostE(actor);
        let incost_E = this.target.getMoveCostE(actor);
        return { qt: (outcost_T + incost_T), energy: (outcost_E + incost_E) * Math.ceil(actor.getWeight() / Constants.GA_AGENT_MIN_COND) };
    }
    check(ctx) {
        this.checkRangeIs1(ctx) &&
            this.checkCellCanWelcome(ctx, this.zone.actor) &&
            this.checkActorQtEnergyCosts(ctx);
        return ctx;
    }
    doAction(ctx) {
        let actor = this.zone.actor;
        dbg.log(actor.name
            + ' ' + actor.posX + ' ' + actor.posY
            + ' MOVETO ' + this.target.posX + ' ' + this.target.posY);
        actor.posX = this.target.posX;
        actor.posY = this.target.posY;
        let costs = this.getCosts();
        actor.qt = actor.qt - costs.qt;
        actor.energy = actor.energy - costs.energy;
        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;
        return ctx;
    }
}
class ActTurnTo extends ActOnCell {
    getCosts() {
        let actorCell = this.zone.actorCell;
        let actor = this.zone.actor;
        let outcost_T = 0;
        let outcost_E = 0;
        let newTheta = this.target.getA4A(actor.posX, actor.posY);
        let fractionOfTurn = Math.abs(actor.theta - newTheta);
        dbg.log('Turn fraction: ' + fractionOfTurn);
        if (fractionOfTurn > 4) {
            outcost_T = actorCell.getMoveCostT(actor) / 16 * fractionOfTurn;
            outcost_E = actorCell.getMoveCostE(actor) / 16 * fractionOfTurn;
        }
        return { qt: (outcost_T), energy: (outcost_E) * Math.ceil(actor.getWeight() / Constants.GA_AGENT_MIN_COND) };
    }
    check(ctx) {
        this.checkActorQtEnergyCosts(ctx);
        return ctx;
    }
    doAction(ctx) {
        let actor = this.zone.actor;
        let newTheta = this.target.getA4A(actor.posX, actor.posY);
        dbg.log(actor.name
            + ' ' + actor.posX + ' ' + actor.posY
            + ' TURNTO ' + this.target.posX + ' ' + this.target.posY
            + ' th ' + actor.theta + ' => ' + newTheta);
        actor.theta = newTheta;
        let costs = this.getCosts();
        actor.qt = actor.qt - costs.qt;
        actor.energy = actor.energy - costs.energy;
        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;
        return ctx;
    }
}
class ActOnFurniture extends CoreAction {
    constructor() {
        super(...arguments);
        this.costQt = 0;
        this.costEnergy = 0;
    }
    checkCanContain(ctx, container) {
        if (!container.canContain(this.target)) {
            ctx.fails.push(FailId.CannotContain);
            return ctx.all;
        }
        return true;
    }
}
class ActPickUp extends ActOnFurniture {
    check(ctx) {
        this.checkRangeIs1(ctx) &&
            this.checkActorQtEnergyCosts(ctx);
        return ctx;
    }
    doAction(ctx) {
        let actor = this.zone.actor;
        this.target.posX = actor.posX;
        this.target.posY = actor.posY;
        let costs = this.getCosts();
        actor.qt = actor.qt - costs.qt;
        actor.energy = actor.energy - costs.energy;
        ctx.costs.qt += costs.qt;
        ctx.costs.energy += costs.energy;
        return ctx;
    }
}
class ActOnAgent extends CoreAction {
    checkCanReceive() {
        if (this.target.canReceive(this.COD)) {
            return true;
        }
        return false;
    }
}
class ActGive extends ActOnAgent {
    check(ctx) {
        this.checkRangeIs1(ctx);
        return ctx;
    }
}
class Opportunity {
    constructor(action) {
        this.action = action;
    }
    toString() {
        return ActId[this.action.actId] + '(' + this.action.actId + ') ';
    }
}
var MatterType;
(function (MatterType) {
    MatterType[MatterType["Rock"] = 0] = "Rock";
    MatterType[MatterType["Flesh"] = 1] = "Flesh";
    MatterType[MatterType["Wood"] = 2] = "Wood";
})(MatterType || (MatterType = {}));
var ConceptClass;
(function (ConceptClass) {
    ConceptClass[ConceptClass["IndeterminateEntity"] = 0] = "IndeterminateEntity";
    ConceptClass[ConceptClass["Rock"] = 1] = "Rock";
    ConceptClass[ConceptClass["Slug"] = 2] = "Slug";
    ConceptClass[ConceptClass["Sheep"] = 3] = "Sheep";
    ConceptClass[ConceptClass["BarbarianF"] = 4] = "BarbarianF";
})(ConceptClass || (ConceptClass = {}));
var CellType;
(function (CellType) {
    CellType[CellType["InderteminateCell"] = 0] = "InderteminateCell";
    CellType[CellType["CellEarth"] = 1] = "CellEarth";
    CellType[CellType["CellSand"] = 2] = "CellSand";
    CellType[CellType["CellShallowWater"] = 3] = "CellShallowWater";
    CellType[CellType["CellDeepWater"] = 4] = "CellDeepWater";
})(CellType || (CellType = {}));
var ActId;
(function (ActId) {
    ActId[ActId["ActMoveTo"] = 0] = "ActMoveTo";
    ActId[ActId["ActTurnTo"] = 1] = "ActTurnTo";
    ActId[ActId["ActPickUp"] = 2] = "ActPickUp";
    ActId[ActId["ActLayDown"] = 3] = "ActLayDown";
    ActId[ActId["ActGive"] = 4] = "ActGive";
})(ActId || (ActId = {}));
var FailId;
(function (FailId) {
    FailId[FailId["NoAct"] = 0] = "NoAct";
    FailId[FailId["Qt"] = 1] = "Qt";
    FailId[FailId["Energy"] = 2] = "Energy";
    FailId[FailId["RangeIs1"] = 3] = "RangeIs1";
    FailId[FailId["CannotWelcome"] = 4] = "CannotWelcome";
    FailId[FailId["CannotContain"] = 5] = "CannotContain";
})(FailId || (FailId = {}));
var DynAttr;
(function (DynAttr) {
    DynAttr[DynAttr["Mass"] = 0] = "Mass";
    DynAttr[DynAttr["Cond"] = 1] = "Cond";
    DynAttr[DynAttr["Qt"] = 2] = "Qt";
    DynAttr[DynAttr["Energy"] = 3] = "Energy";
})(DynAttr || (DynAttr = {}));
var ModAttr;
(function (ModAttr) {
    ModAttr[ModAttr["CondMax"] = 0] = "CondMax";
    ModAttr[ModAttr["CondSlope"] = 1] = "CondSlope";
    ModAttr[ModAttr["EnergyMax"] = 2] = "EnergyMax";
    ModAttr[ModAttr["EnergySlope"] = 3] = "EnergySlope";
    ModAttr[ModAttr["QtMax"] = 4] = "QtMax";
    ModAttr[ModAttr["QtSlope"] = 5] = "QtSlope";
    ModAttr[ModAttr["MoveEarth"] = 6] = "MoveEarth";
    ModAttr[ModAttr["MoveWater"] = 7] = "MoveWater";
    ModAttr[ModAttr["MoveAir"] = 8] = "MoveAir";
    ModAttr[ModAttr["Solidity"] = 9] = "Solidity";
})(ModAttr || (ModAttr = {}));
var CollectionId;
(function (CollectionId) {
    CollectionId[CollectionId["Indirection"] = 0] = "Indirection";
    CollectionId[CollectionId["User"] = 1] = "User";
    CollectionId[CollectionId["Furniture"] = 2] = "Furniture";
    CollectionId[CollectionId["Agent"] = 3] = "Agent";
    CollectionId[CollectionId["Cell"] = 4] = "Cell";
    CollectionId[CollectionId["Session"] = 5] = "Session";
})(CollectionId || (CollectionId = {}));
const MS_PER_TICK = 1000;
const Constants = {
    DT: MS_PER_TICK,
    DT_IGDAY: 600 * MS_PER_TICK,
    DT_IGYEAR: 43200 * MS_PER_TICK,
    MAX_VISION_RADIUS: 4,
    MAX_VEGETATION: 127,
    NO_SLOPE: 0,
    SLOPE_ONE_PER_IRLHOUR: 1 / (MS_PER_TICK * 60),
    MAX_BEING_MASS: 10000,
    COND_MAX: 100,
    GA_AGENT_MIN_COND: 10,
    GA_MAX_MOVE_WATER: 4,
    GA_MAX_MOVE_EARTH: 4
};
const BEING_MASS = 64;
const Defaults = {
    FURNITURE_MASS: 8,
    FURNITURE_COND_SLOPE: Constants.NO_SLOPE,
    BEING_COND_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    BEING_MASS: BEING_MASS,
    FAST_MASS_SLOPE: Constants.DT_IGYEAR / BEING_MASS,
    SLOW_MASS_SLOPE: 20 * Constants.DT_IGYEAR / BEING_MASS,
    QT_MAX: 32,
    QT_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    ENERGY_MAX: 128,
    ENERGY_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    BEING_STOMACH: 10,
    MOVE_EARTH: 1,
    MOVE_WATER: 0,
    MOVE_AIR: 0,
    VEGETATION: 0
};
function setUniversalTimestep(invSlope) {
    dbg.log('setUniversalTimestep ' + invSlope);
    Defaults.QT_SLOPE = invSlope;
    Defaults.ENERGY_SLOPE = invSlope;
    Defaults.BEING_COND_SLOPE = invSlope;
}
class GenericIdentifier {
}
class CellIdentifier extends GenericIdentifier {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
        this.cId = CollectionId.Cell;
    }
    toIdString() {
        return this.x + '_' + this.y;
    }
}
var absoluteSpaceOrigin = {
    originX: 0,
    originY: 0
};
class AttributeModifier {
    mod(baseValue) { return baseValue; }
    constructor(modifierDao) {
        this.type = modifierDao.type;
        this.originDH = modifierDao.originDH;
        this.duration = modifierDao.duration;
    }
}
class CondSlopeModifier extends AttributeModifier {
    mod(baseCondSlope) {
        return -baseCondSlope;
    }
}
var ModifierConstructors = [];
ModifierConstructors[ModAttr.CondSlope] = CondSlopeModifier;
function ModifierFactory(modifierDao) {
    return new ModifierConstructors[modifierDao.type](modifierDao);
}
var Direction;
(function (Direction) {
    Direction[Direction["W"] = 0] = "W";
    Direction[Direction["NW"] = Math.PI / 4] = "NW";
    Direction[Direction["N"] = Math.PI / 2] = "N";
    Direction[Direction["NE"] = 3 * Math.PI / 4] = "NE";
    Direction[Direction["E"] = Math.PI] = "E";
    Direction[Direction["SE"] = 5 * Math.PI / 4] = "SE";
    Direction[Direction["S"] = 6 * Math.PI / 4] = "S";
    Direction[Direction["SW"] = 7 * Math.PI / 4] = "SW";
})(Direction || (Direction = {}));
class EntityIdentifier extends GenericIdentifier {
    constructor(cId, iId) {
        super();
        this.cId = cId;
        this.iId = iId;
    }
    toIdString() {
        return this.cId + '_' + this.iId;
    }
}
class IndirectEntityIdentifier extends EntityIdentifier {
    constructor(indId) {
        super(CollectionId.Indirection, indId);
        this.iId = indId;
    }
    toIdString() {
        return this.cId + '_' + this.iId;
    }
}
class EntityBase {
    constructor() {
        this.varModified = false;
        this.fullModified = false;
        this.inventory = [];
        this.modifiers = [];
        this.reactions = [];
        this._classId = ConceptClass.IndeterminateEntity;
    }
    get entType() { return this._classId; }
    get theta() { return this._theta; }
    set theta(v) { if (v !== this._theta) {
        this._theta = v;
        this.varModified = true;
    } }
    get posX() { return this._posX; }
    set posX(v) { if (v !== this._posX) {
        this._posX = v;
        this.varModified = true;
    } }
    get posY() { return this._posY; }
    set posY(v) { if (v !== this._posY) {
        this._posY = v;
        this.varModified = true;
    } }
    get cond() { return this._cond; }
    set cond(v) { if (v !== this._cond) {
        this._cond = v;
        this.varModified = true;
    } }
    get condSlope() { return this.modCondSlope; }
    get condMax() { return this._condMax; }
    get mass() { return (this._mass); }
    get updateDH() { return this._updateDH; }
    set updateDH(newUpdateDH) {
        let dt = newUpdateDH - this._updateDH;
        if (dt < 0) {
            throw 'Entity.set updateDH > Trying to reverse time. newUpdateDH ' + newUpdateDH + ' < ' + this._updateDH;
        }
        else if (dt === 0) {
            return;
        }
        this.varModified = true;
        this._updateDH = newUpdateDH;
        this.applyModifiers();
        this._cond = this.getDynNormalValue(dt, this._cond, this._condMax, this.modCondSlope);
    }
    fromOptions(opt) {
        this.reactions.push(ActId.ActPickUp, ActId.ActLayDown);
        this._classId = opt.classId;
        this.gId = opt.gId;
        this._updateDH = opt.varAttr.updateDH;
        this._posX = opt.varAttr.posX;
        this._posY = opt.varAttr.posY;
        this._theta = opt.varAttr.theta;
        this._mass = opt.mass !== undefined ? opt.mass : Defaults.FURNITURE_MASS;
        this._condSlope = opt.condSlope !== undefined ? opt.condSlope : Defaults.FURNITURE_COND_SLOPE;
        this._condMax = opt.condMax !== undefined ? opt.condMax : Constants.COND_MAX;
        this._cond = opt.varAttr.cond !== undefined ? opt.varAttr.cond : this._condMax;
        if (opt.modifiers) {
            for (let modifierDao of opt.modifiers) {
                this.addModifier(ModifierFactory(modifierDao));
            }
        }
        this.applyModifiers();
    }
    getDynNormalValue(dt, val, max, slope) {
        if (slope != Constants.NO_SLOPE) {
            val += dt * slope;
        }
        let limitedVal = val > max ? max : (val < 0 ? 0 : val);
        dbg.log('getDyn > ' + limitedVal
            + ' (max:' + 1
            + ' dh:' + this._updateDH
            + ' detaT:' + dt
            + ' slope: ' + slope
            + ' real: ' + val + ') from '
            + this.gId);
        return limitedVal;
    }
    addModifier(modifier) {
        if (modifier.originDH + modifier.duration >= this.updateDH) {
            console.error('addModifier > expired modifier');
            return;
        }
        this.modifiers.push(modifier);
        this.modifiers.sort(function (a, b) { return a.duration - b.duration; });
    }
    applyModifiers() {
        this.modCondSlope = this._condSlope;
        if (this.modifiers.length) {
            dbg.log('Entity applyModifiers :' + this.modifiers.length);
            let index = 0;
            for (let modifier of this.modifiers) {
                if (modifier.originDH + modifier.duration >= this.updateDH) {
                    this.fullModified = true;
                    this.modifiers.splice(index, 1);
                }
                else {
                    modifier.mod.call(this);
                }
                index++;
            }
        }
    }
    toVarDao() {
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond,
        };
    }
    toDao() {
        return {
            varAttr: this.toVarDao(),
            classId: this._classId,
            mass: this._mass,
            condSlope: this._condSlope
        };
    }
    pushEntity(entity) {
        this.inventory.push(entity);
    }
    getWeight() {
        return this.mass;
    }
    canContain(entity) {
        return false;
    }
    getD2A(originX = 0, originY = 0) {
        let relX = this._posX - originX;
        let relY = this._posY - originY;
        return Math.round(Math.sqrt(relX * relX + relY * relY));
    }
    getA4A(originX = 0, originY = 0) {
        let relX = this._posX - originX;
        let relY = this._posY - originY;
        let theta = 8 * Math.atan2(relX, relY) / Math.PI;
        if (theta < 0)
            theta = 16 + theta;
        if (theta > 15)
            theta = 0;
        return Math.floor(theta / 2);
    }
    asRelativeEntity(observer, relId) {
        this.gId = new IndirectEntityIdentifier(relId);
        this._posX -= observer.posX;
        this._posY -= observer.posY;
    }
}
class Furniture extends EntityBase {
    constructor(opt) {
        super();
        this.isFurniture = true;
        super.fromOptions(opt);
    }
    toIdDao() {
        let dao = this.toDao();
        dao.gId = this.gId;
        return dao;
    }
    toString() {
        return ' { class:Furniture'
            + ', dt:' + this._updateDH
            + ', cond:' + this._cond + '/' + this._condMax + '@' + this._condSlope
            + ', modCondSlope:' + this.modCondSlope
            + ' } ';
    }
}
class AgentIdentifier extends EntityIdentifier {
    constructor(iId) {
        super(CollectionId.Agent, iId);
    }
}
class Agent extends EntityBase {
    constructor(opt) {
        super();
        this.actions = [];
        this.actions.push(ActId.ActMoveTo, ActId.ActTurnTo, ActId.ActPickUp, ActId.ActLayDown);
        this.name = opt.name ? opt.name : '';
        this._massMax = opt.massMax !== undefined ? opt.massMax : Defaults.BEING_MASS;
        this._massSlope = opt.massSlope !== undefined ? opt.massSlope : Defaults.FAST_MASS_SLOPE;
        this._qtMax = opt.qtMax !== undefined ? opt.qtMax : Defaults.QT_MAX;
        this._qt = opt.varAttr.qt !== undefined ? opt.varAttr.qt : 0;
        this._qtSlope = opt.qtSlope !== undefined ? opt.qtSlope : Defaults.QT_SLOPE;
        this._energyMax = opt.energyMax !== undefined ? opt.energyMax : Defaults.ENERGY_MAX;
        this._energy = opt.varAttr.energy !== undefined ? opt.varAttr.energy : 0;
        this._energySlope = opt.energySlope !== undefined ? opt.energySlope : Defaults.ENERGY_SLOPE;
        this.moveWater = opt.moveWater !== undefined ? opt.moveWater : Defaults.MOVE_WATER;
        this.moveEarth = opt.moveEarth !== undefined ? opt.moveEarth : Defaults.MOVE_EARTH;
        this.moveAir = opt.moveAir !== undefined ? opt.moveAir : Defaults.MOVE_AIR;
        this.stomach = opt.varAttr.stomach !== undefined ? opt.varAttr.stomach : Defaults.BEING_STOMACH;
        super.fromOptions(opt);
    }
    get massSlope() { return this._massSlope; }
    get massMax() { return this._massMax; }
    get qt() { return this._qt; }
    set qt(v) { if (v !== this._qt) {
        this._qt = v;
        this.varModified = true;
    } }
    get qtSlope() { return this.modQtSlope; }
    get qtMax() { return this._qtMax; }
    get energy() { return this._qt; }
    set energy(v) { if (v !== this._energy) {
        this._energy = v;
        this.varModified = true;
    } }
    get energySlope() { return this.modEnergySlope; }
    get energyMax() { return this._energyMax; }
    get updateDH() { return this._updateDH; }
    set updateDH(newUpdateDH) {
        let dt = newUpdateDH - this._updateDH;
        if (dt < 0) {
            throw 'Entity.set updateDH > Trying to reverse time. newUpdateDH ' + newUpdateDH + ' < ' + this._updateDH;
        }
        else if (dt === 0) {
            return;
        }
        this.varModified = true;
        this._updateDH = newUpdateDH;
        this.applyModifiers();
        this._cond = this.getDynNormalValue(dt, this._cond, this._condMax, this.modCondSlope);
        this._qt = this.getDynNormalValue(dt, this._qt, this._qtMax, this.modQtSlope);
        this._energy = this.getDynNormalValue(dt, this._energy, this._energyMax, this.modEnergySlope);
    }
    toVarDao() {
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond,
            qt: this.qt,
            energy: this.energy,
            stomach: this.stomach
        };
    }
    toDao() {
        return {
            varAttr: this.toVarDao(),
            classId: this.entType,
            name: this.name,
            condMax: this.mass,
            condSlope: this.condSlope,
            qtMax: this.qtMax,
            qtSlope: this.qtSlope,
            energyMax: this.energyMax,
            energySlope: this.energySlope,
            moveWater: this.moveWater,
            moveEarth: this.moveEarth,
            moveAir: this.moveAir,
            mass: this.mass,
            massMax: this.massMax,
            massSlope: this.massSlope
        };
    }
    toIdDao() {
        let dao = this.toDao();
        dao.gId = this.gId;
        return dao;
    }
    clone() {
        let idDao = this.toDao();
        idDao.gId = this.gId;
        return World.AgentFactory(idDao);
    }
    applyModifiers() {
        this.modQtSlope = this._qtSlope;
        this.modEnergySlope = this._energySlope;
        super.applyModifiers();
    }
    canReceive(furniture) {
    }
    asRelativeEntity(observer, relId) {
        super.asRelativeEntity(observer, relId);
        if (this.name !== observer.name) {
            this.name = '';
        }
    }
    toString() {
        return ' { class:Agent'
            + ' ,name:' + this.name
            + ' ,dt:' + this._updateDH
            + ' ,cond:' + this._cond + '/' + this._condMax + '@' + this._condSlope
            + ' ,modCondSlope:' + this.modCondSlope
            + ' ,qt:' + this._qt + '/' + this._qtMax + '@' + this._qtSlope
            + ' ,modCondSlope:' + this.modQtSlope
            + ' } ';
    }
}
class Cell {
    constructor(cellDao) {
        this.fullModified = false;
        this.inventory = [];
        this.reactions = [ActId.ActMoveTo, ActId.ActTurnTo];
        this.cellType = cellDao.cellType;
        this.posX = cellDao.posX;
        this.posY = cellDao.posY;
        this._vegetation = cellDao.vegetation !== undefined ? cellDao.vegetation : Defaults.VEGETATION;
    }
    get vegetation() { return this._vegetation; }
    set vegetation(v) { if (v !== this._vegetation) {
        this._vegetation = v;
        this.fullModified = true;
    } }
    toString() {
        return '{' + CellType[this.cellType] + ', ' + this.posX + ', ' + this.posY + '}';
    }
    pushFurniture(furniture) {
        dbg.log('pushFurniture ' + furniture);
        this.inventory.push(furniture);
    }
    setBeing(being) {
        if (this.being) {
            throw 'CoreCell.setBeing : being already set';
        }
        this.being = being;
    }
    canWelcome(entity) {
        if (entity instanceof Agent) {
            return this.being === undefined;
        }
        if (entity instanceof Furniture) {
            return true;
        }
        return true;
    }
    getMoveCostT(a) {
        return Number.POSITIVE_INFINITY;
    }
    getMoveCostE(a) {
        return Number.POSITIVE_INFINITY;
    }
    getEatCostT() {
        return 1;
    }
    getEatCostE() {
        return 1;
    }
    getAgent() {
        return this.being;
    }
    getD2A(originX = 0, originY = 0) {
        let relX = this.posX - originX;
        let relY = this.posY - originY;
        return Math.round(Math.sqrt(relX * relX + relY * relY));
    }
    getA4A(originX = 0, originY = 0) {
        let relX = this.posX - originX;
        let relY = this.posY - originY;
        let theta = 8 * Math.atan2(relX, relY) / Math.PI;
        if (theta < 0)
            theta = 16 + theta;
        if (theta > 15)
            theta = 0;
        return Math.floor(theta / 2);
    }
    asRelativeEntity(observer) {
        this.posX -= observer.posX;
        this.posY -= observer.posY;
    }
    toDao() {
        let cellDao = {
            cellType: this.cellType,
            posX: this.posX,
            posY: this.posY
        };
        if (this.vegetation !== 0) {
            cellDao.vegetation = this.vegetation;
        }
        return cellDao;
    }
}
class CellEarth extends Cell {
    getMoveCostT(a) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return (Constants.GA_MAX_MOVE_EARTH - a.moveEarth) * 4;
    }
    getMoveCostE(a) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return a.moveEarth * 2;
    }
}
class CellSand extends Cell {
    getMoveCostT(a) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return (Constants.GA_MAX_MOVE_EARTH - a.moveEarth) * 4;
    }
    getMoveCostE(a) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return a.moveEarth * 2;
    }
}
class CellShallowWater extends Cell {
    getMoveCostT(a) {
        if (a.moveEarth == 0 && a.moveWater == 0)
            return Number.POSITIVE_INFINITY;
        return Math.min((Constants.GA_MAX_MOVE_EARTH - a.moveEarth) * 4, (Constants.GA_MAX_MOVE_WATER - a.moveWater) * 16);
    }
    getMoveCostE(a) {
        if (a.moveEarth == 0 && a.moveWater == 0)
            return Number.POSITIVE_INFINITY;
        return Math.min(a.moveEarth * 2, 1 << a.moveWater);
    }
}
class CellDeepWater extends Cell {
    getMoveCostT(a) {
        if (a.moveWater == 0)
            return Number.POSITIVE_INFINITY;
        return (Constants.GA_MAX_MOVE_WATER - a.moveWater) * 16;
    }
    getMoveCostE(a) {
        if (a.moveWater == 0)
            return Number.POSITIVE_INFINITY;
        return 1 << a.moveWater;
    }
}
class Zone {
    constructor(zoneDao) {
        this.snapshotDH = zoneDao.snapshotDH;
        this.originX = zoneDao.originX ? zoneDao.originX : 0;
        this.originY = zoneDao.originY ? zoneDao.originY : 0;
        this.cellPool = {};
        this.furniturePool = {};
        this.agentPool = {};
        let stringCellId;
        let cell;
        for (let i = 0; i < zoneDao.cells.length; i++) {
            let cellGist = zoneDao.cells[i];
            stringCellId = new CellIdentifier(cellGist.posX, cellGist.posY).toIdString();
            this.cellPool[stringCellId] = World.CellFactory(cellGist);
        }
        this.fillMissingCells();
        for (let i = 0; i < zoneDao.agents.length; i++) {
            let agentDao = zoneDao.agents[i];
            stringCellId = new CellIdentifier(agentDao.varAttr.posX, agentDao.varAttr.posY).toIdString();
            cell = this.cellPool[stringCellId];
            if (cell) {
                let agent = World.AgentFactory(agentDao);
                this.agentPool[agent.gId.iId] = agent;
                cell.setBeing(agent);
                if (agent.gId.iId === zoneDao.actorGId.iId) {
                    this.actorCell = cell;
                    this.actor = agent;
                }
            }
            else {
                dbg.log('skip agent not in circular zone');
            }
        }
        console.assert(this.actor instanceof Agent, 'CoreZone.init > Invalid actor in gist ' + zoneDao.actorGId);
        this.actorOriginalUpdateDH = this.actor.updateDH;
        for (let i = 0; i < zoneDao.furnitures.length; i++) {
            let furnitureDao = zoneDao.furnitures[i];
            stringCellId = new CellIdentifier(furnitureDao.varAttr.posX, furnitureDao.varAttr.posY).toIdString();
            let cell = this.cellPool[stringCellId];
            if (cell) {
                let furniture = World.FurnitureFactory(furnitureDao);
                this.furniturePool[furniture.gId.iId] = furniture;
                cell.pushFurniture(furniture);
            }
            else {
                dbg.log('skip agent not in circular zone');
            }
        }
    }
    fillMissingCells() {
        let viewRadius = Constants.MAX_VISION_RADIUS;
        let cell;
        let cellId;
        for (let ix = -viewRadius; ix <= viewRadius; ix++) {
            for (let iy = -viewRadius; iy <= viewRadius; iy++) {
                if (Math.sqrt(ix * ix + iy * iy) <= viewRadius) {
                    cellId = new CellIdentifier(this.originX + ix, this.originY + iy).toIdString();
                    cell = this.cellPool[cellId];
                    if (!cell) {
                        cell = World.CellFactory({ cellType: World.defaultCellType, posX: this.originX + ix, posY: this.originY + iy });
                        this.cellPool[cellId] = cell;
                    }
                }
            }
        }
    }
    getCellFromRelPos(relX, relY) {
        let cellIdentifier = new CellIdentifier(relX + this.originX, relY + this.originY);
        let absCellIdentifier = cellIdentifier.toIdString();
        let cell = this.cellPool[absCellIdentifier];
        if (cell) {
            return cell;
        }
        throw 'cell not found ' + relX + ' ' + relY;
    }
    getEntity(cId, iId) {
        let entity;
        if (cId === CollectionId.Furniture) {
            entity = this.furniturePool[iId];
        }
        else if (cId === CollectionId.Agent) {
            entity = this.agentPool[iId];
        }
        if (entity === undefined) {
            throw 'entity no found cId:' + cId + ' iId:' + iId;
        }
        return entity;
    }
}
class RelZone extends Zone {
}
var World = {
    defaultCellType: CellType.CellEarth,
    ActionFactory: function (actId, zone, target) {
        let actionConstructor = World.actionContructor[actId];
        if (!actionConstructor) {
            actionConstructor = CoreAction;
        }
        return new actionConstructor(actId, zone, target);
    },
    CellFactory: function (cellDao) {
        let cellConstructor = World.cellContructor[cellDao.cellType];
        if (!cellConstructor) {
            cellConstructor = Cell;
        }
        return new cellConstructor(cellDao);
    },
    FurnitureFactory: function (entityDao) {
        let furnitureConstructor = World.furnitureConstructor[entityDao.classId];
        if (!furnitureConstructor) {
            furnitureConstructor = Furniture;
        }
        return new furnitureConstructor(entityDao);
    },
    AgentFactory: function (agentDao) {
        let agentConstructor = World.agentConstructor[agentDao.classId];
        if (!agentConstructor) {
            agentConstructor = Agent;
        }
        return new agentConstructor(agentDao);
    },
    actionContructor: [],
    cellContructor: [],
    furnitureConstructor: [],
    agentConstructor: []
};
World.actionContructor[ActId.ActMoveTo] = ActMoveTo;
World.actionContructor[ActId.ActTurnTo] = ActTurnTo;
World.actionContructor[ActId.ActPickUp] = ActPickUp;
World.actionContructor[ActId.ActGive] = ActGive;
World.cellContructor[CellType.CellEarth] = CellEarth;
World.cellContructor[CellType.CellSand] = CellSand;
World.cellContructor[CellType.CellShallowWater] = CellShallowWater;
World.cellContructor[CellType.CellDeepWater] = CellDeepWater;
const websocketProtocolVersion = 'yh1';
const XJsonUrl = '/req?json=';
const cookieExpiration = 86400000;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Error"] = 0] = "Error";
    MessageType[MessageType["Registration"] = 1] = "Registration";
    MessageType[MessageType["Login"] = 2] = "Login";
    MessageType[MessageType["SessionCheck"] = 3] = "SessionCheck";
    MessageType[MessageType["User"] = 4] = "User";
    MessageType[MessageType["ReqPilot"] = 5] = "ReqPilot";
    MessageType[MessageType["SetPilot"] = 6] = "SetPilot";
    MessageType[MessageType["Zone"] = 7] = "Zone";
    MessageType[MessageType["Action"] = 8] = "Action";
    MessageType[MessageType["Admin"] = 9] = "Admin";
})(MessageType || (MessageType = {}));
var ToStringId;
(function (ToStringId) {
    ToStringId[ToStringId["UnkownCommand"] = 0] = "UnkownCommand";
    ToStringId[ToStringId["ServerError"] = 1] = "ServerError";
    ToStringId[ToStringId["DatabaseError"] = 2] = "DatabaseError";
    ToStringId[ToStringId["SessionError"] = 3] = "SessionError";
    ToStringId[ToStringId["LoginError"] = 4] = "LoginError";
    ToStringId[ToStringId["InvalidCaptcha"] = 5] = "InvalidCaptcha";
    ToStringId[ToStringId["InvalidCode"] = 6] = "InvalidCode";
    ToStringId[ToStringId["InvalidMail"] = 7] = "InvalidMail";
    ToStringId[ToStringId["DuplicateName"] = 8] = "DuplicateName";
})(ToStringId || (ToStringId = {}));
const ErrMsg = {
    UnkownCommand: { type: MessageType.Error, toStringId: ToStringId.UnkownCommand },
    ServerError: { type: MessageType.Error, toStringId: ToStringId.ServerError },
    DatabaseError: { type: MessageType.Error, toStringId: ToStringId.DatabaseError },
    SessionError: { type: MessageType.Error, toStringId: ToStringId.SessionError },
    LoginError: { type: MessageType.Error, toStringId: ToStringId.LoginError },
    InvalidCaptcha: { type: MessageType.Error, toStringId: ToStringId.InvalidCaptcha },
    InvalidCode: { type: MessageType.Error, toStringId: ToStringId.InvalidCode },
    InvalidMail: { type: MessageType.Error, toStringId: ToStringId.InvalidMail },
    DuplicateName: { type: MessageType.Error, toStringId: ToStringId.DuplicateName }
};
var AdminActId;
(function (AdminActId) {
    AdminActId[AdminActId["Information"] = 0] = "Information";
    AdminActId[AdminActId["CreateUser"] = 1] = "CreateUser";
    AdminActId[AdminActId["DeleteUsers"] = 2] = "DeleteUsers";
    AdminActId[AdminActId["ResetWorld"] = 3] = "ResetWorld";
    AdminActId[AdminActId["UnitTests"] = 4] = "UnitTests";
    AdminActId[AdminActId["IntegrationTests"] = 5] = "IntegrationTests";
})(AdminActId || (AdminActId = {}));
function checkPasswordStrenght(pwd) {
    var re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
    return re.test(pwd);
}
let spfm = function (pattern) {
    return function (...args) {
        return pattern.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] !== 'undefined' ? args[number] : '(?)';
        });
    };
};
let spf2 = function (pattern) {
    return function (v, m) {
        return pattern.replace(/{(\d+)}/g, function (match, number) {
            return number == 0 ? String(v) : String(m);
        });
    };
};
let spf3 = function (pattern) {
    return function (v, m, r) {
        return pattern.replace(/{(\d+)}/g, function (match, number) {
            if (number == 0)
                return String(v);
            else if (number == 1)
                return String(m);
            else
                return String(r);
        });
    };
};
var i18n_en = {
    global_error: 'Une erreur est survenue, veuillez nous excuser pour le désagrément.',
    welcome_name: spfm('Hello {0}'),
    welcome_no_agent_html: '<p>Vous ne possédez aucune enveloppe corporelle. Choisissez les créatures que vous souhaitez incarner grâce au bouton "incarner" :</p><br/><br/><button class="incarnate_button"></button>',
    welcome_name_short: ['Bienvenue § !', { n: 0 }],
    disconnected: 'Vous avez été déconnecté et allez être dirigé vers la page d\'identification.',
    beforeunload: 'Fermeture de la page',
    cancel: 'Annuler',
    close: 'Fermer',
    options: 'Options',
    conds: ['constitution', 'temps', 'énergie', 'mana'],
    conds_lite: { cond: 'C', qt: 'T', energy: 'E', mana: 'M' },
    conds_titles: {
        cond: spf3('Constitution {0} \/ {1} Regeneration : {2}'),
        qt: spf3('Temps {0} \/ {1} Regain : {2}'),
        energy: spf3('Energie {0} \/ {1} Regenration : {2}')
    },
    characs_entity: ['solidité'],
    characs_being: ['type d\'organisme', 'résistance tranchante\/perçante'],
    characs_group_caption: {
        solidity: 'Résistance',
        passive_retort: 'Effet passif',
        move: 'Déplacement',
        attack: 'Attaque',
        attack_remote: 'Attaque à distance',
        perception: 'Perception',
        aptitude: 'Aptitude'
    },
    characs_group_help: {
        solidity: 'Résistance',
        passive_retort: 'Effet passif',
        move: 'Déplacement',
        attack: 'Attaque au contact',
        attack_remote: 'Attaque à distance',
        perception: 'Perception',
        aptitude: 'Aptitude'
    },
    characs: {
        solidity_cut: 'Tranchante/perçante',
        solidity_blunt: 'Contondante',
        solidity_acid: 'Acide',
        solidity_fire: 'Feu',
        solidity_cold: 'Froid',
        passive_retort_cut: 'Tranchant/Perçant',
        passive_retort_acid: 'Acide',
        passive_retort_elec: 'Electrique',
        passive_retort_fire: 'Ardent',
        gist_poisoned: 'Empoisonné',
        solidity_poison: 'Poison',
        solidity_elec: 'Electrique',
        move_water: 'Aquatique',
        move_earth: 'Terrestre',
        move_air: 'Aérien',
        attack_cut: 'Tranchante/perçante',
        attack_blunt: 'Contondante',
        attack_elec: 'Electrique',
        attack_fire: 'Ardente',
        attack_blast: 'Explosion',
        attack_poisoned: 'Empoisonnement ',
        attack_remote_cut: 'Tranchante/perçante',
        attack_remote_blunt: 'Contondante',
        attack_remote_elec: 'Electrique',
        attack_remote_fire: 'Ardente',
        attack_remote_acid: 'Projection d\'acide',
        capture: 'Capacité de capture',
        capture_remote: 'Lancer de filet',
        web: 'Fabrication de toile',
        attack_bury: 'Affut enterré',
        perception_diurnal: 'Perception diurne',
        perception_nocturnal: 'Perception nocturne',
        perception_modificator: 'Mimétisme passif',
        hide: 'Camouflage',
        conscience: 'Conscience',
        communicate: 'Communication',
        prehension: 'Préhensile'
    },
    breed_type: ['autogame', 'mâle', 'femelle', 'hermaphrodite'],
    main_material_types: ['végétal', 'animal'],
    terrain_names: [],
    lifeform: 'Forme de vie',
    no_lifeform: 'Aucune forme de vie',
    furnitures: 'Objets',
    distance: spfm('Distance {0}'),
    distangle: ['Distance § ; Direction §', { dist: 0, angle: 0 }],
    direction: 'Direction : ',
    orientation: 'Orientation : ',
    theta: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
    visibility1: 'Visibilité: §',
    visibility2: ['Visibilité § \/ §', { vis: 0, vis_max: 0 }],
    vegetation: spf2('Vegetation {0} \/ {1}'),
    fertilizer: ['Fertilité § \/ §', { v: 0, m: 0 }],
    tracks: ['Traces § \/ §', { v: 0, m: 0 }],
    characs_being_test: {
        'type d\'organisme': ['végétal', 'animal'], 0: 'résistance tranchante\/perçante § \/ 2000'
    },
    acts_caption: {
        move_to: 'Y aller',
        1: 'Se tourner',
        2: 'Brouter',
        attack: 'Attaquer',
        pointofview: 'Contrôler',
        incarnate: 'Incarner',
        decohere: 'Abandonner la créature'
    },
    acts_captions: [],
    acts_helps: [],
    acts_fails: [],
    acts_costs: spf2('({0}T {1}E)'),
    acts_help: {
        move_to: 'Aller sur cette case',
        1: 'Se tourner dans cette direction',
        2: 'Consommer la végétation',
        attack: 'Attaquer',
        4: 'Prendre le contrôle direct de la créature',
        incarnate: 'Ajouter une nouvelle créature à votre cheptel',
    },
    acts_conditions: {
        distance: 'Distance d\'action',
        qt: 'Quota de temps',
        energy: 'Point d\'énergie',
        mana: 'Mana'
    },
    acts_conditions_lite: {
        same_cell: '(même case)',
        too_far: '(trop éloigné)',
        qt: '§T',
        energy: '§E',
        mana: '§M',
        direction: '(même direction)',
        cannot_move: '(Déplacement impossible)',
        cell_occupied: '(case occupée)'
    },
    acts_fail: {
        range1: 'Inaccessible',
        cannot_contain_being: 'Cell is occupied',
        qt_energy_insufficient: 'QT or energy insufficient'
    },
    input_fail: {
        wrong_identification: 'Identification incorrecte',
        invalid_format: 'Format invalide',
        login_unavailable: 'Cet identifiant est déjà utilisé',
        username_unavailable: 'Ce nom est déjà utilisé',
        too_many_tries: 'Trop d\'essais erronés, veuillez patienter quelques instants'
    },
    yf_logbook: {
        creatures: ['§ créature(s).', { n: 0 }]
    },
    new_reports: 'Nouveau(x) événement(s)',
    event_report: 'Evenements',
    no_events: 'Aucun nouvel évèvenement',
    incarnate_pilotable: 'Sélectionnez la créature avec laquelle vous souhaitez entrer en cohérence',
    incarnate_no_creature_html: '<p>Aucune créature disponible</p>',
    detector: { canvas: 'Canvas', webgl: 'WebGl', workers: 'Workers', websocket: 'WebSocket', file_protocol: 'file:// protocol not allowed' },
    loading: 'Chargement',
    websocket_connected: 'Websocket connected',
    websocket_disconnected: 'Websocket disconnected',
    limited_1_connexion: 'Vous êtes limité a une connexion WebSocket',
    x_messages: ['Unkown command', 'Server error', 'Database error', 'Session expired', 'Login error', 'Invalid captcha', 'Invalid code', 'Invalid mail', 'Name not available'],
    piloted_availables: spfm('{0} available creature(s)'),
    piloted_no_available: 'No incarnated creature',
    pilotable_availables: spfm('{0} available creature(s)'),
    pilotable_no_available: 'No available creature'
};
i18n_en.acts_captions[ActId.ActMoveTo] = 'Go to';
i18n_en.acts_helps[ActId.ActMoveTo] = 'Go to this cell';
i18n_en.acts_captions[ActId.ActTurnTo] = 'Turn to';
i18n_en.acts_helps[ActId.ActTurnTo] = 'Turn toward this direction';
i18n_en.acts_captions[ActId.ActPickUp] = 'Pick';
i18n_en.acts_helps[ActId.ActPickUp] = 'Pick ';
i18n_en.acts_captions[ActId.ActLayDown] = 'Lay';
i18n_en.acts_helps[ActId.ActLayDown] = 'Lay ';
i18n_en.acts_captions[ActId.ActGive] = 'Give';
i18n_en.acts_helps[ActId.ActGive] = 'Give ';
var i18n_fr = {
    global_error: 'Une erreur est survenue, veuillez nous excuser pour le désagrément.',
    welcome_name: spfm('Bonjour {0}'),
    welcome_no_agent_html: '<p>Vous ne possédez aucune enveloppe corporelle. Choisissez les créatures que vous souhaitez incarner grâce au bouton "incarner" :</p><br/><br/><button class="incarnate_button"></button>',
    welcome_name_short: ['Bienvenue § !', { n: 0 }],
    disconnected: 'Vous avez été déconnecté et allez être dirigé vers la page d\'identification.',
    beforeunload: 'Fermeture de la page',
    cancel: 'Annuler',
    close: 'Fermer',
    options: 'Options',
    conds: ['constitution', 'temps', 'énergie', 'mana'],
    conds_lite: { cond: 'C', qt: 'T', energy: 'E', mana: 'M' },
    conds_titles: {
        cond: spf3('Constitution {0} \/ {1} Régénération : {2}'),
        qt: spf3('Temps {0} \/ {1} Regain : {2}'),
        energy: spf3('Energie {0} \/ {1} Régénération : {2}')
    },
    characs_entity: ['solidité'],
    characs_being: ['type d\'organisme', 'résistance tranchante\/perçante'],
    characs_group_caption: {
        solidity: 'Résistance',
        passive_retort: 'Effet passif',
        move: 'Déplacement',
        attack: 'Attaque',
        attack_remote: 'Attaque à distance',
        perception: 'Perception',
        aptitude: 'Aptitude'
    },
    characs_group_help: {
        solidity: 'Résistance',
        passive_retort: 'Effet passif',
        move: 'Déplacement',
        attack: 'Attaque au contact',
        attack_remote: 'Attaque à distance',
        perception: 'Perception',
        aptitude: 'Aptitude'
    },
    characs: {
        solidity_cut: 'Tranchante/perçante',
        solidity_blunt: 'Contondante',
        solidity_acid: 'Acide',
        solidity_fire: 'Feu',
        solidity_cold: 'Froid',
        passive_retort_cut: 'Tranchant/Perçant',
        passive_retort_acid: 'Acide',
        passive_retort_elec: 'Electrique',
        passive_retort_fire: 'Ardent',
        gist_poisoned: 'Empoisonné',
        solidity_poison: 'Poison',
        solidity_elec: 'Electrique',
        move_water: 'Aquatique',
        move_earth: 'Terrestre',
        move_air: 'Aérien',
        attack_cut: 'Tranchante/perçante',
        attack_blunt: 'Contondante',
        attack_elec: 'Electrique',
        attack_fire: 'Ardente',
        attack_blast: 'Explosion',
        attack_poisoned: 'Empoisonnement ',
        attack_remote_cut: 'Tranchante/perçante',
        attack_remote_blunt: 'Contondante',
        attack_remote_elec: 'Electrique',
        attack_remote_fire: 'Ardente',
        attack_remote_acid: 'Projection d\'acide',
        capture: 'Capacité de capture',
        capture_remote: 'Lancer de filet',
        web: 'Fabrication de toile',
        attack_bury: 'Affut enterré',
        perception_diurnal: 'Perception diurne',
        perception_nocturnal: 'Perception nocturne',
        perception_modificator: 'Mimétisme passif',
        hide: 'Camouflage',
        conscience: 'Conscience',
        communicate: 'Communication',
        prehension: 'Préhensile'
    },
    breed_type: ['autogame', 'mâle', 'femelle', 'hermaphrodite'],
    main_material_types: ['végétal', 'animal'],
    terrain_names: [],
    lifeform: 'Forme de vie',
    no_lifeform: 'Aucune forme de vie',
    furnitures: 'Objets',
    distance: spfm('Distance {0}'),
    distangle: ['Distance § ; Direction §', { dist: 0, angle: 0 }],
    direction: 'Direction : ',
    orientation: 'Orientation : ',
    theta: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
    visibility1: 'Visibilité: §',
    visibility2: ['Visibilité § \/ §', { vis: 0, vis_max: 0 }],
    vegetation: spf2('Végétation {0} \/ {1}'),
    fertilizer: ['Fertilité § \/ §', { v: 0, m: 0 }],
    tracks: ['Traces § \/ §', { v: 0, m: 0 }],
    characs_being_test: {
        'type d\'organisme': ['végétal', 'animal'], 0: 'résistance tranchante\/perçante § \/ 2000'
    },
    acts_caption: {
        move_to: 'Y aller',
        1: 'Se tourner',
        2: 'Brouter',
        attack: 'Attaquer',
        pointofview: 'Contrôler',
        incarnate: 'Incarner',
        decohere: 'Abandonner la créature'
    },
    acts_captions: [],
    acts_helps: [],
    acts_fails: [],
    acts_costs: spf2('({0}T {1}E)'),
    acts_help: {
        move_to: 'Aller sur cette case',
        1: 'Se tourner dans cette direction',
        2: 'Consommer la végétation',
        attack: 'Attaquer',
        4: 'Prendre le contrôle direct de la créature',
        incarnate: 'Ajouter une nouvelle créature à votre cheptel',
    },
    acts_conditions: {
        distance: 'Distance d\'action',
        qt: 'Quota de temps',
        energy: 'Point d\'énergie',
        mana: 'Mana'
    },
    acts_conditions_lite: {
        same_cell: '(même case)',
        too_far: '(trop éloigné)',
        qt: '§T',
        energy: '§E',
        mana: '§M',
        direction: '(même direction)',
        cannot_move: '(Déplacement impossible)',
        cell_occupied: '(case occupée)'
    },
    acts_fail: {
        range1: 'Inaccessible',
        cannot_contain_being: 'Case occupée',
        qt_energy_insufficient: 'QT ou EN insuffisant'
    },
    input_fail: {
        wrong_identification: 'Identification incorrecte',
        invalid_format: 'Format invalide',
        login_unavailable: 'Cet identifiant est déjà utilisé',
        username_unavailable: 'Ce nom est déjà utilisé',
        too_many_tries: 'Trop d\'essais erronés, veuillez patienter quelques instants'
    },
    yf_logbook: {
        creatures: ['§ créature(s).', { n: 0 }]
    },
    new_reports: 'Nouveau(x) événement(s)',
    event_report: 'Evenements',
    no_events: 'Aucun nouvel évèvenement',
    incarnate_pilotable: 'Sélectionnez la créature avec laquelle vous souhaitez entrer en cohérence',
    incarnate_no_creature_html: '<p>Aucune créature disponible</p>',
    detector: { canvas: 'Canvas', webgl: 'WebGl', workers: 'Workers', websocket: 'WebSocket', file_protocol: 'Protocole file:// non supporté' },
    loading: 'Chargement',
    websocket_connected: 'Websocket connecté',
    websocket_disconnected: 'Websocket déconnecté',
    limited_1_connexion: 'Vous êtes limité a une connexion WebSocket',
    x_messages: ['Commande inconnue', 'Erreur serveur', 'Erreur base de donnée', 'Session expirée', "Erreur d'identification", 'Captcha invalide', 'Code invalide', 'Email invalide', 'Nom indisponible'],
    piloted_availables: spfm('Vous possédez {0} créature(s)'),
    piloted_no_available: 'Choisissez les créatures à incarner',
    pilotable_availables: spfm('{0} créature(s) disponible(s)'),
    pilotable_no_available: 'Aucune créature disponible'
};
i18n_fr.acts_captions[ActId.ActMoveTo] = 'Y aller';
i18n_fr.acts_helps[ActId.ActMoveTo] = 'Aller sur cette case';
i18n_fr.acts_captions[ActId.ActTurnTo] = 'Se tourner';
i18n_fr.acts_helps[ActId.ActTurnTo] = 'Se tourner dans cette direction';
i18n_fr.acts_captions[ActId.ActPickUp] = 'Ramasser';
i18n_fr.acts_helps[ActId.ActPickUp] = 'Ramassser ';
i18n_fr.acts_captions[ActId.ActLayDown] = 'Poser';
i18n_fr.acts_helps[ActId.ActLayDown] = 'Poser ';
i18n_fr.acts_captions[ActId.ActGive] = 'Donner';
i18n_fr.acts_helps[ActId.ActGive] = 'Donner ';
i18n_fr.acts_fails[FailId.NoAct] = 'Action inconnue';
i18n_fr.acts_fails[FailId.RangeIs1] = 'Inaccessible';
i18n_fr.acts_fails[FailId.CannotWelcome] = 'Occupée';
i18n_fr.acts_fails[FailId.CannotContain] = 'Plein';
i18n_fr.terrain_names[CellType.InderteminateCell] = 'Indéterminé';
i18n_fr.terrain_names[CellType.CellDeepWater] = 'Océan';
i18n_fr.terrain_names[CellType.CellEarth] = 'Terre';
i18n_fr.terrain_names[CellType.CellSand] = 'Sable';
i18n_fr.terrain_names[CellType.CellShallowWater] = 'Eau peu profonde';
var i18n = i18n_fr;
const MouseLeftButtons = 1;
const MouseRightButtons = 2;
const MouseMiddelButtons = 4;
const MouseLeftButton = 0;
const MouseRightButton = 1;
const MouseMiddelButton = 2;
class Pointer {
    constructor(engine, canvas, eventTarget) {
        this.controls = { dragButton: MouseLeftButton, dragButtons: MouseLeftButtons, orbitSensibility: 3 };
        this.currentTheta = 0;
        this.dragging = false;
        this.canvas = canvas;
        this.eventTarget = eventTarget;
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
    }
    static toCardIdStr(id) {
        return 'Card_' + id;
    }
    connectEventHandlers() {
        let mouse2D = new THREE.Vector2();
        this.eventTarget.addEventListener('mousemove', (event) => {
            event.preventDefault();
            if (event.buttons & this.controls.dragButtons) {
                if (!this.dragging) {
                    this.dragging = true;
                }
                let deltaTheta = (this.originX - event.clientX) / window.innerWidth * this.controls.orbitSensibility;
                let theta = this.currentTheta + deltaTheta;
                var cam = this.engine.camera;
                cam.position.x = Math.cos(theta) * this.engine.cameraRadius;
                cam.position.y = Math.sin(theta) * this.engine.cameraRadius;
                this.engine.camera.lookAt(new THREE.Vector3());
            }
            let scene = this.engine.activeZone3D;
            if (scene) {
                mouse2D.set(((event.clientX - this.canvas.offsetLeft) / this.canvas.clientWidth) * 2 - 1, -((event.clientY - this.canvas.offsetTop) / this.canvas.clientHeight) * 2 + 1);
                this.raycaster.setFromCamera(mouse2D, this.engine.camera);
                var intersects = this.raycaster.intersectObjects(scene.intersectors);
                if (intersects.length > 0) {
                    var intersect = intersects[0];
                    scene.cursorTileSelector.position.copy(intersect.point).add(intersect.face.normal);
                    scene.cursorTileSelector.position.divideScalar(Tile.SIZE).round().multiplyScalar(Tile.SIZE);
                    scene.cursorTileSelector.position.z += Tile.SIZE / 2;
                    scene.cursorTileSelector.visible = true;
                    intersect.object.viewInHoverCard();
                }
                else {
                    scene.cursorTileSelector.visible = false;
                }
            }
            this.engine.renderOnce();
        }, false);
        this.eventTarget.addEventListener('mousedown', (event) => {
            event.preventDefault();
            if (!this.dragging && (event.buttons & this.controls.dragButtons)) {
                this.originX = event.clientX;
                this.originY = event.clientY;
            }
        }, false);
        this.eventTarget.addEventListener('mouseup', (event) => {
            event.preventDefault();
            if (event.button === this.controls.dragButton) {
                if (this.dragging) {
                    this.dragging = false;
                    let deltaTheta = (this.originX - event.clientX) / window.innerWidth * this.controls.orbitSensibility;
                    this.currentTheta += deltaTheta;
                }
                else {
                    let scene = this.engine.activeZone3D;
                    if (scene) {
                        mouse2D.set(((event.clientX - this.canvas.offsetLeft) / this.canvas.clientWidth) * 2 - 1, -((event.clientY - this.canvas.offsetTop) / this.canvas.clientHeight) * 2 + 1);
                        this.raycaster.setFromCamera(mouse2D, this.engine.camera);
                        var intersects = this.raycaster.intersectObjects(scene.intersectors);
                        if (intersects.length > 0) {
                            var intersect = intersects[0];
                            scene.targetTileSelector.position.copy(intersect.point).add(intersect.face.normal);
                            scene.targetTileSelector.position.divideScalar(Tile.SIZE).round().multiplyScalar(Tile.SIZE);
                            scene.targetTileSelector.position.z += Tile.SIZE / 2;
                            scene.targetTileSelector.visible = true;
                            this.engine.renderOnce();
                            let tile = intersect.object;
                            ui.mainScene.setCellTargetCard(tile.zone, tile.cell);
                        }
                    }
                }
            }
        }, false);
        this.eventTarget.addEventListener('wheel', (event) => {
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
        this.eventTarget.addEventListener('touchstart', (event) => {
            ui.addInfo('touchstart ' + event.touches.length + ' ' + event.touches[0].pageX + ' ' + event.touches[0].pageY);
        });
        this.eventTarget.addEventListener('touchmove', (event) => {
            ui.addInfo('touchmove ' + event.touches.length + ' ' + event.touches[0].pageX + ' ' + event.touches[0].pageY, false, 500);
        });
    }
    static makeDraggable(element) {
        console.log('make draggable' + element.id);
        element.draggable = true;
        element.addEventListener('dragstart', function (e) {
            let card = this;
            let data;
            card.style.opacity = '0.5';
            if (card.transId !== undefined) {
                document.getElementById('piloted').className = 'pilotedHighlight';
                data = card.transId.toString();
            }
            else if (card.indirectId !== undefined) {
                document.getElementById('pilotable').className = 'pilotableHighlight';
                data = card.indirectId;
            }
            else {
                throw 'card (this) is not a valid CardWrapper';
            }
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', data);
        }, false);
        element.addEventListener('dragend', function (e) {
            let card = this;
            this.style.opacity = '';
            document.getElementById('piloted').className = 'pilotedStandard';
            document.getElementById('pilotable').className = 'pilotableStandard';
        }, false);
    }
    static makeDroppable(element) {
        element.draggable = false;
        element.addEventListener('drop', function (e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault)
                e.preventDefault();
            let cardId = e.dataTransfer.getData('text/plain');
            let destinationDeck = this;
            let card = document.getElementById(cardId);
            if (card) {
                e.dataTransfer.dropEffect = 'move';
                let sourceDeck = card.parentNode;
                if (sourceDeck) {
                    if (destinationDeck.id === 'piloted' && card.transId !== undefined) {
                        ui.switchToMainScene();
                        ui.startSplash(ui.beingsScene);
                        let requestSetPilot = { type: MessageType.SetPilot, pilotableToSet: [card.transId] };
                        G_channel.send(requestSetPilot);
                    }
                    else if (destinationDeck.id === 'pilotable' && card.indirectId !== undefined) {
                        ui.switchToMainScene();
                        ui.startSplash(ui.beingsScene);
                        let requestSetPilot = { type: MessageType.SetPilot, pilotedToUnset: [card.indirectId] };
                        G_channel.send(requestSetPilot);
                    }
                }
                else {
                    console.error('drop > deck not found');
                }
            }
            else {
                console.error('drop > card not found');
            }
            return false;
        }, false);
        element.addEventListener('dragover', function (e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault)
                e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            return false;
        }, false);
        element.addEventListener('dragenter', function (e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault)
                e.preventDefault();
            let element = e.target;
            return false;
        }, false);
        element.addEventListener('dragleave', function (e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (e.preventDefault)
                e.preventDefault();
            let element = e.target;
            return false;
        }, false);
        element.addEventListener('dblclick', function (e) {
            let card = e.target;
            ui.switchToMainScene();
            ui.startSplash(ui.beingsScene);
            if (card.transId !== undefined) {
                let requestSetPilot = { type: MessageType.SetPilot, pilotableToSet: [card.transId] };
                G_channel.send(requestSetPilot);
            }
            else if (card.indirectId !== undefined) {
                let requestSetPilot = { type: MessageType.SetPilot, pilotedToUnset: [card.indirectId] };
                G_channel.send(requestSetPilot);
            }
            else {
                throw 'card is not a valid CardWrapper';
            }
        });
    }
}
class HtmlUI {
    constructor(container) {
        this.container = container;
        this.infoBox = document.getElementById('info_box');
        this.mainScene = new MainScene(container);
        this.beingsScene = new BeingsScene();
        this.switchToScene(this.mainScene);
    }
    static empty(he) {
        while (he.firstChild) {
            he.removeChild(he.firstChild);
        }
    }
    setSize(width, height) {
        this.container.style.width = width.toString();
        this.container.style.height = height.toString();
    }
    addInfo(info, isError = false, timeoutMs = 1000) {
        let infoLine = document.createElement('p');
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
                this.infoBox.removeChild(infoLine);
                infoLine = undefined;
            }
        }, timeoutMs);
        this.infoBox.appendChild(infoLine);
    }
    setUser(m) {
        this.setConnectedState('user_connected');
        if (window.performance && performance.navigation.type === performance.navigation.TYPE_RELOAD) {
            this.addInfo(i18n.welcome_name(m.userOptions.name), false, 2000);
        }
        else {
            this.addInfo(i18n.welcome_name(m.userOptions.name), false, 5000);
        }
    }
    setConnectedState(state) {
    }
    startSplash(pendingScene) {
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
    switchToScene(scene) {
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
    viewReports(zone) {
    }
}
class HtmlActionButton {
    constructor(container, action) {
        this.button = document.createElement('button');
        this.actView = action;
        this.button.addEventListener('click', () => {
            console.log('trigger action ' + action.caption);
            action.triggerAction();
        });
        container.appendChild(this.button);
    }
    update(now) {
        let costs = { qt: 0, energy: 0 };
        let actCtx = this.actView.action.check(new ActionReport(true, [], costs));
        let help = i18n.acts_costs(costs.qt, costs.energy);
        if (actCtx.fails.length) {
            this.button.disabled = true;
            console.log('createActionButton > action ' + ActId[this.actView.action.actId] + ' (' + this.actView.caption + ') will fail : ' + actCtx.fails.join(' ; '));
            for (let id of actCtx.fails) {
                if (id !== FailId.Energy && id !== FailId.Qt) {
                    help += ' ' + i18n.acts_fails[id];
                }
            }
        }
        else {
            this.button.disabled = false;
            console.log('createActionButton > action set ' + this.actView.caption);
        }
        this.button.textContent = this.actView.caption;
        this.button.title = help;
    }
}
class HtmlActionViewer {
    constructor(parent) {
        this.buttons = [];
        this.container = document.createElement('div');
        parent.appendChild(this.container);
    }
    update(now) {
        for (let actButton of this.buttons) {
            actButton.update(now);
        }
    }
    setTarget(zone, target) {
        this.target = target;
        HtmlUI.empty(this.container);
        this.buttons = [];
        console.log('setTarget action ' + target);
        let now = Date.now();
        let action;
        let button;
        for (let actionConstructorId of zone.actor.actions) {
            if (target.reactions.indexOf(actionConstructorId) !== -1) {
                action = WorldUI.ActionViewerFactory(actionConstructorId, zone, target);
                button = new HtmlActionButton(this.container, action);
                this.container.appendChild(button.button);
                this.buttons.push(button);
                button.update(now);
            }
            else {
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
class HtmlCard {
    appendText() {
        let p = document.createElement('p');
        this.container.appendChild(p);
        return p;
    }
    update(now) {
        this.actionsViewer.update(now);
    }
}
class ActorHtmlCard extends HtmlCard {
    constructor(parentNode) {
        super();
        this.zone3D = null;
        this.container = document.createElement('div');
        parentNode.appendChild(this.container);
        this.container.id = 'ActorCard';
        this.actorName = this.appendText();
        this.actorName.addEventListener('click', () => {
            console.log('hide actor card');
            this.setZone(null);
        });
        this.actorCond = this.appendText();
        this.actorQt = this.appendText();
        this.actorEnergy = this.appendText();
        this.actorMoves = this.appendText();
        this.inventory = this.appendText();
        this.actionsViewer = new HtmlActionViewer(this.container);
    }
    update(now) {
        if (this.zone3D) {
            let actor = this.zone3D.zone.actor;
            actor.updateDH = now;
            this.actorName.textContent = actor.name + ' ' + new Date(actor.updateDH) + ' th:' + actor.theta;
            this.actorCond.textContent = i18n.conds_titles.cond(actor.cond, actor.condMax, actor.condSlope);
            this.actorQt.textContent = i18n.conds_titles.qt(actor.qt, actor.qtMax, actor.qtSlope);
            this.actorEnergy.textContent = i18n.conds_titles.energy(actor.energy, actor.energyMax, actor.energySlope);
            this.actorMoves.textContent = i18n.characs.move_earth + ' ' + actor.moveEarth
                + ' ' + i18n.characs.move_water + ' ' + actor.moveAir
                + (actor.moveAir ? ' ' + i18n.characs.move_air + ' ' + actor.moveAir : '');
            this.inventory.textContent = i18n.furnitures + ' ' + this.zone3D.zone.actorCell.inventory.length;
        }
        super.update(now);
    }
    setZone(zone3D) {
        this.zone3D = zone3D;
        if (zone3D) {
            this.actionsViewer.setTarget(zone3D.zone, zone3D.zone.actorCell);
            this.update(Date.now());
            this.container.style.visibility = 'visible';
        }
        else {
            this.container.style.visibility = 'hidden';
        }
    }
}
class TargetCellHtmlCard extends HtmlCard {
    constructor(parentNode) {
        super();
        console.warn('NEW TARGETCELL');
        this.container = document.createElement('div');
        parentNode.appendChild(this.container);
        this.container.id = 'TargetCellCard';
        this.terrainName = this.appendText();
        this.terrainName.addEventListener('click', () => {
            console.log('hide target card');
            this.unsetCell();
        });
        this.distanceToActor = this.appendText();
        this.inventoryLength = this.appendText();
        this.actionsViewer = new HtmlActionViewer(this.container);
        this.beingCard = new TargetEntityHtmlCard(this.container);
    }
    update(now) {
        if (this.cell) {
            let cell = this.cell;
            let terrainName = i18n.terrain_names[cell.cellType] || i18n.terrain_names[CellType.InderteminateCell];
            this.terrainName.textContent = terrainName + ' ' + i18n.vegetation(cell.vegetation, Constants.MAX_VEGETATION);
            this.distanceToActor.textContent = i18n.distance(cell.getD2A()) + ' ' + i18n.theta[cell.getA4A()] + ' (' + cell.getA4A() + ')';
            this.inventoryLength.textContent = cell.inventory.length + ' ent(s) ; ' + (cell.being ? 1 : 0) + ' being';
        }
        super.update(now);
    }
    setCell(zone, cell) {
        this.cell = cell;
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
    constructor(parentNode) {
        super();
        this.container = document.createElement('div');
        parentNode.appendChild(this.container);
        this.container.id = 'TargetEntityCard';
        this.entityName = this.appendText();
        this.actionsViewer = new HtmlActionViewer(this.container);
    }
    update(now) {
        if (this.entity) {
            this.entityName.textContent = this.entity instanceof Agent ? this.entity.name + ' (agent) ' : '(entTODO)';
        }
        super.update(now);
    }
    setEntity(zone, entity) {
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
class CanvasText {
    constructor(context, text, fontSize = 14) {
        this.textFillStyle = 'rgb(0,0,0)';
        this.context = context;
        this.text = text || '';
        this.fontSize = fontSize;
    }
    get text() {
        return this._text;
    }
    set text(text) {
        let textSize = this.context.measureText(text);
        this.w = textSize.width;
        this._text = text;
    }
    draw(x, y, maxWidth) {
        let ctx = this.context;
        ctx.fillStyle = this.textFillStyle;
        ctx.font = this.fontSize + 'px sans-serif';
        ctx.fillText(this.text, x, y + this.fontSize, maxWidth);
    }
}
class CanvasButton {
    constructor(context, offsetLeft, offsetTop, action) {
        this.width = 200;
        this.height = 30;
        this.context = context;
        this.actView = action;
        this._text = new CanvasText(context);
        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
    }
    get text() {
        return this._text.text;
    }
    set text(text) {
        this._text.text = text;
    }
    draw(now) {
        let costs = { qt: 0, energy: 0 };
        let actCtx = this.actView.action.check(new ActionReport(true, [], costs));
        let ctx = this.context;
        let help = i18n.acts_costs(costs.qt, costs.energy);
        if (actCtx.fails.length) {
            ctx.fillStyle = '#ff8888';
            this._text.textFillStyle = 'silver';
            console.log('createActionButton > action ' + ActId[this.actView.action.actId] + ' (' + this.actView.caption + ') will fail : ' + actCtx.fails.join(' ; '));
            for (let id of actCtx.fails) {
                if (id !== FailId.Energy && id !== FailId.Qt) {
                    help += ' ' + i18n.acts_fails[id];
                }
            }
        }
        else {
            ctx.fillStyle = '#88ee88';
            this._text.textFillStyle = 'black';
            console.log('createActionButton > action set ' + this.actView.caption);
        }
        ctx.fillRect(this.offsetLeft, this.offsetTop, this.width, this.height);
        this.text = this.actView.caption + ' ' + help;
        this._text.draw(this.offsetLeft + 10, this.offsetTop + 5, this.width);
    }
}
class CanvasButtonSet {
    constructor(context, offsetLeft, offsetTop) {
        this.width = 200;
        this.height = 60;
        this.cell = null;
        this.entity = null;
        this.context = context;
        this.buttons = [];
        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
    }
    get offsetLeft() {
        return this._offsetLeft;
    }
    set offsetLeft(value) {
        this._offsetLeft = value;
        for (let b of this.buttons) {
            b.offsetLeft = value + 10;
        }
    }
    setCell(zone, cell) {
        this.cell = cell;
        this.buttons = [];
        if (cell) {
            let action;
            let target = cell;
            let button;
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
    }
    setEntity(zone, entity) {
        this.entity = entity;
        this.buttons = [];
        if (entity) {
            let action;
            let target = entity;
            let button;
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
    }
    draw(now) {
        let context = this.context;
        context.fillStyle = '#ff0000';
        context.fillRect(this.offsetLeft, this.offsetTop, this.width, this.height);
        console.log('viewActions (CanvasButtonSet.draw)');
        for (let b of this.buttons) {
            b.draw(now);
        }
    }
    mouseup(event) {
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
class CanvasCard {
    constructor(context, offsetLeft, offsetTop) {
        this.visible = false;
        this.height = 300;
        this.context = context;
        this.actionsViewer = new CanvasButtonSet(context, offsetLeft, offsetTop + 90);
        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
    }
    get offsetLeft() {
        return this._offsetLeft;
    }
    set offsetLeft(value) {
        this._offsetLeft = value;
        this.actionsViewer.offsetLeft = value;
    }
    mouseup(event) {
        this.actionsViewer.mouseup(event);
    }
}
CanvasCard.width = 200;
class UserCanvasCard extends CanvasCard {
    constructor() {
        super(...arguments);
        this.height = 50;
    }
    draw() {
        let ctx = this.context;
        let width = ActorCanvasCard.width;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.offsetLeft, this.offsetTop, UserCanvasCard.width, this.height);
        console.log('fillRect ' + this.offsetLeft + ' ' + this.offsetTop + ' ' + UserCanvasCard.width + ' ' + this.height);
    }
}
UserCanvasCard.width = 100;
class ActorCanvasCard extends CanvasCard {
    constructor(context, offsetLeft, offsetTop) {
        super(context, offsetLeft, offsetTop);
        this.zone3D = null;
        this.actorName = new CanvasText(context);
        this.actorCond = new CanvasText(context);
        this.actorQt = new CanvasText(context);
        this.actorEnergy = new CanvasText(context);
        this.actorMoves = new CanvasText(context);
        this.inventory = new CanvasText(context);
    }
    draw(now) {
        if (this.zone3D) {
            let ctx = this.context;
            let width = ActorCanvasCard.width;
            ctx.strokeStyle = 'lime';
            ctx.fillStyle = '#eeaaff';
            ctx.fillRect(this.offsetTop, this.offsetTop, width, this.height);
            let actor = this.zone3D.zone.actor;
            this.actorName.text = this.zone3D.zone.actor.name;
            let cond = actor.cond;
            this.actorCond.text = i18n.conds_titles.cond(actor.cond, actor.condMax, actor.condSlope);
            this.actorQt.text = i18n.conds_titles.qt(actor.qt, actor.qtMax, actor.qtSlope);
            this.actorEnergy.text = i18n.conds_titles.energy(actor.energy, actor.energyMax, actor.energySlope);
            this.actorMoves.text = i18n.characs.move_earth + ' ' + actor.moveEarth
                + ' ' + i18n.characs.move_water + ' ' + actor.moveAir
                + (actor.moveAir ? ' ' + i18n.characs.move_air + ' ' + actor.moveAir : '');
            this.inventory.text = i18n.furnitures + ' ' + this.zone3D.zone.actorCell.inventory.length;
            let lineSpace = 20;
            this.actorName.draw(this._offsetLeft, this.offsetTop, width);
            this.actorCond.draw(this._offsetLeft, this.offsetTop + 2 * lineSpace, width);
            this.actorQt.draw(this._offsetLeft, this.offsetTop + 3 * lineSpace, width);
            this.actorEnergy.draw(this._offsetLeft, this.offsetTop + 4 * lineSpace, width);
            this.actorMoves.draw(this._offsetLeft, this.offsetTop + 5 * lineSpace, width);
            this.inventory.draw(this._offsetLeft, this.offsetTop + 6 * lineSpace, width);
        }
    }
    setZone(zone3D) {
        this.zone3D = zone3D;
        if (zone3D) {
            this.actionsViewer.setCell(zone3D.zone, zone3D.zone.actorCell);
            this.visible = true;
        }
        else {
            this.visible = false;
        }
    }
}
class TargetCanvasCard extends CanvasCard {
    drawInventory() {
    }
}
class TargetCellCanvasCard extends TargetCanvasCard {
    constructor(context, offsetLeft, offsetTop) {
        super(context, offsetLeft, offsetTop);
        this.cell = null;
        this.terrainName = new CanvasText(context);
        this.distanceToActor = new CanvasText(context);
    }
    draw(now) {
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
            let lineSpace = 30;
            this.terrainName.draw(this._offsetLeft, this.offsetTop, width);
            this.distanceToActor.draw(this._offsetLeft, this.offsetTop + lineSpace, width);
            this.actionsViewer.draw(now);
            this.drawInventory();
        }
        else {
            context.strokeStyle = 'silver';
            context.strokeRect(this._offsetLeft, this.offsetTop, width, this.height);
        }
    }
    setCell(zone, cell) {
        this.cell = cell;
        this.actionsViewer.setCell(zone, cell);
        this.visible = cell !== null;
    }
}
class TargetEntityCanvasCard extends TargetCanvasCard {
    constructor(context, offsetLeft, offsetTop) {
        super(context, offsetLeft, offsetTop);
        this.entity = null;
        this.entityName = new CanvasText(context);
        this.distanceToActor = new CanvasText(context);
    }
    draw(now) {
        let context = this.context;
        let width = TargetCellCanvasCard.width;
        context.clearRect(this._offsetLeft, this.offsetTop, width, this.height);
        if (this.entity) {
            let cell = this.entity;
            context.strokeStyle = 'lime';
            context.fillStyle = '#00ff00aa';
            context.fillRect(this._offsetLeft, this.offsetTop, width, this.height);
            context.strokeRect(this._offsetLeft, this.offsetTop, width, this.height);
            this.entityName.text = 'TODO OBJECT CLASS NAME ?';
            this.distanceToActor.text = i18n.distance(cell.getD2A());
            let lineSpace = 30;
            this.entityName.draw(this._offsetLeft, this.offsetTop, width);
            this.distanceToActor.draw(this._offsetLeft, this.offsetTop + lineSpace, width);
            this.actionsViewer.draw(now);
            this.drawInventory();
        }
        else {
            context.strokeStyle = 'silver';
            context.strokeRect(this._offsetLeft, this.offsetTop, width, this.height);
        }
    }
    setEntity(zone, entity) {
        this.entity = entity;
        this.actionsViewer.setEntity(zone, entity);
        this.visible = entity !== null;
    }
}
class CanvasUi extends HtmlUI {
    constructor(canvas) {
        super(canvas);
        this.logoOffsetX = 0;
        this.logoOffsetY = 0;
        this.logoRotation = 0;
        this.targetCard = null;
        let padding = 10;
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
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
        };
        this.actorCard = new ActorCanvasCard(this.context, padding, padding);
        this.redraw();
    }
    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.targetCard) {
            this.targetCard.offsetLeft = width - 10 - TargetCanvasCard.width;
        }
        this.logoOffsetX = Math.round(width / 2);
        this.logoOffsetY = Math.round(height / 2);
        this.redraw();
    }
    redraw() {
        let now = Date.now();
        if (this.actorCard.visible) {
            this.actorCard.draw(now);
        }
        if (this.targetCard && this.targetCard.visible) {
            this.targetCard.draw(now);
        }
    }
    mouseup(event) {
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
    setCellTargetCard(zone, cell) {
        let padding = 10;
        this.targetCard = new TargetCellCanvasCard(this.context, this.canvas.width - padding - TargetCanvasCard.width, padding);
        this.targetCard.setCell(zone, cell);
        this.redraw();
    }
    setEntityTargetCard(zone, entity) {
        let padding = 10;
        this.targetCard = new TargetEntityCanvasCard(this.context, this.canvas.width - padding - TargetCanvasCard.width, padding);
        this.targetCard.setEntity(zone, entity);
        this.redraw();
    }
    setActorCardTile(zone3D) {
        this.actorCard.setZone(zone3D);
        this.redraw();
    }
    startSplash(pendingScene) {
        super.startSplash(pendingScene);
        this.animationId = window.requestAnimationFrame(() => { this.splashStep(); });
    }
    splashStep() {
        let ctx = this.context;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.translate(this.logoOffsetX, this.logoOffsetY);
        ctx.rotate(this.logoRotation += 0.05);
        ctx.drawImage(this.logo, -this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
        ctx.restore();
        this.animationId = window.requestAnimationFrame(() => { this.splashStep(); });
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
class Store {
    constructor() {
        this.modelStock = {};
        this.modelCallbacks = {};
        this.textureStock = {};
    }
    getModel(url, callback) {
        console.log('getModel ' + url);
        if (this.modelStock[url] instanceof Entity3D) {
            console.log('Store > cache hit ' + url);
            callback(this.modelStock[url].clone());
            return;
        }
        else {
            if (!this.modelCallbacks[url]) {
                this.modelCallbacks[url] = [];
                (this.modelCallbacks[url]).push(callback);
                let p = new Promise((resolve, reject) => {
                    let jsonLoader = new THREE.JSONLoader();
                    jsonLoader.load(url, (geometry, materials) => {
                        dbg.log('Loader model  > ' + url);
                        this.modelStock[url] = this.createEntity3D(geometry, materials);
                        resolve(this.modelStock[url]);
                    });
                }).then((entity) => {
                    let callbacks = this.modelCallbacks[url];
                    if (callbacks !== null && callbacks.length > 0) {
                        dbg.log('Store model callback > ' + url + ' serving:' + callbacks.length);
                        for (let i = 0; i < callbacks.length; i++) {
                            callbacks[i](entity.clone());
                        }
                        this.modelCallbacks[url] = null;
                    }
                    else {
                        console.error('Store > No callback for ' + url);
                    }
                }, (reason) => {
                    console.error(reason);
                });
            }
            else {
                (this.modelCallbacks[url]).push(callback);
                console.log('Store > loads pending ' + url + ' count:' + (this.modelCallbacks[url]).length);
            }
        }
    }
    createEntity3D(geometry, materials) {
        let material;
        if (!materials) {
            console.error('No material ' + materials);
            material = new THREE.MeshLambertMaterial();
        }
        else {
            material = new THREE.MeshFaceMaterial(materials);
        }
        var entity = new Entity3D(geometry, material);
        entity.rotateX(Math.PI / 2);
        entity.geometry.computeBoundingBox();
        return entity;
    }
    getTexture(url) {
        let texture;
        if (this.textureStock[url] instanceof THREE.Texture) {
            texture = this.textureStock[url];
        }
        else {
            let image = new Image();
            texture = new THREE.Texture(image);
            this.textureStock[url] = texture;
            let p = new Promise((resolve, reject) => {
                image.onload = function () { resolve(texture); };
                image.onerror = function (err) { reject(err); console.error('Failed to load ' + url + ' ' + err); };
                image.src = url;
            }).then((tex) => {
                tex.needsUpdate = true;
                G_engine.renderOnce();
            }, (reason) => {
                console.error(reason);
            });
        }
        return texture;
    }
}
class MainScene {
    constructor(container) {
        this.selectedTile = null;
        this.showMainSceneButton = document.getElementById('show_main_scene_button');
        this.showMainSceneButton.addEventListener('click', () => {
            ui.switchToMainScene();
        });
        this.showBeingSceneButton = document.getElementById('show_being_scene_button');
        this.showBeingSceneButton.addEventListener('click', function () {
            let requestPilot = {
                type: MessageType.ReqPilot,
                piloted: { limit: 20 },
                pilotable: { limit: 20 }
            };
            G_channel.send(requestPilot);
            ui.startSplash(ui.beingsScene);
        });
        this.pilotedMiniCardDeck = document.getElementById('piloted_beings');
        this.selectedCard = document.getElementById('selectedTile');
        this.hoverCard = document.getElementById('hoverTile');
        this.actorCard = new ActorHtmlCard(container);
        this.targetCard = new TargetCellHtmlCard(container);
    }
    refreshPiloted(pilotedPool) {
        HtmlUI.empty(this.pilotedMiniCardDeck);
        let keys = Object.keys(pilotedPool);
        console.log('mainScene.refreshPiloted > agents:' + keys.length);
        for (let i = 0; i < keys.length; i++) {
            if (pilotedPool[keys[i]].miniCard) {
                this.pilotedMiniCardDeck.appendChild(pilotedPool[keys[i]].miniCard);
            }
        }
    }
    activate() {
        console.log('MainScene.activate > ');
        this.showMainSceneButton.style.visibility = 'hidden';
        this.showBeingSceneButton.style.visibility = 'visible';
        this.pilotedMiniCardDeck.style.visibility = 'visible';
    }
    inactivate() {
        console.log('MainScene.inactivate > ');
        this.showBeingSceneButton.style.visibility = 'hidden';
        this.pilotedMiniCardDeck.style.visibility = 'hidden';
        this.actorCard.setZone(null);
        this.targetCard.unsetCell();
    }
    setActorCardTile(zone3D) {
        this.actorCard.setZone(zone3D);
    }
    setCellTargetCard(zone, cell) {
        this.targetCard.setCell(zone, cell);
    }
}
class BeingsScene {
    constructor() {
        this.deckContainer = document.getElementById('being_scene');
        this.pilotableDeck = document.getElementById('pilotable');
        this.pilotedDeck = document.getElementById('piloted');
        this.displayPilotable = document.getElementById('display_pilotable_message');
        this.displayPiloted = document.getElementById('display_piloted_message');
        Pointer.makeDroppable(this.pilotableDeck);
        Pointer.makeDroppable(this.pilotedDeck);
        this.inactivate();
    }
    activate() {
        console.log('BeingScene.activate > ');
        ui.mainScene.showMainSceneButton.style.visibility = 'visible';
        this.deckContainer.style.visibility = 'visible';
    }
    inactivate() {
        console.log('BeingScene.inactivate > ');
        this.deckContainer.style.visibility = 'hidden';
    }
    refreshPiloted(pilotedPool) {
        HtmlUI.empty(this.pilotedDeck);
        let card;
        let count = 0;
        for (let indirectionIId in pilotedPool) {
            count++;
            card = document.createElement('div');
            card.indirectId = indirectionIId;
            card.id = Pointer.toCardIdStr(indirectionIId);
            card.textContent = pilotedPool[indirectionIId].actorName;
            card.className = 'pilotedCard';
            card.style.backgroundImage = pilotedPool[indirectionIId].cardUrl;
            Pointer.makeDraggable(card);
            this.pilotedDeck.appendChild(card);
        }
        if (count === 0) {
            this.displayPiloted.textContent = i18n.piloted_no_available;
        }
        else {
            this.displayPiloted.textContent = i18n.piloted_availables(count);
        }
    }
    refreshPilotable(pilotablePool) {
        HtmlUI.empty(this.pilotableDeck);
        if (pilotablePool.length === 0) {
            console.log('onPilotable > No pilotable beings');
            this.displayPilotable.textContent = i18n.pilotable_no_available;
        }
        else {
            this.displayPilotable.textContent = i18n.pilotable_availables(pilotablePool.length);
            console.log('onPilotable > agents:' + pilotablePool.length);
            let card;
            for (let indirectionIId = 0; indirectionIId < pilotablePool.length; indirectionIId++) {
                console.log(pilotablePool[indirectionIId]);
                card = document.createElement('div');
                card.transId = pilotablePool[indirectionIId].transId;
                card.id = Pointer.toCardIdStr(pilotablePool[indirectionIId].transId);
                card.textContent = pilotablePool[indirectionIId].name;
                card.className = 'pilotableCard';
                card.style.backgroundImage = WorldUI.getCardUrl(pilotablePool[indirectionIId].classId);
                Pointer.makeDraggable(card);
                this.pilotableDeck.appendChild(card);
            }
        }
        if (ui.pendingScene === ui.beingsScene) {
            ui.switchToBeingScene();
        }
        else {
            this.highlight(true);
        }
    }
    highlight(pilotableChange) {
        if (this.deckContainer.style.visibility === 'visible') {
            console.log('TODO being scene highlight blink' + pilotableChange);
        }
        else {
            console.log('TODO being scene icon highlight blink');
            ui.mainScene.showBeingSceneButton.className = 'buttonHighlight';
        }
    }
}
class Entity3D extends THREE.Mesh {
}
class RelAgent extends Agent {
}
class Zone3DLoader {
    constructor(actorGist) {
        this.actorId = actorGist.indId;
        this.actorName = actorGist.name;
        this.cardUrl = WorldUI.getCardUrl(actorGist.classId);
        console.log('mainScene.refreshPiloted > minicard:' + this.actorName + ' url:' + this.cardUrl);
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
            G_engine.switchToZone(this.zone3D);
        }
        else {
            this.load();
            ui.startSplash(this);
        }
    }
    load() {
        let requestZone = { type: MessageType.Zone, actorId: this.actorId };
        G_channel.send(requestZone);
    }
    onZoneGist(zoneGist) {
        console.log('Zone3DLoader.onZoneGist > ' + zoneGist.actorGId);
        let zone = new RelZone(zoneGist);
        this.zone3D = new Zone3D(zone);
        if (ui.pendingScene === this) {
            G_engine.switchToZone(this.zone3D);
        }
    }
}
class Zone3D extends THREE.Scene {
    constructor(zone) {
        super();
        this.intersectors = [];
        this.zone = zone;
        let pointerCoord = false;
        for (let stringCellId in zone.cellPool) {
            if (zone.cellPool.hasOwnProperty(stringCellId)) {
                let tile = WorldUI.TileFactory(zone, zone.cellPool[stringCellId]);
                this.intersectors.push(tile);
                this.add(tile);
            }
        }
        this.fillEntities(zone.agentPool);
        this.fillEntities(zone.furniturePool);
        this.targetTileSelector = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(Tile.SIZE * 0.9, Tile.SIZE * 0.9, Tile.SIZE * 0.9), 1), new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 }));
        this.targetTileSelector.position.z = Tile.SIZE / 2 - 5;
        this.targetTileSelector.visible = false;
        this.add(this.targetTileSelector);
        let cursorBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.3, transparent: true });
        let boxGeometry = new THREE.BoxBufferGeometry(Tile.SIZE, Tile.SIZE, Tile.SIZE);
        this.cursorTileSelector = new THREE.Mesh(boxGeometry, cursorBasicMaterial);
        if (pointerCoord) {
            let orig = new THREE.Vector3(-Tile.SIZE / 2, -Tile.SIZE / 2, -Tile.SIZE / 2);
            let arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), orig, Tile.SIZE, 0xff0000);
            arrow.line.material.linewidth = 2;
            this.cursorTileSelector.add(arrow);
            arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), orig, Tile.SIZE / 2, 0x00ff00);
            arrow.line.material.linewidth = 2;
            this.cursorTileSelector.add(arrow);
            arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), orig, Tile.SIZE / 2, 0x0000ff);
            arrow.line.material.linewidth = 2;
            this.cursorTileSelector.add(arrow);
        }
        else {
            this.cursorTileSelector.add(new THREE.LineSegments(new THREE.EdgesGeometry(boxGeometry, 1), new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })));
        }
        this.cursorTileSelector.visible = false;
        this.add(this.cursorTileSelector);
        this.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 10, 0xff0000));
        this.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 10, 0x00ff00));
        this.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 10, 0x0000ff));
        var ambientLight = new THREE.AmbientLight(0xa0a0a0);
        this.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0x808080);
        directionalLight.position.set(1, 0.75, 0.5).normalize();
        this.add(directionalLight);
        G_engine.renderOnce();
    }
    addEntity3D(entity) {
        console.log('addEntity ' + entity.name);
        this.add(entity);
    }
    fillEntities(pool) {
        for (let entityId in pool) {
            if (pool.hasOwnProperty(entityId)) {
                let entity = pool[entityId];
                let modelUrl = WorldUI.getModelUrl(entity.entType);
                console.log('Store> getModel ' + ConceptClass[entity.entType]);
                G_store.getModel(modelUrl, (model) => {
                    let scale = Tile.SIZE;
                    model.geometry.computeVertexNormals();
                    model.scale.set(scale, scale, scale);
                    model.geometry.computeBoundingBox();
                    model.position.set(entity.posX * Tile.SIZE, entity.posY * Tile.SIZE, -model.geometry.boundingBox.min.y * scale);
                    model.rotateY((2 - entity.theta) * Math.PI / 4);
                    let bb = model.geometry.boundingBox;
                    let po = model.position;
                    dbg.log(ConceptClass[entity.entType] + ' : ' + po.x + ',' + po.y + ',' + po.z
                        + ' (' + bb.min.x + ',' + bb.min.y + ',' + bb.min.z + ') ' + ' (' + bb.max.x + ',' + bb.max.y + ',' + bb.max.z + ') ');
                    model.name = ConceptClass[entity.entType];
                    this.addEntity3D(model);
                });
            }
        }
    }
    hoverItem(selectedItem) {
        this.cursorTileSelector.visible = true;
        this.cursorTileSelector.position.x = selectedItem.position.x;
        this.cursorTileSelector.position.z = selectedItem.position.z;
    }
    focusItem(selectedItem, game) {
        console.log('Scene.focusItem ' + selectedItem);
    }
    blurItem() {
        this.cursorTileSelector.visible = false;
    }
    activate() {
        console.log('Zone3D > activate zone3d ' + this.zone.actor.gId.iId);
        ui.mainScene.setActorCardTile(this);
    }
    inactivate() {
        ui.mainScene.setActorCardTile(null);
    }
}
function $(name) {
}
class Tile extends Entity3D {
    constructor(zone, cell, texture = G_store.getTexture('textures/tile.png')) {
        let material = new THREE.MeshBasicMaterial({ map: texture });
        let geometry = new THREE.PlaneBufferGeometry(Tile.SIZE, Tile.SIZE);
        super(geometry, material);
        this.cell = cell;
        this.zone = zone;
        this.position.set(cell.posX * Tile.SIZE, cell.posY * Tile.SIZE, 0);
    }
    static Factory(zone, cellGist) {
        let cell = World.CellFactory(cellGist);
        let tileConstructor = WorldUI.tileContructor[cellGist.cellType];
        if (!tileConstructor) {
            tileConstructor = Tile;
        }
        return new tileConstructor(zone, cell);
    }
    viewInHoverCard() {
    }
}
Tile.SIZE = 10;
class TileEarth extends Tile {
    constructor(zone, cell) {
        let texture;
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
    constructor(zone, cell) {
        let texture;
        texture = G_store.getTexture('textures/sand.png');
        super(zone, cell, texture);
    }
}
class TileShallowWater extends Tile {
    constructor(zone, cell) {
        let texture;
        texture = G_store.getTexture('textures/shallowwater.png');
        super(zone, cell, texture);
    }
}
class TileDeepWater extends Tile {
    constructor(zone, cell) {
        let texture;
        texture = G_store.getTexture('textures/deepwater.png');
        super(zone, cell, texture);
    }
}
class ActionFail {
    constructor(act, reason) {
        this.name = act.caption;
        this.reason = reason;
    }
    toString() {
        return this.reason;
    }
}
class ActionViewer {
    constructor(act) {
        this.action = act;
        this.caption = i18n.acts_captions[act.actId];
        if (!this.caption) {
            console.error('missing caption ' + act.actId);
            this.caption = 'act' + act.actId;
        }
        this.hint = i18n.acts_helps[act.actId];
    }
    triggerAction() {
        let report = this.action.check(new ActionReport());
        if (report.fails.length) {
            console.info('act failed ' + this.action.actId + ' fails:' + report.fails.join(';'));
            ui.addInfo('act failed  TODO (1) : i18n checkFails[0]');
        }
        else {
            console.log('trigger action ' + this.caption);
            let act = this.action;
            let message = {
                type: MessageType.Action,
                actId: act.actId,
                actorId: act.zone.actor.gId.iId,
                expectedActorDH: act.zone.actorOriginalUpdateDH
            };
            if (act.target instanceof Cell) {
                message.targetCellSelector = { x: act.target.posX, y: act.target.posY };
            }
            else if (act.target instanceof EntityBase) {
                message.targetEntityId = act.target.gId.iId;
            }
            else {
                throw 'unknown target';
            }
            G_channel.send(message);
        }
    }
}
class Channel {
    constructor(options) {
        if (window.location.protocol === "file:") {
            ui.addInfo(i18n.detector.file_protocol, true, 10000);
            console.log('file:// => no socket');
            return;
        }
        if (options.socket) {
            this.socket = options.socket;
        }
        else {
            if (!options.wsUri) {
                options.wsUri = 'ws://localhost:8080/';
            }
            console.info('Channel > Connecting WebSocket to ' + options.wsUri);
            try {
                this.socket = new WebSocket(options.wsUri, options.protocol);
            }
            catch (e) {
                ui.addInfo(i18n.detector.websocket, true, 10000);
                console.error(e);
                return;
            }
        }
        this.socket.onmessage = (event) => { this.onChannelMessage(event); };
        this.socket.onopen = (event) => { this.onChannelOpen(event); };
        this.socket.onclose = (event) => { this.onChannelClose(event); };
    }
    onChannelOpen(event) {
        ui.addInfo(i18n.websocket_connected);
        let sessionId = getUserSessionId();
        console.log('Channel.onOpen > sessionId ' + sessionId);
        if (sessionId) {
            this.socket.send(sessionId);
        }
        else {
            let confirmRedirection = true;
            redirect('index.html', ToStringId.SessionError, confirmRedirection);
            throw 'no session id';
        }
    }
    onChannelClose(event) {
        console.warn('Engine.onChannelClose > Channel closed ungracefully ' + performance.navigation.type);
        console.warn('close code:' + event.code);
        ui.addInfo(i18n.websocket_disconnected, true, 2000);
    }
    onChannelMessage(event) {
        ui.setConnectedState('message_received');
        try {
            var o = JSON.parse(event.data);
            console.info('Channel.onSocketMessage > type:' + MessageType[o.type] + ' ' + event.data);
            if (o.type === MessageType.Error) {
                if (o.toStringId) {
                    console.info(i18n.x_messages[o.toStringId]);
                    ui.addInfo(i18n.x_messages[o.toStringId], true, 10000);
                }
                this.socket.close();
                return;
            }
            this.decode(o);
        }
        catch (e) {
            console.error(e);
            alert(i18n.x_messages[ToStringId.ServerError]);
        }
    }
    decode(m) {
        ui.stopSplash();
        if (m.type === MessageType.Zone) {
            G_engine.onZoneGist(m.zoneGist);
        }
        else if (m.type === MessageType.ReqPilot) {
            console.log('ui.pendingScene 0 > ' + ui.pendingScene);
            let pilotMsg = m;
            if (pilotMsg.piloted) {
                G_engine.onPilotedPool(pilotMsg.piloted);
            }
            if (pilotMsg.pilotable !== undefined) {
                ui.beingsScene.refreshPilotable(pilotMsg.pilotable);
            }
            console.log('ui.pendingScene 1 > ' + ui.pendingScene);
        }
        else if (m.type === MessageType.User) {
            ui.setUser(m);
            if (G_engine) {
                let pilotReq = { type: MessageType.ReqPilot,
                    piloted: { limit: 20 }
                };
                this.send(pilotReq);
            }
        }
        else if (m.type === MessageType.SetPilot) {
            console.log('setPilot ack');
            console.log(m);
            let pilotReq = { type: MessageType.ReqPilot,
                piloted: { limit: 20 },
                pilotable: { limit: 20 }
            };
            this.send(pilotReq);
        }
        else if (m.type === MessageType.Admin) {
            dispatchAdminAck(m);
        }
        else {
            console.error('Unknown message type ' + m.type);
        }
    }
    send(m) {
        console.log('Channel > send : ' + JSON.stringify(m));
        ui.setConnectedState('request_pending');
        this.socket.send(JSON.stringify(m));
    }
}
function report(msg) {
    console.error(msg);
}
var ui;
var G_store;
var G_channel;
var G_engine;
function createChannel() {
    console.log('yenah > Protocol version: ' + websocketProtocolVersion);
    let loc = window.location;
    let wsUri;
    if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
        wsUri = "ws://" + loc.host + "/";
    }
    else {
        wsUri = "ws://" + loc.hostname + ":8080/";
    }
    let sessionId = getUserSessionId();
    if (!sessionId) {
        console.log('createChannel > No sessionId ' + sessionId);
        let confirmRedirection = true;
        redirect('index.html', ToStringId.SessionError, confirmRedirection);
        throw 'no session id';
    }
    G_channel = new Channel({ wsUri: wsUri, requireAuth: true, protocol: websocketProtocolVersion });
}
function createEngine() {
    let eventTarget;
    ui = new HtmlUI(document.body);
    eventTarget = document;
    ui.setSize(window.innerWidth, window.innerHeight);
    createChannel();
    G_store = new Store();
    let canvasWebGl = document.getElementById('canvasWebGl');
    G_engine = new ClientEngine(canvasWebGl, eventTarget);
}
var dbg = {
    log(a) {
        console.log(a);
    },
    info(s) {
        console.info(s);
    },
    warn(s) {
        console.warn(s);
    },
    error(s) {
        console.error(s);
    },
    attr(s) {
    },
    assert(test, msg) {
        console.assert(test, msg);
    }
};
var WorldUI = {
    tileContructor: [],
    entity3DConstructor: [],
    cardUrl: [],
    TileFactory: function (zone, cell) {
        let tileConstructor = WorldUI.tileContructor[cell.cellType];
        if (!tileConstructor) {
            tileConstructor = Tile;
        }
        return new tileConstructor(zone, cell);
    },
    ActionViewerFactory: function (actId, zone, target) {
        let actionConstructor = World.actionContructor[actId];
        if (!actionConstructor) {
            actionConstructor = CoreAction;
        }
        let action = new actionConstructor(actId, zone, target);
        return new ActionViewer(action);
    },
    getModelUrl(classId) {
        let url = WorldUI.entity3DConstructor[classId];
        if (!url) {
            dbg.error('WorldUI.getModelUrl > Missing ' + classId);
            url = 'indeterminate';
        }
        return '../models/' + url + '.json';
    },
    getCardUrl(classId) {
        let url = WorldUI.cardUrl[classId];
        if (!url) {
            dbg.error('WorldUI.getCardUrl > Missing ' + classId);
            url = 'indeterminate';
        }
        return 'url(../cardz/' + url + '.jpg)';
    }
};
WorldUI.tileContructor[CellType.InderteminateCell] = Tile;
WorldUI.tileContructor[CellType.CellEarth] = TileEarth;
WorldUI.tileContructor[CellType.CellSand] = TileSand;
WorldUI.tileContructor[CellType.CellShallowWater] = TileShallowWater;
WorldUI.tileContructor[CellType.CellDeepWater] = TileDeepWater;
WorldUI.entity3DConstructor[ConceptClass.IndeterminateEntity] = 'indeterminate_entity';
WorldUI.entity3DConstructor[ConceptClass.Rock] = 'rock';
WorldUI.entity3DConstructor[ConceptClass.Slug] = 'slug';
WorldUI.entity3DConstructor[ConceptClass.Sheep] = 'sheep';
WorldUI.entity3DConstructor[ConceptClass.BarbarianF] = 'barbarian_f';
WorldUI.cardUrl[ConceptClass.IndeterminateEntity] = 'indeterminate';
WorldUI.cardUrl[ConceptClass.Slug] = 'slug';
WorldUI.cardUrl[ConceptClass.Sheep] = 'sheep';
WorldUI.cardUrl[ConceptClass.BarbarianF] = 'barbarian_f';
class ClientEngine {
    constructor(canvasWebGl, eventTarget) {
        this.cameraRadius = 50;
        this.cameraZ = 50;
        this.zone3DPool = {};
        this.activeZone3D = null;
        let cwgl = { canvas: canvasWebGl, context: canvasWebGl.getContext('webgl', { alpha: true }) };
        if (!cwgl.context) {
            ui.addInfo(i18n.detector.webgl, true, 10000);
            throw 'WebGl not supported';
        }
        this.renderer = new THREE.WebGLRenderer(cwgl);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        let canvasSizeX = window.innerWidth;
        let canvasSizeY = window.innerHeight;
        this.renderer.setSize(canvasSizeX, canvasSizeY);
        this.pointer = new Pointer(this, canvasWebGl, eventTarget);
        this.camera = new THREE.OrthographicCamera(canvasSizeX / -2, canvasSizeX / 2, canvasSizeY / 2, canvasSizeY / -2, 1, 2000);
        this.camera.zoom = 8;
        this.camera.updateProjectionMatrix();
        this.pointer.currentTheta = Math.PI / 4;
        var x = Math.round(Math.cos(this.pointer.currentTheta) * this.cameraRadius);
        var y = Math.round(Math.sin(this.pointer.currentTheta) * this.cameraRadius);
        this.camera.position.set(x, y, this.cameraZ);
        this.camera.up = new THREE.Vector3(0, 0, 1);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        window.addEventListener('resize', () => { this.onWindowResize(); });
        this.pointer.connectEventHandlers();
    }
    onWindowResize() {
        console.log('onWindowResize ' + window.innerWidth + ' ' + window.innerHeight);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.updateProjectionMatrix();
        this.renderOnce();
        ui.setSize(window.innerWidth, window.innerHeight);
    }
    startAnimation() {
        if (this.requestAnimationId) {
            console.error('Engine.startAnimation > Animation pending');
        }
        else {
            this.animate();
        }
    }
    stopAnimation() {
        if (this.requestAnimationId) {
            window.cancelAnimationFrame(this.requestAnimationId);
            delete this.requestAnimationId;
        }
        else {
            console.warn('Engine.stopAnimation > No animation');
        }
    }
    animate() {
        this.requestAnimationId = requestAnimationFrame(() => { this.animate(); });
        if (this.activeZone3D) {
            this.renderer.render(this.activeZone3D, this.camera);
        }
        else {
            console.warn('engine.animate > no scene3D');
        }
    }
    renderOnce() {
        if (this.activeZone3D) {
            this.renderer.render(this.activeZone3D, this.camera);
        }
    }
    onPilotedPool(pilotedPool) {
        this.zone3DPool = {};
        if (pilotedPool.length === 0) {
            console.log('TODO : onPilotedPoool > No piloted zone, switch to scene beings only if firsttime or display message ');
        }
        else {
            console.log('onPilotedPool > zones:' + pilotedPool.length);
            for (let agentRelGist of pilotedPool) {
                let scene3DLoader = new Zone3DLoader(agentRelGist);
                this.zone3DPool[agentRelGist.indId] = scene3DLoader;
            }
        }
        ui.mainScene.refreshPiloted(this.zone3DPool);
        ui.beingsScene.refreshPiloted(this.zone3DPool);
    }
    switchToZone(newZone) {
        if (this.activeZone3D === newZone) {
            console.log('Engine.switchToZone > Zone is already active : ' + this.activeZone3D.zone.actor.name);
            return;
        }
        ui.switchToMainScene();
        if (this.activeZone3D) {
            this.activeZone3D.inactivate();
        }
        this.activeZone3D = newZone;
        this.activeZone3D.activate();
    }
    onZoneGist(zoneGist) {
        let zone3DLoader = this.zone3DPool[zoneGist.actorGId.iId];
        if (zone3DLoader) {
            zone3DLoader.onZoneGist(zoneGist);
        }
        else {
            report('Engine.onZoneGist > No loader ' + zoneGist.actorGId.iId);
        }
    }
    tick() {
    }
}
function Imagination() {
    console.log('yenah > Imagination');
    let eventTarget;
    let canvas2D = document.getElementById('canvasUI');
    if (canvas2D) {
        ui = new CanvasUi(canvas2D);
        eventTarget = canvas2D;
    }
    else {
        ui = new HtmlUI(document.body);
        eventTarget = document;
    }
    ui.setSize(window.innerWidth, window.innerHeight);
    G_store = new Store();
    let loc = window.location;
    let canvasWebGl = document.getElementById('canvasWebGl');
    G_engine = new ClientEngine(canvasWebGl, eventTarget);
    setTimeout(function () { ui.stopSplash(); }, 1000);
    let createAgent = function (indId, name, classId, posX, posY, direction) {
        let agent = {
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
    };
    let pilotedz = [
        createAgent('0', 'crea0', ConceptClass.Slug, 0, 0, Direction.W),
        createAgent('1', 'crea1', ConceptClass.Sheep, 1, 1, Direction.NW),
        createAgent('2', 'crea2', ConceptClass.BarbarianF, 2, 2, Direction.N)
    ];
    G_engine.onPilotedPool(pilotedz);
    for (let idx in pilotedz) {
        let zoneGist = {
            actorGId: pilotedz[idx].gId,
            snapshotDH: 0,
            originX: 0,
            originY: 0,
            agents: pilotedz,
            furnitures: [],
            cells: []
        };
        G_engine.onZoneGist(zoneGist);
    }
}
function setUserSession(authId) {
    if (typeof authId === 'string') {
        let days = 1;
        var date = new Date();
        date.setTime(date.getTime() + cookieExpiration);
        document.cookie = 'authId=' + authId + '; expires=' + date.toUTCString();
        console.log('setUserAuth > identification ok, authId:' + authId + ' cookie:' + document.cookie);
    }
    else {
        document.cookie = 'authId=; expires=Thu, 01-Jan-70 00:00:01 GMT';
        console.info('setUserAuth > logout');
    }
}
function getUserSessionId() {
    if (document.cookie) {
        var res = document.cookie.match(/authId=(\w+)/);
        if (res != null && res.length == 2)
            return res[1];
    }
    return false;
}
function redirect(href, reason, confirmRedirection = false) {
    if (confirmRedirection) {
        if (confirm(i18n.x_messages[reason])) {
            document.location.href = href;
        }
    }
    else {
        if (reason) {
            if (i18n.x_messages[reason]) {
                alert(i18n.x_messages[reason]);
            }
            else {
                alert('Error code ' + reason);
            }
        }
        document.location.href = href;
    }
}
var widgetCaptcha;
var captchaCallback = function (response) {
    console.log(response);
    var btn = (document.getElementById('signin_button'));
    btn.disabled = false;
};
var onloadCallback = function () {
    widgetCaptcha = grecaptcha.render('divcaptcha', {
        sitekey: '6Lch0v4SAAAAAF9EtTI6Kb40Rvll5TnF4i-wFSjW',
        callback: captchaCallback
    });
};
var XUserSessionAck = function (ev) {
    console.log('XUserSessionAck >');
    console.log(this.responseText);
    let response;
    try {
        response = JSON.parse(this.responseText);
    }
    catch (e) {
        console.error('Parsing error in' + this.responseText);
        response = { type: MessageType.Error, toStringId: ToStringId.ServerError };
    }
    if (response && response.type === MessageType.User && response.userOptions.name) {
        if (response.closed) {
            setUserSession(false);
        }
        else {
            if (response.sessionId !== undefined) {
                setUserSession(response.sessionId);
            }
        }
        XClearError();
        XShowSuccess(response.userOptions.name);
        return;
    }
    console.info('XUserSessionAck > Error, reset session');
    setUserSession(false);
    XShowError(i18n.x_messages[response.toStringId]);
};
var XSubmitRegistration = function (form) {
    let cResponse = 'test';
    XClearError();
    form.style.visibility = 'hidden';
    let xReq = new XMLHttpRequest();
    xReq.onload = XUserSessionAck;
    xReq.onerror = function (e) {
        console.error(e);
        XShowError(e.message);
    };
    let nameInput = document.getElementById('input_name');
    let mailInput = document.getElementById('input_mail');
    let passwordInput = document.getElementById('input_password');
    let dateInput = document.getElementById('input_date');
    let data = {
        type: MessageType.Registration,
        name: nameInput.value,
        mail: mailInput.value,
        password: passwordInput.value,
        date: dateInput.valueAsDate,
        response: cResponse
    };
    xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
    xReq.send();
};
var XSubmitLogin = function (form) {
    XClearError();
    form.style.visibility = 'hidden';
    let xReq = new XMLHttpRequest();
    xReq.onload = XUserSessionAck;
    xReq.onerror = function (e) {
        console.error(e);
        XShowError(e.message);
    };
    let loginInput = document.getElementById('input_login');
    let passwordInput = document.getElementById('input_password');
    let data = {
        type: MessageType.Login,
        login: loginInput.value,
        password: passwordInput.value,
    };
    xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
    xReq.send();
};
var XCheckSession = function (form) {
    let sessionId = getUserSessionId();
    if (sessionId) {
        XClearError();
        form.style.visibility = 'hidden';
        let xReq = new XMLHttpRequest();
        xReq.onload = XUserSessionAck;
        xReq.onerror = function (e) {
            console.error(e);
            XShowError(e.message);
            setUserSession(false);
        };
        let data = {
            type: MessageType.SessionCheck,
            sessionId: sessionId,
            doClose: false
        };
        xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
        xReq.send();
    }
};
var XShowSuccess = function (username) {
    console.log('XShowSuccess > ' + username);
    if (username) {
        document.getElementById('user_name').textContent = username;
    }
    document.getElementById('success_display').style.visibility = 'visible';
};
var XShowError = function (message = i18n.x_messages[ToStringId.ServerError]) {
    console.log('XShowError > ' + message);
    let dispErr = document.getElementById('error_display');
    dispErr.textContent = message;
    dispErr.style.visibility = 'visible';
    let form = document.forms[0];
    if (form) {
        form.style.visibility = 'visible';
    }
};
var XClearError = function () {
    console.log('XClearError > ');
    let dispErr = document.getElementById('error_display');
    dispErr.textContent = '';
    dispErr.style.visibility = 'hidden';
};
var XCloseSession = function () {
    let sessionId = getUserSessionId();
    console.log('XCloseSession > sessionId: ' + sessionId);
    if (sessionId) {
        XClearError();
        let xReq = new XMLHttpRequest();
        xReq.onload = XUserSessionAck;
        xReq.onerror = function (e) {
            console.error(e);
            XShowError(e.message);
            setUserSession(false);
        };
        let data = {
            type: MessageType.SessionCheck,
            sessionId: sessionId,
            doClose: true
        };
        xReq.open("get", '/req?json=' + encodeURIComponent(JSON.stringify(data)), true);
        xReq.send();
    }
};
function adminMode() {
    ui = new AdminUI(document.body);
    let eventTarget = document;
    ui.setSize(window.innerWidth, window.innerHeight);
    createChannel();
}
class AdminUI extends HtmlUI {
    constructor(container) {
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
    addAction(container, actId) {
        let requestButton = document.createElement('input');
        requestButton.type = 'button';
        requestButton.value = AdminActId[actId];
        requestButton.onclick = function () {
            let act = new AdminAction(actId);
            act.triggerAction();
        };
        container.appendChild(requestButton);
    }
}
class AdminAction {
    constructor(actId = AdminActId.Information) {
        this.actId = actId;
    }
    triggerAction() {
        console.log('triggerAction ' + this.actId);
        let message = {
            type: MessageType.Admin,
            adminActId: this.actId,
        };
        G_channel.send(message);
    }
}
function dispatchAdminAck(m) {
    console.log('admin message');
    console.log(m);
}
//# sourceMappingURL=client.js.map