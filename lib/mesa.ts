/* ============================================================================
 * lib/mesa.ts — John Ehlers MESA / Hilbert Transform 指标（TypeScript 移植版）
 * ----------------------------------------------------------------------------
 * 移植自 G:/工作台/mesa_indicators.py 与 mesa_signals.py（纯 numpy 版）。
 * 保留全部核心序列：主导周期(dc)、相位角(phase)、正弦波(sine)、余弦波(cosine)、
 * 超前正弦(lead)。用于流动性日线指标的「主图 + 相位/正余弦副图」分析。
 *
 * 设计要点：
 *   - 纯 TS，无外部依赖，浏览器内直接计算（复用 liquidity.ts 的确定性 history）。
 *   - 与 Python 版数值结果一致（已对齐公式与边界处理）。
 *   - 主导周期无效处（预热 / 缺失）相位置 NaN；副图绘制时跳过。
 * ========================================================================== */

const D2R = Math.PI / 180;
const deg = (d: number) => d * D2R;

/* ---------------------------------------------------------------------------
 * 基础滤波器
 * ------------------------------------------------------------------------- */
function highpassFilter(x: number[], period = 120): number[] {
  const n = x.length;
  const a1 =
    (Math.cos(deg(0.707 * 360 / period)) + Math.sin(deg(0.707 * 360 / period)) - 1) /
    Math.cos(deg(0.707 * 360 / period));
  const hp = new Array<number>(n).fill(0);
  for (let i = 2; i < n; i++) {
    hp[i] =
      (1 - a1 / 2) * (1 - a1 / 2) * (x[i] - 2 * x[i - 1] + x[i - 2]) +
      2 * (1 - a1) * hp[i - 1] -
      (1 - a1) * (1 - a1) * hp[i - 2];
  }
  return hp;
}

function superSmoother(x: number[], period = 10): number[] {
  const n = x.length;
  const a1 = Math.exp(-1.414 * Math.PI / period);
  const b1 = 2 * a1 * Math.cos(deg(1.414 * 180 / period));
  const c2 = b1;
  const c3 = -a1 * a1;
  const c1 = 1 - c2 - c3;
  const out = new Array<number>(n).fill(0);
  for (let i = 2; i < n; i++) {
    out[i] = c1 * (x[i] + x[i - 1]) / 2 + c2 * out[i - 1] + c3 * out[i - 2];
  }
  out[0] = x[0];
  out[1] = x[1];
  return out;
}

/**
 * 屋顶滤波（Roofing Filter）= 高通(去掉慢漂移) + 超级平滑(去掉高频噪)。
 * 与 dominantCyclePeriod 内部使用的滤波保持一致，作为统一的前处理入口。
 * 返回的即「去趋势偏离」信号（围绕 0 波动），可直接喂给 MESA 或用于绘图。
 */
export function roofFilter(x: number[], hpPeriod = 120, ssPeriod = 10): number[] {
  return superSmoother(highpassFilter(x, hpPeriod), ssPeriod);
}

/* ---------------------------------------------------------------------------
 * 主导周期估计（Ehlers 自相关周期图）
 * ------------------------------------------------------------------------- */
