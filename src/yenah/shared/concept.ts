
import { CoreAction, ActMoveTo, ActTurnTo, ActPickUp, ActGive } from './action'
import { dbg } from '../../services/logger'

export enum MatterType { Rock, Flesh, Wood }
export enum ConceptClass { IndeterminateEntity, Rock, Slug, Sheep, BarbarianF }
export enum CellType { InderteminateCell, CellEarth, CellSand, CellShallowWater, CellDeepWater }
export enum ActId { ActMoveTo, ActTurnTo, ActPickUp, ActLayDown, ActGive }
export enum FailId { NoAct, Qt, Energy, RangeIs1, CannotWelcome, CannotContain }
export enum DynAttr { Mass, Cond, Qt, Energy }
export enum ModAttr { CondMax, CondSlope, EnergyMax, EnergySlope, QtMax, QtSlope, MoveEarth, MoveWater, MoveAir, Solidity }

export enum CollectionId { Indirection, User, Furniture, Agent, Cell, Session } // FIXME (0) => in persistor ? or needed by client for Indirection ?

// TODO (5) : const object =>  Object.freeze() ?
// const MS_PER_TICK = 60000; // 1000ms*60s ~ 1 tick = 1 minute irl (slow time-dependent mode)
const MS_PER_TICK = 1000; // 1000ms ~ 1 tick = 1 second irl (fast time-dependent mode)
// const MS_PER_TICK = 1; // 1 tick = 1 engine cycle (time-independent mode)

export const Constants = {
    DT: MS_PER_TICK, // number of irl miliseconds per tick  
    DT_IGDAY: 600 * MS_PER_TICK, // 10h * 60min ~ 1 ig day = 10h irl 
    DT_IGYEAR: 43200 * MS_PER_TICK, // 30days * 24h * 60min ~ 1 ig year = 1 month irl 

    MAX_VISION_RADIUS: 4,  // 32, //  4 : devel
    MAX_VEGETATION: 127,

    NO_SLOPE: 0,
    SLOPE_ONE_PER_IRLHOUR: 1 / (MS_PER_TICK * 60),
    //INVSLOPE_ONE_PER_IRLMIN: MS_PER_TICK,
    //INVSLOPE_ONE_PER_IRLHOUR: MS_PER_TICK * 60,
    MAX_BEING_MASS: 10000, // maximal being mass (~ 10 tons), used to normalize masses wrt. aging slope
    COND_MAX: 100, // condition of an entity 100% // TODO (2) : if condMax is allways 100 => constant not in persistor ? or is it usefull for buildings ?
    GA_AGENT_MIN_COND: 10, // ~ weakest creature
    GA_MAX_MOVE_WATER: 4,
    GA_MAX_MOVE_EARTH: 4
}

const BEING_MASS = 64;
export const Defaults = {
    FURNITURE_MASS: 8, // ~ 8Kg little furniture, average newborn being mass 
    FURNITURE_COND_SLOPE: Constants.NO_SLOPE, // TODO (4) : very slow degradation of furnitures ?
    BEING_COND_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    BEING_MASS: BEING_MASS, // default : ~64Kg 

    FAST_MASS_SLOPE: Constants.DT_IGYEAR / BEING_MASS, // fast ageing : juvenil to adult in one ig year ~ animal-like
    SLOW_MASS_SLOPE: 20 * Constants.DT_IGYEAR / BEING_MASS, // slow ageing : juvenil to adult in 20 ig year ~ human-like
    QT_MAX: 32,    // Size of the "slot of time" an agent can use !!! must be more than any action qt cost !!!
    QT_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    ENERGY_MAX: 128,
    ENERGY_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    BEING_STOMACH: 10, // TODO (1) : common max ? energy related ?
    MOVE_EARTH: 1,
    MOVE_WATER: 0,
    MOVE_AIR: 0,
    VEGETATION: 0
}

/*
function setUniversalTimestep(invSlope: number) {
    dbg.log('setUniversalTimestep ' + invSlope);
    Defaults.QT_SLOPE = invSlope;
    Defaults.ENERGY_SLOPE = invSlope;
    Defaults.BEING_COND_SLOPE = invSlope;
}*/

// Add dummy values to let the compiler detect signature difference between strings
// FIXME (5) : if identifier type is changed from string | number to something else (e.g. objects), one needs to clone each time it is affected (ex in toDao())
/*export class ItemIdentifier extends String { isEntity = true; constructor(iId: string) { super(iId) } }
export class IndirectionItemIdentifier extends ItemIdentifier { isIndirection = true } // client-side indirect identifier
export class UserItemIdentifier extends ItemIdentifier { isUser = true }
export class AgentItemIdentifier extends ItemIdentifier { isAgent = true }
export class FurnitureItemIdentifier extends ItemIdentifier { isFurniture = true }*/
export type ItemIdentifier = string
export type IndirectionItemIdentifier = string // client-side indirect identifier
export type UserItemIdentifier = string
export type AgentItemIdentifier = string
export type FurnitureItemIdentifier = string
export type TransientIdentifier = number

