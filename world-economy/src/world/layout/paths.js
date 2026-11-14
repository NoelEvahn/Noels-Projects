// Walk-only paths (Annex B 5.3). Items: 'nodeId' | [x,z] free point | [x,z,'nodeId'] named free point | {attach:[x,z]} snaps to the nearest road/path edge.
import { gid } from './roads.js';

export const PATHS = [
  // riverside promenade with connectors at every street (R strip)
  ...Array.from({ length: 13 }, (_, j) => ({ id: `p.prom.c${j}`, name: 'Riverside promenade', items: [gid(0, j), [-188, -250 + 100 * j, `n.prom.${j}`]] })),
  ...Array.from({ length: 12 }, (_, j) => ({ id: `p.prom.s${j}`, name: 'Riverside promenade', items: [`n.prom.${j}`, `n.prom.${j + 1}`] })),
  // Founders Park X paths through the park centre (on the closed Grant St)
  { id: 'p.park.1', name: 'Founders Park path', items: [gid(6, 5), { attach: [750, 350] }, gid(7, 7)] },
  { id: 'p.park.2', name: 'Founders Park path', items: [gid(7, 5), { attach: [750, 350] }, gid(6, 7)] },
  // footbridge landings: stairs to the boulevard node and the span itself
  { id: 'p.footbridge.w', name: 'Footbridge stairs', items: ['n.footbridge', [380, 200, 'n.fb.w']], link: true, fixedY: { 'n.fb.w': 14.2 } },
  { id: 'p.footbridge.e', name: 'Footbridge stairs', items: ['n.footbridge', [420, 200, 'n.fb.e']], link: true, fixedY: { 'n.fb.e': 14.2 } },
  { id: 'p.footbridge.span', name: 'Central Ave footbridge', items: ['n.fb.w', 'n.fb.e'], link: true, flatY: 14.2 },
  { id: 'p.riverdock', name: 'Riverside dock gangway', items: ['n.prom.8', [-215, 578], [-250, 598, 'n.riverdock.bank'], [-296, 600, 'n.riverdock.end']], link: true, fixedY: { 'n.riverdock.end': 0.55 } },
  // Port Calder harbour promenade and marina boardwalk
  { id: 'p.pc.prom.w', name: 'Harbour promenade', items: ['n.pc.w', [-1098, 1135, 'n.pcp.w']] },
  { id: 'p.pc.prom.c', name: 'Harbour promenade', items: ['n.pc.c', [-900, 1135, 'n.pcp.c']] },
  { id: 'p.pc.prom.e', name: 'Harbour promenade', items: ['n.pc.e', [-727, 1135, 'n.pcp.e']] },
  { id: 'p.pc.prom.1', name: 'Harbour promenade', items: ['n.pcp.w', 'n.pcp.c'] },
  { id: 'p.pc.prom.2', name: 'Harbour promenade', items: ['n.pcp.c', 'n.pcp.e'] },
  { id: 'p.marina.walk.w', name: 'Marina boardwalk', items: ['n.marina', [-1262, 1117], [-1330, 1121, 'n.mbw.w']] },
  { id: 'p.marina.walk.e', name: 'Marina boardwalk', items: ['n.marina', [-1160, 1117, 'n.mbw.e']] },
  // beach boardwalk and Palm Cove
  { id: 'p.beach.walk', name: 'Beach boardwalk', items: ['n.palmcove.parking', [-1640, 1085], [-1670, 1112, 'n.beach.w']] },
  // lakeshore trail (inside the loop road) and trails to the cabins at the inlet
  { id: 'p.lake.trail.1', name: 'Lakeshore trail', items: ['n.pinehaven.sq', [-760, -1020], [-800, -960, 'n.trail.a']] },
  { id: 'p.lake.trail.2', name: 'Lakeshore trail', items: ['n.trail.a', [-840, -890], [-880, -850, 'n.trail.b']] },
  // forest trails
  { id: 'p.forest.fern', name: 'Fern Hollow trail', items: ['n.forest.gate', [430, -820], [380, -960], [350, -1050, 'n.camp.fern']] },
  { id: 'p.forest.ridge.1', name: 'Ridge trail', items: ['n.forest.gate', [600, -900], [700, -1300], 'n.firetower'] },
  { id: 'p.forest.ridge.2', name: 'Ridge trail', items: ['n.firetower', [1100, -1650], [1500, -1600, 'n.camp.eagle']] },
];
