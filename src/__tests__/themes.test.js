import { describe, it, expect } from 'vitest';
import { themes, themeChoiceLabels } from '../config/themes';

const parseColor = (value) => {
  const color = String(value || '').trim();

  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((char) => char + char)
            .join('')
        : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    };
  }

  const parts = color.match(/\d+(\.\d+)?/g);
  if (parts && parts.length >= 3) {
    return { r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]) };
  }

  return null;
};

/** Rough perceptual distance (redmean) — good enough to catch "same surface". */
const colorDistance = (a, b) => {
  const rMean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
};

describe('themes', () => {
  it('exports a non-empty themes object', () => {
    expect(themes).toBeDefined();
    expect(Object.keys(themes).length).toBeGreaterThan(0);
  });

  it('each theme has required CSS variables', () => {
    const requiredVars = ['--bg-primary', '--glass-bg', '--text-primary', '--accent-color'];
    for (const [name, theme] of Object.entries(themes)) {
      for (const v of requiredVars) {
        expect(theme.colors, `${name} missing ${v}`).toHaveProperty(v);
      }
    }
  });

  it('rings the cards off from the page in every theme', () => {
    for (const [name, theme] of Object.entries(themes)) {
      const card = parseColor(theme.colors['--card-bg']);
      const page = parseColor(theme.colors['--bg-primary']);

      expect(card, `${name} has an unparsable --card-bg`).not.toBeNull();
      expect(page, `${name} has an unparsable --bg-primary`).not.toBeNull();
      expect(
        colorDistance(card, page),
        `${name} paints its cards the same colour as the page`
      ).toBeGreaterThan(25);
    }
  });

  it('labels every theme for the pickers', () => {
    for (const [name, theme] of Object.entries(themes)) {
      expect(theme.label, `${name} has no label`).toBeTruthy();
      expect(themeChoiceLabels[name], `${name} is missing a picker label`).toBe(theme.label);
    }
  });
});