export type GenericStringId = string // string representation of a GenericIdentifier for use as dictionary indexes
export abstract class GenericIdentifier {

    cId: number // ~ collection Id, list Id, table Id
    abstract toIdString(): GenericStringId
}

// Cell Identifier
// absolute position  : (implicit) ref to region + x, y
// relative position  : (explicit) ref to actor (observer) + dx, dy
// FIXME (1) : there are two instances of postions in cells (in id and in gist) ! =>  Cell implements CellIdentifier { this.posX, this.posY } ?
export class CellIdentifier extends GenericIdentifier {
    constructor(public x: number, public y: number) {
        super();
        this.cId = CollectionId.Cell;
        // this.x = x;
        // this.y = y;
    }
    // x: number
    // y: number
    toIdString() {
        return this.x + '_' + this.y;
    }
}

// "something that can be used in an action as a target"
export interface Target {

    // gId: GenericIdentifier
    posX: number
    posY: number
    reactions: ActId[]
    //  getIdentifier(): IdentifierInterface
    getD2A(originX: number, originY: number): number
    getA4A(originX: number, originY: number): number
    asRelativeEntity(observer: AgentInterface, relId: IndirectionItemIdentifier): void
    toDao(): {} // ~ interface Dao {}
}

// Referentials 

export interface SpaceRef {
    originX: number
    originY: number
}

export var absoluteSpaceOrigin: SpaceRef = {
    originX: 0,
    originY: 0
}

// modifiers.ts

export interface ModifierDao {
    type: ModAttr
    originDH: number
    duration: number
}

class AttributeModifier implements ModifierDao {

    type: ModAttr
    originDH: number
    duration: number
    // abstract mod(this: Entity): void
    mod(baseValue: number) { return baseValue }

    constructor(modifierDao: ModifierDao) {
        this.type = modifierDao.type;
        this.originDH = modifierDao.originDH;
        this.duration = modifierDao.duration;
    }
}

class CondSlopeModifier extends AttributeModifier {

    mod(baseCondSlope: number) {
        return -baseCondSlope;
    }
}

// TODO (1) : add to World constructors ?

var ModifierConstructors: typeof AttributeModifier[] = [];
ModifierConstructors[ModAttr.CondSlope] = CondSlopeModifier;

function ModifierFactory(modifierDao: ModifierDao): AttributeModifier {

    return new ModifierConstructors[modifierDao.type](modifierDao);

}

// DynModifier
// SlopeModifier
// BaseModifier
// PeriodicModifier (mood ~ mind capacities, qt max, energy max) or as permanent attibute ?

// condslope mod : hungry, acid, fire, cold (furniture & agents), poison (agents)
// mood modifiers : energyslope, max energy, qt slope, max qt
// move modifier : reduce/enhence move 
// ex : run : , augment move cost energy   reduce move costqt
// repos : energyslope++
// solidity modifier
// disable capacity (ex : compass)

// Organ is a furniture, but it is "non amovible"
// TODO (1) : implement organs as mixins (interfaces only)
export interface Organ { // DOES NOT extends Entity but implements EntityInterface

}

// TODO (2) : interface Armature { } => skeleton / chitin

export interface Solidity {
    cut?: number
    blunt?: number
    fire?: number
    acid?: number
    elec?: number
    poison?: number
}

// Passive effect on contact
export interface Damage extends Solidity {
    // poison?: number // Poisoning on consumption
}

// all attributes are normalized, so condMax = 1, qtMax = 1, energyMax = 1
export type Slope = number
export type Angle = number
export enum Direction {
    W = 0,
    NW = Math.PI / 4,
    N = Math.PI / 2,
    NE = 3 * Math.PI / 4,
    E = Math.PI,
    SE = 5 * Math.PI / 4,
    S = 6 * Math.PI / 4,
    SW = 7 * Math.PI / 4
}

// interface to sync queries 
export interface PositionGauge {
    posX: any,
    posY: any
}

// interface Position : Conflict with es api https://developer.mozilla.org/en-US/docs/Web/API/Position => rename as CartesianPosition
// TODO (2) : use standard geolocation for IG creatures ? 
// x(cell) => longitude(deg) ; y(cell) => latitude(deg) ; z(cell) => altitude(meter) ; theta(rad) => heading(deg) ; updateDH => timestamp ; (stand/walk/run mode) => speed(m/s)  
interface CartesianPosition extends PositionGauge {
    posX: number,
    posY: number
}

// entity.ts

export class EntityIdentifier extends GenericIdentifier {
    iId: ItemIdentifier // ~ item Id (local to collection, list, table...)
    constructor(cId: CollectionId, iId: ItemIdentifier) {
        super();
        this.cId = cId;
        // this.iId = new ItemIdentifier(iId);
        this.iId = iId;
    }
    toIdString(): GenericStringId {
        return this.cId + '_' + this.iId;
    }
}

export class IndirectEntityIdentifier extends EntityIdentifier {

    iId: IndirectionItemIdentifier

