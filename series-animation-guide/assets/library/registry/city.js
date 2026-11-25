// Registry entries for the 'city' pack (same item shape as ../registry.js). Owned by one builder; do not import other packs' registry files.
import * as THREE from 'three';
import * as B from '../props/city_buildings.js';
import * as V from '../props/city_vehicles.js';

export const ITEMS = [];
const reg = (i) => ITEMS.push(i);
const stage = (o = {}) => ({ sky: ['#78bdf0', '#fbf3df'], ground: 0x8d9199, groundR: 120, shadow: { extent: 22 }, keyPos: [6, 12, 9], fog: null, ...o });
// shoot helper: builds the asset, applies update(t) and returns {obj, cam, update}
const item = (id, title, note, make, cam, st) => reg({ id, cat: 'city', title, note, stage: st ?? stage(), build: () => { const o = make(); return { obj: o, cam, update: (t) => o.userData.update?.(t) }; } });

item('city_brownstone', 'Brownstone row house (13 m)', 'B.brownstone({w,d,floors,seed}): stoop + rails, cornice, fire escape, window boxes, AC, tank, flag; windows flicker', () => B.brownstone({ seed: 3 }), { pos: [11, 7.5, 21], target: [0, 6.2, 0], fov: 46 });
item('city_office_tower', 'Glass office tower (110 m)', 'B.officeTower({floors,name}): curtain wall, lobby with revolving door, window-washer gondola, blinking mast', () => B.officeTower(), { pos: [70, 60, 120], target: [0, 50, 0], fov: 42 }, stage({ shadow: { extent: 80 }, groundR: 400 }));
item('city_apartment_block', 'Apartment block (30 m)', 'B.apartmentBlock({floors}): balconies with railings/plants/laundry, AC, solar panels, spinning roof vents', () => B.apartmentBlock(), { pos: [22, 14, 42], target: [0, 13, 0], fov: 46 }, stage({ shadow: { extent: 36 } }));
item('city_skyscraper', 'Setback skyscraper (230 m)', 'B.skyscraper(): five Art Deco tiers, piers, glowing crown, blinking spire', () => B.skyscraper(), { pos: [150, 110, 260], target: [0, 105, 0], fov: 42 }, stage({ shadow: { extent: 150 }, groundR: 800 }));
item('city_corner_shop', 'Corner shop', 'B.cornerShop(): striped awning, readable signs, blinking OPEN neon, fruit crates, swinging blade sign', () => B.cornerShop(), { pos: [8, 3.8, 15], target: [0, 2.6, 0], fov: 46 });
item('city_diner', 'Chrome diner', 'B.diner(): lit booths, chase-light neon arrow + DINER sign, parking stripes', () => B.diner(), { pos: [13, 5, 22], target: [0, 3, 0], fov: 46 }, stage({ shadow: { extent: 24 } }));
item('city_gas_station', 'Gas station', 'B.gasStation(): canopy + 3 pumps, price pylon with rotating logo, mini mart, flag', () => B.gasStation(), { pos: [20, 10, 34], target: [0, 4, 0], fov: 46 }, stage({ shadow: { extent: 34 } }));

const vehLine = (makers, gap, cam, id, title, note) => reg({ id, cat: 'city', title, note, stage: stage({ shadow: { extent: 16 } }), build: () => { const g = new THREE.Group(); const ups = []; makers.forEach((m, i) => { const v = m(); v.position.set((i - (makers.length - 1) / 2) * gap, 0, 0); v.rotation.y = -0.5; g.add(v); ups.push(v.userData.update); }); return { obj: g, cam, update: (t) => ups.forEach((u) => u(t)) }; } });
vehLine([() => V.sedan({ color: 0xd9392f }), () => V.sedan({ color: 0x2f6fd6, kind: 'hatch' }), () => V.sedan({ color: 0x2fa66a, kind: 'suv' }), () => V.taxi(), () => V.policeCar()], 5.4, { pos: [0, 4.5, 20], target: [0, 0.8, 0], fov: 40 }, 'city_cars', 'Cars: sedan / hatch / suv / taxi / police car', 'V.sedan({color, kind}), V.taxi(), V.policeCar(): spinning wheels (userData.speed), blinkers, flashing light bar');
vehLine([() => V.bus({ speed: 8 }), () => V.deliveryTruck({ speed: 8 })], 13, { pos: [-6, 6, 26], target: [0, 1.6, 0], fov: 42 }, 'city_bus_truck', 'City bus + delivery truck', 'V.bus({color,route,dest}), V.deliveryTruck({name}): passengers bob, amber hazards blink');
vehLine([() => V.fireTruck(), () => V.ambulance()], 12, { pos: [-4, 7, 26], target: [0, 1.6, 0], fov: 42 }, 'city_emergency', 'Fire truck + ambulance', 'V.fireTruck(): ladder raises + swings, red/white flashers; V.ambulance(): triple flash');
vehLine([() => V.bicycle({ speed: 4 }), () => V.scooter({ speed: 5 }), () => V.bicycle({ color: 0xd9392f, shirt: 0x2fa66a, seed: 4, basket: true, speed: 4 }), () => V.scooter({ color: 0xf6c235, box: true, shirt: 0x2f6fd6, speed: 5 })], 2.6, { pos: [0, 1.7, 7.5], target: [0, 0.8, 0], fov: 38 }, 'city_two_wheels', 'Bicycle + scooter (with riders)', 'V.bicycle({rider,basket}): pedals + IK legs pedal; V.scooter({rider,box})');
item('city_tram', 'Tram on its track', 'V.tram(): articulated, pantograph, overhead wire; shuttles along the rails in update(t)', () => V.tram(), { pos: [10, 3.8, 24], target: [0, 1.8, 0], fov: 46 }, stage({ shadow: { extent: 30 } }));
