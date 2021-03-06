
import { CoreAction, ActMoveTo, ActTurnTo, ActPickUp, ActGive } from './action'
import { dbg } from '../../services/logger'
import { Zone } from "./zone";

export enum MatterType { Rock, Flesh, Wood }
export enum ConceptClass { IndeterminateEntity, Rock, Slug, Sheep, BarbarianF, Stork, Wolf }
export enum CellType { InderteminateCell, CellEarth, CellSand, CellShallowWater, CellDeepWater }
export enum ActId { ActMoveTo, ActTurnTo, ActPickUp, ActLayDown, ActGive }
export enum FailId { NoAct, Qt, Energy, RangeIs1, CannotWelcome, CannotContain, SameDirection }
export enum DynAttr { Mass, Cond, Qt, Energy }
export enum ModAttrKind { Cond, Energy, Qt, MoveEarth, MoveWater, MoveAir, Solidity }

export enum InteractionType { Cut, Blunt, Fire, Acid, Electricity } // , Poison excluded (time dependant)

// FIXME (1) : extends BaseCollectionId, cannot extend enums
export enum YenahCollectionId { User, Session, Indirection, Furniture, Agent, Cell } 

export const GO_FORWARD = true

// TODO (5) : const object =>  Object.freeze() ?

export const Constants = {
    MAX_EVENTS_PER_TICK: 100,
    DT_IRLSECOND: 1000,
    DT_IRLMINUTE: 60000,
    DT_IRLHOUR: 3600000,
    DT_IGDAY: 600000, // 1000ms * 60min * 10h => 1 ig day = 10h irl 
    DT_IGYEAR: 43200000, // 1000ms * 60min * 24h * 30days *  => 1 ig year ~ 1 month irl 

    MAX_VISION_RADIUS: 6,  // 32, //  4 : devel
    MAX_VEGETATION: 127,

    NO_SLOPE: 0,
    SLOPE_ONE_PER_IRLSECOND: 1 / 1000, // 1 per 1000ms
    SLOPE_ONE_PER_IRLMINUTE: 1 / 60000, // 1 per 60 * 1000ms
    SLOPE_ONE_PER_IRLHOUR: 1 / 3600000, // 1 per 60 * 60 * 1000ms
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
    FURNITURE_COND_MAX: Constants.COND_MAX,
    BEING_COND_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    BEING_COND_MAX: Constants.COND_MAX,
    BEING_MASS: BEING_MASS, // default : ~64Kg 

    FAST_MASS_SLOPE: Constants.DT_IGYEAR / BEING_MASS, // fast ageing : juvenil to adult in one ig year ~ animal-like
    SLOW_MASS_SLOPE: 20 * Constants.DT_IGYEAR / BEING_MASS, // slow ageing : juvenil to adult in 20 ig year ~ human-like
    QT_INIT: 0,
    QT_MAX: 32,    // Size of the "slot of time" an agent can use !!! must be more than any action qt cost !!!
    QT_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    ENERGY_INIT: 0,
    ENERGY_MAX: 128,
    ENERGY_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
    BEING_STOMACH: 10, // TODO (1) : common max ? energy related ?
    MOVE_EARTH: 1,
    MOVE_WATER: 0,
    MOVE_AIR: 0,
    ATTACK: <Damage>{},
    SOLIDITY: <Solidity>{},
    VEGETATION: 0
}

export type Instant = number // An absolute moment in time (new Date().getTime())
export type Duration = number // A relative duration, given by a difference between two instants

// TODO (1) : all attributes normalized, so condMax = 1, qtMax = 1, energyMax = 1
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

// interface to synchronise queries 
export interface PositionGauge {
    posX: any,
    posY: any
}

// FIXME (1) : for dev server side use, i18n is only available client side 
// TODO (1) : enum ToStringId.perSec , per etc, display per IRL or per IG option
// TODO (2) : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Number/toLocaleString
export function slopeToString(slope: Slope): string {

    let perSec = Constants.SLOPE_ONE_PER_IRLSECOND / slope
    let perHour = Constants.SLOPE_ONE_PER_IRLHOUR / slope
    return slope + ' ('
        + perSec + '/s '
        + perHour + '/h)'
    // + (Math.round(perSec * 100) / 100) + '/s ' // perSec.toLocaleString(undefined, {maximumSignificantDigits: 2}) + '/s ' 
    // + (Math.round(perHour * 100) / 100) + '/h)' // perHour.toLocaleString(undefined, {maximumSignificantDigits: 2}) + '/h)'
}