    constructor(indId: IndirectionItemIdentifier) {
        super(CollectionId.Indirection, indId);
        // this.iId = new IndirectionItemIdentifier(indId);
        this.iId = indId;
    }
    toIdString(): GenericStringId {
        return this.cId + '_' + this.iId;
    }
}

// Frequently varying attributes, only separated from other EntityOptions for Persistor optimisation
export interface EntityVarOptions extends CartesianPosition {
    updateDH: number
    // TODO (1) : Referential : Identifier
    theta: Angle // direction in XY plane
    cond: number
}

export interface EntityOptions {

    classId: ConceptClass
    varAttr: EntityVarOptions
    condMax?: number
    condSlope?: Slope
    mass?: number
    mainMaterial?: MatterType	// TODO (4) : defined by solidity ? being=> flesh/vegetal
    mainColor?: number // (visibility modifier ?)
    solidity?: Solidity
    passiveRetort?: Damage
    baseCapacity?: 0 // TODO (2) : inventory max length ? or getMassSum() limit ?
    modifiers?: ModifierDao[]
}

export interface EntityIdOptions extends EntityOptions {
    gId: EntityIdentifier
}

export interface EntityInterface extends Target {

    gId: EntityIdentifier
    updateDH: number
    readonly varModified: boolean
    readonly fullModified: boolean
    readonly reactions: ActId[]
    readonly entType: ConceptClass
    theta: number
    posX: number
    posY: number
    cond: number
    readonly condSlope: number
    readonly condMax: number
    readonly mass: number

    readonly inventory: EntityInterface[]

    canContain(entity: EntityInterface): boolean

    toDao(): EntityOptions
    toVarDao(): EntityVarOptions
    toIdDao(): EntityIdOptions
}

export abstract class EntityBase implements EntityInterface {

    gId: EntityIdentifier
    //  protected updateDH: number   // "dao update time" : last saving in Persistor  // TODO (0) : updateDH ?
    varModified = false; // TODO (5) : public readonly, getter, no setter 
    fullModified = false; // TODO (5) : public readonly, getter, no setter
    //  protected inventoryModified = false;
    //  protected organsModified = false;

    // protected baseAttr: number[]
    // protected dynAttr: DynamicAttribute[]
    // protected organs: Organ[]
    inventory: EntityInterface[] = [] // TODO (0) : readonly inventory modifications getter/setter
    protected modifiers: AttributeModifier[] = []
    // discretions: number[], // visibility of each attribute by an observer
    readonly reactions: ActId[] = [] // TODO (1) : reactions[indexedActs] or reactionsList[].push (acts...) save in DB or fixed by entType ?

    protected _classId = ConceptClass.IndeterminateEntity
    get entType() { return this._classId }
    // set entType(v: EntityType) { throw 'changing entType is not allowed, create a new Entity with given entType in gist' }

    // parentId: Identifier | undefined;
    protected _theta: Angle // direction in XY plane
    get theta() { return this._theta }
    set theta(v: Angle) { if (v !== this._theta) { this._theta = v; this.varModified = true } }
    protected _posX: number
    get posX() { return this._posX }
    set posX(v: number) { if (v !== this._posX) { this._posX = v; this.varModified = true } }
    protected _posY: number
    get posY() { return this._posY }
    set posY(v: number) { if (v !== this._posY) { this._posY = v; this.varModified = true } }
    protected _cond: number
    get cond() { return this._cond }
    set cond(v: number) { if (v !== this._cond) { this._cond = v; this.varModified = true } }
    protected _condSlope: Slope
    protected modCondSlope: Slope
    get condSlope() { return this.modCondSlope }
    protected _condMax: number
    get condMax() { return this._condMax }

    protected _mass: number // Mass is fixed for furnitures but dynamic for agents
    get mass() { return (this._mass) }

    protected _updateDH: number // "entity update time" : dynamic time for this Entity instance
    get updateDH() { return this._updateDH }
    set updateDH(newUpdateDH: number) {

        // update cond
        let dt = newUpdateDH - this._updateDH;

        if (dt < 0) {
            throw 'Entity.set updateDH > Trying to reverse time. newUpdateDH ' + newUpdateDH + ' < ' + this._updateDH;
        }
        else if (dt === 0) {
            return;
        }

        this.varModified = true
        this._updateDH = newUpdateDH;

        this.applyModifiers();
        this._cond = this.getDynNormalValue(dt, this._cond, this._condMax, this.modCondSlope);

    }

    // FIXME (5) : do not use constructor, applyModifiers 'post-constructor' must be called after all other inits,
    // and 'this' cannot be accessed before super() call => call fromOptions from each extended constructor
    // constructor(opt: EntityOptions) {} 
    protected fromOptions(opt: EntityIdOptions) {

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

        // TODO (0) : modifiers
        if (opt.modifiers) {
            for (let modifierDao of opt.modifiers) {
                this.addModifier(ModifierFactory(modifierDao));
            }
        }

        this.applyModifiers();
    }

    // TODO (1) : give stable/instable info to stablilize ? 
    // TODO (1) : separate positive only and positive/negative allowed ?