export function dominantCyclePeriod(
  close: number[],
  window = 50,
  minPeriod = 10,
  maxPeriod = 48,
): number[] {
  const n = close.length;
  const hp = highpassFilter(close);
  const filt = superSmoother(hp, 10);
  const dc = new Array<number>(n).fill(NaN);

  for (let t = window; t < n; t++) {
    const seg = filt.slice(t - window + 1, t + 1);
    const m = seg.length;
    const corr = new Array<number>(maxPeriod + 1).fill(0);
    for (let lag = 1; lag <= maxPeriod; lag++) {
      if (m - lag < 2) continue;
      const x = seg.slice(0, m - lag);
      const y = seg.slice(lag);
      const mm = x.length;
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (let i = 0; i < mm; i++) {
        sx += x[i];
        sy += y[i];
        sxx += x[i] * x[i];
        syy += y[i] * y[i];
        sxy += x[i] * y[i];
      }
      const mx = sx / mm;
      const my = sy / mm;
      const vx = sxx / mm - mx * mx;
      const vy = syy / mm - my * my;
      const sd = Math.sqrt(vx * vy);
      if (sd > 1e-12) corr[lag] = (sxy / mm - mx * my) / sd;
    }

    const sp = new Array<number>(maxPeriod + 1).fill(0);
    for (let p = minPeriod; p <= maxPeriod; p++) {
      let cs = 0, sn = 0;
      for (let nn = 3; nn <= maxPeriod; nn++) {
        const ang = deg(360 * (nn - 1) / (p - 1));
        cs += corr[nn] * Math.cos(ang);
        sn += corr[nn] * Math.sin(ang);
      }
      sp[p] = cs * cs + sn * sn;
    }

    // 3 根移动平均平滑
    const sps = new Array<number>(maxPeriod + 1).fill(0);
    for (let p = 2; p <= maxPeriod; p++) {
      sps[p] = (sp[p - 2] + 2 * sp[p - 1] + sp[p]) / 4;
    }
    const spn = sps;

    let mx = -Infinity;
    for (let p = minPeriod; p <= maxPeriod; p++) mx = Math.max(mx, spn[p]);
    if (mx <= 0) continue;
    for (let p = 0; p <= maxPeriod; p++) spn[p] = spn[p] / (0.995 * mx);

    let spx = 0, spw = 0;
    for (let p = minPeriod; p <= maxPeriod; p++) {
      if (spn[p] >= 0.5) {
        spx += (p - 1) * spn[p];
        spw += spn[p];
      }
    }
    if (spw > 0) {
      const val = spx / spw;
      dc[t] = val >= minPeriod ? val : minPeriod;
    }
  }
  return dc;
}

/* ---------------------------------------------------------------------------
 * 相位 + 正余弦（核心）
 * ------------------------------------------------------------------------- */
export interface MesaSeries {
  dc: number[]; // 主导周期（与输入等长，预热段为 NaN）
  phase: number[]; // 相位角（度，0~360，无效为 NaN）
  sine: number[]; // 正弦波 = sin(phase)
  cosine: number[]; // 余弦波 = cos(phase)
  lead: number[]; // 超前正弦 = sin(phase + 45°)
  real: number[]; // 正交分解实部（诊断用）
  filtered: number[]; // 去趋势后的带限信号（与输入等长，用于绘图对照）
  strength: number; // 周期强度 0~1（主导周期处的自相关绝对值，NaN 表示不可用）
}

