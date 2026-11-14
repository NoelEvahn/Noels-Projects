// Standard QA viewpoints (Annex G 7.2). [x, z] position, h = camera height above the surface (deck, ground or water), target [x, z, dyRel or {abs}].
// Interior views (V07, V09 first-person rod, V14) are approximated from outside in Stage 2: interiors do not exist yet.
export const VIEWPOINTS = {
  V01: { x: -147, z: 372, h: 1.65, t: [-170, 250, 16], note: 'Spawn on River St looking north to the viaduct and bridge tower' },
  V02: { x: -160, z: 316, h: 1.65, t: [-320, 300, 14], note: 'Old Town under the viaduct looking west to the tower and river' },
  V03: { x: 400, z: 200, h: 2.2, t: [400, 420, -4], note: 'Central Ave footbridge looking south along the boulevard' },
  V04: { x: 190, z: 100, h: 1.65, t: [262, 22, 5], note: 'Midtown corner near the precinct looking north-east' },
  V05: { x: 440, z: 744, h: 3, t: [640, 770, 2], note: 'Industrial street near the Swift Parcel depot looking east' },
  V06: { x: -350, z: 289, h: 1.65, t: [60, 300, 12], note: 'Harlan Bridge mid-span walkway looking east to the skyline' },
  V07: { x: -895, z: -775, h: 2.5, t: [-1010, -930, 0], note: 'Old Boathouse (exterior stand-in) looking out to the lake' },
  V08: { x: -790, z: -1070, h: 1.8, t: [-250, -2300, 140], note: 'Village dock looking north across the lake toward Mt. Sable' },
  V09: { x: -1668, z: -1128, h: 1.65, t: [-1640, -1150, 3], note: 'Inlet footbridge looking at the red-roof cabin' },
  V10: { x: -880, z: 1138, h: 6, t: [-1010, 1190, -2], note: 'Port Calder quay looking west over the berths' },
  V11: { x: -1040, z: 1134, h: 2.2, t: [-1115, 1415, 12], note: 'Marina boardwalk looking south-west to the lighthouse' },
  V12: { x: -1650, z: 1146, h: 1.3, t: [-1900, 1150, 4], note: 'Palm Cove beach at the waterline looking west along the shore' },
  V13: { x: -200, z: -1150, h: 1.65, t: [0, -960, 3], note: 'Old Forest Road on the centre line looking along the road' },
  V14: { x: 258, z: -770, h: 1.65, t: [250, -800, 2], note: 'Forest cabin 1 (exterior stand-in)' },
  V15: { x: 1150, z: -1300, h: 10, t: [450, -3000, 280], note: 'Timberline Yard 10 m up looking north to the peak' },
  V16: { x: 1190, z: -1340, h: 1.65, t: [1300, -1450, 3], note: 'Logging spur A looking up the track' },
};
