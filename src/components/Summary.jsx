import React from "react";
import { useI18n } from "../hooks/useI18n";

const formatWeekRange = (startIso, endIso, fallback) => {
  if (startIso && endIso) return `${startIso} ~ ${endIso}`;
  return fallback;
};

export default function Summary({ currency, jobs, byJob, totals, weeklyTotals = [] }) {
  const { t } = useI18n();

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 space-y-3 border border-transparent dark:border-gray-800">
      <h2 className="font-semibold">{t("totals")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {jobs.map((j) => (
          <div key={j.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
            <div className="text-gray-600 dark:text-gray-300 text-sm mb-1">{j.name}</div>
            <div className="text-lg font-semibold">
              {(byJob[j.id]?.hours ?? 0).toFixed(2)} h
            </div>
            <div className="text-sm">
              {currency} {(byJob[j.id]?.pay ?? 0).toFixed(2)}
            </div>
          </div>
        ))}
        <div className="p-4 rounded-xl bg-gray-900 text-white dark:bg-black">
          <div className="text-gray-200 text-sm mb-1">{t("overall")}</div>
          <div className="text-lg font-semibold">{(totals.hours ?? 0).toFixed(2)} h</div>
          <div className="text-sm">{currency} {(totals.pay ?? 0).toFixed(2)}</div>
        </div>
      </div>
      {weeklyTotals.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("weeklyTotals")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {weeklyTotals.map((week) => (
              <div key={week.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="text-gray-600 dark:text-gray-300 text-sm mb-1">
                  {formatWeekRange(week.startIso, week.endIso, t("unknownWeek"))}
                </div>
                <div className="text-lg font-semibold">
                  {(week.hours ?? 0).toFixed(2)} h
                </div>
                <div className="text-sm">
                  {currency} {(week.pay ?? 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
