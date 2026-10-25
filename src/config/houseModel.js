/**
 * Schematic model of Ekhagsvägen 41.
 *
 * Coordinates are meters, x is east/west and z is south/north with the
 * entrance facing +z. Rects are [x1, z1, x2, z2] and every floor is modelled
 * as a set of rooms so the page can bind devices to a room directly.
 *
 * The model is traced from the sales floor plans (planritningvan1 = entrance
 * floor, planritningvan2 = upper floor). The plans are exported at different
 * scales, so each floor has its own px -> metre factor:
 *
 *   ground: 100 px/m, origin at plan px (996.5, 581)
 *   upper:  74.45 px/m, origin at plan px (950, 582.5)
 *
 * The upper floor is width-matched to the ground floor and sits 1.22 m inside
 * the long facades, which is where the knee walls run under the 1.5-storey
 * roof. Keep room ids stable - they are persisted in page settings.
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
  // Entrance floor. South row (entrance, laundry, bathroom, kitchen) and the
  // north row (two bedrooms plus the open living room).
  {
    id: 'hall',
    label: 'Hall',
    floor: 'ground',
    rects: [[-3.815, 0.23, 2.115, 1.73]],
  },
  {
    id: 'sovrum_1',
    label: 'Sovrum 1',
    floor: 'ground',
    rects: [[-6.195, -3.84, -2.515, 0.23]],
  },
  {
    id: 'sovrum_2',
    label: 'Sovrum 2',
    floor: 'ground',
    rects: [[-2.515, -3.84, 0.095, 0.23]],
  },
  {
    id: 'vardagsrum',
    label: 'Vardagsrum',
    floor: 'ground',
    rects: [[0.095, -3.84, 6.195, 0.23]],
  },
  {
    id: 'kok',
    label: 'Kök',
    floor: 'ground',
    rects: [[2.115, 0.23, 6.195, 3.84]],
  },
  {
    id: 'entre',
    label: 'Entré',
    floor: 'ground',
    rects: [[-0.905, 1.73, 2.115, 3.84]],
  },
  {
    id: 'badrum',
    label: 'Badrum',
    floor: 'ground',
    rects: [[-3.815, 1.73, -0.905, 3.84]],
  },
  {
    id: 'kladvard',
    label: 'Klädvård',
    floor: 'ground',
    rects: [[-6.195, 0.23, -3.815, 3.84]],
  },
  {
    id: 'garage',
    label: 'Garage',
    floor: 'ground',
    rects: [[-13.75, -2.2, -7.75, 4.4]],
  },

  // Upper floor: a north row with two bedrooms around the allrum and a south
  // row with the closets, the bathroom and the stairwell.
  {
    id: 'allrum',
    label: 'Allrum',
    floor: 'upper',
    rects: [
      [-2.748, -2.617, 2.606, -0.041],
      [-2.748, -0.041, 1.75, 0.651],
      [-0.894, 0.651, 0.141, 2.617],
    ],
  },
  {
    id: 'sovrum_3',
    label: 'Sovrum 3',
    floor: 'upper',
    rects: [[-6.195, -2.617, -2.748, 0.651]],
  },
  {
    id: 'sovrum_4',
    label: 'Sovrum 4',
    floor: 'upper',
    rects: [[2.606, -2.617, 6.195, -0.041]],
  },
  {
    id: 'sovrum_5',
    label: 'Sovrum 5',
    floor: 'upper',
    rects: [[1.75, -0.041, 6.195, 2.617]],
  },
  {
    id: 'badrum_2',
    label: 'Badrum övre',
    floor: 'upper',
    rects: [[-3.894, 0.651, -0.894, 2.617]],
  },
  {
    id: 'klk_1',
    label: 'KLK 1',
    floor: 'upper',
    rects: [[-6.195, 0.651, -3.894, 2.617]],
  },
  {
    id: 'klk_2',
    label: 'KLK 2',
    floor: 'upper',
    rects: [[0.141, 0.651, 1.75, 2.617]],
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
 * The kitchen, living room and entrance are one open space, the allrum is open
 * towards the stair landing, and every interior door is a cased opening
 * without a leaf - only the four exterior doors swing.
 */
