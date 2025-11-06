export const WEEK_UNKNOWN_KEY = "unknown";

export const getWeekBoundary = (dateStr) => {
  if (!dateStr) {
    return { key: WEEK_UNKNOWN_KEY, startIso: null, endIso: null };
  }
  const base = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return { key: WEEK_UNKNOWN_KEY, startIso: null, endIso: null };
  }
  const day = base.getUTCDay();
  const diff = day; // Weeks run Sunday (0) through Saturday (6)
  const start = new Date(base);
  start.setUTCDate(start.getUTCDate() - diff);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  return { key: `${startIso}_${endIso}`, startIso, endIso };
};

export const formatWeekRange = (startIso, endIso, fallback = "") => {
  if (startIso && endIso) return `${startIso} ~ ${endIso}`;
  return fallback;
};
