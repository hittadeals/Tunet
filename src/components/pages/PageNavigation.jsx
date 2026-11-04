import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Edit2, ChevronUp, ChevronDown, GripVertical, LayoutGrid, Trash2 } from '../../icons';
import { getIconComponent } from '../../icons';
import { useModalActions, usePages } from '../../contexts';

// ── Edit-mode page manager popover ──────────────────────────────────────

function PageManagerPopover({
  pages,
  activePage,
  setActivePage,
  setEditingPage,
  pageSettings,
  pagesConfig,
  persistConfig,
  setShowAddPageModal,
  onDeletePage,
  onClose,
  t,
}) {
  const ref = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const pageOrder = pagesConfig?.pages || [];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const movePage = (fromIndex, toIndex) => {
    if (!persistConfig || fromIndex === toIndex) return;
    const next = [...pageOrder];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    persistConfig({ ...pagesConfig, pages: next });
  };

  return (
    <div
      ref={ref}
      data-testid="page-manager-popover"
      className="absolute right-0 bottom-full z-50 mb-2 w-[min(21rem,calc(100vw-1.5rem))] origin-bottom-right scale-100 transform rounded-2xl border border-[var(--glass-border)] p-1.5 opacity-100 shadow-2xl transition-all duration-200 sm:w-64"
      style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-h-72 space-y-0.5 overflow-y-auto">
        {pages.map((page, idx) => {
          const settings = pageSettings[page.id] || {};
          const label = settings.label || page.label;
          const isHidden = settings.hidden;
          const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
          const isActive = activePage === page.id;
          const isOver = overIdx === idx && dragIdx !== idx;

          return (
            <div
              key={page.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(idx);
              }}
              onDragLeave={() => setOverIdx(null)}
              onDrop={() => {
                if (dragIdx !== null) movePage(dragIdx, idx);
                setDragIdx(null);
                setOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={`group flex items-center gap-1 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-[var(--glass-bg-hover)] ${
                isOver ? 'bg-[var(--accent-color)]/10' : ''
              } ${isHidden ? 'opacity-50' : ''}`}
            >
              <span
                className="shrink-0 cursor-grab text-[var(--text-muted)] active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <button
                type="button"
                onClick={() => {
                  setActivePage(page.id);
                  onClose();
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5"
              >
                <div
                  className={`shrink-0 rounded-md p-1.5 transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                      : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-semibold ${
                      isActive
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)] group-hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </p>
                  {isHidden && (
                    <p className="text-[9px] tracking-wider text-[var(--text-muted)] uppercase">
                      {t('nav.hidden') || 'Hidden'}
                    </p>
                  )}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => movePage(idx, idx - 1)}
                  disabled={idx === 0}
                  aria-label={t('nav.moveUp') || 'Move up'}
                  title={t('nav.moveUp') || 'Move up'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-25 sm:h-7 sm:w-7"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => movePage(idx, idx + 1)}
                  disabled={idx === pages.length - 1}
                  aria-label={t('nav.moveDown') || 'Move down'}
                  title={t('nav.moveDown') || 'Move down'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-25 sm:h-7 sm:w-7"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPage(page.id);
                    onClose();
                  }}
                  aria-label={t('nav.editPage') || 'Edit page'}
                  title={t('nav.editPage') || 'Edit page'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--accent-color)] transition-opacity hover:bg-[var(--glass-bg-hover)] sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                {page.id !== 'home' && (
                  <button
                    type="button"
                    onClick={() => onDeletePage?.(page)}
                    aria-label={t('nav.deletePage') || 'Delete page'}
                    title={t('nav.deletePage') || 'Delete page'}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--status-error-fg)] transition-opacity hover:bg-[var(--status-error-bg)] sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-2 my-0.5 h-px bg-[var(--glass-border)]" />

      <button
        type="button"
        onClick={() => {
          setShowAddPageModal(true);
          onClose();
        }}
        className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
      >
        <div className="rounded-md bg-[var(--accent-bg)] p-1.5 text-[var(--accent-color)] transition-colors group-hover:bg-[var(--accent-color)] group-hover:text-[var(--text-primary)]">
          <Plus className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
          {t('nav.addPage')}
        </p>
      </button>
    </div>
  );
}

// ── Main navigation ─────────────────────────────────────────────────────

/**
 * PageNavigation - Navigation component for switching between pages
 *
 * In view mode: horizontal scrollable pill bar.
 * In edit mode: horizontal pills + a pinned "Pages" button that opens
 *   a dropdown with all pages, drag-reorder, edit, and add-page.
 */
export default function PageNavigation({
  pages,
  badges = {},
  activePage,
  setActivePage,
  editMode,
  setEditingPage,
  t,
}) {
  const { pagesConfig, persistConfig, pageSettings, persistPageSettings, headerSettings } =
    usePages();
  const { setShowAddPageModal } = useModalActions();
  const showLabelsOnMobile = headerSettings?.showPagePillLabelsOnMobile ?? true;
  const [dragOverId, setDragOverId] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const pageOrder = pagesConfig?.pages || [];
  const isSinglePage = pages.length === 1;

  const toggleManager = useCallback(() => setShowManager((v) => !v), []);
  const closeManager = useCallback(() => setShowManager(false), []);

  // Close popover when leaving edit mode
  useEffect(() => {
    if (!editMode) setShowManager(false);
  }, [editMode]);

  const movePage = (sourceId, targetId) => {
    if (!persistConfig) return;
    if (!sourceId || !targetId || sourceId === targetId) return;
    const nextPages = [...pageOrder];
    const fromIndex = nextPages.indexOf(sourceId);
    const toIndex = nextPages.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    nextPages.splice(fromIndex, 1);
    nextPages.splice(toIndex, 0, sourceId);
    persistConfig({ ...pagesConfig, pages: nextPages });
  };

  const deletePage = useCallback(
    (page) => {
      if (!page || page.id === 'home' || !persistConfig) return;
      if (typeof window !== 'undefined' && !window.confirm(t('confirm.deletePage'))) {
        return;
      }
      const nextPages = (pagesConfig?.pages || []).filter((id) => id !== page.id);
      const nextConfig = { ...pagesConfig, pages: nextPages };
      delete nextConfig[page.id];
      persistConfig(nextConfig);
      if (persistPageSettings) {
        const nextSettings = { ...pageSettings };
        delete nextSettings[page.id];
        persistPageSettings(nextSettings);
      }
      if (activePage === page.id) setActivePage(nextPages[0] || 'home');
    },
    [
      activePage,
      pageSettings,
      pagesConfig,
      persistConfig,
      persistPageSettings,
      setActivePage,
      t,
    ]
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {/* Scrollable page pills */}
      <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-2 overflow-x-auto sm:gap-4">
        {pages.map((page) => {
          const settings = pageSettings[page.id] || {};
          const label = settings.label || page.label;
          const isHidden = settings.hidden;
          const hideSinglePagePill = settings.hideSinglePagePill === true;
          const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
          const isDragOver = dragOverId === page.id;

          if (!editMode && isHidden) return null;
          if (!editMode && isSinglePage && hideSinglePagePill) return null;

          return (
            <button
              key={page.id}
              aria-label={label}
              aria-current={activePage === page.id ? 'page' : undefined}
              draggable={editMode}
              onClick={() => (editMode ? setEditingPage(page.id) : setActivePage(page.id))}
              onDragStart={(event) => {
                if (!editMode) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', page.id);
              }}
              onDragOver={(event) => {
                if (!editMode) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverId(page.id);
              }}
              onDragLeave={() => {
                if (!editMode) return;
                setDragOverId(null);
              }}
              onDrop={(event) => {
                if (!editMode) return;
                event.preventDefault();
                const sourceId = event.dataTransfer.getData('text/plain');
                setDragOverId(null);
                movePage(sourceId, page.id);
              }}
              onDragEnd={() => setDragOverId(null)}
              className={`flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-[11px] font-bold tracking-wide whitespace-nowrap transition-all sm:min-h-0 sm:min-w-0 sm:rounded-full sm:px-5 sm:py-2.5 sm:text-xs ${
                activePage === page.id
                  ? 'border-transparent bg-[var(--accent-bg)] text-[var(--accent-color)] shadow-sm'
                  : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
              } ${editMode && isHidden ? 'scale-95 border-gray-500 opacity-50' : ''} ${editMode ? 'cursor-move' : ''} ${isDragOver ? 'border-[var(--accent-color)]' : ''}`}
            >
              <Icon
                className={`h-5 w-5 sm:h-4 sm:w-4 ${editMode && isHidden ? 'animate-pulse' : ''}`}
              />
              <span
                className={
                  showLabelsOnMobile || activePage === page.id ? undefined : 'hidden sm:inline'
                }
              >
                {label}
              </span>
              {badges[page.id] > 0 && (
                <span
                  className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--domain-light)] px-1 text-[9px] leading-none font-bold text-black tabular-nums"
                  aria-label={`${badges[page.id]} ${t('lights.pageTitle')}`}
                >
                  {badges[page.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pinned edit-mode page manager trigger — always visible */}
      {editMode && (
        <div className="relative shrink-0">
          <button
            type="button"
            data-testid="page-manager-trigger"
            onClick={toggleManager}
            aria-label={t('nav.pages') || t('nav.addPage')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-all sm:px-4 sm:py-2.5 sm:text-xs ${
              showManager
                ? 'border-[var(--accent-color)] bg-[var(--glass-bg-hover)] text-[var(--accent-color)]'
                : 'border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('nav.pages') || t('nav.addPage')}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showManager ? 'rotate-180' : ''}`}
            />
          </button>

          {showManager && (
            <PageManagerPopover
              pages={pages}
              activePage={activePage}
              setActivePage={setActivePage}
              setEditingPage={setEditingPage}
              pageSettings={pageSettings}
              pagesConfig={pagesConfig}
              persistConfig={persistConfig}
              setShowAddPageModal={setShowAddPageModal}
              onDeletePage={deletePage}
              onClose={closeManager}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
}
