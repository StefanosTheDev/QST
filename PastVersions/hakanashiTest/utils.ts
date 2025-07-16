// ── Map aggressor side → signed delta ─────────────────────────────────────────
export function deltaFromSide(side: 'A' | 'B' | 'N', size: number): number {
  if (side === 'B') return +size; // bid-hit = buy pressure
  if (side === 'A') return -size; // ask-hit = sell pressure
  return 0; // neutral
}

// ── Format Eastern Time ───────────────────────────────────────────────────────
export function fmtEst(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: true,
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── CVD Coloring ──────────────────────────────────────────────────────────────
export function getCvdColor(
  close: number,
  open: number,
  prevHigh: number | null,
  prevLow: number | null,
  strong: boolean
): string {
  if (!strong) {
    if (close > open) return 'green';
    if (close < open) return 'red';
    return 'gray';
  }
  if (prevHigh === null || prevLow === null) {
    if (close > open) return 'green';
    if (close < open) return 'red';
    return 'gray';
  }
  if (close > prevHigh) return 'green';
  if (close < prevLow) return 'red';
  return 'gray';
}
