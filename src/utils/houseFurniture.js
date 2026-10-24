import * as THREE from 'three';

/**
 * Small procedural furniture builders for the 3D house model.
 *
 * The models are deliberately low-poly: a handful of boxes and cylinders read
 * as furniture from the orbit camera without adding assets or draw-call heavy
 * detail. Everything is built around the room floor (y = 0) and rotated by the
 * caller, so furniture stays a pure visual layer the scene can dispose.
 */

const COLORS = {
  wood: 0x9a7550,
  light: 0xc9a97e,
  white: 0xe9e5dd,
  stone: 0x8d8880,
  fabric: 0x6d7a80,
  linen: 0xe8e2d5,
  duvet: 0xc7cec4,
  dark: 0x35383b,
  metal: 0x9aa0a4,
  ceramic: 0xf4f2ec,
  glass: 0x8fb3c4,
  green: 0x5c7a54,
  water: 0x9db4bb,
  rug: 0x8f958d,
};

const materials = new Map();

function mat(color, roughness = 0.85, metalness = 0) {
  const key = `${color}:${roughness}:${metalness}`;
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }
  return materials.get(key);
}

function box(w, h, d, color, x = 0, y = 0, z = 0, roughness) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, roughness));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius, height, color, x = 0, y = 0, z = 0, segments = 18) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    mat(color)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function group(...children) {
  const result = new THREE.Group();
  result.add(...children);
  return result;
}