export const HOUSE_OPENINGS = [
  // Ground floor
  { id: 'kok_vardagsrum', floor: 'ground', rects: [[2.115, 0.23, 6.195, 0.23]] },
  { id: 'hall_vardagsrum', floor: 'ground', rects: [[0.095, 0.23, 2.115, 0.23]] },
  { id: 'hall_entre', floor: 'ground', rects: [[-0.905, 1.73, 2.115, 1.73]] },
  { id: 'entre_kok', floor: 'ground', rects: [[2.115, 1.99, 2.115, 3.01]] },
  { id: 'sovrum_1_dorr', floor: 'ground', rects: [[-3.535, 0.23, -2.655, 0.23]] },
  { id: 'sovrum_2_dorr', floor: 'ground', rects: [[-2.345, 0.23, -1.465, 0.23]] },
  { id: 'kladvard_dorr', floor: 'ground', rects: [[-3.815, 0.67, -3.815, 1.57]] },
  { id: 'badrum_dorr', floor: 'ground', rects: [[-2.705, 1.73, -1.805, 1.73]] },

  // Upper floor
  { id: 'allrum_oppning', floor: 'upper', rects: [[-2.748, -0.041, 1.75, -0.041]] },
  { id: 'sovrum_5_oppning', floor: 'upper', rects: [[1.75, -0.041, 2.606, -0.041]] },
  { id: 'sovrum_5_korridor', floor: 'upper', rects: [[1.75, -0.041, 1.75, 0.689]] },
  { id: 'trapphall_oppning', floor: 'upper', rects: [[-0.894, 0.651, 0.141, 0.651]] },
  { id: 'sovrum_3_dorr', floor: 'upper', rects: [[-2.748, -0.912, -2.748, -0.168]] },
  { id: 'sovrum_4_dorr', floor: 'upper', rects: [[2.606, -1.731, 2.606, -0.912]] },
  { id: 'badrum_2_dorr', floor: 'upper', rects: [[-2.516, 0.651, -1.757, 0.651]] },
  { id: 'klk_1_dorr', floor: 'upper', rects: [[-4.839, 0.651, -4.081, 0.651]] },
  { id: 'klk_2_dorr', floor: 'upper', rects: [[1.75, 0.689, 1.75, 1.47]] },
];

/**
 * Windows drawn on the exterior walls. `rect` is the wall line the opening
 * sits on, `sill` is the height above the floor and `height` the pane height.
 */
export const HOUSE_WINDOWS = [
  // Ground floor - north facade (bedrooms, living room, garden door)
  { floor: 'ground', kind: 'window', rect: [-5.405, -3.84, -4.525, -3.84], sill: 0.95, height: 1.3 },
  { floor: 'ground', kind: 'window', rect: [-4.405, -3.84, -3.525, -3.84], sill: 0.95, height: 1.3 },
  { floor: 'ground', kind: 'window', rect: [-1.735, -3.84, -0.855, -3.84], sill: 0.95, height: 1.3 },
  { floor: 'ground', kind: 'window', rect: [0.795, -3.84, 2.565, -3.84], sill: 0.5, height: 1.95 },
  { floor: 'ground', kind: 'window', rect: [3.745, -3.84, 5.525, -3.84], sill: 0.5, height: 1.95 },

  // Ground floor - south facade (laundry, bathroom, kitchen)
  { floor: 'ground', kind: 'window', rect: [-5.455, 3.84, -4.575, 3.84], sill: 0.95, height: 1.3 },
  { floor: 'ground', kind: 'window', rect: [-1.545, 3.84, -1.065, 3.84], sill: 1.35, height: 0.75 },
  { floor: 'ground', kind: 'window', rect: [1.515, 3.84, 2.005, 3.84], sill: 1.25, height: 0.8 },

  // Ground floor - gable walls
  { floor: 'ground', kind: 'window', rect: [-6.195, -2.74, -6.195, -0.97], sill: 0.6, height: 1.8 },
  { floor: 'ground', kind: 'window', rect: [6.195, -2.43, 6.195, -0.66], sill: 0.5, height: 1.95 },
  { floor: 'ground', kind: 'window', rect: [6.195, 0.73, 6.195, 2.51], sill: 0.6, height: 1.8 },

  // Upper floor - gable walls only; the long facades are knee walls below the
  // roof slope and get their light from the roof windows in the allrum.
  { floor: 'upper', kind: 'window', rect: [-6.195, -0.42, -6.195, 0.465], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [6.195, -1.039, 6.195, -0.153], sill: 0.85, height: 1.1 },
  { floor: 'upper', kind: 'window', rect: [6.195, 0.205, 6.195, 1.097], sill: 0.85, height: 1.1 },
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
    rect: [0.395, 3.84, 1.375, 3.84],
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
    rect: [2.675, -3.84, 3.655, -3.84],
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
    rect: [-6.195, 0.38, -6.195, 1.35],
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
    rect: [-12.25, 4.4, -9.25, 4.4],
    hinge: 'start',
    swing: 1,
    style: 'garage',
    height: 2.2,
    lift: true,
  },
];

export const HOUSE_MODEL_BOUNDS = {
  minX: -14.2,
  maxX: 6.6,
  minZ: -4.3,
  maxZ: 4.9,
};