    // get dynamic attribute normalized value
    protected getDynNormalValue(dt: number, val: number, max: number, slope: number) {

        if (slope != Constants.NO_SLOPE) {
            val += dt * slope;  // FIXME (1) : slope should be an integer. Use inverseSlope to store in options ?
        }
        let limitedVal = val > max ? max : (val < 0 ? 0 : val);

        dbg.log('getDyn > ' + limitedVal
            + ' (max:' + 1
            + ' dh:' + this._updateDH
            + ' detaT:' + dt
            + ' slope: ' + slope
            + ' real: ' + val + ') from '
            + this.gId
        );

        return limitedVal;
    }

    private addModifier(modifier: AttributeModifier) {

        if (modifier.originDH + modifier.duration >= this.updateDH) {
            console.error('addModifier > expired modifier');
            return;
        }

        // TODO (0) : check for duplicate ?

        this.modifiers.push(modifier);
        // order by increasing expiration time
        this.modifiers.sort(function (a, b) { return a.duration - b.duration; });
    }

    protected applyModifiers() {

        // modifiers are ordered by increasing expiration time

        // TODO (1) : for modAttr[ID]... ?
        this.modCondSlope = this._condSlope;
        // FIXME (1) modCondMax ? how to do it with normalized values ?? localMax = 0.9 of globalMax for example ?

        if (this.modifiers.length) {
            dbg.log('Entity applyModifiers :' + this.modifiers.length);

            let index = 0;
            for (let modifier of this.modifiers) {
                if (modifier.originDH + modifier.duration >= this.updateDH) {
                    // FIXME (1) : apply before removing ? (ex: poison)
                    // remove modifier
                    this.fullModified = true;
                    this.modifiers.splice(index, 1);
                    // TODO (0) : set updateDH to expiration time ?
                }
                else {
                    modifier.mod.call(this); // modifier.mod(this);

                }
                index++;

                // modAttr += ... +increment or *ratio ? log cumulables to max ?
            }
        }
    }

    toVarDao(): EntityVarOptions { // ~ protected, Persistor friend ! (only used internally or to store partial doc in Persistor)
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond,
        }
    }

    toDao(): EntityOptions {

        return {
            varAttr: this.toVarDao(),
            classId: this._classId,
            mass: this._mass,
            condSlope: this._condSlope
        }
    }

    abstract toIdDao(): EntityIdOptions

    protected pushEntity(entity: EntityInterface) {
        this.inventory.push(entity);
    }

    getWeight() {
        return this.mass;
        // TODO (0) : + inventory mass
    }

    canContain(_entity: EntityInterface): boolean {
        // TODO (4) : this.getContentWeight() > this.getMaxCapacity()
        return false;
    }

    // TODO (5) : ~ AbsEntityExtends Entity
    /*   getIdentifier(): TargetSelector {
          return { collId: CollectionId.Furniture, iId: this.iId }
      }  */
    //  abstract getIdentifier(): AbsIdentifier

    getD2A(originX = 0, originY = 0) {

        let relX = this._posX - originX;
        let relY = this._posY - originY;
        return Math.round(Math.sqrt(relX * relX + relY * relY));
    }

    // get angle (quadrant) for actor
    getA4A(originX = 0, originY = 0) {
        // radian to direction (0 -> 7)
        // Math.atan2(delta x, delta y), assuming actor is ALWAYS at zone center (0,0)

        let relX = this._posX - originX;
        let relY = this._posY - originY;

        let theta = 8 * Math.atan2(relX, relY) / Math.PI;
        if (theta < 0)
            theta = 16 + theta;
        if (theta > 15)
            theta = 0;
        return Math.floor(theta / 2);
    }

    asRelativeEntity(observer: AgentInterface, relId: IndirectionItemIdentifier) {

        // FIXME (1) : pre-external observe for entType cast (indeterminate, disguise...)
        // TODO (2) : modify each attribute f(actor.perception* -(/?) this.dicretion*)
        this.gId = new IndirectEntityIdentifier(relId);
        this._posX -= observer.posX;
        this._posY -= observer.posY;
    }
}

// furniture.ts

export interface FurnitureIdDao extends EntityOptions {
    gId: EntityIdentifier
}

export interface FurnitureInterface extends EntityInterface {
    readonly isFurniture: true // dummy signature ~ instanceof FurnitureInterface
}

interface FurnitureConstructor {
    new(opt: EntityOptions): FurnitureInterface; // TODO (1) : FurnitureOptions extends EntityOptions ?
}

export class Furniture extends EntityBase implements FurnitureInterface {

    readonly isFurniture = true

    constructor(opt: EntityIdOptions) {
        super();
        super.fromOptions(opt);
    }

