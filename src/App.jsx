import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Settings from "./components/Settings";
import ShiftTable from "./components/ShiftTable";
import Summary from "./components/Summary";
import CsvControls from "./components/CsvControls";
import { useI18n } from "./hooks/useI18n";
import "./App.css";

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

/** 초기 상태: 회사별 breakPolicy 포함 */
const initialState = {
  currency: "CAD",
  jobs: [
    {
      id: "A",
      name: "Job A",
      rate: 20,
      breakPolicy: { enabled: true, thresholdHours: 5, minBreakMin: 30 },
    },
    {
      id: "B",
      name: "Job B",
      rate: 25,
      breakPolicy: { enabled: true, thresholdHours: 5, minBreakMin: 30 },
    },
  ],
  shifts: [],
};

const LS_KEY = "ptpc_v3"; // 구조 변경했으니 버전 올림

function reviveState(raw) {
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;

    // jobs: 배열로 강제 + breakPolicy 보정
    const jobs = Array.isArray(p.jobs)
      ? p.jobs.map((j, i) => ({
          id: j.id ?? (i === 0 ? "A" : i === 1 ? "B" : uid()),
          name: j.name ?? (j.id ? `Job ${j.id}` : `Job ${i + 1}`),
          rate: Number(j.rate) || 0,
          breakPolicy: {
            enabled: !!(j.breakPolicy?.enabled ?? true),
            thresholdHours: Number(j.breakPolicy?.thresholdHours ?? 5) || 0,
            minBreakMin: Number(j.breakPolicy?.minBreakMin ?? 30) || 0,
          },
        }))
      : initialState.jobs;

    const shifts = Array.isArray(p.shifts)
      ? p.shifts.map((s) => ({ ...s, jobId: s.jobId ?? s.job ?? "A" }))
      : [];

    return {
      currency: typeof p.currency === "string" ? p.currency : "CAD",
      jobs,
      shifts,
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

function emptyShift(jobs) {
  const j = jobs[0] ?? {
    id: "A",
    rate: 20,
    breakPolicy: { enabled: true, minBreakMin: 30 },
  };
  const defaultBreak = j.breakPolicy?.enabled
    ? j.breakPolicy.minBreakMin ?? 30
    : 0;
  return {
    id: uid(),
    date: todayIso(),
    jobId: j.id,
    start: "09:00",
    end: "17:00",
    unpaidBreakMin: defaultBreak,
    rate: j.rate, // (행에서는 안 쓰지만 CSV 호환용으로 남겨둠)
  };
}
function coerceFromBackup(payload) {
  // 안전하게 형태 보정
  const currency =
    typeof payload?.currency === "string" ? payload.currency : "CAD";

  const jobs = Array.isArray(payload?.jobs)
    ? payload.jobs.map((j, i) => ({
        id:
          j.id ??
          (i === 0
            ? "A"
            : i === 1
            ? "B"
            : crypto?.randomUUID?.() || Math.random().toString(36).slice(2)),
        name: j.name ?? (j.id ? `Job ${j.id}` : `Job ${i + 1}`),
        rate: Number(j.rate) || 0,
        breakPolicy: {
          enabled: !!(j.breakPolicy?.enabled ?? false),
          thresholdHours: Number(j.breakPolicy?.thresholdHours ?? 0) || 0,
          minBreakMin: Number(j.breakPolicy?.minBreakMin ?? 0) || 0,
        },
      }))
    : [
        {
          id: "A",
          name: "Job A",
          rate: 20,
          breakPolicy: { enabled: true, thresholdHours: 5, minBreakMin: 30 },
        },
        {
          id: "B",
          name: "Job B",
          rate: 25,
          breakPolicy: { enabled: true, thresholdHours: 5, minBreakMin: 30 },
        },
      ];

  const shifts = Array.isArray(payload?.shifts)
    ? payload.shifts.map((s) => ({
        id:
          s.id ??
          (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)),
        date: s.date ?? new Date().toISOString().slice(0, 10),
        jobId: s.jobId ?? s.job ?? "A",
        start: s.start ?? "09:00",
        end: s.end ?? "17:00",
        unpaidBreakMin: Number(s.unpaidBreakMin) || 0,
        // rate 필드는 무시(계산은 jobs.rate 사용)
      }))
    : [];

  return { currency, jobs, shifts };
}

function reducer(state, action) {
  switch (action.type) {
    case "resetAll":
      localStorage.removeItem(LS_KEY);
      return { ...initialState };

    case "setCurrency":
      return { ...state, currency: action.value };

    case "setJobName":
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === action.jobId ? { ...j, name: action.name } : j
        ),
      };

    case "setJobRate": {
      const old = state.jobs.find((j) => j.id === action.jobId);
      const newRate = Number(action.rate) || 0;
      const jobs = state.jobs.map((j) =>
        j.id === action.jobId ? { ...j, rate: newRate } : j
      );
      // (행 시급은 표시/수정 안 하므로 동기화는 선택사항) — 합계 계산에서 항상 jobs의 rate 사용
      return { ...state, jobs };
    }

    case "setJobBreakPolicy": {
      const { jobId, value } = action;
      const jobs = state.jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              breakPolicy: {
                enabled: !!value.enabled,
                thresholdHours: Number(value.thresholdHours) || 0,
                minBreakMin: Number(value.minBreakMin) || 0,
              },
            }
          : j
      );
      return { ...state, jobs };
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

    case "replaceAllShifts": {
      const next = Array.isArray(action.value)
        ? action.value.map((s) => ({ ...s, jobId: s.jobId ?? s.job ?? "A" }))
        : [];
      return { ...state, shifts: next };
    }

    case "appendShifts": {
      const next = Array.isArray(action.value)
        ? action.value.map((s) => ({ ...s, jobId: s.jobId ?? s.job ?? "A" }))
        : [];
      return { ...state, shifts: [...state.shifts, ...next] };
    }

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
    case "restoreAll": {
      const next = coerceFromBackup(action.value);
      return { ...state, ...next };
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

  // auto-save
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
  const handleFullExport = () => {
    const payload = {
      currency: state.currency,
      jobs: state.jobs,
      shifts: state.shifts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `part_time_backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const jsonInputRef = React.useRef(null);
  const handleFullImportClick = () => jsonInputRef.current?.click();
  const handleFullImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      dispatch({ type: "restoreAll", value: data });
    } catch (err) {
      alert("Invalid backup file.");
      console.error(err);
    } finally {
      e.target.value = ""; // 같은 파일 다시 선택 가능하게
    }
  };
  // 합계 계산: 회사별 정책 적용
  const { byJob, totals } = useMemo(() => {
    const byJob = {};
    for (const s of shifts) {
      const job = jobs.find((j) => j.id === (s.jobId ?? s.job));
      const rate = Number(job?.rate ?? 0);
      const policy = job?.breakPolicy;
      const scheduledMin = minutesBetween(s.start, s.end);
      const thresholdMin = Number(policy?.thresholdHours ?? 0) * 60;
      const policyMin =
        policy?.enabled && scheduledMin >= thresholdMin
          ? Number(policy?.minBreakMin ?? 0)
          : 0;

      const effectiveBreak = Math.max(Number(s.unpaidBreakMin) || 0, policyMin);
      const paidMin = Math.max(0, scheduledMin - effectiveBreak);
      const hours = paidMin / 60;
      const pay = round2(hours * rate);

      const key = s.jobId ?? s.job ?? "A";
      if (!byJob[key]) byJob[key] = { hours: 0, pay: 0 };
      byJob[key].hours += hours;
      byJob[key].pay += pay;
    }
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
    return { byJob, totals };
  }, [shifts, jobs]);

  const handleImportReplace = (imported) =>
    dispatch({ type: "replaceAllShifts", value: imported });
  const handleImportAppend = (imported) =>
    dispatch({ type: "appendShifts", value: imported });
  const handleReorder = (fromIndex, toIndex) =>
    dispatch({ type: "reorderShifts", fromIndex, toIndex });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 헤더 생략 — 기존 그대로 */}
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
              >
                {theme === "dark" ? t("themeLight") : t("themeDark")}
              </button>
              <button
                className="px-2 py-1 text-xs rounded border bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                onClick={() => setLang(lang === "en" ? "ko" : "en")}
              >
                {lang === "en" ? t("langKorean") : t("langEnglish")}
              </button>
              <button
                className="px-2 py-1 text-xs rounded border bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                onClick={() => dispatch({ type: "resetAll" })}
              >
                {t("clearLocalData")}
              </button>
              <span className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 border dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                {t("autoSaveOn")}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <button
                className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-900 text-sm border hover:bg-blue-200"
                onClick={handleFullExport}
              >
                Full Backup (JSON)
              </button>

              <input
                ref={jsonInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFullImportChange}
              />
              <button
                className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-900 text-sm border hover:bg-blue-200"
                onClick={handleFullImportClick}
              >
                Restore from JSON
              </button>
            </div>

            {/* 기존 CsvControls 그대로 */}
            <CsvControls
              shifts={shifts}
              onImportReplace={(imported) =>
                dispatch({ type: "replaceAllShifts", value: imported })
              }
              onImportAppend={(imported) =>
                dispatch({ type: "appendShifts", value: imported })
              }
            />
          </div>
        </header>

        {/* 세로 스택: Settings → Summary → Shifts */}
        <div className="space-y-4">
          <Settings
            currency={currency}
            jobs={jobs}
            onSetCurrency={(v) => dispatch({ type: "setCurrency", value: v })}
            onSetJobName={(jobId, name) =>
              dispatch({ type: "setJobName", jobId, name })
            }
            onSetJobRate={(jobId, rate) =>
              dispatch({ type: "setJobRate", jobId, rate })
            }
            onSetJobBreakPolicy={(jobId, value) =>
              dispatch({ type: "setJobBreakPolicy", jobId, value })
            }
          />

          <Summary
            currency={currency}
            jobs={jobs}
            byJob={byJob}
            totals={totals}
          />

          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 space-y-3 border border-transparent dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t("shifts")}</h2>
              <div className="flex items-center gap-2">
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
                <button
                  className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm dark:bg-black"
                  onClick={() => dispatch({ type: "addShift" })}
                >
                  {t("add")}
                </button>
              </div>
            </div>

          </section>
        </div>

        {/* Shifts 섹션 — 기존과 동일 */}
        {/* ... */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 space-y-3 border border-transparent dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("shifts")}</h2>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border bg-gray-100 text-gray-900 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
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
      </div>
    </div>
  );
}
