import React from "react";

export default function Settings({ currency, jobs, onSetCurrency, onSetJobRate }) {
  const inputBase =
    "w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100";

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 space-y-3 border border-transparent dark:border-gray-800">
      <h2 className="font-semibold dark:text-gray-100">Settings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 dark:text-gray-300">Currency</span>
          <select
            className={inputBase}
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
            <span className="block text-gray-600 dark:text-gray-300">Job {k} hourly rate</span>
            <input
              type="number"
              step="0.01"
              className={inputBase}
              value={jobs[k]}
              onChange={(e) => onSetJobRate(k, Number(e.target.value) || 0)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}