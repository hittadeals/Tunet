/**
 * Schematic model of Ekhagsvägen 41.
 *
 * Coordinates are meters, x is east/west and z is south/north with the
 * entrance facing +z. Rects are [x1, z1, x2, z2] and every floor is modelled
 * as a set of rooms so the page can bind devices to a room directly.
 *
 * The model is intentionally diagrammatic: it is built from the sales floor
 * plans and is meant to be replaced by a GLB model later without touching the
 * page logic. Keep room ids stable - they are persisted in page settings.
 */

export const HOUSE_FLOORS = [
  {
    id: 'ground',
    label: 'Entréplan',
    labelKey: 'house3d.floor.ground',
    elevation: 0,
    height: 3.0,
  },
  {
    id: 'upper',
    label: 'Övre plan',
    labelKey: 'house3d.floor.upper',
    elevation: 3,
    height: 2.3,
  },
];

const ROOMS = [
  {
    id: 'hall',
    label: 'Hall',
    floor: 'ground',
    rects: [[-5.8, -1.0, 1.4, 1.6]],
  },
  {
    id: 'sovrum_1',
    label: 'Sovrum 1',
    floor: 'ground',
    rects: [[-5.8, -4.2, -2.0, -1.0]],
  },
  {
    id: 'sovrum_2',
    label: 'Sovrum 2',
    floor: 'ground',
    rects: [[-2.0, -4.2, 1.4, -1.0]],
  },
  {
    id: 'vardagsrum',
    label: 'Vardagsrum',
    floor: 'ground',
    rects: [[1.4, -4.2, 5.8, 1.6]],
  },
  {
    id: 'kok',
    label: 'Kök',
    floor: 'ground',
    rects: [[1.4, 1.6, 5.8, 4.2]],
  },
  {
    id: 'entre',
    label: 'Entré',
    floor: 'ground',
    rects: [[-1.4, 1.6, 1.4, 4.2]],
  },
  {
    id: 'badrum',
    label: 'Badrum',
    floor: 'ground',
    rects: [[-3.2, 1.6, -1.4, 4.2]],
  },
  {
    id: 'kladvard',
    label: 'Klädvård',
    floor: 'ground',
    rects: [[-5.8, 1.6, -3.2, 4.2]],
  },
  {
    id: 'garage',
    label: 'Garage',
    floor: 'ground',
    rects: [[-13.0, -2.0, -7.4, 4.0]],
  },
  {
    id: 'allrum',
    label: 'Allrum',
    floor: 'upper',
    rects: [
      [-2.4, -4.2, 1.8, -0.8],
      [-0.05, -0.8, 1.8, 0.8],
    ],
  },
  {
    id: 'sovrum_3',
    label: 'Sovrum 3',
    floor: 'upper',
    rects: [[-5.8, -4.2, -2.4, -1.2]],
  },
  {
    id: 'sovrum_4',
    label: 'Sovrum 4',
    floor: 'upper',
    rects: [[1.8, -4.2, 5.8, -1.2]],
  },
  {
    id: 'sovrum_5',
    label: 'Sovrum 5',
    floor: 'upper',
    rects: [[3.6, -1.2, 5.8, 0.8]],
  },
  {
    id: 'badrum_2',
    label: 'Badrum övre',
    floor: 'upper',
    rects: [[-2.4, -0.8, -0.95, 0.8]],
  },
  {
    id: 'klk_1',
    label: 'KLK 1',
    floor: 'upper',
    rects: [[-5.8, -1.2, -2.4, 0.8]],
  },
  {
    id: 'klk_2',
    label: 'KLK 2',
    floor: 'upper',
    rects: [[1.8, -1.2, 3.6, 0.8]],
  },
];

/** Floor finish per room; rooms without an entry get wooden floors. */
const FLOOR_FINISHES = {
  entre: 'tile',
  badrum: 'tile',
  badrum_2: 'tile',
  kladvard: 'tile',
  garage: 'concrete',
  sovrum_1: 'carpet',
  sovrum_2: 'carpet',
  sovrum_3: 'carpet',
  sovrum_4: 'carpet',
  sovrum_5: 'carpet',
  allrum: 'carpet',
};

export const HOUSE_ROOMS = ROOMS.map((room) => ({
  floorFinish: FLOOR_FINISHES[room.id] || 'wood',
  ...room,
}));

/**
 * Wall segments that are left open. Rectangles are [x1, z1, x2, z2] and may
 * cover a part of a wall (a cased opening) or the full shared edge.
 *
 * The kitchen and living room are one open space, and the hall flows into
 * both the entrance and the living room without a door in between.
 */
