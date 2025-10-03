
import React, { useRef } from "react";

// CSV 유틸: RFC4180 스타일로 "필드 내 ,/줄바꿈/따옴표" 안전 처리
function toCSVRow(arr) {
  return arr
    .map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      const needsQuote = /[",\n\r]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function parseCSV(text) {
  const rows = [];
  let i = 0, cur = "", inQuotes = false, row = [];
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cur += c; i++; continue;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(cur); cur = ""; i++; continue; }
      if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
      if (c === '\r') { // CRLF 지원
        if (text[i + 1] === '\n') { i++; }
        row.push(cur); rows.push(row); row = []; cur = ""; i++; continue;
      }
      cur += c; i++; continue;
    }
  }
  // 마지막 셀
  row.push(cur); rows.push(row);
  // 마지막이 빈 줄일 때 제거
  while (rows.length && rows[rows.length - 1].every((x) => x === "")) rows.pop();
  return rows;
}

const HEADERS = ["id","date","job","start","end","unpaidBreakMin","rate","note"];

export default function CsvControls({ shifts, onImportReplace, onImportAppend }) {
  const fileRef = useRef(null);
  const fileRefAppend = useRef(null);

  const handleExport = () => {
    const lines = [HEADERS];
    for (const s of shifts) {
      lines.push([
        s.id,
        s.date,
        s.job,
        s.start,
        s.end,
        s.unpaidBreakMin ?? 0,
        s.rate ?? 0,
        s.note ?? ""
      ]);
    }
    const csv = lines.map(toCSVRow).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `shifts_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const parseAndMap = async (file, mode) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) return;

    // 헤더 확인
    const header = rows[0].map((h) => h.trim());
    const isHeader =
      header.length >= HEADERS.length &&
      HEADERS.every((h, idx) => header[idx] && header[idx].toLowerCase() === h.toLowerCase());

    const dataRows = isHeader ? rows.slice(1) : rows;

    // CSV → shift 객체 매핑(+타입 변환)
    const toShift = (cells) => {
      const get = (idx) => (cells[idx] ?? "").trim();
      return {
        id: get(0) || crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        date: get(1) || new Date().toISOString().slice(0,10),
        job: (get(2) || "A").toUpperCase(),
        start: get(3) || "09:00",
        end: get(4) || "17:00",
        unpaidBreakMin: Number(get(5)) || 0,
        rate: Number(get(6)) || 0,
        note: get(7) || ""
      };
    };

    const imported = dataRows
      .filter((r) => r && r.length) // 빈 줄 제거
      .map(toShift);

    if (!imported.length) return;

    if (mode === "replace") onImportReplace(imported);
    if (mode === "append") onImportAppend(imported);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm"
        onClick={handleExport}
      >
        CSV 내보내기
      </button>

      {/* 교체 Import */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseAndMap(f, "replace").finally(() => (fileRef.current.value = ""));
        }}
      />
      <button
        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-900 text-sm border"
        onClick={() => fileRef.current?.click()}
      >
        CSV 불러오기(교체)
      </button>

      {/* 추가 Import */}
      <input
        ref={fileRefAppend}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseAndMap(f, "append").finally(() => (fileRefAppend.current.value = ""));
        }}
      />
      <button
        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-900 text-sm border"
        onClick={() => fileRefAppend.current?.click()}
      >
        CSV 불러오기(추가)
      </button>
    </div>
  );
}