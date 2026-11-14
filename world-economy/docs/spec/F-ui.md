# Annex F — User interface

Owner: Stage 5 (Opus). DOM + CSS overlay above the WebGL canvas. Contract: MASTER_SPEC §5.10. The UI holds no game state: it reads `Sim.select`, writes `Sim.cmd`, listens to the bus.

## 1. Visual language

| Token | Value |
|---|---|
| Mood | Dark glass over the world: calm, premium, legible. No cartoon chrome, no gradients on text, no emoji |
| Surfaces | `--panel: rgba(16,19,24,.74)` + `backdrop-filter: blur(18px) saturate(1.2)`; fallback `rgba(16,19,24,.92)` when blur is unsupported or quality is Low. Raised `rgba(28,32,40,.86)`. Hairline `1px rgba(255,255,255,.08)` |
| Text | `--text: #F2F4F7`, secondary `#A9B1BD`, disabled `#6B7380` |
| Accents | Money gold `#E8B54A`; positive teal `#3CC8B4`; negative coral `#FF6B5E`; info blue `#6FA8FF`; warning amber `#F2A33A` |
| Type | UI `Inter`, display `Sora` (Google Fonts, `display=swap`), fallback `system-ui, sans-serif`. Sizes 12/13/15/18/24/36. Money and all changing numbers use `font-variant-numeric: tabular-nums` |
| Shape and space | 8 px grid; radii 6 (controls), 10 (cards), 16 (panels, phone 28); shadows `0 12px 40px rgba(0,0,0,.45)` |
| Motion | 160 ms ease-out for hover/press, 240 ms for panels (translate 12 px + fade). Respect `prefers-reduced-motion` |
| Icons | Inline SVG sprite drawn by us (`ui/kit/icons.js`, about 70 icons, 1.5 px stroke) |
| Money format | `$1,234.50`; compact `$12.4k`, `$1.2M` on HUD; negatives coral with a minus sign |
| Sound | Every control uses `sfx.ui.*` (Annex E §6.1) |

## 2. Architecture (`src/ui/`)

| Part | Rule |
|---|---|
| `kit/h.js` | `h(tag, props, ...children)` DOM helper; `bind(el, selectorName, args, events[], render)` re-renders only when one of the listed bus events fires and the selected data changed (shallow compare) |
| Layers | `#hud` (pointer-events none except controls), `#world-prompts`, `#phone`, `#screens` (modal stack), `#toasts`, `#overlay` (fades, loading), `#debug` (perf HUD) |
| Modal stack | `UI.open(scr)` pushes; `Esc` pops; a blocking screen sets `Input.setContext('ui')` and releases pointer lock; closing the last one restores the previous context and re-requests pointer lock inside the same key/click event |
| Updates | HUD values update on events, not per frame; animated counters tween with `requestAnimationFrame` only while changing. DOM writes are batched; budget ≤ 0.5 ms per frame |
| CSS | One stylesheet per area in `ui/styles/`, inlined by the build. No CSS framework |
| No platform dialogs | Never `alert/confirm/prompt`. Use `kit/dialog.js` |

## 3. Component list (`ui/kit/`)

Button (primary, secondary, ghost, danger, icon), Toggle, Slider (with numeric readout), Stepper, Select, SegmentedControl, Tabs, TextInput, NumberInput (money-aware), Checkbox, Card, StatTile (label, value, delta), Table (sortable, sticky header, virtualised above 100 rows), List/ListItem, Badge, ProgressBar, Meter (zones), Sparkline, LineChart, BarChart, StackedBar, Donut (charts drawn on `<canvas>` 2D by `kit/charts.js`), Dialog (confirm, input), Toast, Tooltip, KeyHint (renders the bound key or button), Avatar, PriceTag, MoneyDelta, EmptyState, Skeleton, MapCanvas, PhoneFrame, AppIcon, WidgetHost (job widgets, section 7).

## 4. Screens

`scr.*` ids are passed to `UI.open`. "Reads" lists selectors; "Writes" lists commands (Annex D §12–13). Every screen refreshes on the listed events.

