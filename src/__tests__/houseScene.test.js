import { describe, it, expect } from 'vitest';
import {
  buildWallSegments,
  getLightColor,
  getRoomCenter,
  getRoomStats,
  normalizeName,
} from '../utils/houseScene';
import { fixturePositions } from '../utils/houseScene3d';
import { buildFurnitureItem } from '../utils/houseFurniture';
import { HOUSE_DOORS, HOUSE_OPENINGS, HOUSE_ROOMS, HOUSE_WINDOWS } from '../config/houseModel';
import { HOUSE_FURNITURE } from '../config/houseFurniture';

const rooms = [
  { id: 'kok', label: 'Kök', floor: 'ground', rects: [[0, 0, 4, 3]] },
  {
    id: 'vardagsrum',
    label: 'Vardagsrum',
    floor: 'ground',
    rects: [[4, 0, 8, 4]],
  },
];

describe('houseScene helpers', () => {
  it('normalizes names without diacritics', () => {
    expect(normalizeName('Kök & Vardagsrum')).toBe('kok vardagsrum');
    expect(normalizeName('  Entré  ')).toBe('entre');
  });

  it('aggregates lights, temperature and humidity', () => {
    const entities = {
      'light.kok_tak': { state: 'on', attributes: {} },
      'light.kok_spot': { state: 'off', attributes: {} },
      'sensor.kok_temp': {
        state: '21.44',
        attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
      },
      'sensor.kok_humidity': { state: '45.2', attributes: { device_class: 'humidity' } },
    };
    const stats = getRoomStats(rooms, { kok: Object.keys(entities) }, entities);
    expect(stats.kok.lightsOn).toBe(1);
    expect(stats.kok.lightsTotal).toBe(2);
    expect(stats.kok.temperature).toBe(21.4);
    expect(stats.kok.humidity).toBe(45);
  });

  it('resolves light colors from rgb and color temperature', () => {
    expect(getLightColor({ attributes: { rgb_color: [10, 20, 30] } })).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
    expect(getLightColor({ attributes: { color_temp_kelvin: 2200 } })).toEqual({
      r: 255,
      g: 166,
      b: 60,
    });
    expect(getLightColor({})).toEqual({ r: 255, g: 183, b: 77 });
  });

  it('centers rooms and spreads fixtures inside the room', () => {
    expect(getRoomCenter(rooms[0])).toEqual({ x: 2, z: 1.5 });
    const positions = fixturePositions(rooms[0], 2);
    expect(positions).toHaveLength(2);
    positions.forEach(({ x, z }) => {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(4);
      expect(z).toBeGreaterThan(0);
      expect(z).toBeLessThan(3);
    });
  });
});

describe('buildWallSegments', () => {
  it('emits a shared wall once', () => {
    const adjacent = [
      { id: 'a', rects: [[0, 0, 4, 3]] },
      { id: 'b', rects: [[4, 0, 8, 3]] },
    ];
    const segments = buildWallSegments(adjacent);
    const shared = segments.filter(
      (segment) => !segment.horizontal && segment.x1 === 4 && segment.z1 === 0
    );
    expect(shared).toHaveLength(1);
  });

  it('leaves a fully covered wall open', () => {
    const segments = buildWallSegments(rooms, [{ id: 'open', rects: [[4, 0, 4, 4]] }]);
    expect(
      segments.some((segment) => !segment.horizontal && segment.x1 === 4 && segment.z1 === 0)
    ).toBe(false);
  });

  it('splits a wall around a doorway', () => {
    const segments = buildWallSegments(rooms, [{ id: 'door', rects: [[1, 0, 2, 0]] }]);
    const pieces = segments
      .filter((segment) => segment.horizontal && segment.z1 === 0)
      .map((segment) => [segment.x1, segment.x2])
      .sort((a, b) => a[0] - b[0]);
    expect(pieces).toEqual([
      [0, 1],
      [2, 4],
      [4, 8],
    ]);
  });

  it('keeps the kitchen and living room open in the house model', () => {
    const segments = buildWallSegments(
      HOUSE_ROOMS.filter((room) => room.floor === 'ground'),
      HOUSE_OPENINGS
    );
    const blocked = segments.some(
      (segment) =>
        Math.abs(segment.z1 - 1.6) < 1e-6 &&
        Math.abs(segment.z2 - 1.6) < 1e-6 &&
        segment.x1 <= 1.5 &&
        segment.x2 >= 5.7
    );
    expect(blocked).toBe(false);
  });

  it('leaves no wall stub between the hall, kitchen and living room', () => {
    const segments = buildWallSegments(
      HOUSE_ROOMS.filter((room) => room.floor === 'ground'),
      HOUSE_OPENINGS
    );
    const kitchenWall = segments.filter(
      (segment) =>
        segment.horizontal && Math.abs(segment.z1 - 1.6) < 1e-6 && Math.abs(segment.z2 - 1.6) < 1e-6
    );
    kitchenWall.forEach((segment) => {
      expect(segment.x2).toBeLessThanOrEqual(-1.4 + 1e-6);
    });
  });

  it('keeps the hall open towards the entrance and living room', () => {
    const segments = buildWallSegments(
      HOUSE_ROOMS.filter((room) => room.floor === 'ground'),
      HOUSE_OPENINGS
    );
    const entranceWall = segments.some(
      (segment) =>
        Math.abs(segment.z1 - 1.6) < 1e-6 &&
        Math.abs(segment.z2 - 1.6) < 1e-6 &&
        segment.x1 <= -1.3 &&
        segment.x2 >= 0.5
    );
    expect(entranceWall).toBe(false);

    const hallLivingWall = segments.some(
      (segment) =>
        Math.abs(segment.x1 - 1.4) < 1e-6 &&
        Math.abs(segment.x2 - 1.4) < 1e-6 &&
        segment.z1 <= -0.6 &&
        segment.z2 >= 1.2
    );
    expect(hallLivingWall).toBe(false);
  });
});