export function dominantCyclePhase(price: number[], dc: number[]): MesaSeries {
  const n = price.length;
  // A 修复：相位引擎与周期估计共用同一套屋顶滤波（去趋势+去高频噪），
  // 不再用轻平滑的原始价，前后处理一致，正弦波将骑在带限信号上、噪声更小。
  const filt = roofFilter(price, 120, 10);
  const dcPeriod = dc.map((T) => Math.floor(T + 0.5));

  const phase = new Array<number>(n).fill(NaN);
  const sine = new Array<number>(n).fill(0);
  const cosine = new Array<number>(n).fill(0);
  const lead = new Array<number>(n).fill(0);
  const real = new Array<number>(n).fill(0);
  const imag = new Array<number>(n).fill(0);
  const detrender = new Array<number>(n).fill(0);
  const q1 = new Array<number>(n).fill(0);
  const i1 = new Array<number>(n).fill(0);
  const ji = new Array<number>(n).fill(0);
  const jq = new Array<number>(n).fill(0);

  for (let t = 0; t < n; t++) {
    const T = dcPeriod[t];
    if (!isFinite(T) || T < 1 || t < 6) continue;
    const Ti = T as number;
    detrender[t] =
      (0.0962 * filt[t] + 0.5769 * filt[t - 2] - 0.5769 * filt[t - 4] - 0.0962 * filt[t - 6]) *
      (0.075 * Ti + 0.54);
    q1[t] =
      (0.0962 * detrender[t] + 0.5769 * detrender[t - 2] - 0.5769 * detrender[t - 4] - 0.0962 * detrender[t - 6]) *
      (0.075 * Ti + 0.54);
    i1[t] = detrender[t - 3];

    const half = Math.floor(Ti / 2) + 1;
    if (t >= half + 2) {
      ji[t] = ji[t - 1] + i1[t] - i1[t - half];
      jq[t] = jq[t - 1] + q1[t] - q1[t - half];
      // 同谱判别器（Homodyne Discriminator）
      const rp =
        0.2 *
          (ji[t] * ji[t] - jq[t] * jq[t] +
            ji[t - 1] * ji[t - 1] - jq[t - 1] * jq[t - 1] +
            ji[t - 2] * ji[t - 2] - jq[t - 2] * jq[t - 2] +
            ji[t - 3] * ji[t - 3] - jq[t - 3] * jq[t - 3]) +
        0.8 * real[t - 1];
      const ip =
        0.2 *
          (ji[t] * jq[t] + ji[t - 1] * jq[t - 1] +
            ji[t - 2] * jq[t - 2] + ji[t - 3] * jq[t - 3]) +
        0.8 * imag[t - 1];
      real[t] = rp;
      imag[t] = ip;
      if (rp !== 0 || ip !== 0) {
        const ph = ((Math.atan2(ip, rp) * 180) / Math.PI) % 360;
        const ph360 = (ph + 360) % 360;
        phase[t] = ph360;
        sine[t] = Math.sin(ph360 * D2R);
        cosine[t] = Math.cos(ph360 * D2R);
        lead[t] = Math.sin((ph360 + 45) * D2R);
      }
    }
  }
  return { dc, phase, sine, cosine, lead, real, filtered: filt, strength: NaN };
}

/* ---------------------------------------------------------------------------
 * 便捷封装
 * ------------------------------------------------------------------------- */
export function phaseSineCosine(
  close: number[],
  window = 50,
  minPeriod = 10,
  maxPeriod = 48,
): MesaSeries {
  const dc = dominantCyclePeriod(close, window, minPeriod, maxPeriod);
  const mesa = dominantCyclePhase(close, dc);
  const n = close.length;

  // 周期强度：在最近 window 段、滞后 = 主导周期 处计算去趋势信号的自相关绝对值。
  // 真周期信号此处 |r| 接近 1；随机游走/弱周期则接近 0。用于诚实标注「当前是否显著周期」。
  let strength = NaN;
  const T = Math.round(isFinite(dc[n - 1]) ? dc[n - 1] : 0);
  if (T >= 2 && n > window + T) {
    const seg = mesa.filtered.slice(n - window - T, n);
    const a = seg.slice(0, seg.length - T);
    const b = seg.slice(T);
    const m = Math.min(a.length, b.length);
    if (m > 8) {
      const aa = a.slice(a.length - m);
      const bb = b.slice(0, m);
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let i = 0; i < m; i++) {
        sa += aa[i];
        sb += bb[i];
        saa += aa[i] * aa[i];
        sbb += bb[i] * bb[i];
        sab += aa[i] * bb[i];
      }
      const ma = sa / m;
      const mb = sb / m;
      const va = saa / m - ma * ma;
      const vb = sbb / m - mb * mb;
      const sd = Math.sqrt(va * vb);
      strength = sd > 1e-12 ? Math.min(1, Math.abs(sab / m - ma * mb) / sd) : NaN;
    }
  }
  return { ...mesa, strength };
}

/** 找出首个相位有效的下标（跳过预热段）。 */
export function firstValidIndex(phase: number[]): number {
  for (let i = 0; i < phase.length; i++) if (isFinite(phase[i])) return i;
  return 0;
}
