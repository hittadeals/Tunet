/**
 * Schematic furniture for the 3D house model.
 *
 * Positions are model-space metres (x east/west, z south/north) and `rot` is
 * degrees around the Y axis. Every item is a small procedural mesh from
 * `utils/houseFurniture`, so the scene stays asset-free and cheap to render.
 * Keep the list readable: one block per room, ordered by room id.
 */

export const HOUSE_FURNITURE = [
  // Ground floor
  { room: 'hall', type: 'rug', x: -2.0, z: 0.3, w: 2.6, d: 1.1, color: 'rug' },
  { room: 'hall', type: 'bench', x: -4.7, z: -0.55, w: 1.4 },
  { room: 'hall', type: 'shelf', x: -3.3, z: 1.3, w: 1.2, rot: 180 },
  { room: 'hall', type: 'plant', x: 1.05, z: 1.3 },

  { room: 'sovrum_1', type: 'bed', x: -4.6, z: -2.6, w: 1.8, d: 2.1, rot: 90 },
  { room: 'sovrum_1', type: 'nightstand', x: -5.45, z: -1.5 },
  { room: 'sovrum_1', type: 'nightstand', x: -5.45, z: -3.7 },
  { room: 'sovrum_1', type: 'wardrobe', x: -2.4, z: -3.3, w: 1.6, rot: 90 },

  { room: 'sovrum_2', type: 'bed', x: -0.95, z: -2.6, w: 1.6, d: 2.0, rot: 90 },
  { room: 'sovrum_2', type: 'nightstand', x: -1.8, z: -1.45 },
  { room: 'sovrum_2', type: 'wardrobe', x: 1.15, z: -3.4, w: 1.4, rot: 270 },

  { room: 'vardagsrum', type: 'rug', x: 3.9, z: -2.4, w: 3.0, d: 2.6, color: 'rug' },
  { room: 'vardagsrum', type: 'sofa', x: 3.9, z: -1.2, w: 2.6, rot: 180 },
  { room: 'vardagsrum', type: 'armchair', x: 2.4, z: -2.5, rot: 90 },
  { room: 'vardagsrum', type: 'coffeeTable', x: 3.9, z: -2.6, w: 1.3, d: 0.7 },
  { room: 'vardagsrum', type: 'diningTable', x: 3.2, z: 0.75, w: 1.7, d: 0.9 },
  { room: 'vardagsrum', type: 'tvUnit', x: 3.9, z: -3.9, w: 2.2 },
  { room: 'vardagsrum', type: 'plant', x: 5.3, z: 1.1 },

  { room: 'kok', type: 'kitchenRun', x: 3.3, z: 3.9, w: 3.4, rot: 180 },
  { room: 'kok', type: 'fridge', x: 5.4, z: 3.8, rot: 180 },
  { room: 'kok', type: 'island', x: 2.4, z: 2.75, w: 2.2, d: 0.9 },
  { room: 'kok', type: 'stool', x: 1.9, z: 2.05 },
  { room: 'kok', type: 'stool', x: 2.9, z: 2.05 },

  { room: 'entre', type: 'rug', x: -0.4, z: 3.5, w: 1.1, d: 0.7, color: 'dark' },
  { room: 'entre', type: 'console', x: 1.2, z: 2.5, w: 1.1, rot: 270 },
  { room: 'entre', type: 'plant', x: -1.15, z: 3.85 },

  { room: 'badrum', type: 'bathtub', x: -2.72, z: 2.55, rot: 90 },
  { room: 'badrum', type: 'toilet', x: -2.85, z: 3.85, rot: 180 },
  { room: 'badrum', type: 'sink', x: -1.72, z: 2.0, rot: 270 },

  { room: 'kladvard', type: 'washer', x: -5.35, z: 2.15 },
  { room: 'kladvard', type: 'washer', x: -4.55, z: 2.15 },
  { room: 'kladvard', type: 'shelf', x: -4.5, z: 3.95, w: 2.2, rot: 180 },

  { room: 'garage', type: 'bench', x: -12.5, z: 2.6, w: 2.2, rot: 90 },
  { room: 'garage', type: 'shelf', x: -9.4, z: -1.75, w: 2.0 },
  { room: 'garage', type: 'crate', x: -8.4, z: -1.2 },
  { room: 'garage', type: 'crate', x: -9.0, z: -1.2 },
  { room: 'garage', type: 'crate', x: -8.7, z: -0.55 },

  // Upper floor
  { room: 'allrum', type: 'rug', x: 0.0, z: -2.4, w: 2.8, d: 2.2, color: 'rug' },
  { room: 'allrum', type: 'sofa', x: -0.4, z: -3.3, w: 2.2 },
  { room: 'allrum', type: 'coffeeTable', x: 0.3, z: -2.2, w: 1.0, d: 0.6 },
  { room: 'allrum', type: 'tvUnit', x: -0.2, z: -0.95, w: 1.8, rot: 180 },
  { room: 'allrum', type: 'plant', x: 1.35, z: -0.1 },

  { room: 'sovrum_3', type: 'bed', x: -4.6, z: -2.7, w: 1.6, d: 2.0, rot: 90 },
  { room: 'sovrum_3', type: 'nightstand', x: -5.45, z: -1.65 },
  { room: 'sovrum_3', type: 'wardrobe', x: -2.75, z: -3.4, w: 1.4, rot: 270 },

  { room: 'sovrum_4', type: 'bed', x: 4.7, z: -2.7, w: 1.6, d: 2.0, rot: 270 },
  { room: 'sovrum_4', type: 'nightstand', x: 5.45, z: -1.65 },
  { room: 'sovrum_4', type: 'desk', x: 2.35, z: -3.5, w: 1.3, rot: 90 },

  { room: 'sovrum_5', type: 'desk', x: 5.4, z: -0.2, w: 1.4, rot: 270 },
  { room: 'sovrum_5', type: 'shelf', x: 4.5, z: 0.6, w: 1.2, rot: 180 },

  { room: 'badrum_2', type: 'toilet', x: -2.05, z: -3.85 },
  { room: 'badrum_2', type: 'sink', x: -1.0, z: -3.85, w: 0.55 },
  { room: 'badrum_2', type: 'shower', x: -1.5, z: -2.6 },

  { room: 'klk_1', type: 'wardrobe', x: -4.7, z: 0.45, w: 1.8, rot: 180 },
  { room: 'klk_1', type: 'wardrobe', x: -3.1, z: 0.45, w: 1.0, rot: 180 },
  { room: 'klk_2', type: 'wardrobe', x: 2.7, z: 0.45, w: 1.5, rot: 180 },
];



