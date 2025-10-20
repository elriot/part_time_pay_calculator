import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Settings from "./components/Settings";
import ShiftTable from "./components/ShiftTable";
import Summary from "./components/Summary";
import CsvControls from "./components/CsvControls";
import { useI18n } from "./hooks/useI18n";
import "./App.css";

/* Theme hook 동일 */
const THEME_KEY = "ptpc_theme";
function useTheme() {
  const getInitial = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };
  const [theme, setTheme] = useState(getInitial);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return { theme, setTheme };
}

/* Utilities 동일 */
const uid = () =>
  crypto?.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
const todayIso = () => new Date().toISOString().slice(0, 10);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const minutesBetween = (start, end) => {
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  let s = sh * 60 + sm,
    e = eh * 60 + em;
  if (e < s) e += 24 * 60;
  return e - s;
};
const emptyShift = (jobs) => ({
  id: uid(),
  date: todayIso(),
  job: "A",
  start: "09:00",
  end: "17:00",
  unpaidBreakMin: 30,
  rate: jobs?.A ?? 20,
});

/* State / Reducer 동일 (문구 없음) */
const initialState = { currency: "CAD", jobs: { A: 20, B: 25 }, shifts: [] };
const LS_KEY = "ptpc_v1";
function reviveState(raw) {
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    return {
      currency: typeof p.currency === "string" ? p.currency : "CAD",
      jobs:
        p.jobs && typeof p.jobs === "object"
          ? { A: 20, B: 25, ...p.jobs }
          : { A: 20, B: 25 },
      shifts: Array.isArray(p.shifts) ? p.shifts : [],
    };
  } catch {
    return null;
  }
}
function init(initial) {
  const raw = localStorage.getItem(LS_KEY);
  const revived = raw ? reviveState(raw) : null;
  return revived ? { ...initial, ...revived } : initial;
}
function reducer(state, action) {
  switch (action.type) {
    case "resetAll": {
      localStorage.removeItem(LS_KEY);
      return { ...initialState };
    }
    case "setCurrency":
      return { ...state, currency: action.value };
    case "setJobRate": {
      const jobs = { ...state.jobs, [action.job]: Number(action.value) || 0 };
      const shifts = state.shifts.map((s) =>
        s.job === action.job && s.rate === state.jobs[action.job]
          ? { ...s, rate: jobs[action.job] }
          : s
      );
      return { ...state, jobs, shifts };
    }
    case "addShift":
      return { ...state, shifts: [...state.shifts, emptyShift(state.jobs)] };
    case "removeShift":
      return {
        ...state,
        shifts: state.shifts.filter((s) => s.id !== action.id),
      };
    case "updateShift":
      return {
        ...state,
        shifts: state.shifts.map((s) =>
          s.id === action.id ? { ...s, ...action.patch } : s
        ),
      };
    case "replaceAllShifts":
      return {
        ...state,
        shifts: Array.isArray(action.value) ? action.value : [],
      };
    case "appendShifts":
      return {
        ...state,
        shifts: [
          ...state.shifts,
          ...(Array.isArray(action.value) ? action.value : []),
        ],
      };
    case "reorderShifts": {
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return state;
      const next = [...state.shifts];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...state, shifts: next };
    }
    case "sortByDateStart": {
      const sorted = [...state.shifts].sort((a, b) => {
        const d = (a.date || "").localeCompare(b.date || "");
        if (d !== 0) return d;
        return (a.start || "").localeCompare(b.start || "");
      });
      return { ...state, shifts: sorted };
    }
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState, init);
  const { currency, jobs, shifts } = state;
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useI18n();

  // Auto-save
  const saveTimer = useRef(null);
  useEffect(() => {
    const payload = JSON.stringify({ currency, jobs, shifts });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(
      () => localStorage.setItem(LS_KEY, payload),
      300
    );
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [currency, jobs, shifts]);

  // Calculations
  const { perShift, byJob, totals } = useMemo(() => {
    const perShift = shifts.map((s) => {
      const workedMin = Math.max(
        0,
        minutesBetween(s.start, s.end) - (Number(s.unpaidBreakMin) || 0)
      );
      const hours = workedMin / 60;
      const pay = round2(hours * (s.rate || 0));
      return { ...s, hours: round2(hours), pay };
    });
    const byJob = perShift.reduce(
      (acc, s) => {
        const k = s.job || "A";
        acc[k] = acc[k] || { hours: 0, pay: 0 };
        acc[k].hours += s.hours;
        acc[k].pay += s.pay;
        return acc;
      },
      { A: { hours: 0, pay: 0 }, B: { hours: 0, pay: 0 } }
    );
    Object.keys(byJob).forEach((k) => {
      byJob[k].hours = round2(byJob[k].hours);
      byJob[k].pay = round2(byJob[k].pay);
    });
    const totals = {
      hours: round2(
        Object.values(byJob).reduce((t, v) => t + (v.hours || 0), 0)
      ),
      pay: round2(Object.values(byJob).reduce((t, v) => t + (v.pay || 0), 0)),
    };
    return { perShift, byJob, totals };
  }, [shifts]);

  const handleImportReplace = (imported) =>
    dispatch({ type: "replaceAllShifts", value: imported });
  const handleImportAppend = (imported) =>
    dispatch({ type: "appendShifts", value: imported });
  const handleReorder = (fromIndex, toIndex) =>
    dispatch({ type: "reorderShifts", fromIndex, toIndex });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Part-time Pay Calculator</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("appSubtitle")}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {t("projectLabel")}
            </div>
            <div className="flex gap-2 items-center">
              <button
                className="px-2 py-1 text-xs rounded border bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Toggle dark mode"
                aria-pressed={theme === "dark"}
              >
                {theme === "dark" ? t("themeLight") : t("themeDark")}
              </button>

              {/* 언어 토글 */}
              <button
                className="px-2 py-1 text-xs rounded border bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                onClick={() => setLang(lang === "en" ? "ko" : "en")}
                title="Switch language"
              >
                {lang === "en" ? t("langKorean") : t("langEnglish")}
              </button>

              <button
                className="px-2 py-1 text-xs rounded border bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                onClick={() => dispatch({ type: "resetAll" })}
                title={t("clearLocalData")}
              >
                {t("clearLocalData")}
              </button>
              <span className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 border dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                {t("autoSaveOn")}
              </span>
            </div>

            <CsvControls
              shifts={shifts}
              onImportReplace={handleImportReplace}
              onImportAppend={handleImportAppend}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <Settings
              currency={currency}
              jobs={jobs}
              onSetCurrency={(v) => dispatch({ type: "setCurrency", value: v })}
              onSetJobRate={(job, value) =>
                dispatch({ type: "setJobRate", job, value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Summary currency={currency} byJob={byJob} totals={totals} />
          </div>
        </div>

        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 space-y-3 border border-transparent dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("shifts")}</h2>

            <div className="flex items-center gap-2">
              {/* 정렬 버튼 */}
              <button
                className="px-3 py-1.5 rounded-lg border bg-gray-100 text-gray-900 text-sm hover:bg-gray-200
                   dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                onClick={() => dispatch({ type: "sortByDateStart" })}
                title={t("sortByDate")}
              >
                <span className="inline-flex items-center gap-1">
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M5 3.5a.75.75 0 0 1 1.5 0v10.69l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L5 14.19V3.5Z" />
                    <path d="M10.75 5.5a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 4a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 4a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Z" />
                  </svg>
                  {t("sortByDate")}
                </span>
              </button>

              {/* + Add 버튼 */}
              <button
                className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm dark:bg-black"
                onClick={() => dispatch({ type: "addShift" })}
              >
                {t("add")}
              </button>
            </div>
          </div>

          <ShiftTable
            currency={currency}
            jobs={jobs}
            shifts={shifts}
            onUpdate={(id, patch) =>
              dispatch({ type: "updateShift", id, patch })
            }
            onAdd={() => dispatch({ type: "addShift" })}
            onRemove={(id) => dispatch({ type: "removeShift", id })}
            onReorder={handleReorder}
          />
        </section>

        <footer className="text-xs text-gray-500 pt-2">
          {t("footerNote")}
        </footer>
      </div>
    </div>
  );
}
