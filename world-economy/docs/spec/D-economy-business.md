# Annex D — Economy, business, property, construction, vehicles

Owner: Stage 4 (Sonnet). Everything here lives in `src/sim/` and `src/data/` (pure JS, deterministic, Node-testable). Money is integer cents. Dollar figures below are initial values in `data/balance.js` and `data/*.js`; the bots in section 14 tune them. Formulas and interfaces are binding.

## 1. Ledger (single source of truth)

Interface: MASTER_SPEC §5.4. Account and transaction-type ids: MASTER_SPEC §7.4.

| Rule | Detail |
|---|---|
| One money store | The only place money exists is `Ledger` account balances. No module keeps its own balance, revenue counter or cache that is not derived from the journal totals |
| Double entry | Every transfer debits `from` and credits `to`. Σ of all balances (including `ext:*`) is always 0 |
| Player funds | `cash` (wallet, spendable anywhere), `bank:checking` (card payments, transfers, receives rent and business withdrawals), `bank:savings` (interest, transfers only) |
| Business funds | Each business has `biz:<id>`. Revenue lands there; payroll, stock and opex are paid from there. The owner moves money with `equity.in` / `equity.out` |
| Overdraft | 0 for all player and business accounts. A payment that cannot be made fails; obligations that cannot be paid become **payables** (section 6.6) |
| Journal | Ring buffer of 5,000 `Tx`. Aggregates `daily[day][account][type] = {in, out}` kept for 56 days, then folded into `lifetime[account][type]` |
| Aggregation | High-frequency flows are batched: one `sale.goods` transfer per business per hour, one `payroll` per business per day, one `wage` per shift |
| Net worth | `cash + checking + savings + Σ biz accounts + asset values (vehicles, property, plots and pieces, business equipment at resale value, inventory at market sell price, securities) − loan balances − payables` |

## 2. Bank (`sim/bank.js`)

| Feature | Rule |
|---|---|
| Deposit / withdraw | At the bank or any ATM (`INT.atm`); the Bank app can transfer checking ↔ savings anywhere but cannot convert to or from cash |
| Savings interest | 0.05% per day on the 00:00 balance, type `interest.savings` |
| Loans | Available after 3 game days of income history. Max total principal = 40% of net worth, min $500. Terms 4, 8 or 12 weeks. Interest 2.0% per week on the outstanding balance, charged Monday 00:00 (`loan.interest`); equal weekly principal instalments auto-debited from `bank:checking` (`loan.repay`) |
| Missed instalment | Credit score −40; late fee $25 (`fee`); after 3 misses the bank seizes checking and savings up to the arrears, then forces the sale of the least valuable vehicle |
| Credit score | 300–850, starts 600. +5 per on-time instalment, +1 per day with positive net income. Score sets the loan cap multiplier (0.6× at 500, 1.0× at 600, 1.4× at 750) and rate (2.4% → 1.6%) |
| Business loans | Same product, proceeds may be sent straight to a business account |

## 3. Taxes, fees, investments

| # | Item | Rule |
|---|---|---|
| 3.1 | Income tax | 10% of gross wages, withheld at shift end (`tax.income`). Tips and own-account fish sales under the 10 kg/day allowance are untaxed |
| 3.2 | Business tax | 12% of each business's weekly profit (revenue − cost of goods − payroll − opex) if positive, debited from its account Monday 00:00 (`tax.business`). Losses carry forward 4 weeks |
| 3.3 | Property tax | 0.15% of assessed value per week (`tax.property`) from `bank:checking`. Unpaid tax becomes an arrears loan at 4% per week |
| 3.4 | Investments (P2, `sim/invest.js`) | Securities `sec.index`, `sec.harlanfoods`, `sec.calderfish`, `sec.timberco`, `sec.metrologistics`, `sec.harlanreit`. Hourly price update: `p ← p · exp(μ + σ·N(0,1) + κ·(ln p̄ − ln p) + λ·sector)` with μ = 0.00004, σ = 0.006 (index 0.003), κ = 0.01, and `sector` = normalised hourly change of the linked market index (fish price, lumber price, wholesale activity, property index), λ = 0.3. Weekly dividend 0.4% of value. Trade fee 0.5% each way (`fee`). Random draws come from the saved `rng.market` stream, so reloading does not change outcomes |
| 3.5 | Fines and fees | Traffic fine $40, job damage fines (Annex C), tow $40, licence fees (section 4.4) |

## 4. Items (`data/items.js`)

```js
{ id:'item.fish.trout', name:'Trout', category:'fish', unit:'kg', weight:1, base:1400,  // cents
  perishable:{ freshDays:1, coldDays:4 }, stack:999, tags:['lake','premium'] }
```

### 4.1 Produce chain items

| Id | Unit | Base price | Source | Notes |
|---|---|---|---|---|
| `item.fish.carp` | kg | $4 | lake, pond | |
| `item.fish.perch` | kg | $6 | lake | |
| `item.fish.bass` | kg | $10 | lake | |
| `item.fish.pike` | kg | $12 | lake (reeds, deep) | |
| `item.fish.trout` | kg | $14 | lake (rocks, inlet, deep) | premium |
| `item.fish.mackerel` | kg | $5 | ocean | |
| `item.fish.cod` | kg | $9 | ocean | |
| `item.fish.snapper` | kg | $14 | ocean | premium |
| `item.fish.tuna` | kg | $22 | ocean ground C | premium |
| `item.fish.shrimp` | kg | $16 | ocean trawl | premium |
| `item.fish.crab` | kg | $18 | crab pots | premium |
| `item.fish.lobster` | kg | $34 | crab pots (rare) | premium |
| `item.food.fishfillet` | kg | $17 | filleting (1 kg fish → 0.6 kg) | |
| `item.food.smokedfish` | kg | $24 | smokehouse | |
| `item.wood.log_pine` | m³ | $55 | logging | weight 600 |
| `item.wood.log_spruce` | m³ | $65 | logging | weight 550 |
| `item.wood.lumber` | bundle | $95 | sawmill (1 log + $15 milling → 1 bundle) | weight 350 |
| `item.wood.firewood` | bundle | $6 | sawmill offcuts | |

### 4.2 Ingredients and trade goods (wholesale)

| Id | Unit | Base | Used by |
|---|---|---|---|
| `item.ing.produce` | portion | $0.60 | food businesses |
| `item.ing.meat` | portion | $1.60 | food businesses |
| `item.ing.bread` | portion | $0.30 | food businesses |
| `item.ing.dairy` | portion | $0.50 | food businesses |
| `item.ing.fish` | portion | $2.00 | food businesses; 1 kg of any non-premium fish converts to 4 portions on transfer into a food business |
| `item.ing.fish_premium` | portion | $3.50 | 1 kg premium fish → 4 portions |
| `item.ing.coffee` | dose | $0.35 | cafe |
| `item.ing.beverage` | bottle | $0.70 | vending, food |
| `item.ing.snack` | pack | $0.60 | vending, retail |
| `item.goods.grocery` | basket unit | $2.00 | supermarket, general stores |
| `item.goods.household` | unit | $4.00 | supermarket, retail |
| `item.goods.clothing` | unit | $12 | retail |
| `item.goods.electronics` | unit | $60 | retail |
| `item.goods.tools` | unit | $18 | retail (hardware) |
| `item.goods.souvenir` | unit | $3 | retail (ocean, lake) |
| `item.goods.tackle` | unit | $6 | retail (tackle), hut |
| `item.goods.bait` | tub | $1 | fishing |
| `item.parts` | unit | $25 | repairs, mechanic |
| `item.fuel` | litre | $1.60 | vehicles, boats |
| `item.mat.concrete` | pallet | $40 | construction |
| `item.mat.brick` | pallet | $50 | construction |
| `item.mat.steel` | bundle | $90 | construction |
| `item.mat.glass` | crate | $70 | construction |
| `item.mat.fixtures` | crate | $110 | construction, fit-outs |

