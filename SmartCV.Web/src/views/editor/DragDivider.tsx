export function DragDivider({ onMouseDown, active }: { onMouseDown: (e: React.MouseEvent) => void; active: boolean }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`relative w-1 shrink-0 cursor-col-resize group select-none transition-colors
        ${active ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800 hover:bg-emerald-400 dark:hover:bg-emerald-600'}`}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-1 h-1 rounded-full transition-colors
            ${active ? 'bg-white' : 'bg-gray-400 dark:bg-gray-600 group-hover:bg-emerald-300'}`} />
        ))}
      </div>
    </div>
  );
}
