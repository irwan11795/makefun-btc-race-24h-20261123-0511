// cbBTC 24h race bot — washout + range, long only.
//
// Two legs share a single position slot:
//  - Washout: after a -4% slide over the last 4 hours, buy all-in and hold
//    to the end of the window (the harness flattens the position). The only
//    early exits are a -3% stop and a 500-bar time cap.
//  - Range: on calmer tape, a close 60 bps under its 90-bar average buys a
//    quarter of the cash. It exits on +80 bps, on a reclaim of the average
//    plus 60 bps, on a -120 bps stop (which retires the leg for the race),
//    or after 360 bars.
// The range leg is gate insurance: it earns on flat days when the washout
// leg never fires, so the bot still clears the dev gate (net PnL > $0).
//
// Everything is bigint arithmetic. The bot reads nothing but the bars the
// harness sends: no clock, no network, no randomness, no files.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const CBBTC = 'CBBTC';
const SLIP_BPS = 100;
const BPS = 10000n;

// One place for every tuned number.
const CFG = {
  washoutTriggerBps: -400n,
  washoutStopBps: 300n,
  washoutMaxBars: 500,
  rangeFloorBps: -300n,
  rangeDiscountBps: 60n,
  rangeTakeBps: 80n,
  rangeStopBps: 120n,
  rangeMaxBars: 360,
  rangeNumerator: 25n,
  rangeDenominator: 100n,
} as const;

// Mutable race state.
const S = {
  closes: [] as bigint[],
  leg: null as 'W' | 'R' | null,
  barsHeld: 0,
  holding: false,
  buyPending: false,
  rangeRetired: false,
};

// 240-bar return in bps, or null while the history is too short.
function ret240(): bigint | null {
  const n = S.closes.length;
  if (n < 241) return null;
  const now = S.closes[n - 1];
  const then = S.closes[n - 241];
  return (now * BPS) / then - BPS;
}

// Mean of the last 90 closes, or null while the history is too short.
function avg90(): bigint | null {
  const n = S.closes.length;
  if (n < 90) return null;
  let total = 0n;
  for (let i = n - 90; i < n; i++) total += S.closes[i];
  return total / 90n;
}

// One order that sells the whole position.
function flatten(qty: bigint): OrderInput[] {
  return [{ side: 'sell', symbol: CBBTC, qty, max_slippage_bps: SLIP_BPS }];
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    // Bank this bar before anything else, warm-up included: the
    // indicators need the warm-up history behind the scored window.
    for (const b of batch.bars) {
      if (b.symbol === CBBTC) S.closes.push(BigInt(b.c));
    }
    if (state.warmingUp) return [];

    const pos = state.positions.get(CBBTC);
    const close = state.close(CBBTC);

    // The buy we sent never landed: forget the leg we tentatively armed.
    if (S.buyPending && pos === undefined) {
      S.buyPending = false;
      S.leg = null;
    }

    if (pos !== undefined) {
      S.buyPending = false;
      if (!S.holding) {
        S.barsHeld = 0;
        S.holding = true;
      } else {
        S.barsHeld += 1;
      }
      if (close === null) return [];
      const worth = state.value(CBBTC, pos.qty);
      const paid = pos.cost;

      if (S.leg === 'W') {
        const stopped = worth <= (paid * (BPS - CFG.washoutStopBps)) / BPS;
        if (stopped || S.barsHeld >= CFG.washoutMaxBars) return flatten(pos.qty);
        return [];
      }
      if (S.leg === 'R') {
        const avg = avg90();
        if (worth >= (paid * (BPS + CFG.rangeTakeBps)) / BPS) return flatten(pos.qty);
        if (avg !== null && close * BPS >= avg * (BPS + CFG.rangeDiscountBps)) return flatten(pos.qty);
        if (worth <= (paid * (BPS - CFG.rangeStopBps)) / BPS) {
          S.rangeRetired = true;
          return flatten(pos.qty);
        }
        if (S.barsHeld >= CFG.rangeMaxBars) return flatten(pos.qty);
        return [];
      }
      return [];
    }

    S.holding = false;
    S.leg = null;
    if (close === null) return [];
    const ret = ret240();

    // Washout entry: flat and the 4-hour slide is at least -400 bps.
    if (ret !== null && ret <= CFG.washoutTriggerBps) {
      const room = state.weightRoom(CBBTC);
      const spend = state.cash < room ? state.cash : room;
      const minSpend = BigInt(state.hello.fees.min_notional_quote_units);
      if (spend <= 0n || spend < minSpend) return [];
      S.leg = 'W';
      S.barsHeld = 0;
      S.buyPending = true;
      return [{ side: 'buy', symbol: CBBTC, notional_quote_units: spend, max_slippage_bps: SLIP_BPS }];
    }

    // Range entry: flat, leg alive, tape not sliding, close discounted.
    if (!S.rangeRetired && ret !== null && ret > CFG.rangeFloorBps) {
      const avg = avg90();
      if (avg !== null && close * BPS <= avg * (BPS - CFG.rangeDiscountBps)) {
        const quarter = (state.cash * CFG.rangeNumerator) / CFG.rangeDenominator;
        const room = state.weightRoom(CBBTC);
        const spend = quarter < room ? quarter : room;
        const minSpend = BigInt(state.hello.fees.min_notional_quote_units);
        if (spend <= 0n || spend < minSpend) return [];
        S.leg = 'R';
        S.barsHeld = 0;
        S.buyPending = true;
        return [{ side: 'buy', symbol: CBBTC, notional_quote_units: spend, max_slippage_bps: SLIP_BPS }];
      }
    }

    return [];
  },
});
