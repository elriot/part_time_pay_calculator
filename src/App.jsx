import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Settings from "./components/Settings";
import ShiftTable from "./components/ShiftTable";
import Summary from "./components/Summary";
import { useI18n } from "./hooks/useI18n";
import "./App.css";
import { getWeekBoundary } from "./utils/week";

const THEME_KEY = "ptpc_theme";
const LANGUAGE_LABELS = {
  en: "langEnglish",
  ko: "langKorean",
  ja: "langJapanese",
};
const LANGUAGE_CODES = Object.keys(LANGUAGE_LABELS);
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
      breakPolicy: { enabled: true, thresholdHours: 6, minBreakMin: 30 },
    },
    {
      id: "B",
      name: "Job B",
      rate: 25,
      breakPolicy: { enabled: true, thresholdHours: 6, minBreakMin: 30 },
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
            thresholdHours: Number(j.breakPolicy?.thresholdHours ?? 6) || 0,
            minBreakMin: Number(j.breakPolicy?.minBreakMin ?? 30) || 0,
          },
        }))
      : initialState.jobs;

    const jobMap = new Map(jobs.map((job) => [job.id, job]));
    const shifts = Array.isArray(p.shifts)
      ? p.shifts.map((s) => {
          const jobId = s.jobId ?? s.job ?? "A";
          const job = jobMap.get(jobId);
          const start = s.start ?? "09:00";
          const end = s.end ?? "17:00";
          const scheduledMin = minutesBetween(start, end);
          const thresholdMin =
            Number(job?.breakPolicy?.thresholdHours ?? 0) * 60;
          const shouldApplyPolicy =
            job?.breakPolicy?.enabled && scheduledMin >= thresholdMin;
          const unpaidBreakMinRaw = Number(s.unpaidBreakMin) || 0;
          const unpaidBreakMin =
            job?.breakPolicy?.enabled && !shouldApplyPolicy
              ? 0
              : unpaidBreakMinRaw;
          return {
            ...s,
            id: s.id ?? uid(),
            date: s.date ?? todayIso(),
            jobId,
            start,
            end,
            unpaidBreakMin,
          };
        })
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
  return {
    id: uid(),
    date: todayIso(),
    jobId: j.id,
    start: "09:00",
    end: "17:00",
    unpaidBreakMin: 0,
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

  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  const shifts = Array.isArray(payload?.shifts)
    ? payload.shifts.map((s) => {
        const jobId = s.jobId ?? s.job ?? "A";
        const job = jobMap.get(jobId);
        const start = s.start ?? "09:00";
        const end = s.end ?? "17:00";
        const scheduledMin = minutesBetween(start, end);
        const thresholdMin =
          Number(job?.breakPolicy?.thresholdHours ?? 0) * 60;
        const shouldApplyPolicy =
          job?.breakPolicy?.enabled && scheduledMin >= thresholdMin;
        const unpaidBreakMinRaw = Number(s.unpaidBreakMin) || 0;
        const unpaidBreakMin =
          job?.breakPolicy?.enabled && !shouldApplyPolicy
            ? 0
            : unpaidBreakMinRaw;

        return {
          id:
            s.id ??
            (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)),
          date: s.date ?? new Date().toISOString().slice(0, 10),
          jobId,
          start,
          end,
          unpaidBreakMin,
          // rate 필드는 무시(계산은 jobs.rate 사용)
        };
      })
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
      alert(t("invalidBackup"));
      console.error(err);
    } finally {
      e.target.value = ""; // 같은 파일 다시 선택 가능하게
    }
  };
  // 합계 계산: 회사별 정책 적용
  const { byJob, totals, weeklyTotals } = useMemo(() => {
    const byJob = {};
    const byWeek = {};
    for (const s of shifts) {
      const job = jobs.find((j) => j.id === (s.jobId ?? s.job));
      const rate = Number(job?.rate ?? 0);
      const policy = job?.breakPolicy;
      const scheduledMin = minutesBetween(s.start, s.end);
      const scheduledHours = scheduledMin / 60;
      const thresholdMin = Number(policy?.thresholdHours ?? 0) * 60;
      const manualBreak = Number(s.unpaidBreakMin) || 0;
      const shouldApplyPolicy =
        policy?.enabled && scheduledMin >= thresholdMin;
      const policyMin = shouldApplyPolicy
        ? Number(policy?.minBreakMin ?? 0)
        : 0;

      const effectiveBreak = shouldApplyPolicy
        ? Math.max(manualBreak, policyMin)
        : manualBreak;
      const paidMin = Math.max(0, scheduledMin - effectiveBreak);
      const hours = paidMin / 60;
      const pay = round2(hours * rate);
      const week = getWeekBoundary(s.date);

      const key = s.jobId ?? s.job ?? "A";
      if (!byJob[key]) byJob[key] = { hours: 0, pay: 0 };
      byJob[key].hours += hours;
      byJob[key].pay += pay;

      if (!byWeek[week.key]) {
        byWeek[week.key] = {
          hours: 0,
          pay: 0,
          startIso: week.startIso,
          endIso: week.endIso,
          scheduledHours: 0,
        };
      }
      byWeek[week.key].hours += hours;
      byWeek[week.key].pay += pay;
      byWeek[week.key].scheduledHours += scheduledHours;
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
    const weeklyTotals = Object.entries(byWeek)
      .map(([id, value]) => ({
        id,
        startIso: value.startIso,
        endIso: value.endIso,
        hours: round2(value.hours),
        pay: round2(value.pay),
        scheduledHours: round2(value.scheduledHours ?? 0),
      }))
      .sort((a, b) => {
        if (a.startIso && b.startIso) {
          return b.startIso.localeCompare(a.startIso);
        }
        if (a.startIso) return -1;
        if (b.startIso) return 1;
        return a.id.localeCompare(b.id);
      });
    return { byJob, totals, weeklyTotals };
  }, [shifts, jobs]);

  const handleReorder = (fromIndex, toIndex) =>
    dispatch({ type: "reorderShifts", fromIndex, toIndex });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 헤더 생략 — 기존 그대로 */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("appTitle")}</h1>
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
              <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                <span>{t("language")}:</span>
                <select
                  className="rounded border bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 px-1 py-0.5"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  {LANGUAGE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {t(LANGUAGE_LABELS[code] ?? LANGUAGE_LABELS.en)}
                    </option>
                  ))}
                </select>
              </label>
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
                {t("saveJson")}
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
                {t("loadJson")}
              </button>
            </div>

            {/* 기존 CsvControls 그대로 */}
            {/* <CsvControls
              shifts={shifts}
              onImportReplace={(imported) =>
                dispatch({ type: "replaceAllShifts", value: imported })
              }
              onImportAppend={(imported) =>
                dispatch({ type: "appendShifts", value: imported })
              }
            /> */}
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
            weeklyTotals={weeklyTotals}
          />
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
