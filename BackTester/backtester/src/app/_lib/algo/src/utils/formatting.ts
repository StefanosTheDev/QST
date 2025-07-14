export function formatEasternTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: true,
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getMinuteTimestamp(tsMs: number): string {
  const dt = new Date(tsMs);
  dt.setSeconds(0, 0);
  return dt.toISOString();
}
