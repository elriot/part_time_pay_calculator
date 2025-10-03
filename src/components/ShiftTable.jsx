import React from "react";
import ShiftRow from "./ShiftRow";

export default function ShiftTable({ currency, jobs, shifts, onUpdate, onAdd, onRemove }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-600 dark:text-gray-300">
          <tr className="border-t border-gray-200 dark:border-gray-800">
            <th className="py-2 pr-2">날짜</th>
            <th className="py-2 pr-2">근무처</th>
            <th className="py-2 pr-2">시작</th>
            <th className="py-2 pr-2">끝</th>
            <th className="py-2 pr-2">휴게(분)</th>
            <th className="py-2 pr-2">유급시간(h)</th>
            <th className="py-2 pr-2">시급</th>
            <th className="py-2 pr-2">일급</th>
            <th className="py-2 pr-2"> </th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <ShiftRow
              key={shift.id}
              currency={currency}
              jobs={jobs}
              shift={shift}
              onChange={(patch) => onUpdate(shift.id, patch)}
              onRemove={() => onRemove(shift.id)}
            />
          ))}
        </tbody>
      </table>
      <div className="mt-3">
        <button
          className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm"
          onClick={onAdd}
        >
          + 추가
        </button>
      </div>
    </div>
  );
}