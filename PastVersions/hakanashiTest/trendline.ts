import { TOL_PCT } from './config';

// ── Trendline fitting & breakout detection ───────────────────────────────────
export function checkTrendLine(
  support: boolean,
  pivot: number,
  slope: number,
  y: number[]
): number {
  const intercept = -slope * pivot + y[pivot];
  const diffs = y.map((yi, i) => slope * i + intercept - yi);
  if (support && Math.max(...diffs) > 1e-5) return -1;
  if (!support && Math.min(...diffs) < -1e-5) return -1;
  return diffs.reduce((sum, d) => sum + d * d, 0);
}

export function optimizeSlope(
  support: boolean,
  pivot: number,
  initSlope: number,
  y: number[]
): [number, number] {
  const slopeUnit = (Math.max(...y) - Math.min(...y)) / y.length;
  let optStep = 1,
    bestSlope = initSlope;
  let bestErr = checkTrendLine(support, pivot, initSlope, y);
  let derivative = 0,
    getDerivative = true;
  const minStep = 1e-4;

  // ── V3 Dynamic Bailout START ───────────────────────────────────────────
  const maxIters = y.length * 20;
  const maxNoImprove = y.length * 5;
  let iters = 0,
    noImprove = 0;
  // ── V3 Dynamic Bailout END ─────────────────────────────────────────────

  while (optStep > minStep) {
    iters++;
    if (iters >= maxIters || noImprove >= maxNoImprove) {
      console.warn(
        `[optimizeSlope] V3 bail-out: iters=${iters}, noImprove=${noImprove}, window=${y.length}`
      );
      break;
    }
    if (getDerivative) {
      let test = bestSlope + slopeUnit * minStep;
      let errTest = checkTrendLine(support, pivot, test, y);
      if (errTest < 0) {
        test = bestSlope - slopeUnit * minStep;
        errTest = checkTrendLine(support, pivot, test, y);
      }
      derivative = errTest - bestErr;
      getDerivative = false;
    }

    const trial =
      derivative > 0
        ? bestSlope - slopeUnit * optStep
        : bestSlope + slopeUnit * optStep;
    const errTrial = checkTrendLine(support, pivot, trial, y);
    if (errTrial < 0 || errTrial >= bestErr) {
      optStep *= 0.5;
      noImprove++;
    } else {
      bestSlope = trial;
      bestErr = errTrial;
      getDerivative = true;
      noImprove = 0;
    }
  }

  const bestIntercept = -bestSlope * pivot + y[pivot];
  return [bestSlope, bestIntercept];
}

export function fitTrendlinesWindow(y: number[]): {
  supportLine: number[];
  resistLine: number[];
  supSlope: number;
  resSlope: number;
  breakout: 'bullish' | 'bearish' | 'none';
} {
  const N = y.length;
  const x = Array.from({ length: N }, (_, i) => i);
  const meanX = x.reduce((a, b) => a + b, 0) / N;
  const meanY = y.reduce((a, b) => a + b, 0) / N;
  const covXY = x.reduce((s, xi, i) => s + (xi - meanX) * (y[i] - meanY), 0);
  const varX = x.reduce((s, xi) => s + (xi - meanX) ** 2, 0);
  const slope = covXY / varX;
  const residuals = y.map((yi, i) => yi - slope * i);

  const upPiv = residuals.indexOf(Math.max(...residuals));
  const loPiv = residuals.indexOf(Math.min(...residuals));

  const [supSlope, supInt] = optimizeSlope(true, loPiv, slope, y);
  const [resSlope, resInt] = optimizeSlope(false, upPiv, slope, y);

  const supportLine = x.map((i) => supSlope * i + supInt);
  const resistLine = x.map((i) => resSlope * i + resInt);
  const last = y[N - 1];
  const tolRes = Math.abs(resistLine[N - 1]) * TOL_PCT;
  const tolSup = Math.abs(supportLine[N - 1]) * TOL_PCT;

  const breakout =
    last >= resistLine[N - 1] - tolRes
      ? 'bullish'
      : last <= supportLine[N - 1] + tolSup
      ? 'bearish'
      : 'none';

  return { supportLine, resistLine, supSlope, resSlope, breakout };
}
