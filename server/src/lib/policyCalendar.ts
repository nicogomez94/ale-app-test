// Policy dates are date-only values stored at UTC midnight. Today is Argentina's
// calendar day, not the host's timezone or a rolling 24-hour interval.
export function argentinaCalendarDay(now = new Date()): Date {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(now);
  return new Date(`${today}T00:00:00.000Z`);
}

export function policyDaysRemaining(expiry: Date, now = new Date()): number {
  return Math.round((Date.parse(expiry.toISOString().slice(0, 10)) - argentinaCalendarDay(now).getTime()) / 86400000);
}
