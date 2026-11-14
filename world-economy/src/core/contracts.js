// JSDoc typedefs for the binding contracts (MASTER_SPEC 5). No runtime code.
// Frozen after tag s2a-scaffold: changes need a CONTRACT CHANGE entry in docs/DECISIONS.md.

/** @typedef {number} Cents      integer, never fractional. $1 = 100 */
/** @typedef {[number, number, number]} Vec3   [x, y, z] metres */
/** @typedef {{ok:true, data?:any} | {ok:false, error:string, detail?:any}} Result */
/** @typedef {{day:number, minute:number, total:number}} GameTime */

/** @typedef {Object} Tx
 *  @property {number} id @property {number} t @property {string} from @property {string} to
 *  @property {Cents} amount @property {string} type @property {string} [memo] @property {string} [ref] */

/** @typedef {Object} Placement
 *  @property {string} id @property {string} archetype
 *  @property {number} x @property {number} y @property {number} z @property {number} rotY
 *  @property {number} [seed] @property {Object} [params] @property {string[]} [tags] */

/** @typedef {Object} Collider
 *  @property {'box'|'cyl'|'deck'|'ramp'} shape @property {Vec3} pos @property {Vec3} [half]
 *  @property {number} [radius] @property {number} [height] @property {number} [rotY]
 *  @property {number} yMin @property {number} yMax @property {boolean} walkable @property {string} [surface] */

/** @typedef {Object} Archetype
 *  @property {string} id @property {string} category @property {Vec3} size
 *  @property {Collider[]} colliders @property {Object[]} anchors @property {number[]} lod @property {Object} [paramSchema] */

/** @typedef {Object} Poi
 *  @property {string} id @property {string} type @property {string} name @property {string} region @property {string} district
 *  @property {Vec3} pos @property {number} rotY @property {string} [placementId] @property {string[]} tags @property {Object} [data] */

/** @typedef {Object} Interactable
 *  @property {string} id @property {string} kind @property {Vec3} pos @property {number} radius
 *  @property {string} prompt @property {string} [poiId] @property {string} [placementId] @property {Object} [data] */

/** @typedef {Object} Entity
 *  @property {number} id @property {string} kind @property {string} archetype
 *  @property {Float32Array} pos @property {Float32Array} quat @property {Float32Array} vel
 *  @property {Float32Array} prevPos @property {Float32Array} prevQuat @property {Object} anim @property {Object} [parts] @property {number} flags */

/** @typedef {Object} CameraState
 *  @property {Vec3} pos @property {Vec3} target @property {number} fov @property {'third'|'first'|'vehicle'|'cinematic'|'fixed'} mode */

export {};
