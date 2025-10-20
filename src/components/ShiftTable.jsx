import React, { useState, useMemo } from "react";
import ShiftRow from "./ShiftRow";

export default function ShiftTable({
  currency,
  jobs,
  shifts,
  onUpdate,
  onAdd,
  onRemove,
  onReorder, // (fromIndex, toIndex)
}) {
  const [draggingId, setDraggingId] = useState(null);
  const [overId, setOverId] = useState(null);

  const idToIndex = useMemo(() => {
    const map = new Map();
    shifts.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [shifts]);

  const handleDragStart = (id) => setDraggingId(id);
  const handleDragOver = (e, id) => {
    e.preventDefault(); // drop 허용
    setOverId(id);
  };
  const finishDrag = () => {
    if (draggingId && overId && draggingId !== overId) {
      const fromIndex = idToIndex.get(draggingId);
      const toIndex = idToIndex.get(overId);
      if (typeof fromIndex === "number" && typeof toIndex === "number") {
        onReorder?.(fromIndex, toIndex);
      }
    }
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-600 dark:text-gray-300">
          <tr>
            <th className="py-2 pr-2 w-10">#</th>
            <th className="py-2 pr-2 w-8">↕︎</th>
            <th className="py-2 pr-2">날짜</th>
            <th className="py-2 pr-2">근무처</th>
            <th className="py-2 pr-2">시작</th>
            <th className="py-2 pr-2">끝</th>
            <th className="py-2 pr-2">휴게(분)</th>
            <th className="py-2 pr-2">유급시간(h)</th>
            <th className="py-2 pr-2">시급</th>
            <th className="py-2 pr-2">일급</th>
            <th className="py-2 pr-2"> </th>
          </tr>
        </thead>
        <tbody onDrop={finishDrag} onDragEnd={finishDrag}>
          {shifts.map((shift, idx) => {
            const isDragging = draggingId === shift.id;
            const isOver = overId === shift.id && draggingId !== overId;

            return (
              <ShiftRow
                key={shift.id}
                rowIndex={idx}                // ← 번호 표시용
                currency={currency}
                jobs={jobs}
                shift={shift}
                onChange={(patch) => onUpdate(shift.id, patch)}
                onRemove={() => onRemove(shift.id)}
                // 드래그 관련
                rowDragProps={{
                  draggable: true,
                  onDragStart: () => handleDragStart(shift.id),
                  onDragOver: (e) => handleDragOver(e, shift.id),
                }}
                isDragging={isDragging}
                isOver={isOver}
              />
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm dark:bg-black"
          onClick={onAdd}
        >
          + 추가
        </button>
        <span className="text-xs text-gray-500">
          팁: ↕︎ 핸들을 드래그해서 순서를 바꿀 수 있어요.
        </span>
      </div>
    </div>
  );
}