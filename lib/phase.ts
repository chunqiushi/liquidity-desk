// 周期分解（衍生研究指标）
// 给定一条序列，去趋势后通过自相关找主周期，再用最小二乘拟合
//   residual(t) ≈ A · sin(2π t / T + φ)
// 返回振幅 A、相位 φ（0~360°）、拟合的正弦/余弦曲线、残差与趋势。
// 纯函数、确定性。本模块仅做"描述性周期分解"，不用于预测、不做因果解释。

export interface CycleFit {
  T: number; // 主周期（样本数）
  amplitude: number; // 振幅
  phaseDeg: number; // 相位角（度，0~360）
  residual: number[]; // 去趋势后的残差
  trend: number[]; // 移动平均趋势
  fittedSin: number[]; // A·sin(2π t/T + φ)
  fittedCos: number[]; // A·cos(2π t/T + φ)
}

export interface FitOptions {
  detrendWindow?: number; // 去趋势移动平均窗宽
  minLag?: number; // 自相关最小滞后
  maxLag?: number; // 自相关最大滞后
}

function movingAverage(arr: number[], win: number): number[] {
  const n = arr.length;
  const half = Math.floor(win / 2);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < n) {
        s += arr[j];
        c++;
      }
    }
    out[i] = c > 0 ? s / c : arr[i];
  }
  return out;
}

function autocorrelation(a: number[], b: number[], lag: number): number {
  const n = a.length - lag;
  if (n <= 1) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i + lag];
  }
  ma /= n;
  mb /= n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i + lag] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va === 0 || vb === 0) return 0;
  return cov / Math.sqrt(va * vb);
}

export function fitCycle(values: number[], opts: FitOptions = {}): CycleFit {
  const win = opts.detrendWindow ?? 21;
  const minLag = opts.minLag ?? 20;
  const maxLag = opts.maxLag ?? 250;
  const n = values.length;

  const trend = movingAverage(values, win);
  const residual = values.map((v, i) => v - trend[i]);

  // 找主周期：在 [minLag, maxLag] 内取 |自相关| 最大者
  let bestLag = Math.min(maxLag, Math.max(minLag, Math.floor(n / 3)));
  let bestAcf = -Infinity;
  const lo = Math.min(minLag, n - 2);
  const hi = Math.min(maxLag, n - 2);
  for (let L = lo; L <= hi; L++) {
    const acf = Math.abs(autocorrelation(residual, residual, L));
    if (acf > bestAcf) {
      bestAcf = acf;
      bestLag = L;
    }
  }
  const T = bestLag > 0 ? bestLag : n;

  // 最小二乘拟合 residual ≈ a·sin(ωt) + b·cos(ωt)
  const w = (2 * Math.PI) / T;
  let Sss = 0;
  let Scc = 0;
  let Ssc = 0;
  let Sys = 0;
  let Syc = 0;
  for (let t = 0; t < n; t++) {
    const s = Math.sin(w * t);
    const c = Math.cos(w * t);
    const r = residual[t];
    Sss += s * s;
    Scc += c * c;
    Ssc += s * c;
    Sys += r * s;
    Syc += r * c;
  }
  const det = Sss * Scc - Ssc * Ssc;
  let a = 0;
  let b = 0;
  if (det !== 0) {
    a = (Sys * Scc - Syc * Ssc) / det;
    b = (Syc * Sss - Sys * Ssc) / det;
  }
  const amplitude = Math.sqrt(a * a + b * b);
  let phaseDeg = (Math.atan2(b, a) * 180) / Math.PI;
  if (phaseDeg < 0) phaseDeg += 360;

  const fittedSin: number[] = [];
  const fittedCos: number[] = [];
  for (let t = 0; t < n; t++) {
    fittedSin.push(+(amplitude * Math.sin(w * t + (phaseDeg * Math.PI) / 180)).toFixed(4));
    fittedCos.push(+(amplitude * Math.cos(w * t + (phaseDeg * Math.PI) / 180)).toFixed(4));
  }

  return { T, amplitude, phaseDeg, residual, trend, fittedSin, fittedCos };
}
