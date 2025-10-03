import { useMemo, useReducer } from "react";
import Settings from "./components/Settings";
import ShiftTable from "./components/ShiftTable";
import Summary from "./components/Summary";
import CsvControls from "./components/CsvControls";
import "./App.css"

const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const todayIso = () => new Date().toISOString().slice(0, 10);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const emptyShift = (jobs) => ({
  id: uid(),
  date: todayIso(),
  job: "A",
  start: "09:00",
  end: "17:00",
  unpaidBreakMin: 30,
  rate: jobs?.A ?? 20,  // 근무처 기본 시급 자동 세팅
});

const initialState = {
  currency: "CAD",
  jobs: { A: 20, B: 25 }, // 근무처별 기본 시급
  shifts: [],             // 시작은 비워두고, 첫 행은 버튼으로 추가
};

function reducer(state, action) {
  switch (action.type) {
    case "setCurrency":
      return { ...state, currency: action.value };
    case "setJobRate": {
      const jobs = { ...state.jobs, [action.job]: Number(action.value) || 0 };
      // 이미 입력된 shift 중 해당 job의 rate가 "기본값과 동일"했다면 같이 갱신
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
      return { ...state, shifts: state.shifts.filter((s) => s.id !== action.id) };
    case "updateShift":
      return {
        ...state,
        shifts: state.shifts.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    case "replaceAllShifts": {
      const next = Array.isArray(action.value) ? action.value : [];
      return { ...state, shifts: next };
    }
    case "appendShifts": {
      const next = Array.isArray(action.value) ? action.value : [];
      return { ...state, shifts: [...state.shifts, ...next] };
    }			
    default:
      return state;
  }
}

// 유틸: 분 계산 (자정 넘김 지원)
const minutesBetween = (start, end) => {
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  let s = sh * 60 + sm,
    e = eh * 60 + em;
  if (e < s) e += 24 * 60;
  return e - s;
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currency, jobs, shifts } = state;

  // 합계 계산
  const { perShift, byJob, totals } = useMemo(() => {
    const perShift = shifts.map((s) => {
      const workedMin = Math.max(0, minutesBetween(s.start, s.end) - (Number(s.unpaidBreakMin) || 0));
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
      hours: round2(Object.values(byJob).reduce((t, v) => t + (v.hours || 0), 0)),
      pay: round2(Object.values(byJob).reduce((t, v) => t + (v.pay || 0), 0)),
    };

    return { perShift, byJob, totals };
  }, [shifts]);

	// Import 콜백들
	const handleImportReplace = (imported) => {
		dispatch({ type: "replaceAllShifts", value: imported });
	};
	const handleImportAppend = (imported) => {
		dispatch({ type: "appendShifts", value: imported });
	};

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Part-time Pay Calculator</h1>
          <p className="text-sm text-gray-600">데스크탑 우선 · 서로 다른 시급/휴게시간을 한 번에 계산</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-xs text-gray-600">project: part_time_pay_calculator</div>
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
              onSetJobRate={(job, value) => dispatch({ type: "setJobRate", job, value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Summary currency={currency} byJob={byJob} totals={totals} />
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">근무 기록</h2>
            <button
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm"
              onClick={() => dispatch({ type: "addShift" })}
            >
              + 추가
            </button>
          </div>
          <ShiftTable
            currency={currency}
            jobs={jobs}
            shifts={shifts}
            onUpdate={(id, patch) => dispatch({ type: "updateShift", id, patch })}
            onAdd={() => dispatch({ type: "addShift" })}
            onRemove={(id) => dispatch({ type: "removeShift", id })}
          />
        </section>
      </div>
    </div>
  );
}