### 4.3 Personal items and tools (retail prices)

| Id | Price | Effect |
|---|---|---|
| `item.food.sandwich` | $6 | hunger +35 |
| `item.food.meal` | $14 (restaurant) | hunger +80, energy +5 |
| `item.food.coffee_cup` | $3 | energy +12 |
| `item.tool.rod_basic` / `rod_pro` / `rod_master` | $35 / $240 / $900 | tension zone ×1.0 / 1.25 / 1.5; max fish 4 / 12 / 40 kg |
| `item.tool.keepnet` / `cooler` | $20 / $90 | fish storage 10 kg / 60 kg cold |
| `item.tool.axe` / `chainsaw` | $40 / $380 | own-account logging |
| `item.tool.toolbox` | $120 | self-repair at the garage |
| `item.tool.camera` | $150 | photo mode jobs |
| `item.gear.backpack` | $60 | carry capacity 25 → 40 kg |

### 4.4 Licences (bought at City Hall or the relevant POI; `opex.license`)

| Id | Price | Grants |
|---|---|---|
| `lic.fishing_commercial` | $150 | Unlimited fish sales, +10% fish sale price |
| `lic.boat` | $250 | Operate passenger boats; skipper commercial vessels |
| `lic.driver_commercial` | $300 | Trucks (`veh.boxtruck`, `veh.logtruck`) |
| `lic.business` | $100 per business | Required by `biz.create` (included in startup costs below) |
| `lic.logging` | $400 | Own-account logging and `biz.logging` |
| `lic.food` | $200 | Food businesses (cart, cafe, restaurant) |

## 5. Markets, inventory, skills, needs

### 5.1 Markets (`sim/market.js`)

| Market | POI | Buys from player | Sells | Notes |
|---|---|---|---|---|
| `mkt.city.wholesale` | `poi.city.wholesale` | fish (−10% vs fish markets), lumber, firewood | all `item.ing.*`, `item.goods.*`, `item.parts`, `item.mat.*`, bulk fuel | Bulk lots; delivery to city businesses for 4% |
| `mkt.lake.fish` | `poi.lake.store` | lake fish, fillets, smoked fish | lake fish, bait | Small stock: prices move quickly |
| `mkt.ocean.seafood` | `poi.ocean.seafood` | all fish (ocean species at full price, lake species at −5%) | all fish | Largest fish market |
| `mkt.forest.sawmill` | `poi.forest.sawmill` | logs | lumber, firewood; milling service | |

### 5.2 Price model

For market *m* and item *i*: `stock`, `target`, `base`, elasticity `k` (0.5 staples and goods, 0.8 fish, 0.6 wood and materials).

```
mid   = base × clamp((target / max(stock, 0.1·target))^k, 0.5, 2.2) × season(i, day)
buy   = round(mid × 1.12)        // player pays
sell  = round(mid × 0.88)        // player receives
```

- Trades are priced in slices of 5% of `target`, recomputing `mid` after each slice, so large trades move the price against the trader.
- Hourly update: `stock += npcSupply(i, hour) − npcDemand(i, hour, regionActivity)`, then `stock += (target − stock) × 0.02`. NPC businesses (the diner, Lakeside Grill, FreshWay, stalls) are part of `npcDemand`; the trawlers and loggers that are not the player's are part of `npcSupply`.
- `season(i, day) = 1 + a_i · sin(2π · day / 28 + φ_i)` with `a` up to 0.12.
- Perishables: fish held outside a cold container lose grade after `freshDays` (sell price × 0.6) and are removed after twice that. Cold containers (coolers, holds, business fridges, warehouses with the cold-room upgrade) use `coldDays`.
- Retail shops are not markets: fixed price = current wholesale `mid` × 1.30, unlimited stock, no price impact.

### 5.3 Inventory (`sim/inventory.js`)

Containers have a weight capacity and optional `cold` flag: `player` (25 kg), `veh:<id>` (cargo capacity of the model), `prop:<id>` (storage by property), `biz:<id>` (by type and upgrades), `unit:<id>` (a vending machine's 60 items, a boat's hold). `Inventory.move` requires both containers to be within 10 m of the player or linked by a business delivery policy. Quantities are integers in the item's unit.

### 5.4 Skills (`sim/skills.js`)
Job skills: Annex C §1.1. Global skills: `skill.driving` (XP per km without collision; +2% tyre grip assist and −3% fuel use per level), `skill.boating` (docking assist cone, −3% fuel), `skill.management` (XP per business-day of profit; +1 staff slot per 3 levels, −1% wages per level, unlocks manager policies at L3), `skill.fitness` (XP by running and carrying; +2% carry capacity and −2% energy drain per level).

### 5.5 Needs (`sim/needs.js`, P1, light)

| Need | Drain | Restore | Effect |
|---|---|---|---|
| Energy 0–100 | −4 per waking game hour, plus task energy | Sleep: +12.5 per hour in a hostel bed, +14 in a rented or owned home (× 1 + 0.3·comfort). Coffee +12 | < 20: job timing windows −20%, sprint disabled. 0: the player passes out, wakes at home or the hostel 6 h later, pays `fee` $30 if at the hostel |
| Hunger 0–100 | −3.5 per game hour | Food items; eating at any food business (pays that business) | < 20: energy drains 1.5× faster. 0: energy cap 50 |

Sleep runs the clock at scale 120 until the chosen wake time. Housing cost: hostel $18 per night, rented room $32 per day, owned home free.

## 6. Business framework (`sim/business/`)

### 6.1 Concepts
- A **business** is an instance of a type (section 7) at a **site** (a leased or owned premises), or siteless (vending route, delivery, fishing, logging, rental company) with **units** at sites.
- A business has **products** (with recipes), **inventory**, **staff**, **units** (machines, vehicles, boats, equipment), **upgrades**, **policies**, a ledger account, and stats.
- The sim runs every business each game hour whether or not the player is nearby. When the player is within 150 m, sales are visualised: customers walk in (`npc:customer`), staff NPCs work, units move.
- The player can work in an owned business using the matching job controller (`staffAssist`): that hour's capacity rises by one skilled worker and quality by the player's score.

### 6.2 Data model

