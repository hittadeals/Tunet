import { useCallback, useMemo, useRef } from 'react';

const MIN_SWIPE_DISTANCE_PX = 70;
const MAX_SWIPE_DURATION_MS = 1500;
const MIN_HORIZONTAL_RATIO = 1.2;
const MAX_ANCESTOR_LOOKUP_DEPTH = 12;

const IGNORED_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="dialog"]',
  '[data-no-page-swipe]',
].join(',');

/**
 * `touch-action` other than auto/manipulation means the widget under the finger
 * already owns the horizontal gesture (sliders, the weather card's own swipe,
 * drag overlays), so the page swipe has to stay out of it.
 */
const reservesHorizontalGesture = (element) => {
  if (typeof window === 'undefined' || !window.getComputedStyle) return false;
  const touchAction = window.getComputedStyle(element)?.touchAction || '';
  if (!touchAction) return false;
  return !['auto', 'manipulation'].includes(touchAction.trim());
};

/** Only a real horizontal scroller owns the gesture, not clipped decoration. */
const isHorizontalScroller = (element) => {
  if (element.scrollWidth <= element.clientWidth + 1) return false;
  if (typeof window === 'undefined' || !window.getComputedStyle) return false;
  const overflowX = window.getComputedStyle(element)?.overflowX || '';
  return overflowX === 'auto' || overflowX === 'scroll';
};

const isInsideOwnGestureZone = (start, boundary) => {
  let node = start;
  let depth = 0;

  while (node && node !== boundary && node.nodeType === 1 && depth < MAX_ANCESTOR_LOOKUP_DEPTH) {
    if (reservesHorizontalGesture(node) || isHorizontalScroller(node)) return true;
    node = node.parentElement;
    depth += 1;
  }

  return false;
};

const toPoint = (touch) =>
  touch && Number.isFinite(touch.clientX) && Number.isFinite(touch.clientY)
    ? { x: touch.clientX, y: touch.clientY }
    : null;

/**
 * Switches dashboard pages with a horizontal swipe.
 *
 * A swipe left goes to the next page, a swipe right to the previous one, and
 * hidden pages are skipped. Callers are expected to disable this while editing,
 * because touch is used to drag cards there.
 *
 * Attach the handlers to a surface that covers the whole viewport: the finger
 * often lands below the content box, where the page would otherwise never see
 * the gesture.
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

  const completeGesture = useCallback(
    (endPoint) => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!enabled || !gesture || !endPoint) return;

      const deltaX = endPoint.x - gesture.x;
      const deltaY = endPoint.y - gesture.y;

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

  const handleTouchStart = useCallback(
    (event) => {
      gestureRef.current = null;
      if (!enabled) return;
      if (event.touches?.length !== 1) return;

      const target = event.target;
      if (target?.closest?.(IGNORED_TARGET_SELECTOR)) return;
      if (isInsideOwnGestureZone(target, event.currentTarget)) return;

      const point = toPoint(event.touches[0]);
      if (!point) return;

      gestureRef.current = { ...point, lastX: point.x, lastY: point.y, time: Date.now() };
    },
    [enabled]
  );

  const handleTouchMove = useCallback((event) => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    const point = toPoint(event.touches?.[0]);
    if (!point) return;

    gesture.lastX = point.x;
    gesture.lastY = point.y;
  }, []);

  const handleTouchEnd = useCallback(
    (event) => {
      const touch = event.changedTouches?.[0] || event.touches?.[0];
      completeGesture(toPoint(touch));
    },
    [completeGesture]
  );

  const handleTouchCancel = useCallback(() => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    // The browser cancels a touch when it takes over the gesture for scrolling.
    // Keep whatever the finger already travelled instead of dropping the swipe.
    completeGesture({ x: gesture.lastX, y: gesture.lastY });
  }, [completeGesture]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}