export function durationToString(dt: Duration) {
    let seconds = dt / Constants.DT_IRLSECOND
    let hours = dt / Constants.DT_IRLHOUR
    return dt + 'ms ('
        + seconds + 's '
        + hours + 'h)'
    // + (Math.round(seconds * 100) / 100) + 's ' // perSec.toLocaleString(undefined, {maximumSignificantDigits: 2}) + '/s ' 
    //+ (Math.round(hours * 100) / 100) + 'h)' // perHour.toLocaleString(undefined, {maximumSignificantDigits: 2}) + '/h)'
}

export function instantToString(instant: Instant) {
    return new Date(instant).toString();
}


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
        this.cId = YenahCollectionId.Cell;
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

// TODO (3) : generic AttributeEvent<Kind> and LinearAttribute<Kind> ?

export enum AttrEventKind { ModExpired, MaxReached, ZeroReached }

export interface AttributeEventInterface {
    readonly attrKind: ModAttrKind
    readonly evtKind: AttrEventKind
    readonly instant: Instant
    toString(): string
}

export class AttributeEvent implements AttributeEventInterface {

    constructor(public readonly attrKind: ModAttrKind, public readonly evtKind: AttrEventKind, public readonly instant: Instant) { }

    toString() {
        return '{AttrEvt ' + this.attrKind + ' (' + ModAttrKind[this.attrKind]
            + '), evtKind:' + this.evtKind + ' (' + AttrEventKind[this.evtKind]
            + '), instant:' + this.instant + ' ' + instantToString(this.instant)
            + ' }'
    }
}

// dynamic_attributes

export interface DynamicAttributeInterface {
    value: number,
    maximum: number,
    slope: Slope,
    instant: Instant
}

export interface LinearAttributeInterface {
    getNextEvent(upToInstant: number, goForward: boolean): AttributeEventInterface[]
    addModifier(modifier: AttributeModifier): void
    getBaseAttribute(): DynamicAttributeInterface
    getModifiedAttribute(): DynamicAttributeInterface
}

export class LinearAttribute implements LinearAttributeInterface {

    protected _value: number
    protected _maximum: number
    protected _slope: Slope
    protected _currentInstant: Instant
    protected attributeModifiers?: Set<AttributeModifier>

    constructor(protected attrKind: ModAttrKind,
        value: number, maximum: number, slope: number, instant: number,
        modifiers?: AttributeModifierDao[]) {
        if (value < 0 || maximum < 0 || instant < 0) {
            throw 'negative attributes value, max and instant are not allowed'
        }
        this._maximum = maximum
        this._value = value
        this._slope = slope
        this._currentInstant = instant
        if (modifiers && modifiers.length) {
            for (let modifierDao of modifiers) {
                this.addModifier(ModifierFactory(modifierDao))
            }
        }
    }

    // increaseValue / decreaseValue
    modifyValue(delta: number): AttributeEventInterface[] {

        let happeningEvents: AttributeEventInterface[] = []
        let newModValue = this._value + delta

        if (newModValue <= 0) {
            // TODO (1) : retrigger on same value or not ? && this._value !== 0 
            happeningEvents.push(new AttributeEvent(this.attrKind, AttrEventKind.ZeroReached, this._currentInstant))
            newModValue = 0
        }
        else {

            let currentModMax = this.getModifiedAttribute().maximum
            if (newModValue >= currentModMax) {
                // TODO (1) : retrigger on same value or not ? && this._value !== currentModMax  
                happeningEvents.push(new AttributeEvent(this.attrKind, AttrEventKind.MaxReached, this._currentInstant))
                newModValue = currentModMax
            }
        }

        this._value = newModValue

        return happeningEvents
    }

    getBaseAttribute(): DynamicAttributeInterface {
        return {
            value: this._value,
            maximum: this._maximum,
            slope: this._slope,
            instant: this._currentInstant
        }
    }

    getModifiedAttribute(): DynamicAttributeInterface {

        let currentSlope = this._slope
        let currentMax = this._maximum

        // virtually apply modifiers
        if (this.attributeModifiers) {
            for (let modifier of this.attributeModifiers) {
                if (modifier.slopeVariation) {
                    currentSlope += modifier.slopeVariation
                }
                if (modifier.maxVariation) {
                    currentMax += modifier.maxVariation
                }
            }
        }

        return {
            value: this._value,
            maximum: currentMax,
            slope: currentSlope,
            instant: this._currentInstant
        }
    }