```js
/** @typedef {Object} Business
 * @property {string} id            'b3'
 * @property {string} typeId        'biz.cafe'
 * @property {string} name
 * @property {string|null} siteId   main premises
 * @property {number} tier          1..3
 * @property {number} createdDay
 * @property {{from:number,to:number,days:number[]}} hours
 * @property {number} reputation    0..1, starts 0.5
 * @property {Array<{id:string, price:number, ref:number, active:boolean}>} products
 * @property {Array<Staff>} staff   {id,name,role,skill:1..5,wage,morale:0..1,hiredDay,unitId?}
 * @property {Array<Unit>} units    {id,kind:'machine'|'vehicle'|'boat'|'equipment',modelId,siteId?,condition:0..1,stock?:Object,staffId?}
 * @property {string[]} upgrades
 * @property {{autoRestock:{enabled:boolean,targets:Object,source:string}, pricing:'manual'|'auto', managerId:string|null, reinvestPct:number}} policies
 * @property {{payables:number, lossCarry:number}} finance
 * @property {{hour:Object, today:Object, days:Object[]}} stats   // days: last 28 daily reports
 */
/** @typedef {Object} DailyReport  day, revenue, cogs, payroll, opex, tax, profit, customers, lost, stockouts, avgQuality, reputation */
```

### 6.3 Sites (`data/businesses.js`, positions in Annex B §9)

```js
{ id:'site.city.food.02', kinds:['biz.cafe','biz.restaurant'], district:'city.downtown',
  footfall:[2,2,2,2,3,8,30,70,90,60,55,95,110,80,50,45,55,80,95,85,60,35,15,5],  // passers-by per hour 0..23
  leasePerDay:26000, deposit:200000, buyPrice:3120000, area:140, seatsMax:40 }
```

Footfall profiles are derived from Annex B §8 densities × a site factor, then multiplied at runtime by weekday (Sat 1.25, Sun 1.1 for leisure sites; × 0.5 on weekends for office sites), weather (rain 0.7, storm 0.4; beach and lake leisure sites 0.25 in rain) and `regionActivity` (0.8–1.3, a slow index raised by player-driven deliveries, taxi and ferry trips, construction progress, forest health).

### 6.4 Hourly simulation (`simulateHour(b, ctx)`)

```
if closed this hour: accrue fixed costs only; return
F         = site.footfall[hour] × weekdayMult × weatherMult × regionActivity × (1 + marketing)
quality   = clamp(0.25·equipment + 0.45·staffSkillAvg + 0.20·freshness + 0.10·cleanliness + assistBonus, 0, 1.2)
appeal    = 0.4 + 0.6 × (0.6·quality + 0.4·reputation)
for each active product p:
    priceMult = price ≤ 2.5·ref ? clamp((ref / price)^ε, 0, 1.6) : 0        // ε per type, section 7
    demand_p  = stochasticRound(F × capture × share_p × appeal × priceMult)
capacity  = min(staffThroughput, physicalCapacity)                           // per type
sales     = allocate(demand, capacity, stock by recipe)                      // proportional when constrained
revenue   = Σ sales_p × price_p        → one transfer ext:customers → biz:<id>, type sale.goods
cogs      = Σ recipe cost at average inventory cost (inventory decremented)
lost      = Σ demand − Σ sales
reputation += 0.02·(served/demand − 0.85) + 0.01·(quality − 0.5) − 0.03·[stockout]   (clamped 0..1)
accrue payroll for staff on duty; accrue utilities = type.utilPerHour × open
unit wear, breakdown rolls, alerts (stockout, breakdown, lowCash, staff)
```

`stochasticRound(x)` = floor(x) + (rng < frac(x)). Daily close at 00:00: pay accrued payroll (`payroll`), lease (`rent.paid`), utilities and site fees (`opex.*`), spoilage, staff morale update, auto-restock orders, daily report, `biz:daily`.

### 6.5 Staff and automation

| Aspect | Rule |
|---|---|
| Candidates | Each business has a pool of 4–6 generated candidates per role, refreshed every 2 days: `{name, role, skill 1–5, wageAsk}`. `wageAsk = roleBase × (0.8 + 0.12·skill)` |
| Role base wages per hour | cashier/clerk $12, server $12.50, barista $13, cook $15, maintainer $14, driver $15, fisher/deckhand $15, skipper $20, logger $17, forklift operator $15, attendant $12.50, manager $24 |
| Throughput | Per role per hour × `(0.7 + 0.1·skill)`: cook 18 dishes, server 14 covers, barista 28 tickets, cashier 30 customers, clerk 16 customers, maintainer 12 machine visits per day, driver per route, attendant 8 rentals |
| Morale | Starts 0.7. +0.02 per day paid on time, +0.05 on a raise, −0.1 per unpaid day, −0.03 per day of overload (demand > 1.3 × capacity). Below 0.3 the employee quits (`biz:alert staffQuit`) |
| Shifts | Staff work the business's open hours up to 10 h per day; longer hours need more staff per role (computed, shown in the UI) |
| Manager | With a manager and `skill.management` ≥ 3: auto-restock to targets, auto-pricing (holds price within ±10% of `ref` following stock), auto-rehire, auto-repair. Without a manager: optional basic auto-restock with a 10% delivery surcharge |
| Player-free operation | A business with all required roles filled and auto-restock on runs without the player |

### 6.6 Cash shortfalls and closure
If `biz:<id>` cannot pay an obligation, the amount is added to `finance.payables` and retried daily. Payables older than 3 days suspend the business (no sales). `biz.close` sells equipment and units at resale value (section 6.7), pays payables, and returns the balance to the owner (`equity.out`); a remaining deficit must be paid by the owner before closure completes.

### 6.7 Valuation and sale
Equipment and fit-out resale = 50% of cost; units = vehicle/boat used value (section 10) or 60% for machines; inventory at market sell price. A profitable business can be sold as a going concern for `assets + 6 × average weekly profit` to `ext:buyers`.

### 6.8 Upgrades and tiers
Each type has upgrades `{id, cost, requires, effect}` and three tiers. Tier-ups are bought as upgrades and gated by lifetime revenue and `skill.management`. Effects modify the framework parameters only (capacity, quality terms, capture, cost multipliers, new products, automation), so one implementation serves all types.

## 7. Business types

"Typical" columns are design targets at about 75% utilisation, tier 1, competently run; bots tune footfall and capture to hit them (±35%).

| Type | Startup (incl. licences) | Fixed per day | Required staff | Typical revenue / day | Typical net / day | Payback |
|---|---|---|---|---|---|---|
| `biz.vending` | $450 per machine + $100 once | $4–$15 site fee per machine | none (owner restocks) or maintainers | $95 per machine | $45 per machine | 10 days |
| `biz.foodstand` | cart $2,400 + $300; truck $16,000 | pitch $25 | 1 operator (owner or staff) | $520 (cart), $1,700 (truck) | $180 / $700 | 13 / 23 days |
| `biz.cafe` | $14,000 + $300 | lease $110, utilities $30 | 2 baristas | $1,450 | $640 | 22 days |
| `biz.restaurant` | $38,000 + $300 | lease $260, utilities $90 | 3 cooks, 3 servers | $4,300 | $1,650 | 23 days |
| `biz.fishing` | skiff $3,800 + gear $300 + $250; trawler $85,000 | berth $10 / $60 | 1 fisher; trawler: skipper + 2 deckhands | $330 / $4,800 | $150 / $3,800 | 28 / 22 days |
| `biz.delivery` | used van $6,500 + $100 | parking $10 | 1 driver per vehicle | $420 per van | $220 per van | 30 days |
| `biz.retail` | $22,000 fit-out + $4,000 stock + $100 | lease $150, utilities $25 | 2 clerks | $2,600 | $820 | 32 days |
| `biz.boatrental` | dock $3,000 + boats $2,100 + $100 | upkeep $20 | 1 attendant | $380 (weather-dependent) | $200 | 26 days |
| `biz.logging` | $30,160 (licence, lease, used log truck, saws) | lease fee $5 per m³ | 2 loggers + 1 driver | $1,620 | $810 | 37 days |
| `biz.warehouse` | $60,000 purchase or lease $420 per day | utilities $40 | 1 forklift operator | $960 storage rent + own-use savings | $770 + savings | 78 days (strategic) |
| `biz.supermarket` | $180,000 | utilities $250, shrink 1% | 10 (6 cashiers/stockers per shift, 1 manager) | $16,000 | $3,100 (4,400 with own warehouse) | 58 / 41 days |
| `biz.rental` | price of properties + $100 | upkeep 0.4% of rent | none (agent fee 8% optional) | 2.0% of property value | 1.6% of value | 60 days |