export const HOUSE_OPENINGS = [
  { id: 'kok_vardagsrum', floor: 'ground', rects: [[1.4, 1.6, 5.8, 1.6]] },
  { id: 'hall_entre', floor: 'ground', rects: [[-1.4, 1.6, 1.4, 1.6]] },
  { id: 'hall_vardagsrum', floor: 'ground', rects: [[1.4, -1.0, 1.4, 1.6]] },
  { id: 'sovrum_1_dorr', floor: 'ground', rects: [[-2.8, -1.0, -2.0, -1.0]] },
  { id: 'sovrum_2_dorr', floor: 'ground', rects: [[-1.4, -1.0, -0.6, -1.0]] },
  { id: 'badrum_dorr', floor: 'ground', rects: [[-2.5, 1.6, -1.7, 1.6]] },
  { id: 'sovrum_3_dorr', floor: 'upper', rects: [[-3.1, -1.2, -2.4, -1.2]] },
  { id: 'sovrum_4_dorr', floor: 'upper', rects: [[1.9, -1.2, 2.7, -1.2]] },
  { id: 'sovrum_5_dorr', floor: 'upper', rects: [[3.6, -1.2, 4.4, -1.2]] },
  { id: 'badrum_2_dorr', floor: 'upper', rects: [[-1.5, -0.8, -0.95, -0.8]] },
  { id: 'klk_1_dorr', floor: 'upper', rects: [[-3.2, -1.2, -2.4, -1.2]] },
];

/**
 * Windows drawn on the exterior walls. `rect` is the wall line the opening
 * sits on, `sill` is the height above the floor and `height` the pane height.
 */
export const HOUSE_WINDOWS = [
  // Ground floor
  { floor: 'ground', kind: 'window', rect: [-5.2, 4.2, -4.0, 4.2], sill: 0.95, height: 1.1 },
  { floor: 'ground', kind: 'window', rect: [-2.9, 4.2, -2.1, 4.2], sill: 1.35, height: 0.8 },
  { floor: 'ground', kind: 'window', rect: [1.4, 4.2, 2.6, 4.2], sill: 1.0, height: 1.2 },
  { floor: 'ground', kind: 'window', rect: [4.0, 4.2, 5.2, 4.2], sill: 1.0, height: 1.2 },
  { floor: 'ground', kind: 'window', rect: [-5.8, -3.4, -5.8, -2.2], sill: 0.95, height: 1.2 },
  { floor: 'ground', kind: 'window', rect: [-5.8, -0.6, -5.8, 0.4], sill: 1.05, height: 1.1 },
  { floor: 'ground', kind: 'window', rect: [5.8, -3.2, 5.8, -1.6], sill: 0.7, height: 1.6 },
  { floor: 'ground', kind: 'window', rect: [-4.6, -4.2, -3.2, -4.2], sill: 0.95, height: 1.2 },
  { floor: 'ground', kind: 'window', rect: [-1.0, -4.2, 0.2, -4.2], sill: 0.95, height: 1.2 },
  { floor: 'ground', kind: 'window', rect: [4.4, -4.2, 5.4, -4.2], sill: 0.95, height: 1.2 },

  // Upper floor
  { floor: 'upper', kind: 'window', rect: [-5.8, -3.4, -5.8, -2.4], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [-4.6, -4.2, -3.6, -4.2], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [0.0, -4.2, 1.2, -4.2], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [2.6, -4.2, 3.8, -4.2], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [5.8, -3.4, 5.8, -2.4], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [5.8, -0.6, 5.8, 0.4], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [-2.3, 0.8, -1.1, 0.8], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [4.2, 0.8, 5.2, 0.8], sill: 0.85, height: 1.1 },
];

/**
 * Openable doors. `rect` is the wall line, `hinge` the side the leaf hangs on
 * and `swing` flips the opening direction. Bind a door/window sensor to a door
 * id in the page editor and the leaf swings open when the sensor reports open.
 */
export const HOUSE_DOORS = [
  {
    id: 'front',
    label: 'Ytterdörr',
    labelKey: 'house3d.door.front',
    floor: 'ground',
    room: 'entre',
    rect: [0.1, 4.2, 1.0, 4.2],
    hinge: 'end',
    swing: 1,
    style: 'entry',
    height: 2.05,
  },
  {
    id: 'back',
    label: 'Baksida',
    labelKey: 'house3d.door.back',
    floor: 'ground',
    room: 'vardagsrum',
    rect: [2.2, -4.2, 3.4, -4.2],
    hinge: 'start',
    swing: 1,
    style: 'glass',
    height: 2.1,
  },
  {
    id: 'laundry',
    label: 'Tvättstuga',
    labelKey: 'house3d.door.laundry',
    floor: 'ground',
    room: 'kladvard',
    rect: [-4.1, 1.6, -3.25, 1.6],
    hinge: 'start',
    swing: 1,
    style: 'inner',
    height: 2.05,
  },
  {
    id: 'garage',
    label: 'Garage',
    labelKey: 'house3d.door.garage',
    floor: 'ground',
    room: 'garage',
    rect: [-11.6, 4.0, -8.8, 4.0],
    hinge: 'start',
    swing: 1,
    style: 'garage',
    height: 2.2,
    lift: true,
  },
];

export const HOUSE_MODEL_BOUNDS = {
  minX: -13.4,
  maxX: 6.2,
  minZ: -4.6,
  maxZ: 4.6,
};