    protected getDynamicValue(dt: number, val: number, max: number, slope: number) {

        if (slope != Constants.NO_SLOPE) {
            val += dt * slope;  // FIXME (1) : slope should be an integer. Use inverseSlope to store in options ?
        }
        let limitedVal = val > max ? max : (val < 0 ? 0 : val);

        dbg.attr('getDyn > ' + limitedVal
            + ' (max:' + 1
            + ' dh:' + this._currentInstant
            + ' detaT:' + dt
            + ' slope: ' + slope
            + ' real: ' + val + ') '
        )

        return limitedVal;
    }

    protected stabiliseFinallyAt(newSnapshotInstant: Instant, snapshotMax: number, snapshotSlope: number): void {

        // FIXME (3) : REF MAXMOD max modifier expiration should decrease currentValue
        // FIXME (3) : REF IntegerInstant check for rounding issue that could cause double event ? (ex: event Max triggerd, but value at 0.9999... or event zero at 0.000..1)
        this._value = this.getDynamicValue(newSnapshotInstant, this._value, snapshotMax, snapshotSlope)

        if (this.attributeModifiers) {
            for (let modifier of this.attributeModifiers) {
                let expirationInstant = this._currentInstant + modifier.duration

                if (expirationInstant <= newSnapshotInstant) {
                    this.attributeModifiers.delete(modifier)
                }
                else {
                    modifier.duration -= newSnapshotInstant - this._currentInstant
                }
            }
        }

        this._currentInstant = newSnapshotInstant
    }

    // returns first upcoming event (and all events happening at the same instant) in the limit of upToInstant
    // goForward === true => stabilises at first event instant
    getNextEvent(upToInstant = Number.POSITIVE_INFINITY, goForward = false): AttributeEventInterface[] {

        let currentSlope = this._slope
        let currentMax = this._maximum
        let nextExpiration = Number.POSITIVE_INFINITY
        let nextMaxReachingInstant = Number.POSITIVE_INFINITY
        let nextZeroReachingInstant = Number.POSITIVE_INFINITY
        let happeningEvents: AttributeEventInterface[] = []

        if (this.attributeModifiers) {
            for (let modifier of this.attributeModifiers) {
                nextExpiration = Math.min(nextExpiration, this._currentInstant + modifier.duration)

                if (modifier.slopeVariation) {
                    currentSlope += modifier.slopeVariation
                }
                if (modifier.maxVariation) {
                    currentMax += modifier.maxVariation
                }
            }
        }

        if (currentSlope > 0) {
            
            if (this._value < currentMax) {
                // TODO (3) : REF IntegerInstant integer DH => Math.floor, ceil, round ? setter() ?
                nextMaxReachingInstant = this._currentInstant + (currentMax - this._value) / currentSlope
            }
            else if (this._value === currentMax) {
               //  dbg.log('skip MaxReaching event, max already reached')
            }
            else {
                throw 'attribute value exceeds maximum (with modification)'
            }
        }
        else if (currentSlope < 0) {

            if (this._value > 0) {
                // TODO (3) : REF IntegerInstant integer DH => Math.floor, ceil, round ?
                nextZeroReachingInstant = this._currentInstant - this._value / currentSlope
            }
            else {
                dbg.log('skip ZeroReaching event, zero already reached')
            }
        }

        let nextEventInstant = Math.min(nextMaxReachingInstant, nextZeroReachingInstant, nextExpiration)

        if (nextEventInstant !== Number.POSITIVE_INFINITY && nextEventInstant <= upToInstant) {

            if (nextMaxReachingInstant === nextEventInstant) {
                happeningEvents.push(new AttributeEvent(this.attrKind, AttrEventKind.MaxReached, nextEventInstant))
            }
            if (nextZeroReachingInstant === nextEventInstant) {
                happeningEvents.push(new AttributeEvent(this.attrKind, AttrEventKind.ZeroReached, nextEventInstant))
            }
            if (nextExpiration === nextEventInstant) {
                // FIXME (1) : should generate one event per modifier ?
                happeningEvents.push(new AttributeEvent(this.attrKind, AttrEventKind.ModExpired, nextEventInstant))
            }

            if (goForward) {
                this.stabiliseFinallyAt(nextEventInstant, currentMax, currentSlope)
            }
        }

        return happeningEvents
    }

