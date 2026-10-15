import { useCallback, useMemo, useRef } from 'react';

const MIN_SWIPE_DISTANCE_PX = 70;
const MAX_SWIPE_DURATION_MS = 900;
const MIN_HORIZONTAL_RATIO = 1.5;
const HORIZONTAL_OVERFLOW_SLACK_PX = 4;
const MAX_SCROLLER_LOOKUP_DEPTH = 12;

const IGNORED_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="dialog"]',
  '[data-no-page-swipe]',
].join(',');

/**
 * `touch-action` other than auto/manipulation means the widget below the finger
 * already owns the horizontal gesture (sliders, sliders in modals, the weather
 * card's own swipe, drag overlays), so the page swipe has to stay out of it.
 */
const reservesHorizontalGesture = (element) => {
  if (typeof window === 'undefined' || !window.getComputedStyle) return false;
  const touchAction = window.getComputedStyle(element)?.touchAction || '';
  if (!touchAction) return false;
  return !['auto', 'manipulation'].includes(touchAction.trim());
};

const isInsideOwnGestureZone = (start, boundary) => {
  let node = start;
  let depth = 0;

  while (node && node !== boundary && node.nodeType === 1 && depth < MAX_SCROLLER_LOOKUP_DEPTH) {
    if (reservesHorizontalGesture(node)) return true;
    if (node.scrollWidth > node.clientWidth + HORIZONTAL_OVERFLOW_SLACK_PX) return true;
    node = node.parentElement;
    depth += 1;
  }

  return false;
};

/**
 * Switches dashboard pages with a horizontal swipe.
 *
 * A swipe left goes to the next page, a swipe right to the previous one, and
 * hidden pages are skipped. Callers are expected to disable this while editing,
 * because touch is used to drag cards there.
 *
 * @param {Object} params
 * @param {Array<{id: string}>} params.pages - Pages in navigation order
 * @param {Record<string, {hidden?: boolean}>} [params.pageSettings] - Per-page settings
 * @param {string} params.activePage - Currently visible page id
 * @param {Function} params.setActivePage - Switches the visible page
 * @param {boolean} [params.enabled] - Whether swiping is active
 */
export function usePageSwipe({
  pages,
  pageSettings = {},
  activePage,
  setActivePage,
  enabled = true,
}) {
  const gestureRef = useRef(null);

  const pageIds = useMemo(
    () =>
      (pages || [])
        .map((page) => page?.id)
        .filter((id) => typeof id === 'string' && !pageSettings?.[id]?.hidden),
    [pages, pageSettings]
  );

  const handleTouchStart = useCallback(
    (event) => {
      gestureRef.current = null;
      if (!enabled) return;
      if (event.touches?.length !== 1) return;

      const target = event.target;
      if (target?.closest?.(IGNORED_TARGET_SELECTOR)) return;
      if (isInsideOwnGestureZone(target, event.currentTarget)) return;

      const touch = event.touches[0];
      gestureRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (event) => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!enabled || !gesture) return;

      const touch = event.changedTouches?.[0] || event.touches?.[0];
      if (!touch) return;

      const deltaX = touch.clientX - gesture.x;
      const deltaY = touch.clientY - gesture.y;

      if (Date.now() - gesture.time > MAX_SWIPE_DURATION_MS) return;
      if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE_PX) return;
      if (Math.abs(deltaX) < Math.abs(deltaY) * MIN_HORIZONTAL_RATIO) return;

      const currentIndex = pageIds.indexOf(activePage);
      if (currentIndex < 0) return;

      const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= pageIds.length) return;

      setActivePage?.(pageIds[nextIndex]);
    },
    [activePage, enabled, pageIds, setActivePage]
  );

  const handleTouchCancel = useCallback(() => {
    gestureRef.current = null;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}