    toIdDao(): FurnitureIdDao {
        let dao: FurnitureIdDao = <FurnitureIdDao>this.toDao();
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

// agent.ts

export class AgentIdentifier extends EntityIdentifier {
    iId: AgentItemIdentifier
    constructor(iId: string) {
        super(CollectionId.Agent, iId);
    }
}

interface AgentVarOptions extends EntityVarOptions {

    qt: number
    energy: number
    stomach: number
}

export interface PilotableDao {
    classId: ConceptClass
    posX: Number
    posY: number
    name: string
}

export interface PilotableAbsIdDao extends PilotableDao {
    agentIId: AgentItemIdentifier
}

export interface PilotableTransientIdDao extends PilotableDao {
    transId: TransientIdentifier
}

export interface AgentOptions extends EntityOptions {

    varAttr: AgentVarOptions
    name: string
    //  pilotId: number   // only accessible from Persistor.setPilot/getPilot
    massMax?: number
    massSlope?: Slope
    qtMax?: number
    qtSlope?: Slope
    energyMax?: number
    energySlope?: Slope

    // Characteristics summary for external interface (defined in detail by organs, invenrory, modifiers...)
    moveEarth?: number	// Capacité de déplacement terrestre
    moveWater?: number	// Capacité de déplacement aquatique
    moveAir?: number	// Capacité de déplacement aérien
    attack?: Damage
    remoteAttack?: Damage

    capture?: number	// Capacité de capture
    remoteCapture?: number	// Lancer de filet
    web?: 0	// Fabrication de toile
    // attack_bury: 0,	// Affut enterré => propriété de mind/conscience/strategy ?
    perceptionDiurnal?: number	// Perception diurne
    perceptionNocturnal?: number	// Perception nocturne
    perceptionAlteration?: number	// Mimétisme passif
    // hide: 0,	// Camouflage actif => propriété de mind/conscience/strategy ? modificateur de perceptionAlteration
    mind?: number // Souvenirs, mémoire
    consciousness?: number	// Conscience
    social?: number	// Communication, langage (propriété de mind/conscience/strategy ? )
    prehension?: number	// Préhensile = > donne accès à inventaire ?

    diet?: number	// Régime alimentaire
    compass?: number	// Localisation (propriété de mind/conscience/strategy ? )
    compassTx?: number	// Partage de la localisation
    compassRx?: number	// Partage de la localisation
    breedType?: number	// Reproducteur auto, émetteur (~mâle) et/ou récepteur (~femelle) 
    pregnancySlope?: Slope	// Vitesse de conception
    pregnancyCount?: number	// Nombre de descendants
    pregnancyCond?: number	// Corpulence des descendants
    juvenileDuration?: number	// Info génétique permettant de calculer le type d'état juvenile larve, etc... => durée d'inhibition sexuelle , calcul life_duration ? et pregnancy_duration ?
    juvenileType?: number	// Info génétique sur le type de larve/juvénile/oeuf/graine => set actions. A voir, pointeur sur un génome typique ?
    diseases?: number[]	// Porteur des maladies (porteur sain ou non !)
}

export interface AgentIdOptions extends AgentOptions {

    gId: EntityIdentifier
}

export interface AgentIdRelOptions extends AgentOptions {

    indId: IndirectionItemIdentifier
}

export interface AgentInterface extends EntityInterface {

    gId: AgentIdentifier

    readonly actions: ActId[]  // isAgent: true // ~ has actions 
    // TODO (0) : readonly moves, stomach, name ?
    name: string
    stomach: number
    moveWater: number
    moveEarth: number
    moveAir: number

    readonly massMax: number
    readonly massSlope: number
    getWeight(): number // full weight, including inventory
    qt: number
    readonly qtMax: number
    readonly qtSlope: number
    energy: number
    readonly energyMax: number
    readonly energySlope: number

    canReceive(furniture: FurnitureInterface): void

    toVarDao(): AgentVarOptions
    toDao(): AgentOptions
    toIdDao(): AgentIdOptions
}

interface AgentConstructor {
    new(opt: AgentOptions): AgentInterface;
}

export class Agent extends EntityBase implements AgentInterface {

    gId: AgentIdentifier

    name: string
    stomach: number
    moveWater: number
    moveEarth: number
    moveAir: number

    protected _massSlope: Slope
    get massSlope() { return this._massSlope }
    protected _massMax: number
    get massMax() { return this._massMax }

    protected _qt: number
    get qt() { return this._qt }
    set qt(v: number) { if (v !== this._qt) { this._qt = v; this.varModified = true } }
    protected _qtSlope: Slope
    protected modQtSlope: Slope
    get qtSlope() { return this.modQtSlope }
    protected _qtMax: number
    get qtMax() { return this._qtMax }

    protected _energy: number
    get energy() { return this._qt }
    set energy(v: number) { if (v !== this._energy) { this._energy = v; this.varModified = true } }
    protected _energySlope: Slope
    protected modEnergySlope: Slope
    get energySlope() { return this.modEnergySlope }
    protected _energyMax: number
    get energyMax() { return this._energyMax }

    readonly actions: ActId[] = []

    get updateDH() { return this._updateDH }
    set updateDH(newUpdateDH: number) {

        // update cond
        let dt = newUpdateDH - this._updateDH;

        if (dt < 0) {
            throw 'Entity.set updateDH > Trying to reverse time. newUpdateDH ' + newUpdateDH + ' < ' + this._updateDH;
        }
        else if (dt === 0) {
            return;
        }

        this.varModified = true
        this._updateDH = newUpdateDH;

        this.applyModifiers();
        this._cond = this.getDynNormalValue(dt, this._cond, this._condMax, this.modCondSlope);
        this._qt = this.getDynNormalValue(dt, this._qt, this._qtMax, this.modQtSlope);
        this._energy = this.getDynNormalValue(dt, this._energy, this._energyMax, this.modEnergySlope);
    }

    constructor(opt: AgentIdOptions) {
        super();

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

        // TODO (0) : stomach etc...AgentBase
        // this.applyModifiers();
        super.fromOptions(opt);
    }

    toVarDao(): AgentVarOptions {
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond,
            qt: this.qt,
            energy: this.energy,
            stomach: this.stomach
        }
    }

    toDao(): AgentOptions {

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
        }
    }

