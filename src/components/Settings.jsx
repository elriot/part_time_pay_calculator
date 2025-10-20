import React from "react";
import { useI18n } from "../hooks/useI18n";

export default function Settings({
  currency,
  jobs,
  onSetCurrency,
  onSetJobName,
  onSetJobRate,
  onSetJobBreakPolicy,
}) {
  const { t } = useI18n();
  const inputBase =
    "w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100";

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 space-y-4 border border-transparent dark:border-gray-800">
      <h2 className="font-semibold dark:text-gray-100">{t("settings")}</h2>

      {/* Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="block text-gray-600 dark:text-gray-300">
            {t("currency")}
          </span>
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
      </div>

      {/* Jobs */}
      <div className="space-y-4">
        {jobs.map((j) => (
          <div
            key={j.id}
            className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="block text-gray-600 dark:text-gray-300">
                  Job {j.id} name
                </span>
                <input
                  type="text"
                  className={inputBase}
                  value={j.name}
                  onChange={(e) => onSetJobName(j.id, e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600 dark:text-gray-300">
                  {t("jobRate", { k: j.id })}
                </span>
                <input
                  type="number"
                  step="0.01"
                  className={inputBase}
                  value={j.rate}
                  onChange={(e) =>
                    onSetJobRate(j.id, Number(e.target.value) || 0)
                  }
                />
              </label>
            </div>

            {/* 회사별 자동 휴게 정책 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {/* Enable toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!j.breakPolicy?.enabled}
                  onChange={(e) =>
                    onSetJobBreakPolicy(j.id, {
                      ...j.breakPolicy,
                      enabled: e.target.checked,
                    })
                  }
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t("autoBreakTitle")}
                </span>
              </label>

              {/* Threshold */}
              <label className="text-sm">
                <span className="block text-gray-600 dark:text-gray-300 mb-1">
                  {t("thresholdHold")} (hours)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  className={inputBase}
                  value={j.breakPolicy?.thresholdHours ?? 5}
                  onChange={(e) =>
                    onSetJobBreakPolicy(j.id, {
                      ...j.breakPolicy,
                      thresholdHours: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>

              {/* Break minutes */}
              <label className="text-sm">
                <span className="block text-gray-600 dark:text-gray-300 mb-1">
                  {t("minBreakMinutes")} (minutes)
                </span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  className={inputBase}
                  value={j.breakPolicy?.minBreakMin ?? 30}
                  onChange={(e) =>
                    onSetJobBreakPolicy(j.id, {
                      ...j.breakPolicy,
                      minBreakMin: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
