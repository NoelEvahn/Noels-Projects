// All economy tunables (Annex D). Money in integer cents. Owned by Stage 4; bots tune these.
export const BALANCE = {
  startCash: 10000,
  // taxes (Annex D 3)
  incomeTax: 0.10, businessTax: 0.12, propertyTaxWeekly: 0.0015, arrearsRateWeekly: 0.04, lossCarryWeeks: 4,
  fishAllowanceKgPerDay: 10, fineTraffic: 4000, fineTow: 4000,
  // bank (Annex D 2)
  savingsDaily: 0.0005, loanMinCents: 50000, loanNetWorthPct: 0.40, loanTerms: [4, 8, 12], loanRateWeekly: 0.02, loanRateWeeklyBest: 0.016, loanRateWeeklyWorst: 0.024,
  loanMinIncomeDays: 3, lateFee: 2500, creditStart: 600, creditMin: 300, creditMax: 850, missedForSeize: 3,
  // markets (Annex D 5.2)
  spread: 0.12, sliceFraction: 0.05, priceClamp: [0.5, 2.2], mktReversion: 0.02, shopMarkup: 1.30, wholesaleDeliveryPct: 0.04,
  // inventory
  playerCapKg: 25, backpackCapKg: 40, interactRange: 10,
  // needs (Annex D 5.5)
  energyDrainPerHour: 4, hungerDrainPerHour: 3.5, sleepHostelPerHour: 12.5, sleepHomePerHour: 14, passOutFee: 3000, passOutHours: 6,
  hostelNight: 1800, roomPerDay: 3200, roomDeposit: 6400,
  // jobs (Annex C 1)
  shiftMaxMinutes: 480, skillMultPerLevel: 0.07, maxSkill: 10, xpBase: 100, xpExp: 1.5, tipCap: 0.6,
  lowEnergy: 20,
  // business framework (Annex D 6)
  priceMin: 0.2, priceMax: 3.0, demandPriceCap: 2.5, staffSlotsBase: 3, candidatePool: [4, 6], candidateRefreshDays: 2,
  closeSellPct: 0.5, machineResalePct: 0.6, goingConcernWeeks: 6, payablesSuspendDays: 3, autoRestockSurcharge: 0.10,
  repGain: 0.02, vendingCashBoxMax: 40000, maxBusinesses: 40, maxStaff: 300,
  // property (Annex D 8)
  propertySellPct: 0.92, propertyDrift: 0.0004, propertyVol: 0.0012, propertyActivity: 0.0006, rentValuePct: 0.02, upkeepPctOfRent: 0.004,
  // construction (Annex D 9)
  buildRefundPct: 0.70, maxPieces: 600, maxFurniture: 200, furnitureValuePct: 0.5, habitableMult: 1.25, shellMult: 0.6,
  // vehicles (Annex D 10)
  fuelPrice: 160, boatFuelPrice: 180, vehDeliveryFee: 5000, vehHomeDeliver: 1000, repairRate: 0.08, wearPer10km: 0.005, jerryLitres: 20,
  // investments (Annex D 3.4)
  invMu: 0.00004, invSigma: 0.006, invSigmaIndex: 0.003, invKappa: 0.01, invLambda: 0.3, invFee: 0.005, dividendWeekly: 0.004,
  // region activity
  activityMin: 0.8, activityMax: 1.3,
};
