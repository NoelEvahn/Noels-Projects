// Tutorial flow (Annex F 10 onboarding, first 15 minutes): data only. sim/tutorial.js evaluates it, Stage 5 UI reads it.
// A step is done when its `done` condition holds. Conditions (all JSON, no code):
//   { ev: 'job:shiftEnd', min: 1, where: { 'summary.tasks': { gte: 1 } } }  bus event seen `min` times since the tutorial began, payload paths matched
//   { signal: 'moved', min: 12 }   same, for game-side signals forwarded with Sim.cmd('tutorial.signal') (player:step -> 'moved', ui:open -> 'ui:open')
//   { sel: 'liquid', gte: 35000 }  a tutorial selector (see SELECTORS in sim/tutorial.js): gte, lte, gt, lt, eq, truthy
//   { ack: true }                  the UI called Sim.cmd('tutorial.ack') for this step (coach mark dismissed)
//   { any: [...] } / { all: [...] }
// Steps run in order; a step whose condition is already true when it becomes current completes at once, so out-of-order play never blocks.
// `ui` holds selectors for the Stage 5 coach marks: `coach` (HUD element id), `app` (phone app id), `waypoint` (poi ids), `prompt` (input action).
// Money is integer cents; the player starts with $100 (BALANCE.startCash).
export const TUTORIAL_STEPS = [
  { id: 'tut.move', title: 'Look around', body: 'You arrive with $100. Move with WASD, look with the mouse, hold Shift to run.', ui: { coach: 'hud.minimap', prompt: 'move' }, done: { signal: 'moved', min: 12 } },
  { id: 'tut.jobs', title: 'Find work', body: 'Open the phone, choose Jobs and set a waypoint to Swift Parcel or Marlowe\'s Diner.', ui: { app: 'phone.jobs', coach: 'hud.phone', waypoint: ['poi.city.depot', 'poi.city.diner'] }, done: { any: [{ signal: 'ui:open', where: { screen: 'scr.phone.jobs' } }, { sel: 'employer', truthy: true }, { ev: 'job:shiftStart', min: 1 }] } },
  { id: 'tut.shift', title: 'Work your first shift', body: 'Start a shift at the employer, finish at least one task and end the shift to get paid.', ui: { coach: 'hud.job', waypoint: ['poi.city.depot', 'poi.city.diner'], prompt: 'interact' }, done: { ev: 'job:shiftEnd', min: 1, where: { 'summary.tasks': { gte: 1 } } } },
  { id: 'tut.summary', title: 'Gross, tax and net', body: 'Your pay is the gross amount minus 10% income tax withheld. Tips come on top and are not taxed.', ui: { coach: 'scr.shiftsummary' }, done: { any: [{ ack: true }, { sel: 'checking', gt: 0 }] } },
  { id: 'tut.bank', title: 'Deposit at the ATM', body: 'Banked money earns savings interest and pays for card purchases. Deposit some cash at an ATM, then check the Finance app.', ui: { app: 'phone.finance', coach: 'hud.cash', waypoint: ['poi.city.bank'] }, done: { sel: 'checking', gt: 0 } },
  { id: 'tut.goal', title: 'Buy your first vending machine', body: 'A machine costs $450 plus a $100 business licence. Save up, buy one, and place it at a site.', ui: { app: 'phone.business', coach: 'hud.goal', waypoint: ['poi.city.hardware'] }, done: { sel: 'vendingUnits', gte: 1 } },
  { id: 'tut.income', title: 'Restock and earn', body: 'Buy stock at wholesale, restock the machine, set prices, and wait for the first hourly sale.', ui: { app: 'phone.business', coach: 'hud.business', waypoint: ['poi.city.wholesale'] }, done: { ev: 'biz:hourly', min: 1, where: { 'report.revenue': { gte: 1 } } } },
];
/** one-shot hints fired when their condition first holds (any time during or after the steps); they never block the flow */
export const TUTORIAL_TIPS = [
  { id: 'tip.needs', title: 'Energy and hunger', body: 'Energy and hunger drain over time. Eat at the diner or supermarket; sleep at the hostel or at home.', ui: { coach: 'hud.needs' }, when: { any: [{ sel: 'energy', lt: 40 }, { sel: 'hunger', lt: 40 }] } },
  { id: 'tip.bizhub', title: 'The Business hub', body: 'With $350 you can start a vending route. Open Business in the phone for sites, prices and stock.', ui: { app: 'phone.business', coach: 'hud.phone' }, when: { sel: 'liquid', gte: 35000 } },
  { id: 'tip.goals', title: 'Next goals', body: 'Optional goals: your first vehicle, a fishing licence, five machines, your first property.', ui: { coach: 'hud.notifications' }, when: { sel: 'vendingUnits', gte: 1 } },
];
