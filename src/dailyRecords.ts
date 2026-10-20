export const dailyRecordsKey = "h2otype.daily-scores.v2";
export type DailyRecord = {
  id: string;
  day: string;
  score: number;
  wpm: number;
  accuracy: number;
  combo: number;
};
export function parseDailyRecords(raw: string | null): DailyRecord[] {
  try {
    const data = JSON.parse(raw ?? "null");
    if (data?.version !== 1 || !Array.isArray(data.records)) return [];
    return data.records
      .filter(
        (record: DailyRecord) =>
          record &&
          typeof record.id === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(record.day) &&
          [record.score, record.wpm, record.accuracy, record.combo].every(
            (value) => Number.isSafeInteger(value) && value >= 0,
          ) &&
          record.accuracy <= 100,
      )
      .slice(0, 300);
  } catch {
    return [];
  }
}
export function compareDaily(a: DailyRecord, b: DailyRecord) {
  return b.score - a.score || b.accuracy - a.accuracy || b.wpm - a.wpm;
}
export function recordDaily(record: DailyRecord) {
  let records: DailyRecord[] = [];
  let available = true;
  try {
    records = parseDailyRecords(localStorage.getItem(dailyRecordsKey));
  } catch {
    available = false;
  }
  const previousBest = records
    .filter((entry) => entry.day === record.day)
    .sort(compareDaily)[0];
  if (!records.some((entry) => entry.id === record.id)) records.push(record);
  const days = [...new Set(records.map((entry) => entry.day))]
    .sort()
    .reverse()
    .slice(0, 30);
  records = days.flatMap((day) =>
    records
      .filter((entry) => entry.day === day)
      .sort(compareDaily)
      .slice(0, 10),
  );
  if (available) {
    try {
      localStorage.setItem(
        dailyRecordsKey,
        JSON.stringify({ version: 1, records }),
      );
    } catch {
      available = false;
    }
  }
  return {
    records: records
      .filter((entry) => entry.day === record.day)
      .sort(compareDaily),
    previousBest,
    available,
  };
}
