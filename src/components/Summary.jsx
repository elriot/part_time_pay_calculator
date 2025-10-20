import React from "react";

export default function Summary({ currency, byJob, totals }) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 space-y-3 border border-transparent dark:border-gray-800">
      <h2 className="font-semibold">Totals</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.keys(byJob).map((k) => (
          <div key={k} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
            <div className="text-gray-600 dark:text-gray-300 text-sm mb-1">Job {k}</div>
            <div className="text-lg font-semibold">{byJob[k].hours.toFixed(2)} h</div>
            <div className="text-sm">
              {currency} {byJob[k].pay.toFixed(2)}
            </div>
          </div>
        ))}
        <div className="p-4 rounded-xl bg-gray-900 text-white dark:bg-black">
          <div className="text-gray-200 text-sm mb-1">Overall</div>
          <div className="text-lg font-semibold">{totals.hours.toFixed(2)} h</div>
          <div className="text-sm">
            {currency} {totals.pay.toFixed(2)}
          </div>
        </div>
      </div>
    </section>
  );
}