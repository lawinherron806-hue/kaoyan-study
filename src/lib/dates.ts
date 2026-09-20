export const chinaDay = (value: Date | string = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
export const today = () => chinaDay();
export function dayOffset(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function streak(dates: string[], date: string) {
  const days = new Set(dates);
  let cursor = days.has(date) ? date : dayOffset(date, -1),
    count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = dayOffset(cursor, -1);
  }
  return count;
}
