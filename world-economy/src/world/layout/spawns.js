// Spawn points (Annex B 6, MASTER_SPEC 10 VS0). Resolved against the built world; pure data + resolver.
export const PLAYER_SPAWN = { poi: 'poi.city.spawn', yaw: 0 };
/** road vehicles: placed on the kerbside parking lane of the road nearest to the POI */
export const VEHICLE_SPAWNS = [
  { id: 'v.start', archetype: 'veh.sedan', at: [-155.25, 392], yaw: 0, tag: 'start' },
  { id: 'v.depot', archetype: 'veh.van', poi: 'poi.city.depot' },
  { id: 'v.gate', archetype: 'veh.pickup', poi: 'poi.forest.gate' },
  { id: 'v.pinehaven', archetype: 'veh.hatch_used', poi: 'poi.lake.pinehaven' },
  { id: 'v.portcalder', archetype: 'veh.sedan', poi: 'poi.ocean.portcalder' },
  { id: 'v.palmcove', archetype: 'veh.coupe', poi: 'poi.ocean.palmcove_parking' },
  { id: 'v.timberline', archetype: 'veh.logtruck', poi: 'poi.forest.timberline' },
];
/** boats: spawned in open water beside the dock point of the POI */
export const BOAT_SPAWNS = [
  { id: 'b.riverdock', archetype: 'boat.skiff', xz: [-306, 588], yaw: 0 },
  { id: 'b.village', archetype: 'boat.rowboat', poi: 'poi.lake.fish.dock', yaw: -Math.PI / 2 },
  { id: 'b.boathouse', archetype: 'boat.skiff', xz: [-905, -825], yaw: Math.PI },
  { id: 'b.harbor', archetype: 'boat.skiff', xz: [-862, 1182], yaw: Math.PI },
  { id: 'b.marina', archetype: 'boat.console', xz: [-1218, 1186], yaw: Math.PI },
  { id: 'b.quay', archetype: 'boat.skiff', xz: [346, 1134], yaw: Math.PI },
  { id: 'b.trawler', archetype: 'boat.trawler', xz: [-900, 1230], yaw: Math.PI },
];
export const TELEPORT_PRESETS = [];
