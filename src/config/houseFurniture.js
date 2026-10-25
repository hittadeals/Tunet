/**
 * Schematic furniture for the 3D house model.
 *
 * Positions are model-space metres (x east/west, z south/north) and `rot` is
 * degrees around the Y axis. Every item is a small procedural mesh from
 * `utils/houseFurniture`, so the scene stays asset-free and cheap to render.
 * Keep the list readable: one block per room, ordered by room id.
 *
 * The layout follows the fixture symbols on the sales plans: wardrobes sit
 * where the plans mark G, the kitchen peninsula carries the sink and hob, and
 * the laundry machines stand against the bathroom wall in Klädvård.
 */

export const HOUSE_FURNITURE = [
  // Ground floor
  { room: 'hall', type: 'rug', x: -1.4, z: 1.0, w: 1.8, d: 0.9, color: 'rug' },
  { room: 'hall', type: 'bench', x: -3.3, z: 0.55, w: 1.2 },
  { room: 'hall', type: 'console', x: -2.2, z: 0.5, w: 1.1 },
  { room: 'hall', type: 'plant', x: 1.8, z: 1.4 },

  { room: 'sovrum_1', type: 'bed', x: -5.05, z: -2.5, w: 1.8, d: 2.1, rot: 90 },
  { room: 'sovrum_1', type: 'nightstand', x: -5.6, z: -3.5 },
  { room: 'sovrum_1', type: 'nightstand', x: -5.6, z: -1.5 },
  { room: 'sovrum_1', type: 'wardrobe', x: -2.8, z: -2.9, w: 2.0, rot: 270 },
  { room: 'sovrum_1', type: 'desk', x: -3.4, z: -0.3, w: 1.2, rot: 180 },

  { room: 'sovrum_2', type: 'bed', x: -1.5, z: -2.5, w: 1.6, d: 2.05, rot: 90 },
  { room: 'sovrum_2', type: 'nightstand', x: -2.15, z: -1.4 },
  { room: 'sovrum_2', type: 'wardrobe', x: -0.25, z: -1.6, w: 1.4, rot: 270 },

  { room: 'vardagsrum', type: 'rug', x: 4.1, z: -2.0, w: 3.0, d: 2.6, color: 'rug' },
  { room: 'vardagsrum', type: 'sofa', x: 3.2, z: -2.0, w: 2.4, rot: 90 },
  { room: 'vardagsrum', type: 'armchair', x: 4.6, z: -3.3 },
  { room: 'vardagsrum', type: 'coffeeTable', x: 4.4, z: -2.0, w: 1.2, d: 0.7 },
  { room: 'vardagsrum', type: 'tvUnit', x: 5.9, z: -2.0, w: 1.8, rot: 270 },
  { room: 'vardagsrum', type: 'diningTable', x: 1.5, z: -1.9, w: 1.7, d: 0.9 },
  { room: 'vardagsrum', type: 'plant', x: 5.8, z: -0.4 },

  { room: 'kok', type: 'kitchenRun', x: 3.9, z: 3.5, w: 3.4, rot: 180 },
  { room: 'kok', type: 'fridge', x: 5.85, z: 3.5, rot: 180 },
  { room: 'kok', type: 'island', x: 3.55, z: 1.2, w: 2.8, d: 0.68 },
  { room: 'kok', type: 'stool', x: 3.0, z: 2.0 },
  { room: 'kok', type: 'stool', x: 3.9, z: 2.0 },

  { room: 'entre', type: 'rug', x: 1.2, z: 3.3, w: 1.1, d: 0.7, color: 'dark' },
  { room: 'entre', type: 'console', x: 1.95, z: 2.7, w: 1.0, rot: 270 },
  { room: 'entre', type: 'plant', x: 1.95, z: 1.95 },

  { room: 'badrum', type: 'shower', x: -3.3, z: 3.3 },
  { room: 'badrum', type: 'sink', x: -2.65, z: 3.6, rot: 180 },
  { room: 'badrum', type: 'sink', x: -1.95, z: 3.6, rot: 180 },
  { room: 'badrum', type: 'toilet', x: -1.95, z: 2.4 },

  { room: 'kladvard', type: 'laundryMachine', x: -4.2, z: 2.8, rot: 270, appliance: 'dryer' },
  { room: 'kladvard', type: 'laundryMachine', x: -4.2, z: 3.45, rot: 270, appliance: 'washer' },
  { room: 'kladvard', type: 'wardrobe', x: -5.85, z: 3.3, w: 1.0, rot: 90 },
  { room: 'kladvard', type: 'bench', x: -4.6, z: 1.0, w: 1.2 },

  { room: 'garage', type: 'bench', x: -13.2, z: 3.0, w: 2.0, rot: 90 },
  { room: 'garage', type: 'shelf', x: -10.5, z: -1.7, w: 2.0 },
  { room: 'garage', type: 'crate', x: -8.4, z: -1.3 },
  { room: 'garage', type: 'crate', x: -8.4, z: -0.6 },
  { room: 'garage', type: 'crate', x: -9.1, z: -1.0 },

  // Upper floor
  { room: 'allrum', type: 'rug', x: -1.3, z: -1.5, w: 2.6, d: 1.8, color: 'rug' },
  { room: 'allrum', type: 'sofa', x: -1.3, z: -0.35, w: 2.2, rot: 180 },
  { room: 'allrum', type: 'coffeeTable', x: -1.3, z: -1.4, w: 1.0, d: 0.6 },
  { room: 'allrum', type: 'tvUnit', x: 1.9, z: -1.5, w: 1.6, rot: 270 },
  { room: 'allrum', type: 'shelf', x: -2.55, z: -2.0, w: 1.4, rot: 90 },
  { room: 'allrum', type: 'plant', x: 2.3, z: 0.3 },

  { room: 'sovrum_3', type: 'bed', x: -5.15, z: -1.4, w: 1.7, d: 2.05, rot: 90 },
  { room: 'sovrum_3', type: 'nightstand', x: -5.7, z: -2.45 },
  { room: 'sovrum_3', type: 'nightstand', x: -5.7, z: -0.35 },
  { room: 'sovrum_3', type: 'wardrobe', x: -3.05, z: -1.0, w: 1.8, rot: 270 },
  { room: 'sovrum_3', type: 'desk', x: -3.5, z: 0.35, w: 1.2, rot: 180 },

  { room: 'sovrum_4', type: 'bed', x: 5.15, z: -1.35, w: 1.6, d: 2.05, rot: 270 },
  { room: 'sovrum_4', type: 'nightstand', x: 6.0, z: -2.35 },
  { room: 'sovrum_4', type: 'nightstand', x: 6.0, z: -0.35 },
  { room: 'sovrum_4', type: 'wardrobe', x: 3.4, z: -0.35, w: 1.6, rot: 180 },
  { room: 'sovrum_4', type: 'desk', x: 3.3, z: -2.3, w: 1.3 },

  { room: 'sovrum_5', type: 'bed', x: 5.15, z: 1.3, w: 1.8, d: 2.05, rot: 270 },
  { room: 'sovrum_5', type: 'nightstand', x: 6.0, z: 0.2 },
  { room: 'sovrum_5', type: 'nightstand', x: 6.0, z: 2.4 },
  { room: 'sovrum_5', type: 'wardrobe', x: 3.2, z: 0.3, w: 1.8 },
  { room: 'sovrum_5', type: 'desk', x: 2.4, z: 2.2, w: 1.2 },

  { room: 'badrum_2', type: 'shower', x: -2.3, z: 1.9 },
  { room: 'badrum_2', type: 'toilet', x: -3.45, z: 1.15 },
  { room: 'badrum_2', type: 'sink', x: -1.3, z: 1.2, rot: 270 },

  { room: 'klk_1', type: 'wardrobe', x: -5.85, z: 1.6, w: 1.8, rot: 90 },
  { room: 'klk_1', type: 'shelf', x: -4.15, z: 1.6, w: 1.6, rot: 270 },
  { room: 'klk_2', type: 'wardrobe', x: 0.65, z: 1.6, w: 1.2, rot: 90 },
  { room: 'klk_2', type: 'shelf', x: 1.55, z: 1.0, w: 1.2, rot: 270 },
];
