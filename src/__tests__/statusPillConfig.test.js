import { describe, expect, it } from 'vitest';
import { normalizeStatusPillConfig } from '../utils/statusPillConfig';

describe('normalizeStatusPillConfig', () => {
  it('fills in defaults for a new conditional pill', () => {
    const pill = normalizeStatusPillConfig({ id: 'p1', type: 'conditional' });

    expect(pill.visible).toBe(true);
    expect(pill.clickable).toBe(false);
    expect(pill.tapAction).toBe('auto');
    expect(pill.animated).toBe(true);
    expect(pill.showLabel).toBe(true);
    expect(pill.showSublabel).toBe(true);
  });

  it('keeps valid values and coerces legacy strings', () => {
    const pill = normalizeStatusPillConfig({
      id: 'p2',
      type: 'conditional',
      visible: 'false',
      tapAction: 'toggle',
      showCount: '1',
      decimals: '2',
    });

    expect(pill.visible).toBe(false);
    expect(pill.tapAction).toBe('toggle');
    expect(pill.showCount).toBe(true);
    expect(pill.decimals).toBe(2);
  });

  it('repairs group pills with missing selections', () => {
    const pill = normalizeStatusPillConfig({
      id: 'p3',
      type: 'group_status',
      groupPreset: 42,
      groupEntityIds: 'light.kitchen',
    });

    expect(pill.groupPreset).toBe('lights_on');
    expect(pill.groupSelectionMode).toBe('all');
    expect(pill.groupEntityIds).toEqual([]);
    expect(pill.hideWhenEmpty).toBe(true);
  });

  it('ignores non-object input', () => {
    expect(normalizeStatusPillConfig(null)).toBeNull();
    expect(normalizeStatusPillConfig('pill')).toBe('pill');
  });
});
