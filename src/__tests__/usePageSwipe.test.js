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

const touchMove = (x, y) => ({ touches: [{ clientX: x, clientY: y }] });

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

/** Nodes standing in for real DOM elements during the ancestor walk. */
const node = (props = {}) => ({
  nodeType: 1,
  scrollWidth: 10,
  clientWidth: 10,
  touchAction: 'auto',
  overflowX: 'visible',
  parentElement: null,
  closest: () => null,
  ...props,
});

const stubComputedStyle = () =>
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => ({
    touchAction: element?.touchAction || 'auto',
    overflowX: element?.overflowX || 'visible',
  }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
    const first = renderSwipe({ setActivePage });

    swipe(first.result, 160, 320);
    expect(setActivePage).not.toHaveBeenCalled();

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

  it('accepts a deliberate one second swipe', () => {
    vi.useFakeTimers();
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    act(() => result.current.onTouchStart(touchStart(320, 100)));
    act(() => vi.advanceTimersByTime(1200));
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));

    expect(setActivePage).toHaveBeenCalledWith('kitchen');
  });

  it('ignores drags that take too long', () => {
    vi.useFakeTimers();
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    act(() => result.current.onTouchStart(touchStart(320, 100)));
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('does nothing while editing', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage, enabled: false });

    swipe(result, 320, 160);

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('leaves widgets that own horizontal gestures alone', () => {
    stubComputedStyle();
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    const card = node({ touchAction: 'pan-y' });

    act(() => result.current.onTouchStart(touchStart(320, 100, { target: card })));
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('leaves horizontal scrollers alone but not clipped decoration', () => {
    stubComputedStyle();
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    const scroller = node({ scrollWidth: 400, clientWidth: 100, overflowX: 'auto' });
    const clipped = node({ scrollWidth: 400, clientWidth: 100, overflowX: 'hidden' });

    act(() => result.current.onTouchStart(touchStart(320, 100, { target: scroller })));
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));
    expect(setActivePage).not.toHaveBeenCalled();

    act(() => result.current.onTouchStart(touchStart(320, 100, { target: clipped })));
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));
    expect(setActivePage).toHaveBeenCalledWith('kitchen');
  });

  it('ignores touches that start on a form control', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    const control = { closest: (selector) => (selector.includes('input') ? {} : null) };

    act(() => result.current.onTouchStart(touchStart(320, 100, { target: control })));
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('keeps a swipe that the browser cancels after the finger moved', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    act(() => result.current.onTouchStart(touchStart(320, 100)));
    act(() => result.current.onTouchMove(touchMove(200, 105)));
    act(() => result.current.onTouchCancel());

    expect(setActivePage).toHaveBeenCalledWith('kitchen');
  });

  it('drops a cancelled touch that never moved', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

    act(() => result.current.onTouchStart(touchStart(320, 100)));
    act(() => result.current.onTouchCancel());
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));

    expect(setActivePage).not.toHaveBeenCalled();
  });

  it('ignores multi touch gestures', () => {
    const setActivePage = vi.fn();
    const { result } = renderSwipe({ setActivePage });

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
    act(() => result.current.onTouchEnd(touchEnd(160, 100)));

    expect(setActivePage).not.toHaveBeenCalled();
  });
});
