// Registry entries for the 'landmarks' pack (same item shape as ../registry.js). Owned by one builder; do not import other packs' registry files.
import * as TW from '../props/landmarks_towers.js';
import * as LT from '../props/landmarks_lattice.js';
import * as MA from '../props/landmarks_monuments.js';
import * as MB from '../props/landmarks_monuments_b.js';
import * as MC from '../props/landmarks_monuments_c.js';
import { sizeLadder } from '../props/landmarks_ladder.js';
import { bigStage } from '../props/landmarks_kit.js';

export const ITEMS = [];
// e: {id,title,note,make(),H (height m),d (cam dist),az (azimuth rad),hy (target height frac of H),el (cam height frac),fov,ground,sky,R (shadow radius)}
function entry(e) {
  const az = e.az ?? 0.55, hy = (e.hy ?? 0.4) * e.H, d = e.d ?? e.H * 1.75, el = (e.el ?? 0.55) * e.H, fov = e.fov ?? 38;
  const pos = [Math.sin(az) * d, e.cy ?? el, Math.cos(az) * d], target = [e.tx ?? 0, e.ty ?? hy, e.tz ?? 0];
  const sky = e.sky ?? ['#7fc4f2', '#eaf5ff'];
  ITEMS.push({
    id: 'landmarks_' + e.id, cat: 'landmarks', title: e.title, note: e.note ?? '',
    stage: { sky, ground: e.ground ?? 0x7fb35a, groundR: 60, fog: e.fog === false ? null : [0xdfeefa, d * 1.6, d * 14], hemiI: 1.15, keyPos: e.keyPos },
    build(ctx) {
      const obj = e.make();
      bigStage(ctx, e.R ?? Math.max(120, e.H * 1.1), pos);
      return { obj, cam: { pos, target, fov }, update: (t) => obj.userData.update && obj.userData.update(t) };
    },
  });
}

entry({ id: 'empire', title: 'Empire State Building (381 m / 443 m)', make: () => TW.empireState(), H: 443, d: 900, hy: 0.46, ground: 0x8a8c92 });
entry({ id: 'burj', title: 'Burj Khalifa (828 m)', make: () => TW.burjKhalifa(), H: 828, d: 1500, hy: 0.46, ground: 0xe3cf9a, sky: ['#6fb8ee', '#fff0d6'] });
entry({ id: 'wtc', title: 'One World Trade Center (541 m)', make: () => TW.oneWTC(), H: 541, d: 1000, hy: 0.46, ground: 0x8a8c92 });
entry({ id: 'shanghai', title: 'Shanghai Tower (632 m)', make: () => TW.shanghaiTower(), H: 632, d: 1150, hy: 0.46, ground: 0x8a8c92, az: 0.7 });
entry({ id: 'taipei101', title: 'Taipei 101 (508 m)', make: () => TW.taipei101(), H: 508, d: 950, hy: 0.46, ground: 0x8a8c92 });
entry({ id: 'petronas', title: 'Petronas Towers (452 m)', make: () => TW.petronasTowers(), H: 452, d: 1000, hy: 0.46, ground: 0x86b86a, az: 0.35 });

entry({ id: 'eiffel', title: 'Eiffel Tower (330 m)', make: () => LT.eiffelTower(), H: 330, d: 640, hy: 0.42, ground: 0xc9c0a8 });
entry({ id: 'tokyotower', title: 'Tokyo Tower (333 m)', make: () => LT.tokyoTower(), H: 333, d: 640, hy: 0.42, ground: 0x8a8c92 });
entry({ id: 'skytree', title: 'Tokyo Skytree (634 m)', make: () => LT.tokyoSkytree(), H: 634, d: 1200, hy: 0.42, ground: 0x8a8c92 });
entry({ id: 'cntower', title: 'CN Tower (553 m)', make: () => LT.cnTower(), H: 553, d: 1050, hy: 0.42, ground: 0x8a8c92 });
entry({ id: 'spaceneedle', title: 'Space Needle (184 m)', make: () => LT.spaceNeedle(), H: 184, d: 360, hy: 0.42, ground: 0x7fbf5f });

entry({ id: 'liberty', title: 'Statue of Liberty (93 m)', make: () => MA.statueOfLiberty(), H: 93, d: 190, hy: 0.45, ground: 0x2f86bb });
entry({ id: 'bigben', title: 'Big Ben / Elizabeth Tower (96 m) + Parliament', make: () => MA.bigBen(), H: 96, d: 520, hy: 0.3, tx: -35, az: 0.15, el: 0.6, ground: 0xc6bca4 });
entry({ id: 'pisa', title: 'Leaning Tower of Pisa (56 m)', make: () => MA.leaningTowerPisa(), H: 56, d: 130, hy: 0.45, az: 0.3, ground: 0x6dbb55 });
entry({ id: 'colosseum', title: 'Colosseum (48 m)', make: () => MA.colosseum(), H: 48, d: 330, hy: 0.3, az: 2.4, el: 2.0, ground: 0xc9bc9a, R: 360 });
entry({ id: 'giza', title: 'Pyramids of Giza + Sphinx (139 m)', make: () => MA.pyramidsGiza(), H: 139, d: 720, hy: 0.3, az: 0.8, el: 0.4, ground: 0xe6c98a, R: 700 });
entry({ id: 'tajmahal', title: 'Taj Mahal (73 m)', make: () => MA.tajMahal(), H: 73, d: 230, hy: 0.4, az: 0.2, el: 0.5, ground: 0xd8c79a, R: 300 });
entry({ id: 'christ', title: 'Christ the Redeemer (38 m)', make: () => MA.christRedeemer(), H: 38, d: 100, hy: 0.62, az: 0.3, el: 0.55, ground: 0x5a9a4a, R: 400, sky: ['#6fb8ee', '#fff0d6'] });

