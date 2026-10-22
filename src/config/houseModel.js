/**
 * Schematic model of Ekhagsvägen 41.
 *
 * Coordinates are meters, x is east/west and z is south/north with the
 * entrance facing +z. Rects are [x1, z1, x2, z2] and every floor is modelled
 * as a set of rooms so HA areas can be mapped onto the visible geometry.
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
    height: 2.7,
  },
  {
    id: 'upper',
    label: 'Övre plan',
    labelKey: 'house3d.floor.upper',
    elevation: 3,
    height: 2.3,
  },
];

export const HOUSE_ROOMS = [
  {
    id: 'hall',
    label: 'Hall',
    floor: 'ground',
    rects: [[-5.8, -1.0, 1.4, 1.6]],
    keywords: ['hall', 'korridor', 'entréhall'],
  },
  {
    id: 'sovrum_1',
    label: 'Sovrum 1',
    floor: 'ground',
    rects: [[-5.8, -4.2, -2.0, -1.0]],
    keywords: ['sovrum 1', 'master', 'föräldrasovrum'],
  },
  {
    id: 'sovrum_2',
    label: 'Sovrum 2',
    floor: 'ground',
    rects: [[-2.0, -4.2, 1.4, -1.0]],
    keywords: ['sovrum 2', 'gästrum', 'guest room'],
  },
  {
    id: 'vardagsrum',
    label: 'Vardagsrum',
    floor: 'ground',
    rects: [[1.4, -4.2, 5.8, 1.6]],
    keywords: ['vardagsrum', 'living room', 'livingroom'],
  },
  {
    id: 'kok',
    label: 'Kök',
    floor: 'ground',
    rects: [[0.6, 1.6, 5.8, 4.2]],
    keywords: ['kök', 'kok', 'kitchen'],
  },
  {
    id: 'entre',
    label: 'Entré',
    floor: 'ground',
    rects: [[-1.4, 1.6, 0.6, 4.2]],
    keywords: ['entré', 'entre', 'entry'],
  },
  {
    id: 'badrum',
    label: 'Badrum',
    floor: 'ground',
    rects: [[-3.2, 1.6, -1.4, 4.2]],
    keywords: ['badrum', 'bathroom', 'wc'],
  },
  {
    id: 'kladvard',
    label: 'Klädvård',
    floor: 'ground',
    rects: [[-5.8, 1.6, -3.2, 4.2]],
    keywords: ['klädvård', 'tvättstuga', 'laundry'],
  },
  {
    id: 'garage',
    label: 'Garage',
    floor: 'ground',
    rects: [[-13.0, -2.0, -7.4, 4.0]],
    keywords: ['garage', 'carport'],
  },
  {
    id: 'allrum',
    label: 'Allrum',
    floor: 'upper',
    rects: [
      [-0.6, -4.2, 1.8, -2.0],
      [-2.4, -2.0, 1.8, 0.8],
    ],
    keywords: ['allrum', 'loft', 'tv-rum'],
  },
  {
    id: 'sovrum_3',
    label: 'Sovrum 3',
    floor: 'upper',
    rects: [[-5.8, -4.2, -2.4, -1.2]],
    keywords: ['sovrum 3', 'barnrum'],
  },
  {
    id: 'sovrum_4',
    label: 'Sovrum 4',
    floor: 'upper',
    rects: [[1.8, -4.2, 5.8, -1.2]],
    keywords: ['sovrum 4', 'barnrum'],
  },
  {
    id: 'sovrum_5',
    label: 'Sovrum 5',
    floor: 'upper',
    rects: [[3.6, -1.2, 5.8, 0.8]],
    keywords: ['sovrum 5', 'hemmakontor', 'office'],
  },
  {
    id: 'badrum_2',
    label: 'Badrum övre',
    floor: 'upper',
    rects: [[-2.4, -4.2, -0.6, -2.0]],
    keywords: ['badrum övre', 'badrum 2', 'bathroom upper'],
  },
  {
    id: 'klk_1',
    label: 'KLK 1',
    floor: 'upper',
    rects: [[-5.8, -1.2, -2.4, 0.8]],
    keywords: ['klk 1', 'förvaring'],
  },
  {
    id: 'klk_2',
    label: 'KLK 2',
    floor: 'upper',
    rects: [[1.8, -1.2, 3.6, 0.8]],
    keywords: ['klk 2', 'förvaring'],
  },
];

export const HOUSE_MODEL_BOUNDS = {
  minX: -13.4,
  maxX: 6.2,
  minZ: -4.6,
  maxZ: 4.6,
};
