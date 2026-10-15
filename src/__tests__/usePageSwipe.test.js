import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePageSwipe } from '../hooks/usePageSwipe';

const pages = [{ id: 'home' }, { id: 'kitchen' }, { id: 'office' }];

const touchStart = (x, y, extra = {}) => ({
  touches: [{ clientX: x, clientY: y }],
  target: { closest: () => null },
  currentTarget: null,
  ...extra,
});

const touchEnd = (x, y) => ({ changedTouches: [{ clientX: x, clientY: y }] });

const renderSwipe = (overrides = {}) =>
  renderHook(() =>
    usePageSwipe({
      pages,
      pageSettings: {},
      activePage: 'home',
      setActivePage: () => {},
      ...overrides,
    })
  );

const swipe = (result, fromX, toX, { fromY = 100, toY = 100 } = {}) => {
  act(() => result.current.onTouchStart(touchStart(fromX, fromY)));
  act(() => result.current.onTouchEnd(touchEnd(toX, toY)));
};

afterEach(() => {
  vi.useRealTimers();
});

describe('usePageSwipe', () => {
  it('goes to the next page when swiping left', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    swipe(result, 320, 160);

    expect(setActivePage).toHaveBeenCalledWith('kitchen');
  });

  it('goes to the previous page when swiping right', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ activePage: 'kitchen', setActivePage });

    swipe(result, 160, 320);

    expect(setActivePage).toHaveBeenCalledWith('home');
  });

  it('stays on the first and last page instead of wrapping around', () => {
    const setActivePage = vi.fn();
    const { result, rerender } = renderSwipe({ setActivePage });

    swipe(result, 160, 320);
    expect(setActivePage).not.toHaveBeenCalled();

    rerender();
    const last = renderSwipe({ activePage: 'office', setActivePage });
    swipe(last.result, 320, 160);
    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('skips hidden pages', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({
      setActivePage,
      pageSettings: { kitchen: { hidden: true } },
    });

    swipe(result, 320, 160);

    expect(setActivePage).toHaveBeenCalledWith('office');
  });

  it('ignores swipes that are too short', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    swipe(result, 160, 130);

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('ignores mostly vertical drags so scrolling still works', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    swipe(result, 300, 160, { fromY: 40, toY: 420 });

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('ignores slow drags', () => {
    vi.useFakeTimers();
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    act(() => result.current.onTouchStart(touchStart(320, 100)));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => result.current.onTouchEnd(160, 100));

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('does nothing while editing', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage, enabled: false });

    swipe(result, 320, 160);

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('leaves widgets that own horizontal gestures alone', () => {
    const setActivePage = vi.fn();
    const computedStyle = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      touchAction: 'pan-y',
    });
    const { result } = renderSwipe({ setActivePage });

    const scroller = { nodeType: 1, scrollWidth: 10, clientWidth: 10, parentElement: null };
    const card = {
      nodeType: 1,
      scrollWidth: 10,
      clientWidth: 10,
      parentElement: scroller,
      closest: () => null,
    };

    act(() => result.current.onTouchStart(touchStart(320, 100, { target: card })));
    act(() => result.current.onTouchEnd(160, 100));

    expect(setActivePage).not.toHaveBeenCalled();
    computedStyle.mockRestore();
  });

  it('ignores touches that start on a form control', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    const control = { closest: (selector) => (selector.includes('input') ? {} : null) };

    act(() => result.current.onTouchStart(touchStart(320, 100, { target: control })));
    act(() => result.current.onTouchEnd(160, 100));

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('forgets the gesture when it is cancelled or multi touch', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    act(() => result.current.onTouchStart(touchStart(320, 100)));
    act(() => result.current.onTouchCancel());
    act(() => result.current.onTouchEnd(160, 100));
    expect(setActivePage).not.toHaveBeenCalled();

    act(() =>
      result.current.onTouchStart({
        touches: [
          { clientX: 320, clientY: 100 },
          { clientX: 300, clientY: 120 },
        ],
        target: { closest: () => null },
        currentTarget: null,
      })
    );
    act(() => result.current.onTouchEnd(160, 100));
    expect(setActivePage).not.toHaveBeenCalled();
  });
});
