import React, { useState, useMemo } from "react";
import ShiftRow from "./ShiftRow";

export default function ShiftTable({
  currency,
  jobs,
  shifts,
  onUpdate,
  onAdd,
  onRemove,
  onReorder,
}) {
  const [draggingId, setDraggingId] = useState(null);
  const [overId, setOverId] = useState(null);

  const idToIndex = useMemo(() => {
    const map = new Map();
    shifts.forEach((s, i) => map.set(s.id, i));
    return map;
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
            <th className="py-2 pr-2 w-10">#</th>
            <th className="py-2 pr-2 w-8">↕︎</th>
            <th className="py-2 pr-2">Date</th>
            <th className="py-2 pr-2">Job</th>
            <th className="py-2 pr-2">Start</th>
            <th className="py-2 pr-2">End</th>
            <th className="py-2 pr-2">Break (min)</th>
            <th className="py-2 pr-2">Paid hours</th>
            <th className="py-2 pr-2">Hourly rate</th>
            <th className="py-2 pr-2">Daily total</th>
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
          + Add
        </button>
        <span className="text-xs text-gray-500">
          Tip: Drag the ↕︎ handle to reorder rows.
        </span>
      </div>
    </div>
  );
}