    toIdDao(): AgentIdOptions {
        let dao: AgentIdOptions = <AgentIdOptions>this.toDao();
        dao.gId = this.gId;
        return dao;
    }

    clone(): AgentInterface {
        // Little hack : AgentIdDao = AgentDao + iId
        let idDao: AgentIdOptions = <AgentIdOptions>this.toDao();
        idDao.gId = this.gId;
        return World.AgentFactory(idDao);
    }

    protected applyModifiers() {
        // modifiers are ordered by increasing expiration time

        // TODO (1) : qtmax, energymax,... => for modAttr[ID]... ?
        this.modQtSlope = this._qtSlope;
        this.modEnergySlope = this._energySlope;

        super.applyModifiers();
    }

    canReceive(_furniture: Furniture) {
        // TODO
        return false;
    }

    // TODO (5) : ~ AbsAgentExtends Agent
    /*  getIdentifier(): AbsIdentifier {
          return { cId: CollectionId.Agent, iId: this.iId }
      } */

    asRelativeEntity(observer: AgentInterface, relId: IndirectionItemIdentifier) {
        super.asRelativeEntity(observer, relId);

        // TODO (2) : modify each attribute f(actor.perception* -(/?) this.dicretion*), get name from observer souvenirs
        // FIXME (0) : actor is a clone, so cannot use === ; => compareGid() ?
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

export interface CellDao {
    cellType: CellType,
    posX: number,
    posY: number,
    vegetation?: number
}

export class Cell implements Target { // TODO (1) : implements EntityContainer

    cellType: CellType

    // gId: CellIdentifier

    fullModified = false; // TODO (5) : public readonly, getter, no setter
    posX: number
    posY: number

    //	updateDH: number | undefined

    inventory: FurnitureInterface[] = [] // TODO (0) : this.fullModified

    being: AgentInterface | undefined // TODO (0) : this.fullModified
    // TODO (1) : if this.vegetation === Defaults.VEGETATION delete from db
    protected _vegetation: number
    get vegetation() { return this._vegetation }
    set vegetation(v: number) { if (v !== this._vegetation) { this._vegetation = v; this.fullModified = true } }

    reactions: ActId[] = [ActId.ActMoveTo, ActId.ActTurnTo]

    toString() { // TODO (4) : used for debug only
        return '{' + CellType[this.cellType] + ', ' + this.posX + ', ' + this.posY + '}';
    }
    //   
    /*  arrayMapping: any = {
          jid: 'Cell',
          rel_x: 0,
          rel_y: 0,
          vegetation_max: 0,
          vegetation: 0,
          vegetation_slope: 0,
          fertilizer_max: 0,
          fertilizer: 0,
          fertilizer_slope: 0,
          tracks_max: 0,
          tracks: 0,
          tracks_slope: 0,
          visibility: 0,
          agent: 'TYPE_ENTITY',
          furnitures: Furniture[]
        //  abs_x: 'OPTIONAL_DEBUG',
        //  abs_y: 'OPTIONAL_DEBUG',
      } */

    constructor(cellDao: CellDao) {

        this.cellType = cellDao.cellType;
        this.posX = cellDao.posX;
        this.posY = cellDao.posY;
        this._vegetation = cellDao.vegetation !== undefined ? cellDao.vegetation : Defaults.VEGETATION;

        // this.tracks = cell.tracks | 0;
        // this.visibility = cell.visibility | 10;
        // this.x = cell.rel_x;
        // this.y = cell.rel_y;
    }

    pushFurniture(furniture: FurnitureInterface) {
        dbg.log('pushFurniture ' + furniture);

        this.inventory.push(furniture);
    }

    setBeing(being: AgentInterface) {

        if (this.being) {
            throw 'CoreCell.setBeing : being already set';
        }

        this.being = being;
    }

    canWelcome(entity: EntityInterface) {


        if (entity instanceof Agent) { // FIXME (0) : instanceof Interface ? 
            return this.being === undefined; // !(this.being instanceof CoreAgent);
        }

        if (entity instanceof Furniture) {
            // TODO : this.getContentWeight() > this.getMaxCapacity()
            return true;
        }

        // TODO (4) : building

        return true;

    }

    getMoveCostT(_a: AgentInterface): number {
        return Number.POSITIVE_INFINITY; // undefined ?
    }
    getMoveCostE(_a: AgentInterface): number {
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

    /*  getD2A() {
          // FIXME (0) : abs !! if (this.absRef) ..., or core is always relative ?
          //let relX = this.absRref.posX-
          return Math.round(Math.sqrt(this.posX * this.posX + this.posY * this.posY));
      }  */

    getD2A(originX = 0, originY = 0) {

        let relX = this.posX - originX;
        let relY = this.posY - originY;
        return Math.round(Math.sqrt(relX * relX + relY * relY));
    }

    // get angle (quadrant) for actor
    getA4A(originX = 0, originY = 0) {
        // radian to direction (0 -> 7)
        // Math.atan2(delta x, delta y), assuming actor is ALWAYS at zone center (0,0)

        let relX = this.posX - originX;
        let relY = this.posY - originY;

        let theta = 8 * Math.atan2(relX, relY) / Math.PI;
        if (theta < 0)
            theta = 16 + theta;
        if (theta > 15)
            theta = 0;
        return Math.floor(theta / 2);
    }

    // TODO (5) : ~ AbsCell extends Cell
    /*   getIdentifier(): AbsIdentifier {
           // return { collId: CollectionId.Cell, posX: this.posX, posY: this.posY }
           return { cId: CollectionId.Cell, iId: this.iId }
       } */

    asRelativeEntity(observer: AgentInterface) {

        // FIXME (1) : pre-external observe for entType cast (indeterminate, disguise...)
        // TODO (2) : modify each attribute f(actor.perception* -(/?) this.dicretion*)
        //   this.iId = relId;
        this.posX -= observer.posX;
        this.posY -= observer.posY;
    }

    toDao(): CellDao {

        let cellDao: CellDao = {
            cellType: this.cellType,
            posX: this.posX,
            posY: this.posY
        }

        if (this.vegetation !== 0) { cellDao.vegetation = this.vegetation }

        return cellDao;
    }
}

export class CellEarth extends Cell {

    // name = i18n.terrain.earth

    getMoveCostT(a: AgentInterface) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return (Constants.GA_MAX_MOVE_EARTH - a.moveEarth) * 4;
    }
    getMoveCostE(a: AgentInterface) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return a.moveEarth * 2;
    }
}

export class CellSand extends Cell {

