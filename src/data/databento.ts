// data/databento.ts
import axios from 'axios';
import * as readline from 'node:readline';
import { Readable } from 'stream';
import { Trade, Bar } from '../types';
import { CONFIG } from '../config/constants';
import { deltaFromSide } from '../utils/calculations';
import { getMinuteTimestamp } from '../utils/formatting';

export async function* streamTradesPaged(
  apiKey: string,
  startUtc: string,
  endUtc: string
): AsyncGenerator<Trade> {
  let cur = Date.parse(startUtc);
  const endMs = Date.parse(endUtc);

  while (cur < endMs) {
    const nxt = Math.min(cur + CONFIG.PAGE_MS, endMs);
    const resp = await axios.get<Readable>(CONFIG.DATABENTO.API_URL, {
      params: {
        dataset: CONFIG.DATABENTO.DATASET,
        schema: CONFIG.DATABENTO.SCHEMA,
        symbols: CONFIG.DATABENTO.SYMBOL,
        start: new Date(cur).toISOString(),
        end: new Date(nxt).toISOString(),
        encoding: 'json',
      },
      auth: { username: apiKey, password: '' },
      responseType: 'stream',
    });

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

export async function* streamOneMinuteBars(
  apiKey: string,
  startUtc: string,
  endUtc: string,
  getCvdColor: (
    bar: Bar,
    prevHigh: number | null,
    prevLow: number | null
  ) => string
): AsyncGenerator<Bar> {
  let current: Bar | null = null;
  let runningCvd = 0;
  let prevHigh: number | null = null;
  let prevLow: number | null = null;

  for await (const trade of streamTradesPaged(apiKey, startUtc, endUtc)) {
    const { px, size, side, ts_ms } = trade;
    const iso = getMinuteTimestamp(ts_ms);
    const delta = deltaFromSide(side, size);
    runningCvd += delta;

    if (!current || current.timestamp !== iso) {
      if (current) {
        current.cvd = current.cvd_running;
        current.cvd_color = getCvdColor(current, prevHigh, prevLow);
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
    current.cvd_color = getCvdColor(current, prevHigh, prevLow);
    yield current;
  }
}