    // stabilises and retruns all events up to given snapshot instant (included)
    stabiliseAt(newSnapshotInstant: Instant): AttributeEventInterface[] {

        if (newSnapshotInstant < this._currentInstant) { throw 'Cannot go back in time' }

        let happenedEvents: AttributeEventInterface[] = []
        let nextEvents: AttributeEventInterface[]

        if (newSnapshotInstant === this._currentInstant) {
            dbg.log('stabilising at already reached current instant')
            return happenedEvents
        }

        let loopCount = 0
        for (; loopCount < Constants.MAX_EVENTS_PER_TICK; loopCount++) {
            nextEvents = this.getNextEvent(newSnapshotInstant, GO_FORWARD)

            if (nextEvents.length) {
                happenedEvents.push(...nextEvents)
                if (nextEvents[0].instant <= newSnapshotInstant) {
                    break
                }
            }
            else {
                break
            }
        }
        if (loopCount === Constants.MAX_EVENTS_PER_TICK) {
            throw 'Allowed loops overflow : ' + Constants.MAX_EVENTS_PER_TICK
        }

        let snapshotSlope = this._slope
        let snapshotMax = this._maximum

        if (this.attributeModifiers) {
            for (let modifier of this.attributeModifiers) {
                if (modifier.slopeVariation) {
                    snapshotSlope += modifier.slopeVariation
                }
                if (modifier.maxVariation) {
                    snapshotMax += modifier.maxVariation
                }
            }
        }

        this.stabiliseFinallyAt(newSnapshotInstant, snapshotMax, snapshotSlope)

        return happenedEvents
    }

    addModifier(modifier: AttributeModifier) {

        // TODO (1) : check for duplicates ? Merge modifiers ?

        if (this.attributeModifiers === undefined) {
            this.attributeModifiers = new Set<AttributeModifier>()
        }
        this.attributeModifiers.add(modifier)
    }

    modifierToDao(kind: ModAttrKind): AttributeModifierDao[] | undefined {

        if (this.attributeModifiers && this.attributeModifiers.size > 0) {

            let modDaos: AttributeModifierDao[] = [];
            for (let modi of this.attributeModifiers) {
                modDaos.push({
                    kind: kind,
                    duration: modi.duration
                });
            }

            return modDaos;
        }
        return;
    }

    toString() {
        return '{LinAttr, ' + this.attrKind + ' (' + ModAttrKind[this.attrKind]
            + '), val:' + this._value
            + ', max:' + this._maximum
            + ', slope:' + slopeToString(this._slope)
            + ', dh:' + this._currentInstant
            + '}'
    }
}

// modifiers

export interface AttributeModifierDao {
    kind: ModAttrKind
    // originDH: number
    duration: number
}

// abstract
class AttributeModifier {

    // kind: ModAttrKind
    // originDH: number
    slopeVariation?: number
    maxVariation?: number
    // TODO (1) : setter, allow only positive integer
    duration: number
    // abstract 
    // applyModificationTo(_linearAttribute: LinearAttribute): void { }

    constructor(modifierDao: AttributeModifierDao) {
        // this.kind = modifierDao.kind;
        // this.originDH = modifierDao.originDH;
        // TODO (3) : REF IntegerInstant integer DH => Math.floor, ceil, round ? setter() ?
        if (modifierDao.duration < 0) {
            throw 'negative duration is not allowed'
        }
        this.duration = modifierDao.duration;
    }
}

// ~ Poison (Agents), Wear (furniture, buildings) : reverse condition slope 
// TODO (1) : fixed slope ?
export class CondModifier extends AttributeModifier {

    slopeVariation = - 2 * Constants.SLOPE_ONE_PER_IRLSECOND
}

// TODO (3) : max modifier
// FIXME (3) : REF MAXMOD max modifier expiration should decrease currentValue

interface AttributeModifierCollection {
    condModifiers?: CondModifier[]

}

// TODO (1) : add to World constructors ?

var ModifierConstructors: typeof AttributeModifier[] = [];
ModifierConstructors[ModAttrKind.Cond] = CondModifier;

export function ModifierFactory(modifierDao: AttributeModifierDao): AttributeModifier {

    return new ModifierConstructors[modifierDao.kind](modifierDao);
}


// TODO (4) : PeriodicModifier (mood ~ mind capacities, qt max, energy max) or as permanent attibute ?

// condslope mod : hungry, acid, fire, cold (furniture & agents), poison (agents)
// mood modifiers : energyslope, max energy, qt slope, max qt
// move modifier : reduce/enhence move 
// ex : run : increase move cost, energy / reduce move costqt
// rest (repos) : increase energy slope
// solidity modifier
// disable capacity (ex : compass)

// Organ is a furniture, but it is "non amovible"
// TODO (1) : implement organs as mixins (interfaces only)
export interface Organ { // DOES NOT extends Entity but implements EntityInterface

}

// TODO (2) : interface Armature { } => skeleton / chitin
// TODO (1) : rename as InteractionsInterface ? InteractionsDao ? Options ?
export interface SolidityInterface {
    cut?: number
    blunt?: number
    fire?: number
    acid?: number
    elec?: number
    // poison?: number
}

