import React, { useMemo } from "react";

const minutesBetween = (start, end) => {
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e < s) e += 24 * 60; // cross midnight
  return e - s;
};
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function ShiftRow({
  rowIndex, currency, jobs, shift, onChange, onRemove,
  rowDragProps, isDragging, isOver,
}) {
  const { scheduledHours, paidHours, pay } = useMemo(() => {
    const scheduledMin = minutesBetween(shift.start, shift.end); // 휴게 전 총 시간
    const workedMin = Math.max(0, scheduledMin - (Number(shift.unpaidBreakMin) || 0)); // 유급 시간
    const scheduledH = scheduledMin / 60;
    const paidH = workedMin / 60;
    const pay = round2(paidH * (Number(shift.rate) || 0));
    return {
      scheduledHours: round2(scheduledH),
      paidHours: round2(paidH),
      pay,
    };
  }, [shift.start, shift.end, shift.unpaidBreakMin, shift.rate]);

  const inputBase =
    "border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100";

  return (
    <tr
      className={`border-t border-gray-200 dark:border-gray-800 ${isDragging ? "opacity-50" : ""} ${
        isOver ? "outline outline-2 outline-blue-400/50" : ""
      }`}
      {...rowDragProps}
    >
      <td className="py-1.5 pr-2 text-right tabular-nums w-10 text-gray-500 dark:text-gray-400">
        {rowIndex + 1}
      </td>
      <td className="py-1.5 pr-2 cursor-grab active:cursor-grabbing select-none text-gray-400 dark:text-gray-500">
        ↕︎
      </td>

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
            <option key={k} value={k}>{k}</option>
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

      {/* 새 컬럼: 스케줄 시간(휴게 전 총 시간) */}
      <td className="py-1.5 pr-2 whitespace-nowrap">{scheduledHours.toFixed(2)}</td>

      {/* 기존: 유급시간 */}
      <td className="py-1.5 pr-2 whitespace-nowrap">{paidHours.toFixed(2)}</td>

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
          type="button"
          onClick={onRemove}
          aria-label="Delete"
          title="Delete"
          className="inline-flex items-center justify-center rounded-md p-2
                     text-red-600 hover:text-red-700
                     bg-red-50 hover:bg-red-100
                     dark:text-red-300 dark:hover:text-red-200
                     dark:bg-red-900/20 dark:hover:bg-red-900/30
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400
                     dark:focus:ring-offset-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
               fill="currentColor" className="w-4 h-4">
            <path d="M6 8.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6A.75.75 0 0 1 6 8.5Zm4 .75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Zm2.75-.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75ZM3.25 5.5A.75.75 0 0 1 4 4.75h3.19l.28-.56a1.5 1.5 0 0 1 1.34-.84h2.38c.58 0 1.11.33 1.36.84l.25.56H16a.75.75 0 0 1 0 1.5h-.75v8A2.75 2.75 0 0 1 12.5 17.5h-5A2.75 2.75 0 0 1 4.75 15V6.25H4a.75.75 0 0 1-.75-.75Zm2 1.5V15c0 .69.56 1.25 1.25 1.25h5c.69 0 1.25-.56 1.25-1.25V7H5.25Z"/>
          </svg>
        </button>
      </td>
    </tr>
  );
}