entry({ id: 'sydney', title: 'Sydney Opera House (65 m) + Harbour Bridge (134 m)', make: () => MB.sydneyOperaHouse(), H: 65, d: 380, hy: 0.55, az: -0.45, el: 1.2, ground: 0x2f8fc4, R: 600 });
entry({ id: 'goldengate', title: 'Golden Gate Bridge (227 m towers)', make: () => MB.goldenGate(), H: 227, d: 900, hy: 0.4, tx: -120, az: 0.45, el: 0.7, ground: 0x2a7fb6, R: 1300 });
entry({ id: 'towerbridge', title: 'Tower Bridge (65 m)', make: () => MB.towerBridge(), H: 65, d: 260, hy: 0.4, az: 0.5, el: 0.8, ground: 0xb8b4a8, R: 320 });
entry({ id: 'arc', title: 'Arc de Triomphe (50 m)', make: () => MB.arcDeTriomphe(), H: 50, d: 160, hy: 0.45, az: 0.4, el: 0.7, ground: 0xd4c8aa, R: 300 });
entry({ id: 'stbasils', title: "St Basil's Cathedral (47 m)", make: () => MB.stBasils(), H: 47, d: 150, hy: 0.45, az: 0.5, el: 0.6, ground: 0xb4b2ac, R: 260 });
entry({ id: 'kremlin', title: 'Kremlin Spasskaya Tower (71 m)', make: () => MB.kremlinTower(), H: 71, d: 160, hy: 0.5, az: 0.4, el: 0.5, ground: 0xa8a49c, R: 260 });
entry({ id: 'washington', title: 'Washington Monument (169 m)', make: () => MB.washingtonMonument(), H: 169, d: 360, hy: 0.45, az: 0.4, el: 0.5, ground: 0x5aa84a, R: 400 });
entry({ id: 'gatewayarch', title: 'Gateway Arch (192 m)', make: () => MB.gatewayArch(), H: 192, d: 380, hy: 0.45, az: 0.45, el: 0.5, ground: 0x5aa84a, R: 450 });

entry({ id: 'greatwall', title: 'Great Wall section (wall ~8 m, towers 12 m)', make: () => MC.greatWall(), H: 8, d: 430, ty: 120, cy: 230, az: 0.3, ground: 0x6aae52, R: 800 });
entry({ id: 'rushmore', title: 'Mount Rushmore (heads 18 m)', make: () => MC.mountRushmore(), H: 18, d: 230, ty: 198, cy: 215, tx: 12, az: 0.12, ground: 0x6aae52, R: 350 });
entry({ id: 'stonehenge', title: 'Stonehenge (7.3 m)', make: () => MC.stonehenge(), H: 7.3, d: 48, ty: 2.5, cy: 18, az: 0.7, ground: 0x7fb054, R: 200 });
entry({ id: 'hoover', title: 'Hoover Dam (221 m)', make: () => MC.hooverDam(), H: 221, d: 560, ty: 100, tz: 100, cy: 250, az: 0.55, ground: 0x9c5e3c, R: 900 });
entry({ id: 'angkor', title: 'Angkor Wat (65 m)', make: () => MC.angkorWat(), H: 65, d: 520, ty: 30, cy: 250, az: Math.PI + 0.35, ground: 0x4f9a46, R: 700 });
entry({ id: 'machupicchu', title: 'Machu Picchu (peak ~290 m above site)', make: () => MC.machuPicchu(), H: 290, d: 560, ty: 80, cy: 210, az: 0.3, ground: 0x4f8f48, R: 700 });
entry({ id: 'hollywood', title: 'Hollywood sign (13.7 m letters)', make: () => MC.hollywoodSign(), H: 13.7, d: 320, ty: 170, cy: 195, az: 0.25, ground: 0xc0aa68, R: 350 });

// size ladder: world towers at true scale, side by side with height boards
ITEMS.push({ id: 'landmarks_ladder_towers', cat: 'landmarks', title: 'Size ladder: Statue of Liberty, Pisa, Big Ben, Eiffel, Empire State, CN Tower, Burj Khalifa', note: 'sizeLadder(items,{spacing}) / scaleReference(name)', stage: { sky: ['#7fc4f2', '#eaf5ff'], ground: 0x8fbf6a, groundR: 60, fog: null },
  build(ctx) { const obj = sizeLadder(['pisa', 'liberty', 'bigben', 'eiffel', 'empire', 'cntower', 'burj'], { spacing: 40 }); const W = obj.userData.realWidthM; const pos = [W * 0.5, 450, 2300]; bigStage(ctx, 1500, pos); return { obj, cam: { pos, target: [W * 0.5, 330, 0], fov: 38 }, update: (t) => obj.userData.update(t) }; } });