### 7.1 `biz.vending` — Vending machine route (P0, the first business)

| Aspect | Spec |
|---|---|
| Units | `prop.vending_machine` placed at a free `site.vend.*` (40 sites; fee and footfall vary). Machine: 60 items over 2 product columns (snack ref $1.50, beverage ref $2.00), ε = 1.2 |
| Player loop | Buy a machine at BuildRight or by phone → choose a site (walk there, place it with the build ghost) → buy stock at wholesale → carry stock to the machine, `E` to restock (`holdRing`), `E` to collect cash (machine cash is part of `biz:<id>`; collecting is only a visit that resets the "full cash box" flag which halts sales at $400) → set prices per machine in the app |
| Breakdowns | Condition falls 1% per day; below 0.5 jam chance 5% per hour (sales stop). Repair: visit (`sequence` minigame) or maintainer |
| Staff | Maintainer: restocks, collects, repairs 12 machines per day; needs a business vehicle (`veh.van` or any car) |
| Upgrades | `vend.card_reader` $120 per machine (capture +15%), `vend.telemetry` $600 (stock levels in the app, optimal route list), `vend.cooler` $200 per machine (beverage ref +$0.30), `vend.hotfood` $700 per machine (third product: hot snack ref $3.50, cost $1.20), `vend.branding` $1,500 (reputation floor 0.6) |
| Tiers | T1 route (1–4 machines) → T2 company at 5 machines ($1,200: storage depot, bulk discount 10%, hire maintainers) → T3 regional at 20 machines ($9,000: exclusive premium sites in the office tower, terminal and campus-like locations with 2× footfall; second depot in Port Calder) |
| Supply link | Stock from `mkt.city.wholesale`; own `biz.warehouse` supplies at cost |

### 7.2 `biz.foodstand` — Food cart and food truck (P1)

Pitches `site.cart.*`. Products: hot dog ($4.50; meat 1, bread 1), fish roll ($6; fish 1, bread 1), fries ($3; produce 1), soft drink ($2.50; beverage 1), coffee ($3; coffee 1). ε = 1.4. The operator (owner via a short serving loop reusing diner primitives, or 1 staff) is the capacity (40 sales per hour). A truck (`veh.boxtruck` variant, drivable) can move between pitches per day and adds a second serving window. Upgrades: grill plate, fridge (fish freshness), signage, second pitch licence. Tier 3 = fleet of trucks with a commissary kitchen.

### 7.3 `biz.cafe` (P1)

Sites `site.city.food.*`, `site.lake.food.01`, or own building. Fit-out: counter, espresso machine (tiers: 1-group 28 tickets/h, 2-group 55, 3-group 80), 5–12 tables. Products: coffee $3.20, latte $4.20 (coffee 1, dairy 1), pastry $3.50 (bread 1, dairy 1), sandwich $6.50 (bread 1, produce 1, meat 1), juice $3.80 (produce 2). ε = 1.5. Upgrades: better machine, pastry oven (pastry quality), terrace seating (+8 seats in clear weather), loyalty cards (reputation gain × 1.5), roastery (coffee cost −30%). Tier 3: chain (second and third location share brand reputation).

### 7.4 `biz.restaurant` (P1)

| Aspect | Spec |
|---|---|
| Premises | `site.city.food.*`, lake and ocean food sites, `prop_28` beach bar, or own building ≥ 120 m². Interior template `int.diner` or a player-built interior |
| Equipment | Kitchen stations: grill, fryer, oven, prep, cold room. Each station has a tier 1–3 (cost $2,500 / $6,000 / $14,000) raising dishes per cook-hour and the `equipment` quality term. Dining: tables (4 seats, $350 each) up to `seatsMax` |
| Menu | Player picks up to 8 dishes from the recipe book and sets prices. Initial book: burger $9 (meat, bread, produce), fish and chips $11 (fish, produce, bread), grilled premium fish $18 (fish_premium, produce, dairy), pasta $8 (bread, dairy, produce), steak $19 (meat ×2, produce), salad $7 (produce ×2, dairy), soup $5 (produce, dairy), dessert $5 (dairy, bread), drinks $2.50 (beverage). ε = 1.6 |
| Stock | Ingredients ordered from wholesale, the fish markets, or transferred from the owner's fishing business (no spread: valued at market sell price for P&L). Fridge capacity limits freshness |
| Staff | Cooks (dish throughput), servers (cover throughput), optional dishwasher (cleanliness term), manager |
| Capacity | `min(cooks × 18 × skill, servers × 14 × skill, seats × turnsPerHour(1.2))` |
| Reviews | Each day a review score = f(quality, wait, price fairness) is posted; `biz:alert review`; reputation follows |
| Upgrades | Station tiers, more tables, decor ($3,000: appeal +0.05), terrace, delivery service (adds 20% demand, needs `biz.delivery` or a 15% platform fee), signature seafood menu (requires premium fish supply contract; +25% ticket) |
| Tiers | T2 at lifetime revenue $150k: second dining room; T3: franchise locations |
| Supply link | Fishing → fish markets → restaurant; own fishing business → restaurant directly; logging has no link; warehouse lowers ingredient cost 12% |

### 7.5 `biz.fishing` (P1)

Units are boats with crews. Each crewed boat runs a daily trip in the hourly sim: `catchKg = boat.catchRate × hoursFished × crewSkill × groundRichness × weatherFactor`, species mix by ground. Boats: `boat.rowboat` (owner-operated only), `boat.skiff` (1 fisher, 45 kg per day, lake or inshore), `boat.console` (2 crew, 120 kg), `boat.trawler` (3 crew, 800 kg per trip). Costs: fuel by hours, crew wages, berth fees (`site.ocean.berth.*`, lake docks), net wear. Landings go to the business cold store, then per policy: sell at the best market (auto), hold for price, transfer to own restaurants/stalls, or sell at an own seafood stall (`site.ocean.stall.*`, retail price = mid × 1.25, limited demand 60 kg per day per stall). Ground richness falls when total daily landings exceed the ground's quota and recovers 5% per day (anti-farming and supply realism). Upgrades: sonar (+15%), ice machine (cold days +2), bigger nets, smokehouse (fish → smoked fish), processing room (fillets). The player may skipper any own boat using the fishing job controllers; that trip uses the player's actual catch.

