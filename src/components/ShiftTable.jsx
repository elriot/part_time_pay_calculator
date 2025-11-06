import React, { useState, useMemo } from "react";
import ShiftRow from "./ShiftRow";
import { useI18n } from "../hooks/useI18n";
import { formatWeekRange, getWeekBoundary } from "../utils/week";

export default function ShiftTable({
  currency, jobs, shifts, onUpdate, onAdd, onRemove, onReorder,
}) {
  const { t } = useI18n();
  const [draggingId, setDraggingId] = useState(null);
  const [overId, setOverId] = useState(null);

  const WEEK_BACKGROUND = [
    "bg-white dark:bg-gray-900/40",
    "bg-gray-50 dark:bg-gray-900/60",
  ];

  const idToIndex = useMemo(() => {
    const map = new Map();
    shifts.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [shifts]);

  const enhancedShifts = useMemo(() => {
    const weekOrder = new Map();
    const processedCount = new Map();

    return shifts.map((shift, idx) => {
      const boundary = getWeekBoundary(shift.date);
      if (!weekOrder.has(boundary.key)) {
        weekOrder.set(boundary.key, weekOrder.size);
      }
      const weekIndex = weekOrder.get(boundary.key);
      const seen = processedCount.get(boundary.key) ?? 0;
      processedCount.set(boundary.key, seen + 1);

      return {
        shift,
        idx,
        weekIndex,
        isWeekStart: seen === 0,
        weekStartIso: boundary.startIso,
        weekEndIso: boundary.endIso,
      };
    });
  }, [shifts]);

  const handleDragStart = (id) => setDraggingId(id);
  const handleDragOver = (e, id) => { e.preventDefault(); setOverId(id); };
  const finishDrag = () => {
    if (draggingId && overId && draggingId !== overId) {
      const fromIndex = idToIndex.get(draggingId);
      const toIndex = idToIndex.get(overId);
      if (typeof fromIndex === "number" && typeof toIndex === "number") onReorder?.(fromIndex, toIndex);
    }
    setDraggingId(null); setOverId(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-600 dark:text-gray-300">
          <tr>
            <th className="py-2 pr-2 w-10">{t("thNo")}</th>
            <th className="py-2 pr-2 w-8">{t("thHandle")}</th>
            <th className="py-2 pr-2">{t("thDate")}</th>
            <th className="py-2 pr-2">{t("thJob")}</th>
            <th className="py-2 pr-2">{t("thStart")}</th>
            <th className="py-2 pr-2">{t("thEnd")}</th>
            {/* <th className="py-2 pr-2">{t("thBreak")}</th> */}
            <th className="py-2 pr-2">{t("thScheduledHours")}</th>
            <th className="py-2 pr-2">{t("thPaidHours")}</th>
            {/* ⬇️ 시급 컬럼 제거 */}
            <th className="py-2 pr-2">{t("thDailyTotal")}</th>
            <th className="py-2 pr-2"> </th>
          </tr>
        </thead>
        <tbody onDrop={finishDrag} onDragEnd={finishDrag}>
          {enhancedShifts.map(({ shift, idx, weekIndex, isWeekStart, weekStartIso, weekEndIso }) => {
            const isDragging = draggingId === shift.id;
            const isOver = overId === shift.id && draggingId !== overId;
            const weekBgClass = WEEK_BACKGROUND[weekIndex % WEEK_BACKGROUND.length];
            const weekLabel = formatWeekRange(weekStartIso, weekEndIso, t("unknownWeek"));
            return (
              <React.Fragment key={shift.id}>
                {isWeekStart && (
                  <tr className={`text-xs text-gray-500 dark:text-gray-400 ${weekBgClass}`}>
                    <td colSpan={10} className="pt-4 pb-1 font-semibold tracking-wide uppercase">
                      {t("weekLabel")}: {weekLabel}
                    </td>
                  </tr>
                )}
                <ShiftRow
                  rowIndex={idx}
                  currency={currency}
                  jobs={jobs}
                  shift={shift}
                  onChange={(patch) => onUpdate(shift.id, patch)}
                  onRemove={() => onRemove(shift.id)}
                  rowDragProps={{
                    draggable: true,
                    onDragStart: () => handleDragStart(shift.id),
                    onDragOver: (e) => handleDragOver(e, shift.id),
                  }}
                  isDragging={isDragging}
                  isOver={isOver}
                  rowClassName={weekBgClass}
                />
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm dark:bg-black"
          onClick={onAdd}
        >
          {t("add")}
        </button>
        <span className="text-xs text-gray-500">{t("tipReorder")}</span>
      </div>
    </div>
  );
}