describe('house model doors', () => {
  it('models the front, back, laundry and garage doors', () => {
    expect(HOUSE_DOORS.map((door) => door.id).sort()).toEqual([
      'back',
      'front',
      'garage',
      'laundry',
    ]);
  });

  it('places every door on a wall in the model', () => {
    const segments = buildWallSegments(HOUSE_ROOMS, HOUSE_OPENINGS);
    HOUSE_DOORS.forEach((door) => {
      const [x1, z1, x2, z2] = door.rect;
      const horizontal = Math.abs(z1 - z2) < 1e-6;
      const axis = horizontal ? 'x' : 'z';
      const at = horizontal ? z1 : x1;
      const start = Math.min(horizontal ? x1 : z1, horizontal ? x2 : z2);
      const end = Math.max(horizontal ? x1 : z1, horizontal ? x2 : z2);
      const wall = segments.find((segment) => {
        const segmentAxis = segment.horizontal ? 'x' : 'z';
        const segmentAt = segment.horizontal ? segment.z1 : segment.x1;
        const segmentStart = Math.min(
          segment.horizontal ? segment.x1 : segment.z1,
          segment.horizontal ? segment.x2 : segment.z2
        );
        const segmentEnd = Math.max(
          segment.horizontal ? segment.x1 : segment.z1,
          segment.horizontal ? segment.x2 : segment.z2
        );
        return (
          segmentAxis === axis &&
          Math.abs(segmentAt - at) < 1e-6 &&
          segmentStart <= start + 1e-6 &&
          segmentEnd >= end - 1e-6
        );
      });
      expect(wall, `door ${door.id} is not on a wall`).toBeDefined();
    });
  });

  it('places the front door on the south facade and the back door on the north facade', () => {
    const front = HOUSE_DOORS.find((door) => door.id === 'front');
    const back = HOUSE_DOORS.find((door) => door.id === 'back');
    expect(front.rect[1]).toBeCloseTo(4.2);
    expect(front.rect[3]).toBeCloseTo(4.2);
    expect(back.rect[1]).toBeCloseTo(-4.2);
    expect(back.rect[3]).toBeCloseTo(-4.2);
  });

  it('does not stack a door on top of a window', () => {
    const axis = ([x1, z1, x2, z2]) => {
      const horizontal = Math.abs(z1 - z2) < 1e-6;
      return {
        horizontal,
        at: horizontal ? z1 : x1,
        start: Math.min(horizontal ? x1 : z1, horizontal ? x2 : z2),
        end: Math.max(horizontal ? x1 : z1, horizontal ? x2 : z2),
      };
    };

    HOUSE_DOORS.forEach((door) => {
      const doorAxis = axis(door.rect);
      HOUSE_WINDOWS.filter((window) => window.floor === door.floor).forEach((window) => {
        const windowAxis = axis(window.rect);
        if (doorAxis.horizontal !== windowAxis.horizontal) return;
        if (Math.abs(doorAxis.at - windowAxis.at) > 1e-6) return;
        const overlaps =
          Math.min(doorAxis.end, windowAxis.end) - Math.max(doorAxis.start, windowAxis.start) >
          1e-6;
        expect(overlaps, `${door.id} overlaps a window`).toBe(false);
      });
    });
  });

  it('places the upper bathroom beside the stairwell', () => {
    const bathroom = HOUSE_ROOMS.find((room) => room.id === 'badrum_2');
    expect(bathroom.rects[0]).toEqual([-2.4, -0.8, -0.95, 0.8]);
  });

  it('keeps the upper stair landing open', () => {
    const upperRooms = HOUSE_ROOMS.filter((room) => room.floor === 'upper');
    const segments = buildWallSegments(upperRooms, HOUSE_OPENINGS);
    const landingWall = segments.some(
      (segment) =>
        segment.horizontal &&
        Math.abs(segment.z1 - 0.8) < 1e-6 &&
        segment.x1 < -0.05 &&
        segment.x2 > -0.95
    );
    expect(landingWall).toBe(false);
  });
});

describe('house furniture', () => {
  it('builds every configured furniture item', () => {
    HOUSE_FURNITURE.forEach((item) => {
      expect(buildFurnitureItem(item), item.type).not.toBeNull();
    });
  });

  it('ignores unknown furniture types', () => {
    expect(buildFurnitureItem({ type: 'nope' })).toBeNull();
  });
});
