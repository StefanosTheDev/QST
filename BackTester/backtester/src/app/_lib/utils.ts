// src/lib/formatTimestamp.ts
export function formatTimestamp(
  date: string, // e.g. "2025-06-10"
  time: string // e.g. "09:30"
): string {
  // build a Date from local‐time
  const dt = new Date(`${date}T${time}`);
  // hours and minutes of offset *ahead* of UTC
  const offsetMin = -dt.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;

  return `${date}T${time}:00${sign}${pad(h)}:${pad(m)}`;
}