// Passive effect on contact
/* export interface DamageInterface extends Solidity {
    // poison?: number // Poisoning on consumption
} */

export class Solidity extends Map<InteractionType, number> {

}

export class Damage extends Solidity {

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
    constructor(cId: YenahCollectionId, iId: ItemIdentifier) {
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
        super(YenahCollectionId.Indirection, indId);
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
    cond?: number
}

export interface EntityOptions {

    classId: ConceptClass
    varAttr: EntityVarOptions
    baseCondMax?: number
    baseCondSlope?: Slope
    mass?: number
    mainMaterial?: MatterType	// TODO (4) : defined by solidity ? being=> flesh/vegetal
    mainColor?: number // (visibility modifier ?)
    solidity?: SolidityInterface
    passiveRetort?: Damage
    baseCapacity?: 0 // TODO (2) : inventory max length ? or getMassSum() limit ?
    attributeModifiers?: {
        cond?: AttributeModifierDao[],
        qt?: AttributeModifierDao[],
        energy?: AttributeModifierDao[]
    }
}

export interface EntityIdOptions extends EntityOptions {
    gId: EntityIdentifier
}

export interface EntityInterface extends Target {

    gId: EntityIdentifier

    readonly varModified: boolean
    readonly fullModified: boolean
    readonly reactions: ActId[]
    readonly entType: ConceptClass
    theta: number
    posX: number
    posY: number

    modifyCond(delta: number): AttributeEventInterface[]
    getBaseCond(): DynamicAttributeInterface
    getModifiedCond(): DynamicAttributeInterface
    readonly mass: number
    readonly solidity: Solidity

    readonly inventory: EntityInterface[]

    readonly updateDH: number
    // returns first upcoming event (and all events happening at the same instant) in the limit of upToInstant
    getNextEvent(upToInstant?: number): AttributeEventInterface[]
    getNextCriticalEvent(upToInstant: Instant): AttributeEventInterface | undefined
    stabiliseAt(updateDH: number): AttributeEventInterface[]

    canContain(entity: EntityInterface): boolean

    toDao(): EntityOptions
    toVarDao(): EntityVarOptions
    toIdDao(): EntityIdOptions
}

export abstract class EntityBase implements EntityInterface {

    gId: EntityIdentifier
    varModified = false; // TODO (5) : public readonly, getter, no setter 
    fullModified = false; // TODO (5) : public readonly, getter, no setter
    //  protected inventoryModified = false;
    //  protected organsModified = false;

    // protected baseAttr: number[]
    // protected dynAttr: DynamicAttribute[]
    // protected organs: Organ[]
    inventory: EntityInterface[] = [] // TODO (1) : readonly inventory modifications getter/setter
    protected attributeModifiers: AttributeModifierCollection = {}
    // discretions: number[], // visibility of each attribute by an observer
    readonly reactions: ActId[] = [] // TODO (1) : reactions[indexedActs] or reactionsList[].push (acts...) save in DB or fixed by entType ?
    readonly solidity: Solidity

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

    protected _cond: LinearAttribute
    modifyCond(delta: number): AttributeEventInterface[] {
        this.varModified = true
        return this._cond.modifyValue(delta)
    }
    getBaseCond(): DynamicAttributeInterface {
        return this._cond.getBaseAttribute()
    }
    getModifiedCond(): DynamicAttributeInterface {
        return this._cond.getModifiedAttribute()
    }

    protected _mass: number // Mass is fixed for furnitures but dynamic for agents
    get mass() { return (this._mass) }

    protected _updateDH: number
    get updateDH() { return this._updateDH }