### 7.6 `biz.delivery` (P1)

Units: `veh.moto_125` (20 kg, 6 parcels), `veh.van` (800 kg, 30 parcels), `veh.boxtruck` (3 t, freight). Contracts appear on a board (`Sim.select('biz.contracts')`): local parcel rounds (per-parcel fee), business restock runs (wholesale → NPC shops, per-run fee), inter-region freight (fish from Port Calder to the city, lumber from the sawmill to BuildRight; per-kg-km fee, trucks only). Each driver + vehicle completes `routesPerDay` by vehicle class and `skill`; revenue per contract minus fuel, wages, wear. The player can drive any contract with the courier controller. Internal logistics: when the owner's other businesses restock, an own delivery unit with spare capacity carries it (removes the 4% wholesale delivery fee and the 10% auto-restock surcharge). Tiers: T2 depot yard (`site.city.yard.*`, 6+ vehicles, dispatcher role +20% routes), T3 regional hub (freight contracts with the terminal and the supermarket chain).

### 7.7 `biz.retail` (P1)

A store sells one **assortment** chosen at creation and changeable for a refit fee: `convenience` (snack, beverage, grocery, household), `tackle` (tackle, bait, tools), `clothing`, `electronics`, `hardware` (tools, materials at retail), `souvenir`. Shelves hold stock per product (shelf capacity by fit-out tier). Demand uses the framework with ε = 2.0 (1.3 for convenience). Margin comes from wholesale → retail (ref = wholesale base × 2.0; convenience × 1.6). Location fit: site tags multiply share (tackle at the lake ×2.5, souvenir at the marina and beach ×3, electronics downtown ×1.5). Upgrades: more shelving, window display, security (shrink 2% → 0.5%), online orders (needs delivery). Staff: clerks.

### 7.8 `biz.boatrental` (P2)

Dock sites `site.lake.dock.*`, `site.ocean.dock.01`. Units: rowboats ($400), kayaks ($250), skiffs ($3,800), pedal boats ($600). Hourly demand = leisure footfall × weather factor (clear 1.0, cloudy 0.7, rain 0.1, storm 0); each rental occupies a unit for 1–2 hours at the set hourly price (ref: rowboat $12, kayak $10, skiff $30). Boats wear and occasionally need rescue (handled by the attendant; an unattended incident costs a repair). The owner can work the dock with the boat-rental controller.

### 7.9 `biz.logging` (P2)

Requires `lic.logging`, a timber lease (`site.forest.lease.*`: stand with a regrowing volume and a per-m³ fee), tools, and a truck. Crew output per day = loggers × 12 m³ × skill × standHealth, limited by truck trips (`veh.logtruck` 14 m³ per trip, trips per day by distance and driver). Logs are sold to the sawmill, milled into lumber for a fee and sold to wholesale or BuildRight, or kept for the owner's construction. Sustainability: harvesting above the stand's weekly quota reduces `standHealth`; paying for replanting (or doing forestry tasks) restores it. Upgrades: second saw team, skidder, portable mill (lumber on site, +30% value), haul contract.

### 7.10 `biz.warehouse` (P2)

Premises `site.city.wh.*` (400 pallet slots, tier 2: 900, tier 3: 2,000 + cold room). Income: (a) rent slots to NPC firms: occupancy trends to `clamp(1.3 − price/ref, 0, 0.95)` of the slots offered, at the daily slot price (ref $4); (b) own storage for bulk trading: buy when `mid` is low, sell when high, bounded by the spread, price impact and perishability; (c) supply own businesses at cost with the 12% bulk discount. Staff: forklift operators (in/out throughput 60 pallets per operator-day). Upgrades: racking tiers, cold room, loading bays (throughput), security.

### 7.11 `biz.supermarket` (P2)

