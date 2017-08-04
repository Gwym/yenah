
import { CoreAction, ActMoveTo, ActTurnTo, ActPickUp, ActGive } from './action'
import { dbg } from '../../services/logger'
import { Zone } from "./zone";

export enum MatterType { Rock, Flesh, Wood }
export enum ConceptClass { IndeterminateEntity, Rock, Slug, Sheep, BarbarianF }
export enum CellType { InderteminateCell, CellEarth, CellSand, CellShallowWater, CellDeepWater }
export enum ActId { ActMoveTo, ActTurnTo, ActPickUp, ActLayDown, ActGive }
export enum FailId { NoAct, Qt, Energy, RangeIs1, CannotWelcome, CannotContain }
export enum DynAttr { Mass, Cond, Qt, Energy }
export enum ModAttrKind { Cond, Energy, Qt, MoveEarth, MoveWater, MoveAir, Solidity }

export enum InteractionType { Cut, Blunt, Fire, Acid, Electricity } // , Poison excluded (time dependant)

export enum CollectionId { Indirection, User, Furniture, Agent, Cell, Session } // FIXME (1) :  persistor only information ? or needed by client for Indirection ?

export const GO_FORWARD = true

// TODO (5) : const object =>  Object.freeze() ?

export const Constants = {
    MAX_EVENTS_PER_TICK: 100,
    DT_IRLSECOND: 1000,
    DT_IRLMINUTE: 60000,
    DT_IRLHOUR: 3600000,
    DT_IGDAY: 600000, // 1000ms * 60min * 10h => 1 ig day = 10h irl 
    DT_IGYEAR: 43200000, // 1000ms * 60min * 24h * 30days *  => 1 ig year ~ 1 month irl 

    MAX_VISION_RADIUS: 4,  // 32, //  4 : devel
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
    QT_MAX: 32,    // Size of the "slot of time" an agent can use !!! must be more than any action qt cost !!!
    QT_SLOPE: Constants.SLOPE_ONE_PER_IRLHOUR,
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

export enum AttrEventKind { ModExpired, MaxReached, ZeroReached }

export interface AttributeEventInterface {
    readonly kind: AttrEventKind
    readonly instant: Instant
    toString(): string
}

export class AttributeEvent implements AttributeEventInterface {

    constructor(public readonly kind: AttrEventKind, public readonly instant: Instant) { }

    toString() {
        return '{AttrEvt '
            + ' kind:' + this.kind + ' (' + AttrEventKind[this.kind]
            + ') instant:' + this.instant + ' ' + instantToString(this.instant)
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
    currentValue: number
    readonly baseMaximum: number
    readonly baseSlope: Slope
    readonly currentInstant: Instant
    getNextEvents(upToInstant: number, goForward: boolean): AttributeEventInterface[]
    addModifier(modifier: AttributeModifier): void
    getModifiedAttribute(): DynamicAttributeInterface
}

export class LinearAttribute implements LinearAttributeInterface {

    protected _value: number
    protected _maximum: number
    protected _slope: Slope
    protected _currentInstant: Instant

    get baseMaximum() { return this._maximum }
    get baseSlope() { return this._slope }
    get currentInstant() { return this._currentInstant }
    get currentValue() { return this._value }
    set currentValue(v: number) { this.setCurrentValue(v) }

    protected attributeModifiers?: Set<AttributeModifier>

    constructor(value: number, maximum: number, slope: number, instant: number, modifiers?: AttributeModifierDao[]) {
        this._value = value
        this._maximum = maximum
        this._slope = slope
        this._currentInstant = instant
        if (modifiers && modifiers.length) {
            for (let modifierDao of modifiers) {
                this.addModifier(ModifierFactory(modifierDao))
            }
        }
    }

    /* getBaseAttribute(): DynamicAttributeInterface {
 
         return {
             value: this._value,
             maximum: this._maximum,
             slope: this._slope,
             instant: this._currentInstant
         }
     } */

    protected setCurrentValue(newValue: number) {

        let modAttr = this.getModifiedAttribute()

        newValue = Math.max(Math.min(newValue, modAttr.maximum), 0)

        // TODO (0) : generate event on max or zero reaching ?
        // return events ...

        this._value = newValue
    }

    getModifiedAttribute(): DynamicAttributeInterface {

        let currentSlope = this._slope
        let currentMax = this._maximum

        // virtually apply modifiers
        if (this.attributeModifiers) {
            for (let modifier of this.attributeModifiers) {
                let expirationInstant = this._currentInstant + modifier.duration

                if (expirationInstant >= this._currentInstant) {

                    if (modifier.slopeVariation) {
                        currentSlope += modifier.slopeVariation
                    }
                    if (modifier.maxVariation) {
                        currentMax += modifier.maxVariation
                    }
                }
                else {
                    dbg.error('Modifier has expired : remaining unhandled modifier ' + modifier)
                    // TODO (2) : remove expired ?
                }
            }
        }

        // let currentValue = this.getDynNormalValue(this._currentInstant, this._value, currentMax, currentSlope)

        return {
            value: this._value,
            maximum: currentMax,
            slope: currentSlope,
            instant: this._currentInstant
        }
    }

    protected getDynNormalValue(dt: number, val: number, max: number, slope: number) {

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

    stabiliseAt(newSnapshotInstant: Instant): AttributeEventInterface[] {

        if (newSnapshotInstant < this._currentInstant) { throw 'Cannot go back in time' }

        let happenedEvents: AttributeEventInterface[] = []
        let nextEvents: AttributeEventInterface[]

        if (newSnapshotInstant === this._currentInstant) { 
            dbg.error('stabilising at already reached current instant')
            return happenedEvents
        }

        let loopCount = 0
        for (; loopCount < Constants.MAX_EVENTS_PER_TICK; loopCount++) {
            nextEvents = this.getNextEvents(newSnapshotInstant, GO_FORWARD)

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

    protected stabiliseFinallyAt(newSnapshotInstant: Instant, snapshotMax: number, snapshotSlope: number): void {

        // FIXME (3) : REF MAXMOD max modifier expiration should decrease currentValue
        this._value = this.getDynNormalValue(newSnapshotInstant, this._value, snapshotMax, snapshotSlope)

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

    getNextEvents(upToInstant = Number.POSITIVE_INFINITY, goForward = false): AttributeEventInterface[] {

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
            // TODO (0) : REF IntegerInstant integer DH => Math.floor, ceil, round ? setter() ?
            nextMaxReachingInstant = this._currentInstant + (currentMax - this._value) / currentSlope
        }
        else if (currentSlope < 0) {
            // TODO (0) : REF IntegerInstant integer DH => Math.floor, ceil, round ?
            nextZeroReachingInstant = this._currentInstant - this._value / currentSlope
        }

        let nextEventInstant = Math.min(nextMaxReachingInstant, nextZeroReachingInstant, nextExpiration)

        if (nextEventInstant !== Number.POSITIVE_INFINITY
            && nextEventInstant <= upToInstant) {

            if (nextMaxReachingInstant === nextEventInstant) {
                happeningEvents.push(new AttributeEvent(AttrEventKind.MaxReached, nextEventInstant))
                // TODO (0) : currentValue = currentMax ? // avoid rounding issues
            }
            if (nextZeroReachingInstant === nextEventInstant) {
                happeningEvents.push(new AttributeEvent(AttrEventKind.ZeroReached, nextEventInstant))
                // TODO (0) : currentValue = 0 ? // avoid rounding issues
            }
            if (nextExpiration === nextEventInstant) {
                // FIXME (1) : should generate one event per modifier ?
                happeningEvents.push(new AttributeEvent(AttrEventKind.ModExpired, nextEventInstant))
            }

            if (goForward) {

                this.stabiliseFinallyAt(nextEventInstant, currentMax, currentSlope)
                /* // FIXME (3) : REF MAXMOD max modifier expiration should decrease currentValue
                 this._value = this.getDynNormalValue(nextEventInstant, this._value, currentMax, currentSlope)
 
                 if (this.attributeModifiers) {
                     for (let modifier of this.attributeModifiers) {
                         let expirationInstant = this._currentInstant + modifier.duration
 
                         if (expirationInstant <= nextEventInstant) {
                             this.attributeModifiers.delete(modifier)
                         }
                     }
                 }
 
                 this._currentInstant = nextEventInstant */
            }
        }

        return happeningEvents
    }

    addModifier(modifier: AttributeModifier) {

        // TODO (1) : check for duplicates ? Merge modifiers ?

        if (this.attributeModifiers === undefined) {
            this.attributeModifiers = new Set<AttributeModifier>()
        }
        this.attributeModifiers.add(modifier)
    }

    modifierToDao(kind: ModAttrKind): AttributeModifierDao[] | undefined {
        // TODO (0) : rebase to given DH ?
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
        return '{LinAttr, val:' + this._value
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
        this.duration = modifierDao.duration;
    }
}

// ~ Poison (Agents), Wear (furniture, buildings) : reverse condition slope 
// TODO (1) : fixed slope ?
export class CondModifier extends AttributeModifier {

    slopeVariation = - 2 * Constants.SLOPE_ONE_PER_IRLSECOND
    /* applyModificationTo(linearAttribute: LinearAttribute) {
 
         // FIXME (0) : poison => if < 0 keep sign !
         linearAttribute.slope *= -1;
     }*/
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
    cond?: number
}

export interface EntityOptions {

    classId: ConceptClass
    varAttr: EntityVarOptions
    condMax?: number
    condSlope?: Slope
    mass?: number
    mainMaterial?: MatterType	// TODO (4) : defined by solidity ? being=> flesh/vegetal
    mainColor?: number // (visibility modifier ?)
    solidity?: SolidityInterface
    passiveRetort?: Damage
    baseCapacity?: 0 // TODO (2) : inventory max length ? or getMassSum() limit ?
    attributeModifiers?: AttributeModifierDao[]
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

    cond: number
    getModifiedCond(): DynamicAttributeInterface
    /* readonly condSlope: number
     readonly condMax: number */
    readonly mass: number
    readonly solidity: Solidity

    readonly inventory: EntityInterface[]

    readonly updateDH: number
    getNextEvents(upToInstant?: number): AttributeEventInterface[]
    getNextCriticalEvent(upToInstant: Instant): AttributeEventInterface | undefined
    stabiliseAt(updateDH: number): AttributeEventInterface[]

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

    protected _cond: LinearAttribute;
    get cond() { return this._cond.currentValue; }
    set cond(v: number) { if (v !== this._cond.currentValue) { this._cond.currentValue = v; this.varModified = true } }
    getModifiedCond(): DynamicAttributeInterface {
        return this._cond.getModifiedAttribute();
    }
    /*  get condSlope(): Slope { return this._cond.slope }
      get condMax() { return this._cond.maximum } */

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

        this._mass = opt.mass !== undefined ? opt.mass : Defaults.FURNITURE_MASS;
        let condMax = opt.condMax !== undefined ? opt.condMax : Defaults.FURNITURE_COND_MAX;
        this._cond = new LinearAttribute(
            opt.varAttr.cond !== undefined ? opt.varAttr.cond : condMax,
            condMax,
            opt.condSlope !== undefined ? opt.condSlope : Defaults.FURNITURE_COND_SLOPE,
            opt.varAttr.updateDH,
            opt.attributeModifiers
        );
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

    getNextEvents(upToInstant?: number): AttributeEventInterface[] {

        // TODO (0) : other events, other attributes, objectives, memory, etc ?

        return this._cond.getNextEvents(upToInstant)
    }

    getNextCriticalEvent(upToInstant = Number.POSITIVE_INFINITY) {

        let events = this._cond.getNextEvents(upToInstant)

        for (let evt of events) {
            if (evt.kind === AttrEventKind.ZeroReached && evt.instant <= upToInstant) {
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
 
       //  this.applyModifiers(newUpdateDH);
 
         let happenedEvents = this._cond.stabiliseAt(newUpdateDH)
 
         // TODO (0) : _childStabiliseUpTo()

        return happenedEvents
    }

    // TODO (1) : give stable/instable info to stablilize ? 
    // TODO (1) : separate positive only and positive/negative allowed ?

    // get dynamic attribute normalized value
    /* protected getDynNormalValue(dt: number, val: number, max: number, slope: number) {
 
         if (slope != Constants.NO_SLOPE) {
             val += dt * slope;  // FIXME (1) : slope should be an integer. Use inverseSlope to store in options ?
         }
         let limitedVal = val > max ? max : (val < 0 ? 0 : val);
 
         dbg.attr('getDyn > ' + limitedVal
             + ' (max:' + 1
             + ' dh:' + this._updateDH
             + ' detaT:' + dt
             + ' slope: ' + slope
             + ' real: ' + val + ') from '
             + this.gId
         );
 
         return limitedVal;
     } */

    /* private addModifier(modifier: AttributeModifier) {
 
         if (modifier.originDH + modifier.duration >= this._updateDH) {
             console.error('addModifier > Trying to add an expired modifier');
             return;
         } 
 
         // TODO (1) : check for duplicates ? Merge modifiers ?
 
         if (modifier.kind === ModAttrKind.Cond) {
             if (this.attributeModifiers.condModifiers === undefined) {
                 this.attributeModifiers.condModifiers = [];
             }
             this.attributeModifiers.condModifiers.push(modifier);
         }
 } */

    /*  protected applyModifiers(upToDH: number) {
  
          // TODO (1) : for modAttrKind[ID]... ?
          // FIXME (1) modCondMax ? how to do it with normalized values ?? localMax = 0.9 of globalMax for example ?
  
          if (this.attributeModifiers.condModifiers
              && this.attributeModifiers.condModifiers.length) {
              dbg.log('Entity apply cond modifiers :' + this.attributeModifiers.condModifiers.length);
  
              let condAttr = new LinearAttribute(this._cond, this._condMax, this._condSlope, this._updateDH);
              condAttr.forwardToNextEvent(this.attributeModifiers.condModifiers, upToDH); 
          }
      }  */

    toVarDao(): EntityVarOptions { // ~ protected, Persistor friend ! (only used internally or to store partial doc in Persistor)
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond.currentValue
        }
    }

    toDao(): EntityOptions {

        return {
            varAttr: this.toVarDao(),
            classId: this._classId,
            mass: this._mass,
            condSlope: this._cond.baseSlope,
            attributeModifiers: this._cond.modifierToDao(ModAttrKind.Cond)
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
        super(opt);
        //super.fromOptions(opt);
    }

    toIdDao(): FurnitureIdDao {
        let dao: FurnitureIdDao = <FurnitureIdDao>this.toDao();
        dao.gId = this.gId;
        return dao;
    }

    toString() {
        return ' { class:Furniture'
            + ', dt:' + this._updateDH
            + ', cond:' + this._cond.currentValue + '/' + this._cond.baseMaximum + '@' + this._cond.baseSlope
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
    attack: Damage

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
    attack: Damage

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
    get energy() { return this._energy }
    set energy(v: number) { if (v !== this._energy) { this._energy = v; this.varModified = true } }
    protected _energySlope: Slope
    protected modEnergySlope: Slope
    get energySlope() { return this.modEnergySlope }
    protected _energyMax: number
    get energyMax() { return this._energyMax }

    readonly actions: ActId[] = []

    /*  get updateDH() { return this._updateDH }
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
      } */

    // TODO (0) : protected _stabilise
    /* stabiliseUpTo(newUpdateDH: number): number {
         let dt = super.stabiliseUpTo(newUpdateDH);
 
         dbg.log('Agent.stabilise > ');
 
         this._qt = this.getDynNormalValue(dt, this._qt, this._qtMax, this.modQtSlope);
         this._energy = this.getDynNormalValue(dt, this._energy, this._energyMax, this.modEnergySlope);
         return dt;
     }*/

    constructor(opt: AgentIdOptions) {
        super(opt);

        // overwrite entity default cond slope and mass
        // TODO (5) : absract entity, concreet furniture ?
        // this._condSlope = opt.condSlope !== undefined ? opt.condSlope : Defaults.BEING_COND_SLOPE;
        let condMax = opt.condMax !== undefined ? opt.condMax : Defaults.BEING_COND_MAX;
        this._cond = new LinearAttribute(
            opt.varAttr.cond !== undefined ? opt.varAttr.cond : condMax,
            condMax,
            opt.condSlope !== undefined ? opt.condSlope : Defaults.BEING_COND_SLOPE,
            opt.varAttr.updateDH,
            opt.attributeModifiers
        );

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
        this.attack = opt.attack !== undefined ? opt.attack : Defaults.ATTACK;
        this.stomach = opt.varAttr.stomach !== undefined ? opt.varAttr.stomach : Defaults.BEING_STOMACH;

        // TODO (0) : stomach etc...AgentBase

        // super.fromOptions(opt);
    }

    toVarDao(): AgentVarOptions {
        return {
            updateDH: this._updateDH,
            posX: this._posX,
            posY: this._posY,
            theta: this._theta,
            cond: this._cond.currentValue,
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
            condSlope: this._cond.baseSlope,
            qtMax: this.qtMax,
            qtSlope: this.qtSlope,
            energyMax: this.energyMax,
            energySlope: this.energySlope,
            moveWater: this.moveWater,
            moveEarth: this.moveEarth,
            moveAir: this.moveAir,
            mass: this.mass,
            massMax: this.massMax,
            massSlope: this.massSlope,
            attributeModifiers: this._cond.modifierToDao(ModAttrKind.Cond)
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

    /*   protected applyModifiers() {
           // modifiers are ordered by increasing expiration time
   
           // TODO (1) : qtmax, energymax,... => for modAttr[ID]... ?
           this.modQtSlope = this._qtSlope;
           this.modEnergySlope = this._energySlope;
   
           super.applyModifiers();
       } */

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
        return ' { class:Agent'
            + ', name:' + this.name
            + ', dt:' + this._updateDH
            + ', cond:' + this._cond.currentValue + '/' + this._cond.baseMaximum + '@' + this._cond.baseSlope
            + ', qt:' + this._qt + '/' + this._qtMax + '@' + this._qtSlope
            + ', modCondSlope:' + this.modQtSlope
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