| Screen id | Purpose and layout | Reads | Writes | Refresh events |
|---|---|---|---|---|
| `scr.menu` | Main menu over a live slow camera drift of the world (static gradient until the world is ready). Title, Continue, New Game, Load, Import Code, Settings, Credits. Loading progress bar with stage text | `Save.slots()` | `Save.apply`, new game | `save:*` |
| `scr.pause` | `Esc`: Resume, Save, Load, Export Code, Settings, Controls, Quit to Menu | `Save.slots()` | `Save.write/read` | |
| `scr.saveload` | 3 slots + autosave cards (day, net worth, play time, date); Export Code (text area + Copy), Import Code (paste or file input) | `Save.*` | `Save.*` | `save:*` |
| `scr.settings` | Tabs: Graphics, Audio, Controls, Gameplay, Accessibility. Graphics shows the preset selector and every option of Annex G §3.1 with live apply, plus current fps and governor state | `settings` | `settings.set`, `Quality.apply`, `Input.rebind` | `settings:changed`, `quality:changed` |
| `scr.character` | Player card: name, outfit colours, needs bars, skills list with XP bars, licences, lifetime stats (earned, distance, fish caught, logs cut) | `player.summary`, `skills.all`, `needs.state` | outfit (`settings`) | `skill:*`, `needs:changed` |
| `scr.inventory` | Left: player container grid by category with weight bar; right: the nearby container (vehicle, home, business, machine) for transfers; item detail with Use, Move, Sell hint | `inv.container` ×2 | `inv.move`, `inv.use` | `inv:changed` |
| `scr.phone` | Phone frame with app grid (section 5.3). On width ≥ 1100 px it slides up at the right and the world stays visible; below that it is a centred sheet | — | — | |
| `scr.bank` (app and bank counter) | Accounts with balances; Deposit, Withdraw (only in range of bank/ATM, otherwise disabled with a reason), Transfer; Loans tab (offers, schedule, repay); Transactions tab (filter by type, account) | `bank.state`, `ledger.balances`, `ledger.transactions` | `bank.*` | `ledger:tx`, `bank:changed` |
| `scr.finance` | Financial reports: net-worth chart and breakdown donut; income statement (player or any business; day, week, month); cash-flow bars by category; tax due | `reports.netWorth`, `reports.pnl`, `reports.cashflow` | `tax.payArrears` | `time:day`, `ledger:tx` (throttled 1 s) |
| `scr.invest` | Securities table with sparkline, holdings, buy/sell ticket with fee preview | `invest.state` | `invest.buy/sell` | `time:hour` |
| `scr.jobs` | Job list by region with requirements, hours, estimated pay, skill level; detail card with "Set waypoint", Apply, Quit; current job panel | `jobs.list`, `jobs.current`, `skills.all` | `job.apply`, `job.quit` | `job:*`, `skill:*` |
| `scr.shift_summary` | End-of-shift sheet: tasks, grade, gross, tax, tips, net, XP gained, level-ups | `job:shiftEnd` payload | — | |
| `scr.biz_hub` | Business list cards (today's revenue, profit, alerts), total daily profit, "Start a business" | `biz.list` | — | `biz:*`, `time:hour` |
| `scr.biz_new` | Wizard: type (cost, requirements) → site (map with footfall chart per site, lease vs buy) → name and funding source → confirm with cost breakdown | `biz.types`, `biz.sites` | `biz.create`, `site.lease/buy` | |
| `scr.biz_detail` | Tabs: **Overview** (KPIs, hourly chart, alerts, reputation, capacity bars); **Products** (price steppers with demand hint and margin, active toggles); **Stock** (levels, order form, auto-restock targets, source); **Staff** (roster, wage, morale, candidates, hire/fire, assignments); **Units** (machines, vehicles, boats: status, site, condition, stock, assign, add/remove); **Upgrades**; **Finance** (P&L, account balance, deposit/withdraw, payables); **Settings** (hours, policies, rename, sell/close) | `biz.detail`, `biz.candidates`, `biz.upgrades`, `biz.contracts`, `reports.pnl` | all `biz.*` | `biz:changed`, `biz:hourly`, `biz:alert` |
| `scr.market` | Market listing: item, buy price, sell price, stock trend arrow, quantity stepper with total and price-impact preview; source/destination container picker | `market.listing`, `inv.container` | `market.buy/sell` | `market:updated`, `inv:changed` |
| `scr.shop` | Retail shop UI (supermarket, hardware, tackle, furniture, licences): grid of items with price, owned count, Buy | `shop.listing` | `shop.buy` | |
| `scr.property` | Tabs: Listings (filters, photo = live render thumbnail, price, features, "Set waypoint", Buy/Lease), Owned (value, comfort, tenancy, set home, rent out with suggested rent, sell) | `prop.listings`, `prop.owned` | `prop.*` | `prop:changed` |
| `scr.build` | Construction HUD (not modal): bottom catalogue bar with categories, piece cards and cost; top-left plot budget (spent, value, comfort, habitable flag); validation message near the ghost; undo last; material palette | `build.catalog`, `build.plot` | `build.*`, `furn.*` | `build:changed` |
| `scr.vehicles` | Owned vehicles: location, fuel, condition, value; Set waypoint, Deliver, Tow, Assign to business, Sell | `veh.owned` | `veh.*`, `biz.addUnit` | `veh:changed` |
| `scr.dealer` | Showroom: model list with stats bars (speed, cargo, economy), new/used, colour swatches, price, Buy | `veh.dealer` | `veh.buy` | |
| `scr.fuel` | Pump UI: litres slider, price, Fill | `veh.owned` | `veh.refuel` | |
| `scr.garage` | Repair quote, Repair; self-repair option with skill | `veh.owned` | `veh.repair` | |
| `scr.map` | Full map (section 5.2) | `World.pois`, `biz.list`, `prop.owned`, `veh.owned` | waypoint (UI state) | |
| `scr.notifications` | Notification centre: grouped list with actions (open business, set waypoint) | `notes.list` | `note.read/clear` | `note:new` |
| `scr.sleep` | Wake-time picker, shows cost and energy gain; fade and clock spin during fast-forward | `needs.state`, `time.now` | `needs.sleep` | |
| `scr.tutorial` | Non-blocking coach marks driven by `tutorial.state` | `tutorial.state` | — | |
| `scr.dialog.npc` | Short NPC conversation card (manager hire/quit, customer) with 1–3 choices | controller data | `job.*` | |

## 5. HUD, map, phone

### 5.1 HUD (`ui/hud/`)

| Element | Position | Content and binding |
|---|---|---|
| Wallet | top-right | Cash (gold), bank total (small), animated `MoneyDelta` on every `ledger:tx` touching `cash` or checking |
| Clock | top-right under wallet | Day, weekday, time, weather icon; speed indicator when fast-forwarding |
| Needs | top-right, compact | Energy and hunger bars; pulse below 20 |
| Minimap | bottom-left, 200 px circle (160 px below 1100 px width) | Section 5.2 |
| Region label | under minimap | District name on `player:district`, fades after 4 s |
| Interaction prompt | bottom-centre | KeyHint + text from `interact:focus` |
| Job tracker | top-left | From `JobController.getHud()` at 10 Hz: title, objective, timer, shift earnings, widgets (section 7) |
| Vehicle cluster | bottom-right, when driving | Speed, gear, RPM arc, fuel, condition warning, cargo; boats: speed in knots, throttle, heading |
| Business ticker | right edge, optional | Small pills for `biz:hourly` income and `biz:alert` |
| Toasts | top-centre, max 3 | `ui:toast`, `note:new` |
| Banner | top | Persistent notices: storage unavailable, pointer-lock fallback active |
| Perf HUD | top-left when F3 | Annex G §5 |
| Crosshair dot | centre | Only on foot in pointer-lock mode |

### 5.2 Minimap and map (`ui/kit/mapCanvas.js`)
- A base map bitmap (2048² for the 4000 m world, about 0.51 px per metre) is drawn once to an offscreen canvas from layout data: water, land tint by region, parks, roads by class, bridges, building footprints, docks, labels at 3 zoom levels. Redrawn only when `world:placementsChanged` adds buildings.
- Minimap: rotates with heading (north-up option), draws the base map around the player plus dynamic markers: player arrow, waypoint and route polyline (`World.route`), active job targets, owned vehicles, owned businesses with alert dots, nearby POI icons. Updated at 15 Hz.
- Full map: pan (drag), zoom (wheel, 3 levels), POI filter chips (jobs, shops, fuel, businesses, properties, docks, fish spots), click a POI for a card (name, hours, "Set waypoint"), legend, region labels. Fast travel is not offered (travel is gameplay) except "Take the bus" between `transit` POIs for $3 with a time skip.

### 5.3 Phone apps

| App | Opens | Badge |
|---|---|---|
| Bank | `scr.bank` | — |
| Finance | `scr.finance` | tax due |
| Jobs | `scr.jobs` | — |
| Business | `scr.biz_hub` | alert count |
| Market | `scr.market` in read-only price mode when not at a market | — |
| Property | `scr.property` | vacancy |
| Vehicles | `scr.vehicles` | low fuel |
| Map | `scr.map` | — |
| Invest | `scr.invest` | — |
| Messages | `scr.notifications` | unread |
| Profile | `scr.character` | level-up |
| Settings | `scr.settings` | — |

## 6. Input handling

### 6.1 Default bindings (rebindable; stored in `settings.controls`)

| Action | Keyboard / mouse | Gamepad (P2) |
|---|---|---|
| Move | `W A S D` | left stick |
| Look | mouse | right stick |
| Sprint / walk | `Shift` / `Ctrl` | L3 |
| Jump | `Space` | A |
| Interact / enter vehicle | `E` (`F` alternative) | X |
| Primary / secondary | LMB / RMB | RT / LT |
| Camera toggle first/third | `V` | R3 |
| Phone | `Tab` or `P` | D-pad up |
| Map | `M` | Back |
| Inventory | `I` | D-pad right |
| Pause | `Esc` | Start |
| Vehicle: throttle, brake/reverse, steer | `W`, `S`, `A/D` | RT, LT, left stick |
| Vehicle: handbrake, horn, lights, reset | `Space`, `H`, `L`, hold `R` | A, L3, D-pad left, Y hold |
| Boat: throttle up/down, rudder | `W/S` (sticky throttle), `A/D` | RT/LT, left stick |
| Job aux | `Q`, `E`, `R`, `F`, `T`, `G`, `1–5` | bumpers, D-pad |
| Build: place, remove, rotate, level, catalogue | LMB, RMB, `R`, `Q/E`, `Tab` | A, B, X, bumpers, Y |
| Perf HUD / debug HUD | `F3` / `F4` | — |
| Screenshot-clean HUD | `F2` | — |

### 6.2 Pointer lock and fallbacks
1. Pointer lock is requested only inside the Start/Resume click or the key event that closes the last UI layer; the promise or `pointerlockerror` is handled.
2. If refused or unavailable: **drag-look mode**. Hold RMB (or LMB on empty world) and drag to look; arrow keys also turn the camera (`Q/E` stay free for job actions); the camera auto-follows behind vehicles; a banner explains the mode with a "Try pointer lock" button.
3. Losing lock (`Esc` by the browser) opens `scr.pause`.
4. Fullscreen button in settings, called inside the click, refusal tolerated silently.
5. Touch (P2, Stage 6): left virtual stick, right-side look drag, context buttons (interact, jump, sprint, phone), vehicle pedals; job widgets are tappable.
6. When any text input has focus, game key handling is suspended.

## 7. Job widgets (`ui/hud/widgets/`)

Renderers for the widget types of Annex C §1.3, driven only by the descriptor objects from `getHud()`:

| Type | Descriptor fields | Rendering |
|---|---|---|
| `timingBar` | `pos 0..1, zone:[a,b], perfect:[a,b]` | Horizontal bar, moving marker, zones |
| `holdRing` | `progress 0..1, label` | Ring filling around the KeyHint |
| `tensionBar` | `value, zone:[a,b], danger, label` | Vertical bar with moving safe zone; red flash near limits |
| `sequence` | `keys:[...], index, rhythm?` | Row of KeyHints, current highlighted, beat pulse |
| `balance` | `offset −1..1, limit` | Bubble level |
| `tickets` | `[{id, title, items[], patience 0..1, table?}]` | Stack of order cards with patience bars |
| `route` | `stops:[{label, done, timerSec}], comfort?, fragile?` | Stop list + meters; map markers |
| `gauge` | `value, target, min, max, unit` | Dial or depth strip with target band |
| `sortLanes` | `item:{icon,label}, lanes:[{key,label}]` | Item card with lane hints |
| `document` | `kind, data` | Full in-world monitor UI (invoice match, ledger sort, typing, mail) |
| `inspect` | `hotspots found/total, options?` | Reticle + choice list |
| `checklist` | `[{label, done}]` | Task list |

## 8. Responsive rules

| Width | Behaviour |
|---|---|
| ≥ 1440 | Full layout; phone docked right; business detail uses 2 columns |
| 1100–1439 | Same, tighter paddings |
| 768–1099 (tablet) | Minimap 160 px; phone and screens are centred sheets at 92% width; tables collapse secondary columns into expandable rows; charts stack |
| < 768 | Not a target; a notice suggests a wider window, the game still runs |

No horizontal scrolling at any supported width; long tables scroll inside their card.

## 9. Accessibility and options

UI scale 85–130%; colour-blind-safe status (icons and text accompany colour); subtitles for audio cues in job minigames (bite, burn, knock) as on-screen icons; hold-to-toggle options for sprint and reel; reduced camera shake; reduced motion; configurable minigame timing leniency (Standard, Relaxed +25%) that does not affect pay.

## 10. Onboarding flow (first 15 minutes)

1. Arrive at the bus terminal with $100: coach mark for look and move.
2. Phone tutorial: open Jobs, set a waypoint to Swift Parcel or Marlowe's.
3. Complete a first shift; shift summary explains gross, tax, net.
4. Bank: deposit at the ATM; Finance app shows the first transactions.
5. Lodging: hostel or keep going; needs explained when energy first drops below 40.
6. Goal card: "Buy your first vending machine ($450)". Business hub explained when cash ≥ $350.
7. After the first machine: restock, set price, see the first hourly income tick; tutorial ends and the notification centre takes over with optional goals (first vehicle, fishing licence, five machines, first property).