    constructor(opt: EntityIdOptions) {

        this.reactions.push(ActId.ActPickUp, ActId.ActLayDown);

        this._classId = opt.classId;
        this.gId = opt.gId;

        this._updateDH = opt.varAttr.updateDH;
        this._posX = opt.varAttr.posX;
        this._posY = opt.varAttr.posY;
        this._theta = opt.varAttr.theta;

        this._mass = opt.mass !== undefined ? opt.mass : Defaults.FURNITURE_MASS
        let baseCondMax = opt.baseCondMax !== undefined ? opt.baseCondMax : Defaults.FURNITURE_COND_MAX
        this._cond = new LinearAttribute(
            ModAttrKind.Cond,
            opt.varAttr.cond !== undefined ? opt.varAttr.cond : baseCondMax,
            baseCondMax,
            opt.baseCondSlope !== undefined ? opt.baseCondSlope : Defaults.FURNITURE_COND_SLOPE,
            opt.varAttr.updateDH,
            opt.attributeModifiers ? opt.attributeModifiers.cond : undefined
        )
        this.solidity = new Solidity(); // opt.solidity !== undefined ? opt.solidity : Defaults.SOLIDITY;
        if (opt.solidity) {
            // TODO (3) : for ... or store in database directly with number indexes ?
            // for (let interactionKind in opt.solidity) { this.solidity.set(Mapping[interactionKind], opt.solidity[interactionKind]) }
            if (opt.solidity.cut) { this.solidity.set(InteractionType.Cut, opt.solidity.cut) }
            if (opt.solidity.blunt) { this.solidity.set(InteractionType.Blunt, opt.solidity.blunt) }
            if (opt.solidity.fire) { this.solidity.set(InteractionType.Fire, opt.solidity.fire) }
            if (opt.solidity.acid) { this.solidity.set(InteractionType.Acid, opt.solidity.acid) }
            if (opt.solidity.elec) { this.solidity.set(InteractionType.Electricity, opt.solidity.elec) }
            // if (opt.solidity.poison) { this.solidity.set(InteractionType.Poison,  opt.solidity.poison) }
        }
    }

    getNextEvent(upToInstant?: number): AttributeEventInterface[] {

        // TODO (0) : other events, other attributes, objectives, memory, etc ?
        // FIXME (0) : return nextEvent (one event, not all events up to upToIntstant) (see Agent getNextEvent)

        // if next event === current instant => drop ?? (max reached) GO_FORWARD ?

        return this._cond.getNextEvent(upToInstant)
    }

    getNextCriticalEvent(upToInstant = Number.POSITIVE_INFINITY) {

        let events = this._cond.getNextEvent(upToInstant)

        for (let evt of events) {
            if (evt.evtKind === AttrEventKind.ZeroReached && evt.instant <= upToInstant) {
                return evt
            }
        }
        return
    }

    stabiliseAt(newUpdateDH: number): AttributeEventInterface[] {

        let dt = newUpdateDH - this._updateDH

        if (dt < 0) {
            throw 'Cannot go back in time'
        }

        this.varModified = true
        this._updateDH = newUpdateDH

        let happenedEvents = this._cond.stabiliseAt(newUpdateDH)

        return happenedEvents
    }

    toVarDao(): EntityVarOptions { // ~ protected, Persistor friend ! (only used internally or to store partial doc in Persistor)
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond.getBaseAttribute().value
        }
    }

