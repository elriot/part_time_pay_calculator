import React from "react";

export default function Settings({ currency, jobs, onSetCurrency, onSetJobRate }) {
  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-3">
      <h2 className="font-semibold">기본 설정</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600">통화</span>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={currency}
            onChange={(e) => onSetCurrency(e.target.value)}
          >
            <option>CAD</option>
            <option>USD</option>
            <option>KRW</option>
          </select>
        </label>
        {Object.keys(jobs).map((k) => (
          <label key={k} className="text-sm">
            <span className="block text-gray-600">Job {k} 시급</span>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={jobs[k]}
              onChange={(e) => onSetJobRate(k, Number(e.target.value) || 0)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}