    // name = i18n.terrain.sand

    getMoveCostT(a: AgentInterface) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return (Constants.GA_MAX_MOVE_EARTH - a.moveEarth) * 4;
    }
    getMoveCostE(a: AgentInterface) {
        if (a.moveEarth == 0)
            return Number.POSITIVE_INFINITY;
        return a.moveEarth * 2;
    }
}

export class CellShallowWater extends Cell {

    // name = i18n.terrain.shallow_water

    getMoveCostT(a: AgentInterface) {
        if (a.moveEarth == 0 && a.moveWater == 0)
            return Number.POSITIVE_INFINITY;

        return Math.min((Constants.GA_MAX_MOVE_EARTH - a.moveEarth) * 4,
            (Constants.GA_MAX_MOVE_WATER - a.moveWater) * 16);
    }
    getMoveCostE(a: AgentInterface) {
        if (a.moveEarth == 0 && a.moveWater == 0)
            return Number.POSITIVE_INFINITY;

        // min (move earth, move water)
        return Math.min(a.moveEarth * 2, 1 << a.moveWater);
    }
}

export class CellDeepWater extends Cell {

    // name = i18n.terrain.deep_water

    getMoveCostT(a: AgentInterface) {
        if (a.moveWater == 0)
            return Number.POSITIVE_INFINITY;
        return (Constants.GA_MAX_MOVE_WATER - a.moveWater) * 16;
    }
    getMoveCostE(a: AgentInterface) {
        if (a.moveWater == 0)
            return Number.POSITIVE_INFINITY;
        return 1 << a.moveWater;
    }
}

export interface TimeRef {
    snapshotDH: number
}

export interface ActorRef {
    actorGId: EntityIdentifier
}

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

// class Zone : Actor's viewpoint (business rules)
export abstract class Zone implements TimeRef, SpaceRef {

    //  updateDH = 0 // TODO (0) :  least , highest ? interval ?
    actorOriginalUpdateDH: number // cache value for client side only
    snapshotDH: number

    originX: number // originX and originY ~ const 0 for RelZone
    originY: number

    actor: AgentInterface
    actorCell: Cell
    cellPool: { [index: string]: Cell | undefined } // index : CellIdentifier().toIdString()
    furniturePool: { [index: string]: FurnitureInterface } // index: FurnitureItemIdentifier
    agentPool: { [index: string]: AgentInterface } // index: AgentItemIdentifier

    /*   abstract fillMissingCells(): void
       abstract getCell(targetSelector: CellTargetSelector): CoreCell */

