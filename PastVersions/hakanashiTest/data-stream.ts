import axios from 'axios';
import * as readline from 'node:readline';
import { Readable } from 'stream';

import { Trade, Bar, PAGE_MS } from './config';
import { deltaFromSide, getCvdColor } from './utils';

// ── Page-through raw trades from Databento ────────────────────────────────────
export async function* streamTradesPaged(
  key: string,
  dataset: string,
  schema: string,
  symbol: string,
  startUtc: string,
  endUtc: string
): AsyncGenerator<Trade> {
  let cur = Date.parse(startUtc);
  const endMs = Date.parse(endUtc);

  while (cur < endMs) {
    const nxt = Math.min(cur + PAGE_MS, endMs);
    const resp = await axios.get<Readable>(
      'https://hist.databento.com/v0/timeseries.get_range',
      {
        params: {
          dataset,
          schema,
          symbols: symbol,
          start: new Date(cur).toISOString(),
          end: new Date(nxt).toISOString(),
          encoding: 'json',
        },
        auth: { username: key, password: '' },
        responseType: 'stream',
      }
    );

    let lastTs = cur;
    const rl = readline.createInterface({ input: resp.data });
    for await (const line of rl) {
      if (!line) continue;
      const rec: any = JSON.parse(line);
      const tsEv = Number(rec.hd.ts_event) / 1_000_000;
      lastTs = Math.floor(tsEv);
      yield {
        px: Number(rec.price) / 1e9,
        size: rec.size,
        side: rec.side,
        ts_ms: lastTs,
      };
    }
    cur = lastTs + 1;
  }
}

// ── Build 1-min bars and true cumulative delta ────────────────────────────────
export async function* streamOneMinuteBars(
  key: string,
  dataset: string,
  schema: string,
  symbol: string,
  startUtc: string,
  endUtc: string,
  strongUpdown = true
): AsyncGenerator<Bar> {
  let current: Bar | null = null;
  let runningCvd = 0;
  let prevHigh: number | null = null;
  let prevLow: number | null = null;

  for await (const t of streamTradesPaged(
    key,
    dataset,
    schema,
    symbol,
    startUtc,
    endUtc
  )) {
    const { px, size, side, ts_ms } = t;
    const dt = new Date(ts_ms);
    dt.setSeconds(0, 0);
    const iso = dt.toISOString();

    const delta = deltaFromSide(side, size);
    runningCvd += delta;

    if (!current || current.timestamp !== iso) {
      if (current) {
        current.cvd = current.cvd_running;
        current.cvd_color = getCvdColor(
          current.close,
          current.open,
          prevHigh,
          prevLow,
          strongUpdown
        );
        yield current;
        prevHigh = current.high;
        prevLow = current.low;
      }
      current = {
        timestamp: iso,
        open: px,
        high: px,
        low: px,
        close: px,
        volume: size,
        delta,
        cvd_running: runningCvd,
      };
    } else {
      current.high = Math.max(current.high, px);
      current.low = Math.min(current.low, px);
      current.close = px;
      current.volume += size;
      current.delta += delta;
      current.cvd_running = runningCvd;
    }
  }

  if (current) {
    current.cvd = current.cvd_running;
    current.cvd_color = getCvdColor(
      current.close,
      current.open,
      prevHigh,
      prevLow,
      strongUpdown
    );
    yield current;
  }
}
