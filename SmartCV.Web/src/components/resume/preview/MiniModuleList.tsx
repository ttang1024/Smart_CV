import { GripVertical } from 'lucide-react';
import type { ResumeSection } from '../../../types/resume';

// Mini drag-reorder list shown alongside the preview paper.
export function MiniModuleList({ sectionOrder, dragKey, dragOverKey, onDragStart, onDragOver, onDrop, onDragEnd, panelTitle, sectionLabels }: {
  sectionOrder: ResumeSection[];
  dragKey: ResumeSection | null;
  dragOverKey: ResumeSection | null;
  onDragStart: (key: ResumeSection) => void;
  onDragOver: (key: ResumeSection) => void;
  onDrop: (key: ResumeSection) => void;
  onDragEnd: () => void;
  panelTitle: string;
  sectionLabels: Record<ResumeSection, string>;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm w-[120px] p-2">
      <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">{panelTitle}</div>
      {sectionOrder.map(key => (
        <div
          key={key}
          className={`flex items-center gap-1 py-0.5 px-0.5 rounded transition-colors ${dragOverKey === key && dragKey !== key ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
            } ${dragKey === key ? 'opacity-40' : ''}`}
          onDragOver={e => { e.preventDefault(); onDragOver(key); }}
          onDrop={() => onDrop(key)}
        >
          <span
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(key); }}
            onDragEnd={onDragEnd}
            className="cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 shrink-0"
          >
            <GripVertical className="w-3 h-3" />
          </span>
          <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate leading-5">{sectionLabels[key]}</span>
        </div>
      ))}
    </div>
  );
}
