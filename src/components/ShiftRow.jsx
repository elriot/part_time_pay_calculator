import React, { useMemo } from "react";

const minutesBetween = (start, end) => {
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e < s) e += 24 * 60; // 자정 넘김
  return e - s;
};
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function ShiftRow({ currency, jobs, shift, onChange, onRemove }) {
  const { hours, pay } = useMemo(() => {
    const worked = Math.max(
      0,
      minutesBetween(shift.start, shift.end) - (Number(shift.unpaidBreakMin) || 0)
    );
    const h = worked / 60;
    return { hours: round2(h), pay: round2(h * (Number(shift.rate) || 0)) };
  }, [shift.start, shift.end, shift.unpaidBreakMin, shift.rate]);

  const inputBase =
    "border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100";

  return (
    <tr className="border-t border-gray-200 dark:border-gray-800">
      <td className="py-1.5 pr-2">
        <input
          type="date"
          className={inputBase}
          value={shift.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
      </td>
      <td className="py-1.5 pr-2">
        <select
          className={inputBase}
          value={shift.job}
          onChange={(e) => {
            const job = e.target.value;
            const defaultRate = jobs[job] ?? shift.rate;
            onChange({ job, rate: defaultRate });
          }}
        >
          {Object.keys(jobs).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="time"
          className={inputBase}
          value={shift.start}
          onChange={(e) => onChange({ start: e.target.value })}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="time"
          className={inputBase}
          value={shift.end}
          onChange={(e) => onChange({ end: e.target.value })}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="number"
          min={0}
          step={1}
          className={`${inputBase} w-24`}
          value={shift.unpaidBreakMin}
          onChange={(e) => onChange({ unpaidBreakMin: Number(e.target.value) || 0 })}
        />
      </td>
      <td className="py-1.5 pr-2 whitespace-nowrap">{hours.toFixed(2)}</td>
      <td className="py-1.5 pr-2 whitespace-nowrap">
        <input
          type="number"
          step="0.01"
          className={`${inputBase} w-28`}
          value={shift.rate}
          onChange={(e) => onChange({ rate: Number(e.target.value) || 0 })}
        />
      </td>
      <td className="py-1.5 pr-2 font-medium whitespace-nowrap">
        {currency} {pay.toFixed(2)}
      </td>
      <td className="py-1.5 pr-2 text-right">
        <button
          className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
          onClick={onRemove}
        >
          삭제
        </button>
      </td>
    </tr>
  );
}