export const WEEKLY_TIME_ZONE = "America/Argentina/Buenos_Aires";

type ZonedParts = { year: number; month: number; day: number; hour: number; weekday: number };

export type WeeklyPolicy = {
  clienteNombre: string;
  numeroPoliza: string;
  aseguradora: string;
  fechaVencimiento: Date;
};

function zonedParts(date: Date): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WEEKLY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    year,
    month,
    day,
    hour: Number(parts.hour),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

export function getWeekStartForBuenosAires(date: Date): Date {
  const parts = zonedParts(date);
  const daysSinceMonday = (parts.weekday + 6) % 7;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day - daysSinceMonday));
}

export function isWeeklySummaryDue(date: Date): boolean {
  const parts = zonedParts(date);
  return parts.weekday === 1 && parts.hour >= 8;
}

function compact(value: string, max = 54): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

export function buildWeeklySummaryChunks(policies: WeeklyPolicy[], maxChars = 900): { summaryText: string; chunks: string[] } {
  if (policies.length === 0) {
    const summaryText = "No hay pólizas a vencer en los próximos 7 días.";
    return { summaryText, chunks: [summaryText] };
  }

  const dateFormatter = new Intl.DateTimeFormat("es-AR", { timeZone: WEEKLY_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
  const lines = policies.map((policy, index) =>
    `${index + 1}. ${compact(policy.clienteNombre)} · Póliza ${compact(policy.numeroPoliza, 30)} · ${compact(policy.aseguradora, 42)} · ${dateFormatter.format(policy.fechaVencimiento)}`
  );
  const summaryText = lines.join("\n");
  const groups: string[][] = [];
  let current: string[] = [];
  let length = 0;

  for (const line of lines) {
    const additional = line.length + (current.length ? 1 : 0);
    if (current.length && length + additional > maxChars) {
      groups.push(current);
      current = [];
      length = 0;
    }
    current.push(line);
    length += line.length + (current.length > 1 ? 1 : 0);
  }
  if (current.length) groups.push(current);

  const chunks = groups.map((group, index) => {
    if (groups.length === 1) return group.join("\n");
    return `Parte ${index + 1} de ${groups.length}\n${group.join("\n")}`;
  });
  return { summaryText, chunks };
}

export function canAttemptWeeklyDispatch(
  dispatch: { status: string; attemptCount: number; lastAttemptAt: Date } | null,
  now: Date,
  force = false
): boolean {
  if (!dispatch) return true;
  if (["ACCEPTED", "SENT", "DELIVERED", "READ"].includes(dispatch.status)) return false;
  if (force) return true;
  if (dispatch.attemptCount >= 3) return false;
  const retryDelay = dispatch.status === "PROCESSING" ? 15 * 60 * 1000 : 30 * 60 * 1000;
  return now.getTime() - dispatch.lastAttemptAt.getTime() >= retryDelay;
}