const BUILDERS = {
  bed(item) {
    const w = item.w || 1.6;
    const d = item.d || 2.0;
    return group(
      box(w + 0.12, 0.3, d, COLORS.wood, 0, 0.16, 0),
      box(w, 0.22, d * 0.94, COLORS.linen, 0, 0.42, 0.02),
      box(w * 0.98, 0.09, d * 0.56, COLORS.duvet, 0, 0.57, d * 0.21),
      box(w * 0.42, 0.13, 0.36, COLORS.linen, -w * 0.24, 0.61, -d * 0.31),
      box(w * 0.42, 0.13, 0.36, COLORS.linen, w * 0.24, 0.61, -d * 0.31),
      box(w + 0.12, 0.8, 0.08, COLORS.wood, 0, 0.46, -d / 2 + 0.04)
    );
  },

  nightstand() {
    return group(
      box(0.45, 0.48, 0.4, COLORS.light, 0, 0.24, 0),
      box(0.47, 0.04, 0.42, COLORS.wood, 0, 0.5, 0),
      box(0.33, 0.02, 0.01, COLORS.stone, 0, 0.34, 0.2)
    );
  },

  wardrobe(item) {
    const w = item.w || 1.6;
    return group(
      box(w, 2.05, 0.58, COLORS.light, 0, 1.03, 0),
      box(w / 2 - 0.03, 1.9, 0.03, COLORS.wood, -w / 4, 1.03, 0.3),
      box(w / 2 - 0.03, 1.9, 0.03, COLORS.wood, w / 4, 1.03, 0.3),
      cylinder(0.015, 0.22, COLORS.stone, -0.06, 1.05, 0.33),
      cylinder(0.015, 0.22, COLORS.stone, 0.06, 1.05, 0.33)
    );
  },

  sofa(item) {
    const w = item.w || 2.2;
    const d = item.d || 0.9;
    return group(
      box(w, 0.34, d, COLORS.fabric, 0, 0.2, 0),
      box(w, 0.52, 0.18, COLORS.fabric, 0, 0.46, -d / 2 + 0.09),
      box(0.16, 0.5, d, COLORS.fabric, -w / 2 + 0.08, 0.4, 0),
      box(0.16, 0.5, d, COLORS.fabric, w / 2 - 0.08, 0.4, 0),
      box(w / 2 - 0.12, 0.14, d - 0.24, COLORS.duvet, -w / 4, 0.44, 0.02),
      box(w / 2 - 0.12, 0.14, d - 0.24, COLORS.duvet, w / 4, 0.44, 0.02)
    );
  },

  armchair() {
    return group(
      box(0.92, 0.32, 0.86, COLORS.fabric, 0, 0.19, 0),
      box(0.92, 0.48, 0.16, COLORS.fabric, 0, 0.44, -0.35),
      box(0.14, 0.46, 0.86, COLORS.fabric, -0.39, 0.38, 0),
      box(0.14, 0.46, 0.86, COLORS.fabric, 0.39, 0.38, 0),
      box(0.62, 0.13, 0.6, COLORS.duvet, 0, 0.42, 0.04)
    );
  },

  coffeeTable(item) {
    const w = item.w || 1.2;
    const d = item.d || 0.7;
    return group(
      box(w, 0.06, d, COLORS.wood, 0, 0.42, 0),
      box(w - 0.16, 0.03, d - 0.16, COLORS.stone, 0, 0.2, 0),
      cylinder(0.03, 0.4, COLORS.dark, -w / 2 + 0.08, 0.2, -d / 2 + 0.08),
      cylinder(0.03, 0.4, COLORS.dark, w / 2 - 0.08, 0.2, -d / 2 + 0.08),
      cylinder(0.03, 0.4, COLORS.dark, -w / 2 + 0.08, 0.2, d / 2 - 0.08),
      cylinder(0.03, 0.4, COLORS.dark, w / 2 - 0.08, 0.2, d / 2 - 0.08)
    );
  },

  diningTable(item) {
    const w = item.w || 1.7;
    const d = item.d || 0.9;
    const chair = (x, z, rotation = 0) => {
      const seat = group(
        box(0.42, 0.06, 0.42, COLORS.wood, 0, 0.45, 0),
        box(0.42, 0.46, 0.05, COLORS.light, 0, 0.69, -0.185),
        box(0.06, 0.44, 0.06, COLORS.dark, -0.16, 0.22, -0.16),
        box(0.06, 0.44, 0.06, COLORS.dark, 0.16, 0.22, -0.16),
        box(0.06, 0.44, 0.06, COLORS.dark, -0.16, 0.22, 0.16),
        box(0.06, 0.44, 0.06, COLORS.dark, 0.16, 0.22, 0.16)
      );
      seat.position.set(x, 0, z);
      seat.rotation.y = rotation;
      return seat;
    };

    return group(
      box(w, 0.07, d, COLORS.wood, 0, 0.73, 0),
      box(0.08, 0.7, 0.08, COLORS.dark, -w / 2 + 0.12, 0.36, -d / 2 + 0.12),
      box(0.08, 0.7, 0.08, COLORS.dark, w / 2 - 0.12, 0.36, -d / 2 + 0.12),
      box(0.08, 0.7, 0.08, COLORS.dark, -w / 2 + 0.12, 0.36, d / 2 - 0.12),
      box(0.08, 0.7, 0.08, COLORS.dark, w / 2 - 0.12, 0.36, d / 2 - 0.12),
      chair(-w / 4, -d / 2 - 0.32, Math.PI),
      chair(w / 4, -d / 2 - 0.32, Math.PI),
      chair(-w / 4, d / 2 + 0.32, 0),
      chair(w / 4, d / 2 + 0.32, 0)
    );
  },

  rug(item) {
    const color = COLORS[item.color] || COLORS.fabric;
    return group(box(item.w || 2, 0.02, item.d || 1.4, color, 0, 0.012, 0, 1));
  },

  tvUnit(item) {
    const w = item.w || 2;
    return group(
      box(w, 0.42, 0.42, COLORS.light, 0, 0.23, 0),
      box(w * 0.42, 0.02, 0.01, COLORS.stone, -w * 0.24, 0.25, 0.21),
      box(w * 0.42, 0.02, 0.01, COLORS.stone, w * 0.24, 0.25, 0.21),
      cylinder(0.04, 0.28, COLORS.dark, 0, 0.58, -0.12),
      box(0.34, 0.02, 0.2, COLORS.dark, 0, 0.44, -0.12),
      box(w * 0.68, 0.68, 0.05, COLORS.dark, 0, 1.06, -0.12)
    );
  },

  kitchenRun(item) {
    const w = item.w || 3.6;
    const stoveX = w * 0.24;
    return group(
      box(w, 0.84, 0.62, COLORS.white, 0, 0.44, 0),
      box(w + 0.05, 0.05, 0.66, COLORS.stone, 0, 0.89, 0),
      box(w * 0.94, 0.58, 0.32, COLORS.white, 0, 1.78, -0.14),
      box(0.56, 0.03, 0.44, COLORS.dark, stoveX, 0.93, 0.02),
      box(0.46, 0.025, 0.34, COLORS.metal, -w * 0.27, 0.92, 0.02),
      cylinder(0.02, 0.26, COLORS.metal, -w * 0.27, 1.02, -0.12),
      box(0.5, 0.02, 0.01, COLORS.stone, -w * 0.27, 0.5, 0.315),
      box(0.5, 0.02, 0.01, COLORS.stone, w * 0.05, 0.5, 0.315),
      box(0.5, 0.02, 0.01, COLORS.stone, w * 0.38, 0.5, 0.315)
    );
  },

  island(item) {
    const w = item.w || 2.2;
    const d = item.d || 0.9;
    return group(
      box(w, 0.84, d, COLORS.white, 0, 0.44, 0),
      box(w + 0.06, 0.06, d + 0.08, COLORS.stone, 0, 0.9, 0),
      box(w * 0.7, 0.02, 0.01, COLORS.stone, 0, 0.55, d / 2 + 0.005)
    );
  },

  fridge() {
    return group(
      box(0.66, 1.92, 0.62, COLORS.metal, 0, 0.96, 0),
      box(0.62, 0.015, 0.01, COLORS.dark, 0, 1.16, 0.315),
      cylinder(0.015, 0.3, COLORS.dark, 0.24, 1.42, 0.33),
      cylinder(0.015, 0.3, COLORS.dark, 0.24, 0.86, 0.33)
    );
  },

  stool() {
    return group(
      cylinder(0.18, 0.07, COLORS.wood, 0, 0.62, 0, 22),
      cylinder(0.03, 0.58, COLORS.dark, 0, 0.32, 0, 12),
      cylinder(0.17, 0.03, COLORS.dark, 0, 0.03, 0, 20)
    );
  },

  console(item) {
    const w = item.w || 1;
    return group(
      box(w, 0.06, 0.34, COLORS.wood, 0, 0.8, 0),
      box(w - 0.1, 0.04, 0.3, COLORS.wood, 0, 0.2, 0),
      box(0.05, 0.8, 0.3, COLORS.dark, -w / 2 + 0.05, 0.4, 0),
      box(0.05, 0.8, 0.3, COLORS.dark, w / 2 - 0.05, 0.4, 0)
    );
  },

  bench(item) {
    const w = item.w || 1.4;
    return group(
      box(w, 0.1, 0.42, COLORS.wood, 0, 0.44, 0),
      box(w - 0.1, 0.03, 0.36, COLORS.duvet, 0, 0.5, 0),
      box(0.06, 0.42, 0.36, COLORS.light, -w / 2 + 0.08, 0.21, 0),
      box(0.06, 0.42, 0.36, COLORS.light, w / 2 - 0.08, 0.21, 0)
    );
  },

  shelf(item) {
    const w = item.w || 1.2;
    const boards = [0.36, 0.78, 1.2, 1.62];
    return group(
      box(0.04, 1.82, 0.34, COLORS.wood, -w / 2 + 0.02, 0.91, 0),
      box(0.04, 1.82, 0.34, COLORS.wood, w / 2 - 0.02, 0.91, 0),
      box(w, 1.82, 0.02, COLORS.light, 0, 0.91, -0.16),
      ...boards.map((y) => box(w - 0.08, 0.04, 0.32, COLORS.light, 0, y, 0))
    );
  },

  desk(item) {
    const w = item.w || 1.3;
    return group(
      box(w, 0.05, 0.6, COLORS.wood, 0, 0.74, 0),
      box(0.05, 0.72, 0.55, COLORS.dark, -w / 2 + 0.05, 0.36, 0),
      box(0.05, 0.72, 0.55, COLORS.dark, w / 2 - 0.05, 0.36, 0),
      box(0.34, 0.03, 0.24, COLORS.dark, 0, 0.78, 0.02),
      box(0.44, 0.06, 0.44, COLORS.fabric, 0, 0.45, 0.62),
      box(0.44, 0.42, 0.06, COLORS.fabric, 0, 0.66, 0.82)
    );
  },

  washer() {
    return group(
      box(0.6, 0.86, 0.6, COLORS.white, 0, 0.44, 0),
      cylinder(0.2, 0.035, COLORS.dark, 0, 0.48, 0.31).rotateX(Math.PI / 2),
      cylinder(0.13, 0.045, COLORS.metal, 0, 0.48, 0.32).rotateX(Math.PI / 2),
      box(0.3, 0.05, 0.02, COLORS.stone, 0, 0.84, 0.31)
    );
  },

  laundryMachine(item) {
    const drum = new THREE.Group();
    drum.position.set(0, 0.48, 0.315);
    drum.add(
      cylinder(0.19, 0.02, COLORS.dark).rotateX(Math.PI / 2),
      cylinder(0.165, 0.03, COLORS.metal).rotateX(Math.PI / 2),
      box(0.1, 0.06, 0.03, COLORS.fabric, 0.07, 0.04, 0.025),
      box(0.07, 0.1, 0.03, COLORS.duvet, -0.05, -0.02, 0.026),
      box(0.06, 0.06, 0.03, COLORS.linen, -0.02, 0.09, 0.024)
    );
    drum.children[1].position.z = 0.012;

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.015, 28),
      new THREE.MeshStandardMaterial({
        color: 0x9fc6d8,
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      })
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.z = 0.045;
    drum.add(glass);

    const ledMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2c2e,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02), ledMaterial);
    led.position.set(0.2, 0.78, 0.31);

    const body = group(
      box(0.6, 0.86, 0.6, COLORS.white, 0, 0.44, 0),
      box(0.52, 0.1, 0.02, COLORS.stone, 0, 0.65, 0.305),
      box(0.28, 0.03, 0.02, COLORS.metal, 0, 0.82, 0.31),
      drum,
      led
    );
    body.userData.drum = drum;
    body.userData.ledMaterial = ledMaterial;
    body.userData.appliance = item.appliance;
    return body;
  },

  toilet() {
    return group(
      cylinder(0.19, 0.4, COLORS.ceramic, 0, 0.2, 0),
      (() => {
        const bowl = cylinder(0.23, 0.16, COLORS.ceramic, 0, 0.44, 0.02, 24);
        bowl.scale.z = 1.25;
        return bowl;
      })(),
      box(0.44, 0.36, 0.18, COLORS.ceramic, 0, 0.5, -0.27),
      box(0.4, 0.04, 0.15, COLORS.metal, 0, 0.69, -0.27)
    );
  },

  sink(item) {
    const w = item.w || 0.6;
    return group(
      box(w, 0.68, 0.4, COLORS.light, 0, 0.35, 0),
      box(w * 0.86, 0.1, 0.32, COLORS.ceramic, 0, 0.74, 0),
      cylinder(0.018, 0.2, COLORS.metal, 0, 0.86, -0.12),
      box(0.02, 0.03, 0.13, COLORS.metal, 0, 0.95, -0.06)
    );
  },

  bathtub() {
    return group(
      box(1.7, 0.56, 0.75, COLORS.ceramic, 0, 0.29, 0),
      box(1.52, 0.05, 0.58, COLORS.water, 0, 0.54, 0),
      box(1.7, 0.06, 0.06, COLORS.ceramic, 0, 0.58, -0.345),
      box(1.7, 0.06, 0.06, COLORS.ceramic, 0, 0.58, 0.345),
      box(0.06, 0.06, 0.63, COLORS.ceramic, -0.82, 0.58, 0),
      box(0.06, 0.06, 0.63, COLORS.ceramic, 0.82, 0.58, 0),
      box(0.05, 0.18, 0.05, COLORS.metal, 0.72, 0.62, 0),
      box(0.18, 0.04, 0.05, COLORS.metal, 0.65, 0.7, 0)
    );
  },

  shower() {
    return group(
      box(0.9, 0.06, 0.9, COLORS.ceramic, 0, 0.03, 0),
      box(0.02, 1.9, 0.9, COLORS.glass, -0.44, 0.98, 0, 0.15),
      box(0.9, 1.9, 0.02, COLORS.glass, 0, 0.98, -0.44, 0.15),
      cylinder(0.02, 1.2, COLORS.metal, 0.38, 1.1, -0.38),
      cylinder(0.11, 0.03, COLORS.metal, 0.38, 1.72, -0.3, 20)
    );
  },

  plant() {
    return group(
      cylinder(0.15, 0.28, COLORS.stone, 0, 0.14, 0, 20),
      cylinder(0.025, 0.42, COLORS.wood, 0, 0.44, 0, 8),
      (() => {
        const foliage = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.26, 1),
          mat(COLORS.green, 1)
        );
        foliage.position.set(0, 0.76, 0);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        return foliage;
      })(),
      (() => {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), mat(COLORS.green, 1));
        leaf.position.set(0.13, 0.58, 0.08);
        leaf.castShadow = true;
        leaf.receiveShadow = true;
        return leaf;
      })()
    );
  },

  crate() {
    return group(
      box(0.6, 0.5, 0.6, COLORS.wood, 0, 0.25, 0),
      box(0.64, 0.05, 0.64, COLORS.light, 0, 0.52, 0),
      box(0.62, 0.03, 0.62, COLORS.light, 0, 0.16, 0)
    );
  },
};

/** Builds one group for a furniture spec, or null for unknown types. */
export function buildFurnitureItem(item) {
  const builder = BUILDERS[item?.type];
  if (!builder) return null;
  const mesh = builder(item);
  mesh.position.set(item.x || 0, 0, item.z || 0);
  mesh.rotation.y = THREE.MathUtils.degToRad(item.rot || 0);
  mesh.name = `furniture_${item.type}`;
  return mesh;
}
