## City pack (`city`)
Real-scale (1 unit = 1 m) animated city assets, all deterministic (`userData.update(t)` is closed form; call it every frame). Everything faces +Z, origin at ground level; each records `userData.realHeightM` / `realWidthM`. Registry: `registry/city.js` (ids `city_*`, screenshots `screenshots/city_*.jpg`). Shared helpers: `props/city_kit.js` (`Batch`, `makeWindows` with shader-flicker lit panes, `signMesh`, `plume`, `flag`, `birdFlock`, `makePath`, `halo`, `lampMesh`). Windows flicker in every building.

| Function (file) | Options | Real size | Animates | Screenshot |
|---|---|---|---|---|
| `brownstone` (props/city_buildings.js) | w,d,floors,color,seed,lod | 14 m | windows, banner flag | city_brownstone |
| `officeTower` (city_buildings) | w,d,floors,name,tint | 131 m | revolving door, window-washer gondola, mast beacon, windows | city_office_tower |
| `apartmentBlock` (city_buildings) | w,d,floors,color,accent | 34 m | windows, roof turbine vents | city_apartment_block |
| `skyscraper` (city_buildings) | floors,stone,lit | 243 m | crown glow, spire beacon, windows | city_skyscraper |
| `cornerShop` (city_buildings) | w,d,name,color | 9.5 m | OPEN neon blink, swinging blade sign | city_corner_shop |
| `diner` (city_buildings) | w,d | 10 m | chase-light arrow, neon sign | city_diner |
| `gasStation` (city_buildings) | brand | 10.6 m | rotating logo disc, waving flag | city_gas_station |
| `hospital` (props/city_civic.js) | w,d,floors | 43 m | pulsing cross, helipad chase lights, windsock, vents | city_hospital |
| `school` (city_civic) | w,d | 34 m | working clock (1 min hand turn / 60 s), bell, flag, swings | city_school |
| `policeStation` (city_civic) | w,d,floors | 23 m | blue lamps, rotating beacon, flags | city_police_station |
| `parkingGarage` (city_civic) | w,d,levels | 19 m | 3 cars on the spiral ramp, barrier gate | city_parking_garage |
| `factory` (city_civic) | w,d | 31 m | smoke plumes, conveyor crates, crane hook, vents | city_factory |
| `church` (city_civic) | - | 39 m | swinging bell, pigeons | city_church |
| `stadium` (city_civic) | home,away,crowd | 58 m, pitch 105x68 | hopping crowd (shader), floodlight flicker | city_stadium |
| `trafficLight`, `signalPhase`, `SIGNAL_T` (props/city_street.js) | dir,side,arm | 7 m | red/yellow/green cycle (26 s), pedestrian signal | city_traffic_light |
| `streetLamp` | kind cobra/classic | 9.7 m / 4.9 m | glow flicker | city_street_lamps |
| `bench` | pigeons | 1.25 m | pecking/hopping pigeons | city_bench_hydrant |
| `hydrant` | spray | 0.95 m | water spray arc | city_bench_hydrant |
| `busStop` | route | 3.55 m | arrival board countdown, commuters | city_bus_stop |
| `mailbox`, `newsBox`, `trashBins` | - | 1.4 m | flag + letter, tumbling page, lid, rolling bag/can | city_mail_news_bins |
| `billboard` | w,h | 14.7 m | 3 ads wipe every 7 s | city_billboard |
| `crosswalk` | length,stripes | 2.8 m | running studs | city_crosswalk |
| `manholeSteam` | stack | 9 m | steam plumes | city_manhole_steam |
| `roadworks` | - | 3 m | jackhammer, dust, flasher | city_roadworks |
| `scaffolding` | bays,levels | 14 m | hoist bucket, worker, netting, banner | city_scaffolding |
| `crane` | H,jib | 70 m | jib slew, trolley, swinging load, lights | city_crane |
| `powerLines` | spans,span | 11.5 m | swaying wires, sparrows, bird flock | city_power_lines |
| `hotdogCart` | - | 3.4 m | steam, umbrella sway | city_hotdog_cart |
| `sedan` (props/city_vehicles.js) | color,kind sedan/hatch/wagon/suv,speed | 1.5 m | wheels, blinkers | city_cars |
| `taxi`, `policeCar` | speed | 1.8 m | roof light, flashing bar | city_cars |
| `bus` | color,route,dest | 3.4 m | wheels, passengers bob | city_bus_truck |
| `deliveryTruck` | name | 3.1 m | hazard blink | city_bus_truck |
| `fireTruck` | - | 3.2 m | ladder raise/swing, flashers | city_emergency |
| `ambulance` | - | 2.4 m | triple flash | city_emergency |
| `bicycle`, `scooter` | rider,basket,box | 1.7 / 1.8 m | pedals + IK legs, wheels | city_two_wheels |
| `tram` | track,shuttle | 3.8 m | shuttles on rails, wheels | city_tram |
| `cityBlock` (sets/city_gen.js) | seed,rows(1-2),cols,zone,detail | whole block | traffic, pedestrians, signals | city_block, city_block_downtown |
| `cityGrid` | size,density,detail | size x 78 m | traffic loops, beacons, windows | city_grid |
| `trafficFlow(path,n)` | speed,mix,laneOffset | - | instanced cars driving two lanes | city_traffic_flow |
| `pedestrians(n)` | paths,speed | 1.85 m | walk cycle | city_pedestrians |
| `skylineRing` | radius,n,hmin,hmax,night | up to 350 m | beacons, window flicker | city_skyline_ring |