Premises `site.city.super.01` or the purchase of an NPC store late-game. 5 departments (grocery, produce, dairy and meat, household, beverages and snacks) with shelf capacity and backroom stock; shelves must be stocked from the backroom by stockers (staff or the player's supermarket job loop) for sales to happen. Demand: district population × share by price index (average of department price ratios), quality and stock coverage; ε = 1.3. Checkout capacity = cashiers × 30 customers per hour. Shrink 1% of stock per day. Upgrades: self-checkouts (+60 customers per hour, $18,000), bakery and fish counter (uses own fish; +8% share), loyalty programme, second store in Port Calder.

### 7.12 `biz.rental` — Property rental company (P2)

Wraps the owner's rented-out properties (section 8.4) in one business account: collects rents, pays upkeep and property tax from the business, hires an agent (8% of rent) who fills vacancies and handles repairs. Tier 2 (5 properties): bulk maintenance discount; tier 3 (12 properties): may buy whole apartment blocks and develop plots commercially (section 9.6).

## 8. Property (`sim/property.js`)

### 8.1 Model
```js
{ id:'prop_5', kind:'flat'|'house'|'cabin'|'commercial'|'boathouse', region, district, poi, name,
  basePrice, value, interior:'int.apartment_m', storageKg, garageSlots, berthSlots,
  comfortBase, furnitureGrid:[w,d], owner:'npc'|'player', lease:null|{tenant:'player'|'npc', rentPerDay, since}, rentOut:null|{rentPerDay, occupied:boolean} }
```

### 8.2 Listings (initial)

| Ids | Property | Price | Notes |
|---|---|---|---|
| — | Hostel bed (`poi.city.hostel`) | $18 per night | Not a property; sleep only |
| `lease_room_1` | Old Town room (rent only) | $32 per day, deposit $64 | Storage 60 kg |
| `prop_1`, `prop_2` | Northgate studio | $16,000 | 1 parking space |
| `prop_3`, `prop_4` | Northgate one-bedroom | $26,000 | |
| `prop_5`, `prop_6` | Riverside loft (bridge view) | $58,000 | |
| `prop_7`, `prop_8` | Downtown tower flat | $95,000 | Listed when the construction site reaches stage 5 |
| `prop_9`…`prop_14` | Eastside houses | $70,000–$120,000 | Garage 2 |
| `prop_15`…`prop_18` | Lake cabins | $22,000–$38,000 | Dock berth 1 |
| `prop_19` | Old Boathouse | $48,000 | 3 berths; fishing business base |
| `prop_20` | Pinehaven shop unit | $30,000 | Commercial |
| `prop_21`…`prop_25` | Seagrass Row houses | $85,000–$160,000 | Waterfront, berth 1 |
| `prop_26`, `prop_27` | Port Calder flats | $24,000 | |
| `prop_28` | Coco's Beach Bar | $65,000 | Commercial food site |
| `prop_29`…`prop_31` | Forest cabins | $14,000–$20,000 | |
| `plot_1`…`plot_4` | Lakeview Lots | $9,000 each | 24 × 24 m, residential |
| `plot_5`…`plot_7` | Clifftop lots | $28,000 each | 30 × 24 m, `plot_5` mixed-use |
| `plot_8`…`plot_10` | Ridge Lots | $4,500 each | 30 × 30 m, residential |
| `plot_11`, `plot_12` | Eastside lots | $15,000 each | 24 × 30 m, mixed-use |
| `site.*` commercial units | buy instead of lease | 120 × daily lease | |

### 8.3 Buying, selling, value
Purchase pays `purchase.property` from `bank:checking` or cash. Sale to `ext:buyers` at 92% of current value (8% transaction cost prevents flipping). Value updates daily: `value ← value × (1 + 0.0004 + 0.0012·N(0,1) + 0.0006·(regionActivity − 1))` plus improvements (furniture comfort and, for plots, the building, section 9.5).

### 8.4 Renting out
`prop.setRentOut(propId, rentPerDay)`: market rent = `value × 0.02 × (0.8 + 0.4·comfort)` per day. A tenant arrives within 1–3 days if the asking rent ≤ market rent; above it, the chance per day falls linearly to 0 at 1.4×. Rent is paid daily to `bank:checking` (`rent.received`) or to the rental business. Upkeep 0.4% of rent; random repairs ($50–$400). The owner cannot use a property while it is let; ending a tenancy takes 2 days' notice.

### 8.5 Home
One owned or leased residential property is `home`: sleep, storage, garage (vehicles can be delivered there by phone for $10), respawn point. Comfort 0–1 = `comfortBase` + furniture score (section 9.4).

## 9. Construction and furnishing (`sim/construction.js`, `game/build.js`)

### 9.1 Grid and placement
- Plots have a local grid of **2 m cells**; storey height **3 m**; up to 3 levels. Origin at the plot's south-west corner; `gx` east, `gz` south, `gy` level.
- Structural pieces snap to cells (foundations, floors, roofs, stairs) or to cell edges (walls, doors, windows, fences). Rotation in 90° steps.
- Furniture snaps to a 0.5 m sub-grid inside rooms, rotation 90° (15° with the free-rotate modifier).
- Build mode (`Input` context `build`): orbit camera over the plot or first-person; ghost preview green/red; `LMB` place, `RMB` remove, `R` rotate, `Q/E` level down/up, `Tab` catalogue, `G` grid toggle, `M` material.

### 9.2 Piece catalogue (`data/pieces.js`)

| Piece id | Size | Cost | Material variants (cost multiplier) |
|---|---|---|---|
| `piece.foundation` | 2 × 2 cell slab | $60 | concrete |
| `piece.floor` | 2 × 2 | $45 | wood planks 1.0, tile 1.3, concrete 0.9 |
| `piece.wall` | 2 m edge × 3 m | $80 | timber clapboard 1.0, log 1.2, brick 1.4, plaster 1.1, stone 1.6 |
| `piece.wall_window` | edge | $140 | same variants; window styles sash / picture / shuttered |
| `piece.wall_door` | edge | $160 | same variants; door styles panel / glazed / barn |
| `piece.wall_glass` | edge, full glazing | $260 | steel frame, timber frame |
| `piece.wall_garage` | 2 edges (4 m) roller door | $600 | |
| `piece.pillar` | cell corner | $50 | timber, steel, stone |
| `piece.stairs` | 1 × 2 cells, one level | $300 | wood, steel |
| `piece.roof_flat` | 2 × 2 | $70 | membrane, deck (walkable) |
| `piece.roof_gable` | 2 × 2 slope piece | $95 | shingle 1.0, red metal 1.1, clay tile 1.4 |
| `piece.roof_ridge`, `piece.roof_gable_end` | | $60 | as roof |
| `piece.porch_deck` | 2 × 2 | $55 | wood |
| `piece.railing` | edge | $35 | wood, steel, glass |
| `piece.chimney` | cell | $450 | stone, brick |
| `piece.fence` | edge | $25 | picket, timber, chain-link, hedge |
| `piece.gate` | edge | $90 | |
| `piece.dock_section` | 2 × 2 over water (waterfront plots) | $180 | timber |
| `piece.path` | 2 × 2 ground | $20 | gravel, paver |
| `piece.garden_bed`, `piece.tree_planting` | cell | $30 / $120 | species |

Furniture (`piece.furn.*`, cost, comfort category and points): bed single $180 (sleep 2), bed double $420 (sleep 4), sofa $350 (seat 3), armchair $160 (seat 1), dining table set $380 (dine 3), kitchen counter $300, stove $450, fridge $500 (kitchen 2 each; fridge is cold storage 40 kg), bathroom set $900 (bath 5), wardrobe $220 (storage +40 kg), shelf $90 (storage +15 kg), desk $200 (work 2), lamp $45, ceiling light $60 (light 1 each), rug $110, plant $35, painting $80, TV $600 (decor/leisure), fireplace $900 (cosy 4), workbench $260 (unlocks tool repair at home), fish tank $240. Commercial furniture reused by business fit-outs: counter, shelving, table, espresso machine, grill.

### 9.3 Validation (`Construction.validate(plot, action)` → `Result`)
1. Inside the plot's buildable rectangle (1-cell setback from the boundary; dock pieces only on the water side of waterfront plots).
2. No overlap with an existing piece in the same slot.
3. Support: foundations on terrain with slope ≤ 15% (auto-levelled visually); floors at level 0 need a foundation; walls need a floor or foundation edge below; upper floors need a wall or pillar under at least 2 corners within 2 cells; roofs need a wall or pillar below; stairs need a floor at both ends.
4. Removal must not leave dependants unsupported (rejected with the list, or cascade when the player confirms).
5. Piece count ≤ 600 per plot; furniture ≤ 200 per property.
6. Funds available (`build.piece`). Removal refunds 70% (`build.refund`).

### 9.4 Derived values
- **Rooms**: flood-fill of floor cells enclosed by walls and covered by a roof or upper floor.
- **Habitable** = at least one room ≥ 3 cells with a door to the outside and a full roof.
- **Comfort** = `min(1, Σ category scores capped per category (sleep 4, kitchen 4, bath 5, seat 4, dine 3, light 3, decor 4, cosy 4) / 31)`.
- **Building value** = `1.25 × Σ piece costs` if habitable, else `0.6 ×`. Property value = land value + building value + 0.5 × furniture cost.

### 9.5 Save format
`plots[plotId].pieces` is an array of tuples `[typeIndex, gx, gy, gz, rot(0–3), materialIndex]`; `furniture` is `[typeIndex, x2, level, z2, rot24]` with positions in half-metre units and rotation in 15° steps. Type and material indices refer to the ordered lists in `data/pieces.js`; new entries are only ever appended.

### 9.6 Rendering and commercial development
- Rendering: `bld.player_built` builder creates one `InstancedMesh` per piece type × material for the plot (rebuilt on `build:changed`, time-sliced); colliders are generated from pieces (walls as boxes, floors as decks, stairs as ramps).
- Mixed-use plots: a habitable building with a ground-floor room ≥ 60 m² and a `piece.wall_glass` or door facing the road can be registered as `site.custom.<plotId>` for `biz.cafe`, `biz.retail` or `biz.restaurant` (≥ 120 m²), with footfall from the plot's district and no lease.
- A finished house can be let (section 8.4) or sold.

## 10. Vehicles: ownership economy (`data/vehicles.js`, `sim/vehiclesEcon.js`)

| Model | Class | Price new | Used price | Top speed (m/s) | Tank (L) | Use (L/km) | Cargo (kg) | Seats | Licence |
|---|---|---|---|---|---|---|---|---|---|
| `veh.moto_125` | motorcycle | $1,400 | $650 | 24 | 8 | 0.03 | 20 | 1 | — |
| `veh.moto_cafe` | motorcycle | $5,200 | — | 42 | 13 | 0.045 | 10 | 1 | — |
| `veh.hatch_used` | car | — | $1,800 | 34 | 40 | 0.07 | 150 | 4 | — |
| `veh.sedan` | car | $9,500 | $5,200 | 44 | 55 | 0.08 | 200 | 4 | — |
| `veh.pickup` | car | $14,000 | $8,000 | 40 | 70 | 0.11 | 600 | 2 | — |
| `veh.coupe` | car | $32,000 | — | 58 | 60 | 0.10 | 80 | 2 | — |
| `veh.van` | delivery van | $12,500 | $6,500 | 36 | 70 | 0.11 | 800 | 2 | — |
| `veh.boxtruck` | truck | $28,000 | $15,000 | 30 | 120 | 0.20 | 3,000 | 2 | `lic.driver_commercial` |
| `veh.logtruck` | truck | $46,000 | $24,000 | 26 | 200 | 0.32 | 14 m³ logs | 2 | `lic.driver_commercial` |
| `boat.rowboat` | fishing boat | $400 (+$500 outboard) | — | 2 / 5 | 5 | 0.10 | 150 | 2 | — |
| `boat.skiff` | fishing boat | $3,800 | $2,200 | 14 | 25 | 0.25 | 300 | 3 | — |
| `boat.console` | boat | $18,000 | — | 22 | 150 | 0.60 | 600 | 5 | — |
| `boat.trawler` | commercial vessel | $85,000 | $52,000 | 6 | 1,200 | 2.5 | 800 (cold hold) | 4 | `lic.boat` |
| `boat.workboat` | commercial vessel | $160,000 | — | 6 | 2,000 | 3.5 | 10,000 | 3 | `lic.boat` |
| `boat.ferry` | commercial vessel | $60,000 | — | 10 | 400 | 1.2 | 12 passengers | 2 | `lic.boat` |

| Aspect | Rule |
|---|---|
| Purchase | At dealers (`poi.city.dealer`, `poi.city.usedcars`, `poi.ocean.marine_dealer`) or via the Vehicles app (delivery fee $50). `purchase.vehicle`. Colour choice from 8 paints |
| Fuel | Consumption by distance × throttle factor (0.7–1.6). Refuel at pumps (`fuel`, $1.60 per litre; boat fuel docks $1.80). Empty tank: engine cuts; phone tow $40 or carry a jerry can (20 L) |
| Condition | 1.0 new. Wear −0.5% per 10 km; collision damage from impulse. < 0.5: power −15%, smoke; < 0.25: stall chance. Repair at the garage or boatyard: `(1 − condition) × priceNew × 0.08` (`repair`), discounted by `skill.city.mechanic` |
| Used value | `priceNew × (0.45 + 0.35·condition) × max(0.5, 1 − odoKm/4000)` |
| Parking | Vehicles stay where left (saved). Home garage or berth slots let the phone deliver one for $10. Paid city lots are free in v1; illegal parking has no penalty |
| Business use | A vehicle or boat can be assigned to a business as a unit (ownership stays with the player; running costs are paid by the business) |
| Keys and access | Only owned, company-provided (during a shift) or business-unit vehicles can be driven. Traffic and parked NPC vehicles cannot be taken |

## 11. Tick order and determinism

`Sim.tickMinute(t)` runs, in this fixed order: (1) needs (every 10 min); (2) job shift timers; then on the hour: (3) markets; (4) businesses in id order; (5) securities; then at 00:00: (6) business daily close; (7) property values, rents, tenancies; (8) bank interest and instalments (Monday), taxes (Monday); (9) weather seed step; (10) notifications; (11) autosave flag. Each module draws only from its own RNG stream (`rng.sim`, `rng.jobs`, `rng.market`), so adding draws in one module does not change another's results. Fast-forward (sleep) calls the same function repeatedly with rendering paused.

## 12. `Sim.cmd` reference

All return `Result`. Money arguments are cents. Errors: `ERR.INSUFFICIENT_FUNDS`, `ERR.NOT_FOUND`, `ERR.INVALID_ARG`, `ERR.REQUIREMENT` (licence, skill, tier), `ERR.CAPACITY`, `ERR.NOT_OWNER`, `ERR.OUT_OF_RANGE` (player not near), `ERR.CLOSED`, `ERR.BUSY`, `ERR.LIMIT`.

| Command | Args | Effect |
|---|---|---|
| `bank.deposit` / `bank.withdraw` | `{amount}` | cash ↔ checking (needs bank or ATM range) |
| `bank.transfer` | `{from, to, amount}` | between own bank accounts |
| `bank.takeLoan` | `{amount, weeks, toAccount?}` | |
| `bank.repayLoan` | `{loanId, amount}` | |
| `invest.buy` / `invest.sell` | `{secId, qty}` | |
| `market.buy` | `{marketId, itemId, qty, toContainer, payFrom?}` | priced by slices |
| `market.sell` | `{marketId, itemId, qty, fromContainer, payTo?}` | |
| `shop.buy` | `{poiId, itemId, qty}` | retail items, tools, licences |
| `inv.move` | `{from, to, itemId, qty}` | |
| `inv.use` | `{itemId}` | eat, drink, equip |
| `needs.sleep` | `{untilHour}` | requires a bed |
| `job.apply` / `job.quit` | `{jobId}` | |
| `job.startShift` / `job.endShift` | `{jobId}` / `{}` | |
| `job.nextTask` | `{shiftId}` | returns a task descriptor |
| `job.reportTask` | `{shiftId, taskId, score, units?, tip?}` | validated; accrues pay and XP |
| `biz.create` | `{typeId, name, siteId?, options?}` | pays startup costs from `payFrom` |
| `biz.close` / `biz.sell` | `{bizId}` | |
| `biz.setHours` | `{bizId, from, to, days}` | |
| `biz.setPrice` / `biz.setProductActive` | `{bizId, productId, price}` / `{…, active}` | |
| `biz.hire` / `biz.fire` / `biz.setWage` | `{bizId, candidateId, role}` / `{bizId, staffId}` / `{…, wage}` | |
| `biz.assign` | `{bizId, staffId, unitId}` | crew to boat, driver to van, maintainer to route |
| `biz.order` | `{bizId, itemId, qty, source}` | manual restock |
| `biz.setPolicy` | `{bizId, patch}` | auto-restock, pricing, manager, reinvest |
| `biz.buyUpgrade` | `{bizId, upgradeId, unitId?}` | |
| `biz.addUnit` / `biz.removeUnit` | `{bizId, modelId or vehId, siteId?}` / `{bizId, unitId}` | vending machine, vehicle, boat, equipment |
| `biz.restockUnit` / `biz.collectUnit` / `biz.repairUnit` | `{bizId, unitId, …}` | on-site actions |
| `biz.acceptContract` | `{bizId, contractId}` | delivery, fish supply |
| `biz.deposit` / `biz.withdraw` | `{bizId, amount}` | `equity.in` / `equity.out` |
| `biz.staffAssist` | `{bizId, hours, score}` | called by job controllers in own business |
| `prop.buy` / `prop.sell` | `{propId, payFrom?}` | |
| `prop.lease` / `prop.endLease` | `{leaseId}` | as tenant |
| `prop.setRentOut` | `{propId, rentPerDay or null}` | |
| `prop.setHome` | `{propId}` | |
| `site.lease` / `site.buy` / `site.release` | `{siteId, bizId?}` | |
| `build.place` / `build.remove` / `build.paint` | `{plotId, type, gx, gy, gz, rot, mat}` … | |
| `furn.place` / `furn.remove` | `{propId or plotId, type, x2, level, z2, rot}` | |
| `build.registerSite` | `{plotId, kind}` | commercial development |
| `veh.buy` / `veh.sell` | `{modelId, used, colour, payFrom?}` / `{vehId}` | |
| `veh.refuel` | `{vehId, litres}` | at a pump |
| `veh.repair` | `{vehId}` | at garage or boatyard |
| `veh.deliver` / `veh.tow` | `{vehId}` | phone services |
| `tax.payArrears` | `{amount}` | |
| `note.read` / `note.clear` | `{id}` | |
| `settings.set` | `{path, value}` | not part of the save |
| `debug.grant`, `debug.setTime` | | QA only; sets `meta.cheated` |

## 13. `Sim.select` reference

| Selector | Returns |
|---|---|
| `player.summary` | `{cash, checking, savings, netWorth, day, weekday, hour, minute, job, home, energy, hunger}` |
| `ledger.balances` | `{[accountId]: cents}` for player and business accounts |
| `ledger.transactions` `{account?, type?, limit?}` | `Tx[]` |
| `reports.pnl` `{scope:'player' or bizId, period:'day'|'week'|'month', offset?}` | `{revenue, cogs, payroll, opex, tax, profit, byType, series[]}` derived from ledger totals |
| `reports.netWorth` | `{total, breakdown:{cash, bank, businesses, vehicles, property, inventory, securities, loans}, history[]}` |
| `reports.cashflow` `{days}` | daily in/out series by category |
| `bank.state` | accounts, loans, credit score, loan offers |
| `invest.state` | securities with price, change, holdings, history |
| `market.listing` `{marketId}` | `[{itemId, buy, sell, stock, trend}]` |
| `shop.listing` `{poiId}` | retail items with prices |
| `inv.container` `{id}` | `{cap, used, items:[{itemId, qty, freshness}]}` |
| `jobs.list` | all jobs with requirements, open hours, estimated pay, skill level, hired flag |
| `jobs.current` | active shift state or null |
| `skills.all` | `[{id, level, xp, next}]` |
| `needs.state` | `{energy, hunger}` |
| `biz.list` | summaries of owned businesses |
| `biz.detail` `{bizId}` | full `Business` + today's stats + alerts + capacity breakdown + demand per product |
| `biz.types` | catalogue with startup costs, requirements, unlocked flag |
| `biz.sites` `{typeId}` | available sites with footfall chart data, lease and price |
| `biz.candidates` `{bizId}` | hireable candidates |
| `biz.upgrades` `{bizId}` | available and owned upgrades |
| `biz.contracts` `{bizId}` | open and active contracts |
| `prop.listings` `{region?, kind?}` | for-sale and for-lease properties |
| `prop.owned` | owned and leased properties with value, comfort, tenancy |
| `build.plot` `{plotId}` | pieces, furniture, rooms, habitable, value, comfort |
| `build.catalog` | pieces and furniture with costs |
| `veh.owned` | vehicles with fuel, condition, location, value |
| `veh.dealer` `{poiId}` | stock with prices |
| `notes.list` | notifications |
| `time.now` / `weather.now` | clock and weather |
| `tutorial.state` | current onboarding step |

## 14. Balance targets (verified by headless bots in `test/sim/bots/`)

Real time assumes scale 1 with sleep skipping (about 20 real minutes per game day). Tolerance ±35%.

| Milestone | Target real time | Game day | Bot strategy |
|---|---|---|---|
| First wage paid | ≤ 6 min | 1 | `courier` |
| $250 cash (rod, bait, a few nights' lodging) | 15–20 min | 1 | `courier` |
| First business: one vending machine with stock | 35–50 min | 2–3 | `courier` → `vendor` |
| First vehicle (`veh.moto_125` used, $650) | 45–70 min | 3–4 | |
| Net worth $1,000 | 60–80 min | 4 | |
| Five machines or a food cart | 2.5 h | 8 | `vendor` |
| Net worth $10,000 | 4–5.5 h | 13–16 | `vendor`, `angler-trader` |
| Cafe opened | 6–7 h | 19–21 | `cafe-owner` |
| First owned property (studio) | 7–9 h | 22–27 | |
| Restaurant opened | 10–12 h | 30–36 | `restaurateur` |
| Net worth $100,000 | 14–18 h | 42–54 | `diversifier` |
| Net worth $1,000,000 | 40–55 h | 120–165 | `tycoon` |

Guard rails: best job at L10 ≤ 2.6× best job at L1; any single business's payback ≥ 8 game days; passive income never exceeds 25% of net worth per week; a player who only works jobs reaches $10,000 in 9–12 h (businesses must be clearly better, not mandatory).

## 15. Anti-exploit rules (each has a test in `test/sim/exploit.test.mjs`)

| # | Rule | Test |
|---|---|---|
| 1 | Buy price > sell price for every item in every market at all times (12% / 12% spread), and trades move the price against the trader | Random buy-then-sell loops over 10,000 iterations never increase net worth |
| 2 | Cross-market arbitrage is bounded: transport capacity, spread and price impact make the profit per trip finite and decreasing | Bot shuttling fish between markets earns less per hour than the fishing job after 3 trips |
| 3 | No money is created except by `ext:*` transfers with a defined type; `Ledger.checkInvariant()` is asserted after every test command | Invariant |
| 4 | Job pay requires sim-issued task ids, minimum durations and one report per task | Replay and fabricated ids rejected |
| 5 | No idle income from jobs; shifts end after 8 h | AFK bot earns 0 |
| 6 | RNG state is saved; reloading cannot re-roll markets, securities, candidates, fish or weather | Save → act → reload → act gives identical results |
| 7 | Property and business resale below purchase value (8% cost; 50% fit-out resale); build refunds 70% | Buy-sell loops lose money |
| 8 | Loans capped by net worth excluding the loan proceeds; savings rate < loan rate | Borrow-and-save loses money |
| 9 | Prices settable only within [0.2×, 3×] of `ref`; demand is 0 above 2.5× | Extreme prices produce no revenue |
| 10 | Internal transfers between own businesses are valued at market sell price in P&L and cannot exceed real inventory | Transfer loop does not change consolidated net worth |
| 11 | Fishing grounds and timber stands deplete and recover; market targets cap how much product the world absorbs per day | Unlimited farming bot sees falling returns |
| 12 | Integers only; all percentage maths rounds toward the house (player pays rounded up, receives rounded down) | Fuzz test finds no fractional cents |
| 13 | Sleep fast-forward uses the same tick functions | Determinism test (MASTER_SPEC §9.4, criterion 9) |
| 14 | Debug grants mark the save `cheated` and are excluded from balance tests | Flag set |
