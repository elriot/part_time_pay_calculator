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
    "w-full rounded-lg border border-gray-300 text-sm px-3 py-2 h-9 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 " +
    "dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:focus:ring-blue-600";

  return (
    <section className="rounded-2xl border border-gray-100 bg-white dark:bg-gray-950 shadow p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t("settings")}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage job names, wages, and auto break rules
        </p>
      </div>

      {/* Currency */}
      <div className="flex flex-col max-w-sm">
        <label className="text-sm text-gray-700 dark:text-gray-300 mb-1">{t("currency")}</label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-gray-50 text-sm px-3 py-2 h-9 
                     focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400
                     dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:focus:ring-blue-600"
          value={currency}
          onChange={(e) => onSetCurrency(e.target.value)}
        >
          <option>CAD</option>
          <option>USD</option>
          <option>KRW</option>
        </select>
      </div>

      {/* Job cards */}
      <div className="space-y-4">
        {jobs.map((j) => {
          const enabled = !!j.breakPolicy?.enabled;
          const panelId = `job-${j.id}-break`;

          return (
            <div
              key={j.id}
              className="rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 
                         p-5 space-y-4 shadow-sm transition-all hover:shadow-md"
            >
              {/* 상단 이름 / 시급 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {`Job ${j.id} name`}
                  </span>
                  <input
                    type="text"
                    className={inputBase}
                    value={j.name}
                    onChange={(e) => onSetJobName(j.id, e.target.value)}
                    placeholder="Company name"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {t("jobRate", { k: j.id })}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className={inputBase}
                    value={j.rate}
                    onChange={(e) => onSetJobRate(j.id, Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </label>
              </div>

              {/* 자동 휴게 토글 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("autoBreakTitle")}
                </span>
                <button
                  type="button"
                  aria-expanded={enabled}
                  aria-controls={panelId}
                  onClick={() =>
                    onSetJobBreakPolicy(j.id, {
                      ...j.breakPolicy,
                      enabled: !enabled,
                    })
                  }
                  className={
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
                    (enabled
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600")
                  }
                >
                  <span
                    className={
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow transition " +
                      (enabled ? "translate-x-5" : "translate-x-1")
                    }
                  />
                </button>
              </div>

              {/* 자동 휴게 설정 (토글 열림 시) */}
              <div
                id={panelId}
                className={`overflow-hidden transition-all duration-300 ${
                  enabled ? "max-h-40 opacity-100 pt-2" : "max-h-0 opacity-0"
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {t("thresholdHours")} (hours)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      className={inputBase}
                      value={j.breakPolicy?.thresholdHours ?? 6}
                      onChange={(e) =>
                        onSetJobBreakPolicy(j.id, {
                          ...j.breakPolicy,
                          thresholdHours: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
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
            </div>
          );
        })}
      </div>
    </section>
  );
}