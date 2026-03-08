

# DeepCharts Pro V4.1 — Full Faithful Port Plan

## Gap Analysis: Original PineScript vs Current Implementation

After parsing the full 1743-line PineScript, here are the **critical differences**:

### Engine (`DeepChartsEngine.ts`) — Calculation Logic Wrong

| Feature | Original PineScript | Current Implementation |
|---------|-------------------|----------------------|
| **Z-score basis** | `buy_intensity = buy_vol / range / ATR` (normalized) | Raw volume Z-score (not normalized) |
| **ATR** | Manual 14-period ATR used for normalization | Not calculated at all |
| **Period** | 30 bars for SMA/StdDev | 20 bars |
| **Tier thresholds** | `t2 = sigma * tier2Mult`, `t3 = sigma * tier3Mult` | T2 = `sigma` (raw), T3 = `sigma * tier3Mult` |
| **OI boost** | Additive: `z_final = z + z * boost_factor` | Multiplicative: `z *= boostFactor` |
| **OI direction** | Only boosts buy when `uptick AND oiDelta > 0` | Boosts buy whenever `oiImbalance > 0` |
| **Anomaly types** | CRITICAL, REVERSAL, OI SPIKE (3 types) | Single generic type |
| **Volume Bubbles** | Z-score sized bubbles (huge/large/normal/small) at hl2 | Completely missing |
| **Smart SL/TP** | HVN-based SL, TP1, TP2 with ATR fallback | Completely missing |
| **Dynamic Profile** | Per-bar POC/VAH/VAL as step-line plots | Missing (only static profile) |

### Renderer (`DeepChartsRenderer.ts`) — Missing Visual Features

1. **Volume bars** (small squares above/below signals) — missing
2. **Volume Bubbles** (sized circles at hl2 based on mapVolZ) — missing
3. **SL/TP zone coloring** in profile (red=SL, green=TP1, brighter green=TP2) — missing
4. **Profile zone gradient** (normal low→high, POC bin, VA color) — missing
5. **Projected level lines** from bubble positions — missing
6. **SL/TP labels** next to profile (🛑 SL, ✅ TP1, 🎯 TP2 with R:R) — missing
7. **Stats panel** incomplete (missing OI delta %, POC/VAH/VAL prices, SL/TP stats)
8. **Dynamic POC/VAH/VAL step-lines** across chart — missing

### Settings Panel — Missing Controls

- SL/TP zone settings (enable, trigger source, buffer, HVN threshold, zone bins)
- Dynamic Profile toggle and lookback
- Volume Bubble settings (enable, Z threshold, projected levels)
- Profile Zone Colors (SL/TP/Normal/POC/VA gradient colors)
- Many missing color pickers for new features

---

## Implementation Plan

### 1. Rewrite `DeepChartsEngine.ts` — Fix Core Math + Add Missing Features

**Fix existing calculations:**
- Add ATR(14) calculation
- Change Z-score to intensity-based: `intensity = vol / range / ATR`, then Z-score on intensity
- Change period from 20 → 30
- Fix tier thresholds: `t2 = sigma * tier2Mult`, `t3 = sigma * tier3Mult`
- Fix OI boost to additive with uptick/downtick direction check

**Add new data structures:**
```text
SLTPResult { slPrice, tp1Price, tp2Price, direction, rr1, rr2, hasRealSignal }
VolumeBubble { barIndex, price, zScore, isBull, sizeCategory }
DynamicProfileResult { pocPrice, vahPrice, valPrice }
```

**Add new calculations:**
- Volume Bubble detection (mapVolZ > threshold → bubble with size category)
- Smart SL/TP zones (scan HVN bins for SL/TP1, use VAH/VAL for TP2, ATR fallback)
- Dynamic per-computation POC/VAH/VAL (separate lookback window)
- Anomaly classification (CRITICAL, REVERSAL, OI SPIKE)

**Add new config fields:**
- `enableSLTP`, `sltpSource`, `minDistATR`, `slBufferATR`, `hvnMultiplier`, `sltpZoneBins`, `sltpAtrFallback`, `tp2AtrFallback`, `showSLTPLabels`, `showTP2`, `showSLTPStats`
- `enableDynProfile`, `dynLookback`
- `showMapBubbles`, `mapBubbleThreshold`, `projectLevels`, `maxProjectedLevels`
- `profileOffset`
- Zone colors: `slColor`, `tp1Color`, `tp2Color`, `profileNormalColor`, `profileVaColor`

### 2. Rewrite `DeepChartsRenderer.ts` — Add All Visual Elements

- **Volume Bubbles**: Draw sized circles at hl2 price, bull=cyan, bear=pink
- **Volume Bars**: Small squares above/below signal candles
- **Profile zone coloring**: Color bins by zone (SL=red gradient, TP1=green, TP2=bright green, POC=gold, VA=gray, normal=gradient)
- **SL/TP labels**: Draw 🛑 SL, ✅ TP1, 🎯 TP2 with R:R text next to profile
- **Dynamic POC/VAH/VAL**: Draw step-lines across the full chart width
- **Projected levels**: Dashed lines from bubble positions to right edge with tier labels
- **Enhanced stats panel**: Add OI Δ%, POC/VAH/VAL prices, SL/TP info, signal counters

### 3. Update `DeepChartsSettingsPanel.tsx` — Add All New Controls

New sections:
- **🎯 Smart SL/TP Zones**: Enable toggle, trigger source dropdown, min distance, SL buffer, HVN threshold, zone bins, ATR fallbacks, show labels/TP2/stats
- **📊 Dynamic Profile**: Enable toggle, lookback slider
- **🫧 Volume Bubbles**: Enable toggle, Z threshold, project levels toggle, max levels
- **🎨 Profile Zone Colors**: SL zone, TP1 zone, TP2 zone, POC bin, VA, normal colors

### 4. Update `ABLEChartCanvas.tsx` — Pass New Data

- Pass new result fields (sltp, bubbles, dynProfile) to renderer
- No structural changes needed, just updated data flow

### Files to modify:
1. `src/components/TradingChart/indicators/DeepChartsEngine.ts` — **full rewrite**
2. `src/components/TradingChart/indicators/DeepChartsRenderer.ts` — **major additions**
3. `src/components/TradingChart/indicators/DeepChartsSettingsPanel.tsx` — **add new sections**
4. `src/components/TradingChart/ABLEChartEngine/ABLEChartCanvas.tsx` — minor update to pass new data