    toDao(): EntityOptions {

        return {
            varAttr: this.toVarDao(),
            classId: this._classId,
            mass: this._mass,
            baseCondSlope: this._cond.getBaseAttribute().slope,
            baseCondMax: this._cond.getBaseAttribute().maximum,
            attributeModifiers: {
                cond: this._cond.modifierToDao(ModAttrKind.Cond)
            }
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
    new(opt: EntityIdOptions): FurnitureInterface; // TODO (1) : FurnitureOptions extends EntityOptions ?
}

export class Furniture extends EntityBase implements FurnitureInterface {

    readonly isFurniture = true

    constructor(opt: EntityIdOptions) {
        super(opt);
        //super.fromOptions(opt);
    }

    toIdDao(): FurnitureIdDao {
        let dao: FurnitureIdDao = <FurnitureIdDao>this.toDao();
        dao.gId = this.gId;
        return dao;
    }

    toString() {
        let baseCond = this._cond.getBaseAttribute()
        let modCond = this._cond.getModifiedAttribute()
        return ' { class:Furniture'
            + ', dt:' + this._updateDH
            + ', cond:' + baseCond.value
            + '/' + baseCond.maximum + '(' + modCond.maximum + ')'
            + '@' + baseCond.slope + '(' + modCond.slope + ')'
            + ' } ';
    }
}

// agent.ts

export class AgentIdentifier extends EntityIdentifier {
    iId: AgentItemIdentifier
    constructor(iId: string) {
        super(YenahCollectionId.Agent, iId);
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
    attack: Damage

    readonly massMax: number
    readonly massSlope: number
    getWeight(): number // full weight, including inventory

    modifyQt(delta: number): AttributeEventInterface[]
    getBaseQt(): DynamicAttributeInterface
    getModifiedQt(): DynamicAttributeInterface

    modifyEnergy(delta: number): AttributeEventInterface[]
    getBaseEnergy(): DynamicAttributeInterface
    getModifiedEnergy(): DynamicAttributeInterface

    canReceive(furniture: FurnitureInterface): void

    toVarDao(): AgentVarOptions
    toDao(): AgentOptions
    toIdDao(): AgentIdOptions
}

interface AgentConstructor {
    new(opt: AgentIdOptions): AgentInterface;
}

export class Agent extends EntityBase implements AgentInterface {

    gId: AgentIdentifier

    name: string
    stomach: number
    moveWater: number
    moveEarth: number
    moveAir: number
    attack: Damage

    protected _massSlope: Slope
    get massSlope() { return this._massSlope }
    protected _massMax: number
    get massMax() { return this._massMax }

    protected _qt: LinearAttribute
    modifyQt(delta: number): AttributeEventInterface[] {
        this.varModified = true
        return this._qt.modifyValue(delta)
    }
    getBaseQt(): DynamicAttributeInterface {
        return this._qt.getBaseAttribute()
    }
    getModifiedQt(): DynamicAttributeInterface {
        return this._qt.getModifiedAttribute()
    }
    protected _energy: LinearAttribute
    modifyEnergy(delta: number): AttributeEventInterface[] {
        this.varModified = true
        return this._energy.modifyValue(delta)
    }
    getBaseEnergy(): DynamicAttributeInterface {
        return this._energy.getBaseAttribute()
    }
    getModifiedEnergy(): DynamicAttributeInterface {
        return this._energy.getModifiedAttribute()
    }

    readonly actions: ActId[] = []

    constructor(opt: AgentIdOptions) {
        super(opt);

        // overwrite entity default cond slope and mass
        // TODO (5) : absract entity, concreet furniture ?
        // this._condSlope = opt.condSlope !== undefined ? opt.condSlope : Defaults.BEING_COND_SLOPE;
        let baseCondMax = opt.baseCondMax !== undefined ? opt.baseCondMax : Defaults.BEING_COND_MAX;
        this._cond = new LinearAttribute(
            ModAttrKind.Cond,
            opt.varAttr.cond !== undefined ? opt.varAttr.cond : baseCondMax,
            baseCondMax,
            opt.baseCondSlope !== undefined ? opt.baseCondSlope : Defaults.BEING_COND_SLOPE,
            opt.varAttr.updateDH,
            opt.attributeModifiers ? opt.attributeModifiers.cond : undefined
        );

        // FIXME (1) : manipulate beings ? ActId.ActPickUp, ActId.ActLayDown
        this.actions.push(ActId.ActMoveTo, ActId.ActTurnTo);

        this.name = opt.name ? opt.name : '';
        this._massMax = opt.massMax !== undefined ? opt.massMax : Defaults.BEING_MASS;
        this._massSlope = opt.massSlope !== undefined ? opt.massSlope : Defaults.FAST_MASS_SLOPE;
        this._qt = new LinearAttribute(
            ModAttrKind.Qt,
            opt.varAttr.qt !== undefined ? opt.varAttr.qt : Defaults.QT_INIT,
            opt.qtMax !== undefined ? opt.qtMax : Defaults.QT_MAX,
            opt.qtSlope !== undefined ? opt.qtSlope : Defaults.QT_SLOPE,
            opt.varAttr.updateDH,
            opt.attributeModifiers ? opt.attributeModifiers.qt : undefined
        )
        this._energy = new LinearAttribute(
            ModAttrKind.Energy,
            opt.varAttr.energy !== undefined ? opt.varAttr.energy : Defaults.ENERGY_INIT,
            opt.energyMax !== undefined ? opt.energyMax : Defaults.ENERGY_MAX,
            opt.energySlope !== undefined ? opt.energySlope : Defaults.ENERGY_SLOPE,
            opt.varAttr.updateDH,
            opt.attributeModifiers ? opt.attributeModifiers.energy : undefined
        )
        this.moveWater = opt.moveWater !== undefined ? opt.moveWater : Defaults.MOVE_WATER;
        this.moveEarth = opt.moveEarth !== undefined ? opt.moveEarth : Defaults.MOVE_EARTH;
        this.moveAir = opt.moveAir !== undefined ? opt.moveAir : Defaults.MOVE_AIR;
        this.attack = opt.attack !== undefined ? opt.attack : Defaults.ATTACK;
        this.stomach = opt.varAttr.stomach !== undefined ? opt.varAttr.stomach : Defaults.BEING_STOMACH;

        // TODO (0) : stomach etc...AgentBase

        // super.fromOptions(opt);
    }


    getNextEvent(upToInstant?: number): AttributeEventInterface[] {

        // TODO (0) : GO_FORWARD ?
        // FIXME (0) : return nextEvent (one event, not all events up to upToIntstant)

        let happeningEvents = super.getNextEvent(upToInstant)
        happeningEvents.push(...this._qt.getNextEvent(upToInstant))
        happeningEvents.push(...this._energy.getNextEvent(upToInstant))

        let minInstant = Number.POSITIVE_INFINITY
        for (let evt of happeningEvents) {
            minInstant  = Math.min(minInstant, evt.instant)
        }
        let firstEvents = []
        for (let evt of happeningEvents) {
            if (evt.instant === minInstant) {
                firstEvents.push(evt)
            }
        }

        return firstEvents
    }

    stabiliseAt(newUpdateDH: number): AttributeEventInterface[] {

        let dt = newUpdateDH - this._updateDH

        if (dt < 0) {
            throw 'Cannot go back in time'
        }

        this.varModified = true
        this._updateDH = newUpdateDH

        let happenedEvents = this._cond.stabiliseAt(newUpdateDH)
        happenedEvents.push(...this._qt.stabiliseAt(newUpdateDH))
        happenedEvents.push(...this._energy.stabiliseAt(newUpdateDH))

        return happenedEvents
    }

    toVarDao(): AgentVarOptions {
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond.getBaseAttribute().value,
            qt: this._qt.getBaseAttribute().value,
            energy: this._energy.getBaseAttribute().value,
            stomach: this.stomach
        }
    }

    toDao(): AgentOptions {

        let aMod: {
            cond?: AttributeModifierDao[],
            qt?: AttributeModifierDao[],
            energy?: AttributeModifierDao[]
        } = {}

        let hasMod = false
        let mod = this._cond.modifierToDao(ModAttrKind.Cond)
        if (mod) { aMod.cond = mod; hasMod = true }
        mod = this._qt.modifierToDao(ModAttrKind.Qt)
        if (mod) { aMod.qt = mod; hasMod = true }
        mod = this._energy.modifierToDao(ModAttrKind.Energy)
        if (mod) { aMod.energy = mod; hasMod = true }

        let dao: AgentOptions = {
            varAttr: this.toVarDao(),
            classId: this.entType,
            name: this.name,
            baseCondMax: this._cond.getBaseAttribute().maximum,
            baseCondSlope: this._cond.getBaseAttribute().slope,
            qtMax: this._qt.getBaseAttribute().maximum,
            qtSlope: this._qt.getBaseAttribute().slope,
            energyMax: this._energy.getBaseAttribute().maximum,
            energySlope: this._energy.getBaseAttribute().slope,
            moveWater: this.moveWater,
            moveEarth: this.moveEarth,
            moveAir: this.moveAir,
            mass: this.mass,
            massMax: this.massMax,
            massSlope: this.massSlope
        }

        if (hasMod) {
            dao.attributeModifiers = aMod
        }

        return dao
    }

    toIdDao(): AgentIdOptions {
        let dao: AgentIdOptions = <AgentIdOptions>this.toDao()
        dao.gId = this.gId
        return dao
    }

    clone(): AgentInterface {
        // Little hack : AgentIdDao = AgentDao + iId
        let idDao: AgentIdOptions = <AgentIdOptions>this.toDao();
        idDao.gId = this.gId;
        return World.AgentFactory(idDao);
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
        // actor is a clone, so we cannot compare with === ; => compare Gid (of same CId) 
        if (this.gId.iId !== observer.gId.iId) {
            this.name = '';
        }
    }

    toString() {
        let baseCond = this._cond.getBaseAttribute()
        let modCond = this._cond.getModifiedAttribute()
        let baseQt = this._qt.getBaseAttribute()
        let modQt = this._qt.getModifiedAttribute()
        let baseEnergy = this._energy.getBaseAttribute()
        let modEnergy = this._energy.getModifiedAttribute()

        return ' { class:Agent'
            + ', name:' + this.name
            + ', dt:' + this._updateDH
            + ', cond:' + baseCond.value
            + '/' + baseCond.maximum + '(' + modCond.maximum + ')'
            + '@' + baseCond.slope + '(' + modCond.slope + ')'
            + ', qt:' + baseQt.value
            + '/' + baseQt.maximum + '(' + modQt.maximum + ')'
            + '@' + baseQt.slope + '(' + modQt.slope + ')'
            + ', energy:' + baseEnergy.value
            + '/' + baseEnergy.maximum + '(' + modEnergy.maximum + ')'
            + '@' + baseEnergy.slope + '(' + modEnergy.slope + ')'
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

    //	updateDH: number | undefined // TODO (0) : cell updateDH

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


        if (entity instanceof Agent) { // FIXME (1) : instanceof Agent Interface that is not an Agent ? 
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


