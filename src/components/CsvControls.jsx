import React, { useRef } from "react";
import { useI18n } from "../hooks/useI18n";

// (유틸 동일, 주석 영문 가능)
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
      if (c === '\r') { if (text[i + 1] === '\n') { i++; } row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
      cur += c; i++; continue;
    }
  }
  row.push(cur); rows.push(row);
  while (rows.length && rows[rows.length - 1].every((x) => x === "")) rows.pop();
  return rows;
}
const HEADERS = ["id","date","job","start","end","unpaidBreakMin","rate","note"];

export default function CsvControls({ shifts, onImportReplace, onImportAppend }) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const fileRefAppend = useRef(null);

  const handleExport = () => {
    const lines = [HEADERS];
    for (const s of shifts) {
      lines.push([ s.id, s.date, s.job, s.start, s.end, s.unpaidBreakMin ?? 0, s.rate ?? 0, s.note ?? "" ]);
    }
    const csv = lines.map(toCSVRow).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0,10);
    a.href = url; a.download = `shifts_${today}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const parseAndMap = async (file, mode) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) return;

    const header = rows[0].map((h) => h.trim());
    const isHeader = header.length >= HEADERS.length &&
      HEADERS.every((h, idx) => header[idx] && header[idx].toLowerCase() === h.toLowerCase());

    const dataRows = isHeader ? rows.slice(1) : rows;

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

    const imported = dataRows.filter(Boolean).map(toShift);
    if (!imported.length) return;

    if (mode === "replace") onImportReplace(imported);
    if (mode === "append") onImportAppend(imported);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm" onClick={handleExport}>
        {t("exportCsv")}
      </button>

      <input
        ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseAndMap(f, "replace").finally(() => (fileRef.current.value = ""));
        }}
      />
      <button
        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-900 text-sm border"
        onClick={() => fileRef.current?.click()}
      >
        {t("importCsvReplace")}
      </button>

      <input
        ref={fileRefAppend} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseAndMap(f, "append").finally(() => (fileRefAppend.current.value = ""));
        }}
      />
      <button
        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-900 text-sm border"
        onClick={() => fileRefAppend.current?.click()}
      >
        {t("importCsvAppend")}
      </button>
    </div>
  );
}