    constructor(zoneDao: ZoneDao) { // needs to set originX and originY before constructor }

        this.snapshotDH = zoneDao.snapshotDH;
        this.originX = zoneDao.originX ? zoneDao.originX : 0;
        this.originY = zoneDao.originY ? zoneDao.originY : 0;

        // TODO (0) : updateDH from pools
        this.cellPool = {}
        this.furniturePool = {}
        this.agentPool = {}

        let stringCellId: string;
        let cell: Cell | undefined;

        for (let i = 0; i < zoneDao.cells.length; i++) {

            let cellGist = zoneDao.cells[i];
            stringCellId = new CellIdentifier(cellGist.posX, cellGist.posY).toIdString();
            this.cellPool[stringCellId] = World.CellFactory(cellGist);
        }

        // fill missing is used to filter furnitures and agents on distance (radius
        this.fillMissingCells();

        // Fill with agents
        for (let i = 0; i < zoneDao.agents.length; i++) {

            let agentDao: AgentIdOptions = zoneDao.agents[i];
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
                // TODO (1) : do not create all cells, but dynamicaly create required ones ? radius pb.
                dbg.log('skip agent not in circular zone');
            }
        }

        console.assert(this.actor instanceof Agent, 'CoreZone.init > Invalid actor in gist ' + zoneDao.actorGId); // The actor should be in zonegist.agents
        this.actorOriginalUpdateDH = this.actor.updateDH;

        // Fill with furnitures
        for (let i = 0; i < zoneDao.furnitures.length; i++) {

            let furnitureDao: FurnitureIdDao = zoneDao.furnitures[i];
            stringCellId = new CellIdentifier(furnitureDao.varAttr.posX, furnitureDao.varAttr.posY).toIdString();

            let cell = this.cellPool[stringCellId];

            if (cell) {
                let furniture = World.FurnitureFactory(furnitureDao);
                this.furniturePool[furniture.gId.iId] = furniture;
                // TODO : (1) entity.parentEntity.addToInventory(entity);
                cell.pushFurniture(furniture);
            }
            else {
                // TODO (1) : do not create all cells, but dynamicaly create required ones ? radius pb.
                dbg.log('skip agent not in circular zone');
            }
        }

        // TODO (0) : this.updateDH = cell.upadateDH ... ;

        // TODO (2) : Ephemeris, Sun position for directional light
    }

    // TODO (1) : do not fill but get cells dynamicaly ?

    fillMissingCells() {
        // Fill missing cells with default terrain

        let viewRadius = Constants.MAX_VISION_RADIUS;
        let cell: Cell | undefined;
        let cellId: string;

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

        let cell = this.cellPool[absCellIdentifier];

        if (cell) {
            return cell;
        }

        throw 'cell not found ' + relX + ' ' + relY;
    }

    getEntity(cId: CollectionId, iId: ItemIdentifier): EntityInterface {

        let entity: EntityInterface | undefined;

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

// FIXME (1) : separate agentConstructor and furnitureConstructor or make a common entityConstructor ?
export interface CoreWorldDefinition {
    actionContructor: typeof CoreAction[]
    cellContructor: typeof Cell[]
    furnitureConstructor: FurnitureConstructor[]
    agentConstructor: AgentConstructor[]
    defaultCellType: CellType
    ActionFactory: (actId: ActId, zone: Zone, target: Target) => CoreAction
    CellFactory: (cellDao: CellDao) => Cell
    FurnitureFactory: (entityDao: FurnitureIdDao) => FurnitureInterface
    AgentFactory: (agentDao: AgentIdOptions) => AgentInterface
}

export var World: CoreWorldDefinition = {

    defaultCellType: CellType.CellEarth,  // ~ World.Region.defaultTerrain

    ActionFactory: function (actId: ActId, zone: Zone, target: Target): CoreAction {

        let actionConstructor = World.actionContructor[actId];

        if (!actionConstructor) {
            actionConstructor = CoreAction;
        }

        return new actionConstructor(actId, zone, target);
    },

    CellFactory: function (cellDao: CellDao): Cell {

        let cellConstructor = World.cellContructor[cellDao.cellType];

        if (!cellConstructor) {
            cellConstructor = Cell;
        }

        return new cellConstructor(cellDao);
    },

    FurnitureFactory: function (entityDao: FurnitureIdDao): FurnitureInterface {

        let furnitureConstructor = World.furnitureConstructor[entityDao.classId];

        if (!furnitureConstructor) {
            furnitureConstructor = Furniture;
        }

        return new furnitureConstructor(entityDao);
    },

    AgentFactory: function (agentDao: AgentIdOptions): AgentInterface {

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
}

World.actionContructor[ActId.ActMoveTo] = ActMoveTo;
World.actionContructor[ActId.ActTurnTo] = ActTurnTo;
World.actionContructor[ActId.ActPickUp] = ActPickUp;
// World.actionContructor[ActId.ActLayDown] = ActLayDown;
World.actionContructor[ActId.ActGive] = ActGive;

World.cellContructor[CellType.CellEarth] = CellEarth;
World.cellContructor[CellType.CellSand] = CellSand;
World.cellContructor[CellType.CellShallowWater] = CellShallowWater;
World.cellContructor[CellType.CellDeepWater] = CellDeepWater;

// World.furnitureConstructor[ConceptClass.Rock] = Rock;


