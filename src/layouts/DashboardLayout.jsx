import { Profiler, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Plus } from '../icons';
import Header from './Header';
import StatusBar from './StatusBar';
import BackgroundLayer from './BackgroundLayer';
import ConnectionBanner from './ConnectionBanner';
import DragOverlaySVG from './DragOverlaySVG';
import EditToolbar from './EditToolbar';
import { PageNavigation } from '../components';
import DashboardGrid from '../rendering/DashboardGrid';
import PinLockModal from '../components/ui/PinLockModal';
import { usePageSwipe } from '../hooks/usePageSwipe';
import { useAdaptiveLighting } from '../hooks/useAdaptiveLighting';

const MemoStatusBar = memo(StatusBar);
const MemoDashboardGrid = memo(DashboardGrid);

const CARDS_ONLY_EXIT_MS = 1000;
const CARDS_ONLY_LONG_PRESS_IGNORE_SELECTOR = [
  '[data-dashboard-card]',
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
].join(',');

/** @param {any} props */
export default function DashboardLayout(props) {
  const {
    resolvedAppFontFamily,
    editMode,
    draggingId,
    touchPath,
    isMobile,
    gridColCount,
    dynamicGridColumns,
    isCompactCards,
    now,
    resolvedHeaderTitle,
    headerScale,
    headerSettings,
    setShowHeaderEditModal,
    t,
    sectionSpacing,
    cardsOnlyMode,
    updateCardsOnlyMode,
    pagesConfig,
    pageSettings = {},
    personStatus,
    requestSettingsAccess,
    setAddCardTargetPage,
    setShowAddCardModal,
    setConfigTab,
    isSonosActive,
    isMediaActive,
    getA,
    getEntityImageUrl,
    pages,
    activePage,
    setActivePage,
    setEditingPage,
    guardedSetEditMode,
    guardedSetShowAddCardModal,
    guardedSetShowConfigModal,
    guardedSetShowThemeSidebar,
    guardedSetShowLayoutSidebar,
    guardedSetShowHeaderEditModal,
    connected,
    updateCount,
    dashboardGridPage,
    dashboardGridMedia,
    dashboardGridGrid,
    dashboardGridCards,
    dashboardGridActions,
    showPinLockModal,
    closePinLockModal,
    handlePinSubmit,
    pinLockError,
  } = props;

  const cardsOnlyExitTimerRef = useRef(null);
  const showDashboardChrome = !cardsOnlyMode;
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const activePageEntry = pages.find((page) => page.id === activePage);
  const compactTitle =
    pageSettings?.[activePage]?.label || activePageEntry?.label || resolvedHeaderTitle || '';
  const compactTime = now
    ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const pageBadges = useMemo(() => {
    const entities = dashboardGridMedia?.entities || {};
    const cardSettings = dashboardGridCards?.cardSettings || {};
    const getKey = dashboardGridCards?.getCardSettingsKey;
    const badges = {};
    for (const page of pages || []) {
      let count = 0;
      for (const id of pagesConfig?.[page.id] || []) {
        if (!id.startsWith('light_') && !id.startsWith('light.')) continue;
        const key = getKey ? getKey(id) : id;
        const entityId = id.startsWith('light.')
          ? id
          : cardSettings[key]?.entityId || cardSettings[id]?.entityId;
        if (entityId && entities[entityId]?.state === 'on') count += 1;
      }
      if (count > 0) badges[page.id] = count;
    }
    return badges;
  }, [pages, pagesConfig, dashboardGridMedia, dashboardGridCards]);

  useAdaptiveLighting({
    entities: dashboardGridMedia?.entities,
    callService: dashboardGridMedia?.callService,
  });

  useEffect(() => {
    let frame = null;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        setShowCompactHeader((previous) => {
          const next = window.scrollY > 140;
          return previous === next ? previous : next;
        });
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Swipe between pages, but never while editing: touch drags cards there.
  const pageSwipeHandlers = usePageSwipe({
    pages,
    pageSettings,
    activePage,
    setActivePage,
    enabled: !editMode,
  });

  const handleToggleEdit = useCallback(() => {
    const currentSettings = pageSettings[activePage];
    if (currentSettings?.hidden) setActivePage('home');
    if (editMode && typeof window !== 'undefined') {
      window.dispatchEvent(new window.CustomEvent('tunet:edit-done'));
    }
    guardedSetEditMode(!editMode);
  }, [activePage, editMode, guardedSetEditMode, pageSettings, setActivePage]);

  const contentPaddingClass = isMobile
    ? 'px-2'
    : gridColCount === 1
      ? 'px-10 sm:px-16 md:px-24'
      : gridColCount === 3
        ? dynamicGridColumns
          ? 'px-4 md:px-12'
          : 'px-4 md:px-20'
        : 'px-6 md:px-20';

  const editToolbar = (
    <EditToolbar
      editMode={editMode}
      setShowAddCardModal={guardedSetShowAddCardModal}
      setShowConfigModal={guardedSetShowConfigModal}
      setConfigTab={setConfigTab}
      setShowThemeSidebar={guardedSetShowThemeSidebar}
      setShowLayoutSidebar={guardedSetShowLayoutSidebar}
      setShowHeaderEditModal={guardedSetShowHeaderEditModal}
      onToggleEdit={handleToggleEdit}
      showSettingsMenu
      connected={connected}
      updateCount={updateCount}
      isMobile={isMobile}
      t={t}
    />
  );

  const clearCardsOnlyLongPress = useCallback(() => {
    if (cardsOnlyExitTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(cardsOnlyExitTimerRef.current);
    }
    cardsOnlyExitTimerRef.current = null;
  }, []);

  const shouldIgnoreCardsOnlyLongPress = useCallback((target) => {
    return Boolean(target?.closest?.(CARDS_ONLY_LONG_PRESS_IGNORE_SELECTOR));
  }, []);

  const handleCardsOnlyPointerDown = useCallback(
    (event) => {
      if (!cardsOnlyMode || typeof updateCardsOnlyMode !== 'function') return;
      if (event.button !== 0) return;
      if (shouldIgnoreCardsOnlyLongPress(event.target)) return;

      clearCardsOnlyLongPress();
      cardsOnlyExitTimerRef.current = window.setTimeout(() => {
        cardsOnlyExitTimerRef.current = null;
        updateCardsOnlyMode(false);
      }, CARDS_ONLY_EXIT_MS);
    },
    [cardsOnlyMode, clearCardsOnlyLongPress, shouldIgnoreCardsOnlyLongPress, updateCardsOnlyMode]
  );

  useEffect(() => {
    if (!cardsOnlyMode || typeof updateCardsOnlyMode !== 'function') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') updateCardsOnlyMode(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cardsOnlyMode, updateCardsOnlyMode]);

  useEffect(() => clearCardsOnlyLongPress, [clearCardsOnlyLongPress]);

  let profilingEnabled = false;
  try {
    profilingEnabled =
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('tunet_profile_renders') === '1';
  } catch {
    profilingEnabled = false;
  }

  const onProfileRender = useCallback(
    (id, phase, actualDuration, baseDuration) => {
      if (!profilingEnabled || actualDuration < 8) return;
      console.warn(
        `[RenderProfile] ${id} ${phase} actual=${actualDuration.toFixed(2)}ms base=${baseDuration.toFixed(2)}ms`
      );
    },
    [profilingEnabled]
  );

  const withProfiler = useCallback(
    (id, element) => {
      if (!profilingEnabled) return element;
      return (
        <Profiler id={id} onRender={onProfileRender}>
          {element}
        </Profiler>
      );
    },
    [profilingEnabled, onProfileRender]
  );

  const personHeader = (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-2.5 ${isMobile ? 'flex-1 origin-left scale-90 empty:hidden' : ''}`}
    >
      {(pagesConfig.header || []).map((id) => personStatus(id))}
      {editMode && (
        <button
          onClick={() => {
            requestSettingsAccess(() => {
              setAddCardTargetPage('header');
              setShowAddCardModal(true);
            });
          }}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase transition-all"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent-color) 28%, transparent)',
            color: 'var(--accent-color)',
          }}
        >
          <Plus className="h-3 w-3" /> {t('addCard.type.entity')}
        </button>
      )}
      {(pagesConfig.header || []).length > 0 && !isMobile && (
        <div className="mx-2 h-8 w-px bg-[var(--glass-border)]"></div>
      )}
    </div>
  );

  return (
    <div
      {...pageSwipeHandlers}
      className="min-h-screen overflow-x-hidden font-sans transition-colors duration-500 selection:bg-[var(--accent-bg)]"
      style={
        /** @type {any} */ ({
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          // Height of the fixed page bar, reserved by #main-content below.
          '--bottom-nav-height': '3.875rem',
          '--font-sans': resolvedAppFontFamily,
          fontFamily: resolvedAppFontFamily,
        })
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-[var(--accent-color)] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg"
      >
        {t('a11y.skipToContent') || 'Skip to content'}
      </a>
      <BackgroundLayer />
      {editMode && draggingId && touchPath && <DragOverlaySVG touchPath={touchPath} />}
      <div
        id="main-content"
        role="main"
        aria-label="Dashboard"
        onPointerDown={handleCardsOnlyPointerDown}
        onPointerUp={clearCardsOnlyLongPress}
        onPointerCancel={clearCardsOnlyLongPress}
        onPointerLeave={clearCardsOnlyLongPress}
        className={`relative z-10 mx-auto w-full max-w-[1600px] py-6 md:py-10 ${contentPaddingClass} ${
          isMobile ? 'mobile-grid' : ''
        } ${isCompactCards ? 'compact-cards' : ''}`}
        style={
          showDashboardChrome
            ? {
                // Clear the fixed page bar, then leave the configured gap
                // between the cards and that bar.
                paddingBottom: `calc(var(--bottom-nav-height) + ${sectionSpacing?.navToGrid ?? 24}px + env(safe-area-inset-bottom) * 0.5)`,
              }
            : undefined
        }
      >
        {showDashboardChrome && (
          <Header
            now={now}
            headerTitle={resolvedHeaderTitle}
            headerScale={headerScale}
            editMode={editMode}
            headerSettings={headerSettings}
            setShowHeaderEditModal={setShowHeaderEditModal}
            t={t}
            isMobile={isMobile}
            sectionSpacing={sectionSpacing}
            toolbar={editToolbar}
          >
            <div
              className={`mt-0 w-full font-sans ${isMobile ? 'flex flex-col items-start gap-2' : 'flex items-center justify-between'}`}
              style={{
                marginTop: `${
                  isMobile
                    ? Math.min(sectionSpacing?.headerToStatus ?? 0, 12)
                    : (sectionSpacing?.headerToStatus ?? 0)
                }px`,
              }}
            >
              {isMobile ? (
                <div className="flex w-full min-w-0 items-center gap-2">{personHeader}</div>
              ) : (
                personHeader
              )}
              <div className={`min-w-0 ${isMobile ? 'w-full' : 'flex-1'}`}>
                {withProfiler(
                  'StatusBar',
                  <MemoStatusBar
                    editMode={editMode}
                    t={t}
                    isSonosActive={isSonosActive}
                    isMediaActive={isMediaActive}
                    getA={getA}
                    getEntityImageUrl={getEntityImageUrl}
                    isMobile={isMobile}
                  />
                )}
              </div>
            </div>
          </Header>
        )}

        <ConnectionBanner t={t} setConfigTab={setConfigTab} />

        {withProfiler(
          'DashboardGrid',
          <MemoDashboardGrid
            page={dashboardGridPage}
            media={dashboardGridMedia}
            grid={dashboardGridGrid}
            cards={dashboardGridCards}
            actions={dashboardGridActions}
            t={t}
          />
        )}

        <PinLockModal
          open={showPinLockModal}
          onClose={closePinLockModal}
          onSubmit={handlePinSubmit}
          t={t}
          error={pinLockError}
        />
      </div>

      {showDashboardChrome && !editMode && showCompactHeader && (
        <div
          data-testid="compact-header"
          className="compact-header"
          role="navigation"
          aria-label={compactTitle || t('page.home')}
        >
          <button
            type="button"
            onClick={scrollToTop}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-color)]" />
            <span className="truncate text-xs font-semibold tracking-wide text-[var(--text-primary)]">
              {compactTitle}
            </span>
          </button>
          <time className="shrink-0 text-xs font-medium tabular-nums text-[var(--text-secondary)]">
            {compactTime}
          </time>
          <button
            type="button"
            onClick={scrollToTop}
            aria-label={t('nav.backToTop')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showDashboardChrome && (
        <div
          data-testid="page-navigation-bar"
          data-no-page-swipe="true"
          className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl items-center rounded-[1.75rem] border border-[var(--surface-border)] px-2 pt-1.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--modal-bg) 86%, transparent)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'var(--surface-shadow)',
            // Half the home indicator inset: still clears it, without leaving a
            // dead band under the pills on phones.
            paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom) * 0.5)',
          }}
        >
          <PageNavigation
            pages={pages}
            badges={pageBadges}
            activePage={activePage}
            setActivePage={setActivePage}
            editMode={editMode}
            setEditingPage={setEditingPage}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
