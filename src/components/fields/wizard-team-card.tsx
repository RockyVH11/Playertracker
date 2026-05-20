"use client";

type Props = {
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onScheduleClick: () => void;
  children: React.ReactNode;
};

export function WizardTeamCard({
  isDragging,
  onDragStart,
  onDragEnd,
  onScheduleClick,
  children,
}: Props) {
  return (
    <div
      className={`flex w-full overflow-hidden rounded border text-left text-[10px] leading-snug ${
        isDragging ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onScheduleClick}
        className="min-w-0 flex-1 px-1.5 py-1 hover:bg-slate-100"
      >
        {children}
      </button>
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        aria-label="Drag to place on grid"
        className="shrink-0 cursor-grab border-l border-slate-200 px-1.5 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
        title="Drag to grid"
      >
        ⋮⋮
      </button>
    </div>
  );
}

