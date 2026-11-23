[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/irwan11795/makefun-btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/irwan11795/makefun-btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

# BTC Race Bot — Washout + Range (v1 for btc-race-24h-20261123-0511)

Long-only CBBTC bot for the make.fun 24h BTC race. Two legs, bigint math
only, no wall clock, no network, no randomness.

## Strategy

- **Leg W (washout)** — when flat and the 240-bar return is at or below
  **−400 bps**, buy all-in and hold to the close. No take profit (the
  harness flattens at the last bar). Early exits only: **−300 bps stop**
  or a **500-batch time cap**.
- **Leg R (range)** — when flat, the range leg is still enabled, the
  240-bar return is above **−300 bps**, and the close is at or below the
  **90-bar SMA minus 60 bps**, buy **25% of cash**. Exits: **+80 bps take
  profit**, close back above **SMA + 60 bps**, **−120 bps stop** (which
  disables the range leg for the rest of the race), or a **360-batch
  time cap**.
- One position at a time; a buy that is rejected resets the mode so the
  bot never gets stuck. No orders while warming up. Max slippage 100 bps.
  Sells always sell the whole position.

## Evidence — 10 backtested 24h windows (prior races, same logic)

| Window | Net PnL |
|---|---:|
| dev2314 | +$10,31 |
| dev0603 | +$4,26 |
| dev0828 | +$26,88 |
| live2314 | −$3,25 |
| live0828 | +$3,94 |
| live0603 | +$2,07 |
| oos1 | +$0,59 |
| oos2 | −$1,27 |
| oos3 | +$43,49 |
| oos4 | +$0,82 |

Mean **+$8,78**, worst **−$3,25**, **8/10 positive**, 1–4 trades per
window, max drawdown **≤ 2,54%**. The washout leg never lost money in any
of the 10 windows; the range leg is gate insurance for flat windows where
the washout leg never fires.

## Grade-local (kit 0511, dev window = this race's dev window)

Run 2026-11-23 ~14:05 WIB:
`node <kit-0511>/cli/makefun.mjs grade-local --kit <kit-0511> --bot <repo>
--driver process --save <repo-grade> --json`

- Status: **finished**, compliant, replay reproduced (L1 reproduced: true)
- **Net PnL: +$6,089263** — dev gate PASSED (>$0)
- **Trades: 6 fills = 3 round trips**, all range-leg buys of 25% cash
- Win rate: **1,000** (3/3 round trips positive); rejected orders: **0**
- **Max drawdown: 0,1489%**; fees: **$0,603707**; return +0,6089%;
  Sharpe 0,0418; exposure 9,72%
- Fee sensitivity (2× fees): still +$5,482954
- Washout leg did not fire on this window (no −400 bps 240-bar drop),
  as expected — all PnL came from the range leg
- result_sha256: `b6c1845eebad986a3640d24189691576f146fde3747ec9f39e63577b8ba54d6e`
- action_log_sha256: `26c60cdd5ecd99af84573494b6042cd2c72cf1a25427df76e0c3779b936ad9bc`
- Note: one mismatch line is environmental only: the server harness runs
  Node v26.13.1, this machine v24.22.1.

## Files

- `main.ts` — the bot (entrypoint, `node main.ts`)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's
  `sdk/makefun-bars.ts`
- `README.md` — this file
- `LICENSE` — MIT (`SPDX-License-Identifier: MIT`)

## Status

v1 entry for [btc-race-24h-20261123-0511](https://make.fun/bounty/btc-race-24h-20261123-0511) — built as a fast reference baseline, slot 1.

<sub>Entered on [make.fun](https://make.fun/?ref=2wht1jqa&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
