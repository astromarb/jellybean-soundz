import React, { useState, useRef, useEffect } from 'react';
import { Magazine, Page } from '../types';

interface MagazinePageNavProps {
  magazines: Magazine[];
  pagesInActiveMagazine: Page[];
  activeMagazineId: string | null;
  activePageId: string | null;
  onSelectMagazine: (id: string) => void;
  onSelectPage: (id: string) => void;
  onAddMagazine: (name: string) => void;
  onRenameMagazine: (id: string, name: string) => void;
  onDeleteMagazine: (id: string) => void;
  onAddPage: (magazineId: string, name: string) => void;
  onRenamePage: (id: string, name: string) => void;
  onDeletePage: (id: string) => void;
}

function InlineEdit({
  value,
  onCommit,
  onCancel,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(draft.trim() || value);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onCommit(draft.trim() || value)}
      className={className}
    />
  );
}

export default function MagazinePageNav({
  magazines,
  pagesInActiveMagazine,
  activeMagazineId,
  activePageId,
  onSelectMagazine,
  onSelectPage,
  onAddMagazine,
  onRenameMagazine,
  onDeleteMagazine,
  onAddPage,
  onRenamePage,
  onDeletePage,
}: MagazinePageNavProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEditingId(id);
  };

  const handleAddMagazine = () => {
    onAddMagazine(`Magazine ${magazines.length + 1}`);
  };

  const handleAddPage = () => {
    if (!activeMagazineId) return;
    onAddPage(activeMagazineId, `Page ${pagesInActiveMagazine.length + 1}`);
  };

  const handleDeleteMagazine = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (magazines.length <= 1) return;
    onDeleteMagazine(id);
  };

  const handleDeletePage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (pagesInActiveMagazine.length <= 1) return;
    onDeletePage(id);
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800 shrink-0">
      {/* Magazine row */}
      <div className="flex items-center gap-1 px-2 pt-1.5 pb-0 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mr-1 shrink-0">
          MAG
        </span>
        {magazines.map((mag) => {
          const isActive = mag.id === activeMagazineId;
          return (
            <div
              key={mag.id}
              onClick={() => onSelectMagazine(mag.id)}
              className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-t-lg cursor-pointer text-xs font-medium transition-all shrink-0 select-none border border-b-0 ${
                isActive
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-gray-900 border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: mag.color }}
              />
              {editingId === mag.id ? (
                <InlineEdit
                  value={mag.name}
                  onCommit={(v) => { onRenameMagazine(mag.id, v); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                  className="bg-transparent outline-none w-20 text-xs text-white"
                />
              ) : (
                <span onDoubleClick={(e) => startEdit(e, mag.id)} className="max-w-[80px] truncate">
                  {mag.name}
                </span>
              )}
              {magazines.length > 1 && (
                <button
                  onClick={(e) => handleDeleteMagazine(e, mag.id)}
                  className="opacity-0 group-hover:opacity-100 ml-0.5 text-gray-500 hover:text-red-400 transition-all leading-none"
                  title="Delete magazine"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={handleAddMagazine}
          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-300 transition-colors shrink-0 font-mono"
          title="New magazine"
        >
          +
        </button>
      </div>

      {/* Page row */}
      <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto scrollbar-none border-t border-gray-800/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mr-1 shrink-0">
          PG
        </span>
        {pagesInActiveMagazine.map((page) => {
          const isActive = page.id === activePageId;
          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={`group relative flex items-center gap-1 px-2.5 py-0.5 rounded-md cursor-pointer text-xs transition-all shrink-0 select-none ${
                isActive
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {editingId === page.id ? (
                <InlineEdit
                  value={page.name}
                  onCommit={(v) => { onRenamePage(page.id, v); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                  className="bg-transparent outline-none w-20 text-xs text-white"
                />
              ) : (
                <span onDoubleClick={(e) => startEdit(e, page.id)} className="max-w-[80px] truncate">
                  {page.name}
                </span>
              )}
              {pagesInActiveMagazine.length > 1 && (
                <button
                  onClick={(e) => handleDeletePage(e, page.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all leading-none text-[10px]"
                  title="Delete page"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={handleAddPage}
          className="px-2 py-0.5 text-xs text-gray-600 hover:text-gray-300 transition-colors shrink-0 font-mono"
          title="New page"
        >
          +
        </button>
      </div>
    </div>
  );
}
