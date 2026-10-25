import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWallSegments, getLightColor, getRoomBounds, getRoomCenter } from './houseScene';
import { buildFurnitureItem } from './houseFurniture';

const WALL_THICKNESS = 0.13;
const WALL_COLOR = 0xeeeae1;
const ROOF_COLOR = 0x34383a;
const GROUND_COLOR = 0x6d7a58;
const FLOOR_TEXTURE_METERS = 1.5;

const FLOOR_COLORS = {
  wood: 0xffffff,
  tile: 0xffffff,
  carpet: 0xffffff,
  concrete: 0x9d9b94,
};

const LABEL_STYLE = [
  'position:absolute',
  'left:0',
  'top:0',
  'display:flex',
  'flex-direction:column',
  'align-items:center',
  'gap:2px',
  'pointer-events:none',
  'white-space:nowrap',
  'will-change:transform,opacity',
  'opacity:0',
  'transition:opacity .18s ease',
].join(';');

const LABEL_NAME_STYLE = [
  'padding:2px 7px',
  'border-radius:999px',
  'background:rgba(12,15,18,.5)',
  'color:rgba(255,255,255,.88)',
  'font:700 10px/1.35 ui-sans-serif,system-ui,sans-serif',
  'letter-spacing:.08em',
  'text-transform:uppercase',
  'backdrop-filter:blur(6px)',
].join(';');

const LABEL_STATS_STYLE = [
  'padding:0 5px',
  'color:#ffd28a',
  'font:600 10px/1.3 ui-sans-serif,system-ui,sans-serif',
  'text-shadow:0 1px 4px rgba(0,0,0,.6)',
].join(';');

/** Spread fixtures over the room so several lamps do not overlap. */
export function fixturePositions(room, count) {
  if (count <= 0) return [];
  const bounds = getRoomBounds(room);
  const center = getRoomCenter(room);
  if (count === 1) return [center];

  const { x1, z1, x2, z2 } = bounds;
  const spreadX = Math.min(1.6, Math.max(0.7, (x2 - x1) * 0.28));
  const spreadZ = Math.min(1.4, Math.max(0.6, (z2 - z1) * 0.26));

  const slots = [
    [-1, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
  ];

  return Array.from({ length: count }, (_, index) => {
    if (index < 4) {
      const [sx, sz] = slots[index];
      return { x: center.x + sx * spreadX, z: center.z + sz * spreadZ };
    }
    const [sx, sz] = slots[(index - 4) % 4];
    return { x: center.x + sx * spreadX * 0.45, z: center.z + sz * spreadZ * 0.45 };
  });
}

function createRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createCanvasTexture(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  paint(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function paintWood(ctx, size) {
  const random = createRandom(23);
  const rows = 6;
  const rowHeight = size / rows;
  for (let row = 0; row < rows; row += 1) {
    const tone = 196 + Math.round(random() * 24);
    ctx.fillStyle = `rgb(${tone}, ${Math.round(tone * 0.86)}, ${Math.round(tone * 0.7)})`;
    ctx.fillRect(0, row * rowHeight, size, rowHeight);

    ctx.strokeStyle = 'rgba(92, 62, 36, 0.13)';
    ctx.lineWidth = 1;
    for (let line = 0; line < 5; line += 1) {
      const y = row * rowHeight + random() * rowHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += size / 8) {
        ctx.lineTo(x, y + (random() - 0.5) * 3);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(74, 50, 28, 0.28)';
    ctx.fillRect(0, row * rowHeight, size, 2);
    const joint = (row % 2 === 0 ? 0.34 : 0.71) * size;
    ctx.fillRect(joint, row * rowHeight, 2, rowHeight);
  }
}

function paintTile(ctx, size) {
  const cells = 4;
  const cell = size / cells;
  ctx.fillStyle = '#d9d5cb';
  ctx.fillRect(0, 0, size, size);
  const random = createRandom(41);
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const tone = 213 + Math.round(random() * 14);
      ctx.fillStyle = `rgb(${tone}, ${tone - 3}, ${tone - 9})`;
      ctx.fillRect(col * cell + 2, row * cell + 2, cell - 4, cell - 4);
    }
  }
  ctx.strokeStyle = 'rgba(147, 143, 133, 0.55)';
  ctx.lineWidth = 3;
  for (let line = 0; line <= cells; line += 1) {
    ctx.beginPath();
    ctx.moveTo(line * cell, 0);
    ctx.lineTo(line * cell, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, line * cell);
    ctx.lineTo(size, line * cell);
    ctx.stroke();
  }
}

function paintCarpet(ctx, size) {
  const random = createRandom(67);
  ctx.fillStyle = '#8b877d';
  ctx.fillRect(0, 0, size, size);
  for (let dot = 0; dot < 9000; dot += 1) {
    const shade = 140 + Math.round(random() * 55);
    ctx.fillStyle = `rgba(${shade}, ${shade - 3}, ${shade - 10}, 0.5)`;
    ctx.fillRect(random() * size, random() * size, 1.4, 1.4);
  }
}

function paintLawn(ctx, size) {
  const random = createRandom(97);
  ctx.fillStyle = '#77885f';
  ctx.fillRect(0, 0, size, size);
  for (let blob = 0; blob < 220; blob += 1) {
    const radius = 6 + random() * 26;
    const shade = 112 + Math.round(random() * 42);
    ctx.fillStyle = `rgba(${shade - 20}, ${shade}, ${Math.round(shade * 0.64)}, 0.18)`;
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let dot = 0; dot < 4000; dot += 1) {
    const shade = 88 + Math.round(random() * 55);
    ctx.fillStyle = `rgba(${shade - 14}, ${shade}, ${Math.round(shade * 0.62)}, 0.35)`;
    ctx.fillRect(random() * size, random() * size, 1.5, 2.5);
  }
}

function paintSiding(ctx, size) {
  const random = createRandom(53);
  ctx.fillStyle = '#8c8a70';
  ctx.fillRect(0, 0, size, size);
  const boards = 12;
  const width = size / boards;
  for (let index = 0; index < boards; index += 1) {
    const tone = 128 + Math.round(random() * 18);
    ctx.fillStyle = `rgb(${tone}, ${tone - 2}, ${Math.round(tone * 0.78)})`;
    ctx.fillRect(index * width + 1, 0, width - 2, size);
    ctx.fillStyle = 'rgba(48, 48, 38, 0.25)';
    ctx.fillRect(index * width, 0, 1.5, size);
  }
}

function paintGlow(ctx, size) {
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.04,
    size / 2,
    size / 2,
    size * 0.5
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

function paintSoftShadow(ctx, size) {
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.1,
    size / 2,
    size / 2,
    size * 0.5
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

function normalizeWallRect([x1, z1, x2, z2]) {
  if (Math.abs(z1 - z2) < 1e-6) {
    return { axis: 'x', at: z1, start: Math.min(x1, x2), end: Math.max(x1, x2) };
  }
  if (Math.abs(x1 - x2) < 1e-6) {
    return { axis: 'z', at: x1, start: Math.min(z1, z2), end: Math.max(z1, z2) };
  }
  return null;
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else if (child.material) child.material.dispose();
  });
}

export class HouseScene {
  constructor({
    canvas,
    labelHost,
    rooms,
    floors,
    openings = [],
    windows = [],
    doors = [],
    furniture = [],
    doorStates = {},
    alarmState = '',
    applianceStates = {},
    onSelectRoom,
    onToggleLight,
    formatStats,
  }) {
    this.canvas = canvas;
    this.labelHost = labelHost;
    this.rooms = rooms;
    this.floors = floors;
    this.openings = openings;
    this.windows = windows;
    this.doors = doors;
    this.furniture = furniture;
    this.initialDoorStates = doorStates;
    this.initialAlarmState = alarmState;
    this.initialApplianceStates = applianceStates;
    this.onSelectRoom = onSelectRoom;
    this.onToggleLight = onToggleLight;
    this.formatStats = formatStats;

    this.disposed = false;
    this.dirty = true;
    this.floorGroups = new Map();
    this.pickMeshes = [];
    this.roomFloorMaterials = new Map();
    this.roomGlowMaterials = new Map();
    this.roomPointLights = new Map();
    this.doorEntries = [];
    this.fixtures = new Map();
    this.applianceMeshes = new Map();
    this.applianceStates = {};
    this.applianceSpin = { washer: 0, dryer: 0 };
    this.windowEntries = [];
    this.glassDoorEntries = [];
    this.alarmState = '';
    this.alarmPulseActive = false;
    this.alarmRingMaterials = [];
    this.alarmBeaconMaterial = null;
    this.alarmGlowMaterial = null;
    this.alarmLight = null;
    this.lastFrame = Date.now();
    this.fixtureSignature = '';
    this.labelEls = new Map();
    this.labelStatsEls = new Map();
    this.stats = {};
    this.visibleFloor = 'ground';
    this.showLabels = false;
    this.selectedRoomId = null;
    this.ownedTextures = [];
    this.environmentTexture = null;

    this.entities = {};
    this.roomLights = {};
    this.pointerDown = null;
    this.hasUserInteracted = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.projected = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1);
    this.floorTextures = {
      wood: createCanvasTexture(512, paintWood),
      tile: createCanvasTexture(512, paintTile),
      carpet: createCanvasTexture(256, paintCarpet),
    };
    Object.values(this.floorTextures).forEach((texture) => {
      texture.anisotropy = this.maxAnisotropy;
      this.ownedTextures.push(texture);
    });
    this.glowTexture = createCanvasTexture(256, paintGlow);
    this.ownedTextures.push(this.glowTexture);
    this.sidingTexture = createCanvasTexture(256, paintSiding);
    this.sidingTexture.anisotropy = this.maxAnisotropy;
    this.ownedTextures.push(this.sidingTexture);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 45;
    this.controls.addEventListener('change', () => {
      this.dirty = true;
    });
    this.controls.addEventListener('start', () => {
      this.hasUserInteracted = true;
    });

    this.addLights();
    this.buildEnvironment();
    this.buildGround();
    this.buildFloors();
    this.buildAlarmVisuals();
    this.setDoorStates(this.initialDoorStates);
    this.setAlarmState(this.initialAlarmState);
    this.setApplianceStates(this.initialApplianceStates);
    this.buildLabels();
    this.resetView(true);

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || canvas);
    this.resize();

    this.setVisibleFloor('ground');
    this.setSelectedRoom(null);
    this.applyLabelsVisibility();
    this.start();
  }

  addLights() {
    // Dusk ambience: unlit rooms should read as genuinely dark, with the
    // per-room point lights below doing the heavy lifting once a lamp is on.
    this.scene.add(new THREE.HemisphereLight(0xaebfdc, 0x1b2018, 0.28));
    this.scene.add(new THREE.AmbientLight(0xb9c6de, 0.03));

    const shadowSize = (window.innerWidth || 1024) < 768 ? 1024 : 2048;
    const sun = new THREE.DirectionalLight(0xdfe8ff, 0.6);
    sun.position.set(15, 21, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 4;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0x8fa2c4, 0.12);
    fill.position.set(-14, 9, -12);
    this.scene.add(fill);
  }

  buildEnvironment() {
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.environmentTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environment = this.environmentTexture;
      this.scene.environmentIntensity = 0.12;
      pmrem.dispose();
    } catch {
      this.scene.environment = null;
    }
  }

  buildGround() {
    const lawnTexture = createCanvasTexture(512, paintLawn);
    lawnTexture.repeat.set(10, 10);
    lawnTexture.anisotropy = this.maxAnisotropy;
    this.ownedTextures.push(lawnTexture);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(52, 72),
      new THREE.MeshStandardMaterial({ color: GROUND_COLOR, map: lawnTexture, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Soft blob under the house so the model sits on the lawn instead of floating.
    const shadowTexture = createCanvasTexture(256, paintSoftShadow);
    this.ownedTextures.push(shadowTexture);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 16),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(-3.2, 0.005, 0);
    this.scene.add(contactShadow);

    const drive = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.2),
      new THREE.MeshStandardMaterial({ color: 0x8f8b83, roughness: 0.95 })
    );
    drive.rotation.x = -Math.PI / 2;
    drive.position.set(-10.2, -0.012, 6.1);
    drive.receiveShadow = true;
    this.scene.add(drive);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 6.4),
      new THREE.MeshStandardMaterial({ color: 0xa9a196, roughness: 0.95 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0.3, -0.011, 7.2);
    path.receiveShadow = true;
    this.scene.add(path);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.08, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x9a7951, roughness: 0.92 })
    );
    deck.position.set(3.55, 0.0, -5.25);
    deck.receiveShadow = true;
    deck.castShadow = true;
    this.scene.add(deck);

    const deckEdge = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x7c6040, roughness: 0.95 })
    );
    deckEdge.position.set(3.55, 0.06, -6.24);
    this.scene.add(deckEdge);

    const stepMaterial = new THREE.MeshStandardMaterial({ color: 0xb5ada1, roughness: 0.95 });
    const porchSteps = [
      { width: 2.0, depth: 0.5, height: 0.14, z: 4.55 },
      { width: 2.4, depth: 0.4, height: 0.07, z: 4.9 },
    ];
    porchSteps.forEach((step) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(step.width, step.height, step.depth),
        stepMaterial
      );
      mesh.position.set(0.55, step.height / 2 - 0.01, step.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });

    this.addTrees();
  }

  addTrees() {
    const positions = [
      [-16.5, -5.5, 1.0],
      [-15.5, 7.5, 0.8],
      [8.5, -6.5, 0.9],
      [9.5, 5.5, 1.15],
      [-7.5, 10.5, 0.75],
      [1.5, -9.5, 0.7],
    ];
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6d5743, roughness: 1 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x4f6a45, roughness: 1 });
    const leafLightMaterial = new THREE.MeshStandardMaterial({ color: 0x5d7a4f, roughness: 1 });

    positions.forEach(([x, z, scale]) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.5, 8), trunkMaterial);
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      tree.add(trunk);

      const lower = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), leafMaterial);
      lower.position.y = 1.8;
      lower.castShadow = true;
      const upper = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78, 1), leafLightMaterial);
      upper.position.set(0.2, 2.5, -0.1);
      upper.castShadow = true;
      tree.add(lower, upper);

      tree.position.set(x, 0, z);
      tree.scale.setScalar(scale);
      tree.rotation.y = x + z;
      this.scene.add(tree);
    });
  }

  buildFloors() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: 0.92,
      metalness: 0,
    });
    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f0e7,
      roughness: 0.68,
      metalness: 0,
    });
    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x222628,
      roughness: 0.4,
      metalness: 0.35,
    });
    this.sidingMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.sidingTexture,
      roughness: 0.92,
      metalness: 0,
    });
    this.roofEdgeMaterial = new THREE.MeshStandardMaterial({
      color: ROOF_COLOR,
      roughness: 0.55,
      metalness: 0.35,
    });
    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xa8c4d4,
      roughness: 0.05,
      metalness: 0.3,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    });
    this.handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f2325,
      roughness: 0.35,
      metalness: 0.5,
    });
    this.thresholdMaterial = new THREE.MeshStandardMaterial({
      color: 0xa9845c,
      roughness: 0.75,
      metalness: 0.05,
    });

    this.doorEntries = [];

    this.floors.forEach((floor) => {
      const group = new THREE.Group();
      group.position.y = floor.elevation;
      group.name = `floor_${floor.id}`;

      const rooms = this.rooms.filter((room) => room.floor === floor.id);

      rooms.forEach((room) => {
        const bounds = getRoomBounds(room);
        const center = getRoomCenter(room);

        (room.rects || []).forEach(([x1, z1, x2, z2]) => {
          const width = x2 - x1;
          const depth = z2 - z1;

          const material = this.createFloorMaterial(room.floorFinish || 'wood', width, depth);
          const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), material);
          slab.position.set((x1 + x2) / 2, -0.05, (z1 + z2) / 2);
          slab.receiveShadow = true;
          group.add(slab);
          const roomKey = `${floor.id}:${room.id}`;
          const floorList = this.roomFloorMaterials.get(roomKey) || [];
          floorList.push(material);
          this.roomFloorMaterials.set(roomKey, floorList);

          const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 0.96, depth * 0.96),
            new THREE.MeshBasicMaterial({
              map: this.glowTexture,
              color: 0xffc07a,
              transparent: true,
              opacity: 0,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            })
          );
          glow.rotation.x = -Math.PI / 2;
          glow.position.set((x1 + x2) / 2, 0.015, (z1 + z2) / 2);
          group.add(glow);
          const glowList = this.roomGlowMaterials.get(roomKey) || [];
          glowList.push(glow.material);
          this.roomGlowMaterials.set(roomKey, glowList);

          const pick = new THREE.Mesh(
            new THREE.BoxGeometry(width, 0.08, depth),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
          );
          pick.position.set((x1 + x2) / 2, 0.04, (z1 + z2) / 2);
          pick.userData = { kind: 'room', roomId: room.id };
          group.add(pick);
          this.pickMeshes.push(pick);
        });

        const span = Math.max(bounds.x2 - bounds.x1, bounds.z2 - bounds.z1);
        const roomLight = new THREE.PointLight(0xffc07a, 0, Math.max(3.5, span * 1.35), 2);
        roomLight.position.set(center.x, floor.height - 0.45, center.z);
        group.add(roomLight);
        this.roomPointLights.set(`${floor.id}:${room.id}`, roomLight);
      });

      const floorOpenings = this.openings.filter(
        (opening) => !opening.floor || opening.floor === floor.id
      );
      const wallSegments = buildWallSegments(rooms, floorOpenings);
      wallSegments.forEach((segment) => {
        group.add(this.buildWall(segment, floor, wallMaterial));
      });

      if (floor.id === 'ground') {
        this.buildStairs(group);
      }

      const furnitureGroup = new THREE.Group();
      furnitureGroup.name = `furniture_${floor.id}`;
      this.furniture
        .filter((item) => rooms.some((room) => room.id === item.room))
        .forEach((item) => {
          const mesh = buildFurnitureItem(item);
          if (!mesh) return;
          furnitureGroup.add(mesh);
          if (item.appliance) this.applianceMeshes.set(item.appliance, mesh);
        });
      group.add(furnitureGroup);

      const fixtures = new THREE.Group();
      fixtures.name = `fixtures_${floor.id}`;
      group.add(fixtures);
      group.userData.fixtures = fixtures;

      this.scene.add(group);
      this.floorGroups.set(floor.id, group);
    });

    this.assignGlowRooms();
  }

  assignGlowRooms() {
    const roomAt = (floorId, x, z) =>
      this.rooms.find(
        (room) =>
          room.floor === floorId &&
          (room.rects || []).some(
            ([x1, z1, x2, z2]) =>
              x >= x1 - 1e-6 && x <= x2 + 1e-6 && z >= z1 - 1e-6 && z <= z2 + 1e-6
          )
      );

    this.windowEntries.forEach((entry) => {
      const [x1, z1, x2, z2] = entry.window.rect;
      const room = roomAt(entry.window.floor, (x1 + x2) / 2, (z1 + z2) / 2);
      entry.roomKey = room ? `${entry.window.floor}:${room.id}` : null;
    });
  }

  buildStairs(group) {
    const steps = 16;
    const rise = 3.0 / steps;
    const startZ = 3.95;
    const endZ = 0.75;
    const run = (startZ - endZ) / steps;
    const width = 1.0;
    const centerX = -0.45;

    for (let index = 0; index < steps; index += 1) {
      const height = rise * (index + 1);
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, run + 0.006),
        this.trimMaterial
      );
      step.position.set(centerX, height / 2, startZ - run * (index + 0.5));
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
    }

    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b5844,
      roughness: 0.42,
      metalness: 0.35,
    });
    const railLength = Math.hypot(startZ - endZ, 3.0);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, railLength), railMaterial);
    rail.position.set(centerX + width / 2 + 0.04, 1.5 + 0.9, (startZ + endZ) / 2);
    rail.rotation.x = Math.atan2(3.0, startZ - endZ);
    group.add(rail);
  }

  buildAlarmVisuals() {
    const framed = this.rooms.filter((room) => room.floor === 'ground' && room.id !== 'garage');
    const boxes = framed.map(getRoomBounds);
    const minX = Math.min(...boxes.map((box) => box.x1)) - 0.35;
    const maxX = Math.max(...boxes.map((box) => box.x2)) + 0.35;
    const minZ = Math.min(...boxes.map((box) => box.z1)) - 0.35;
    const maxZ = Math.max(...boxes.map((box) => box.z2)) + 0.35;

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.alarmRingMaterials.push(ringMaterial);

    const ring = new THREE.Group();
    const thickness = 0.14;
    const addBar = (width, depth, x, z) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, depth), ringMaterial);
      bar.position.set(x, 0.035, z);
      ring.add(bar);
    };
    addBar(maxX - minX, thickness, (minX + maxX) / 2, minZ);
    addBar(maxX - minX, thickness, (minX + maxX) / 2, maxZ);
    addBar(thickness, maxZ - minZ, minX, (minZ + maxZ) / 2);
    addBar(thickness, maxZ - minZ, maxX, (minZ + maxZ) / 2);
    this.scene.add(ring);

    this.alarmBeaconMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.alarmGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), this.alarmBeaconMaterial);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), this.alarmGlowMaterial);
    beacon.position.set(1.35, 1.55, 4.35);
    glow.position.copy(beacon.position);
    this.alarmGlow = glow;
    this.scene.add(beacon, glow);

    this.alarmLight = new THREE.PointLight(0xff3b30, 0, 5.5, 2);
    this.alarmLight.position.set(1.35, 2.1, 4.6);
    this.scene.add(this.alarmLight);
  }

  setAlarmState(state) {
    this.alarmState = state || '';
    this.applyAlarmState();
  }

  applyAlarmState() {
    const state = this.alarmState;
    const disarmed = !state || state === 'disarmed';
    const armed = state.startsWith('armed_');
    const triggered = state === 'triggered';
    const pending = ['arming', 'pending', 'disarming'].includes(state);
    const color = triggered
      ? 0xff3b30
      : pending
        ? 0xf59e0b
        : state === 'armed_away'
          ? 0x38bdf8
          : armed
            ? 0x22c55e
            : 0x64748b;

    this.alarmRingMaterials.forEach((material) => {
      material.color.setHex(color);
      material.opacity = disarmed ? 0.07 : armed ? 0.32 : 0.18;
    });
    this.alarmBeaconMaterial.color.setHex(color);
    this.alarmBeaconMaterial.opacity = disarmed ? 0.35 : 1;
    this.alarmGlowMaterial.color.setHex(color);
    this.alarmGlowMaterial.opacity = triggered ? 0.45 : disarmed ? 0.08 : 0.24;
    this.alarmGlow.scale.setScalar(1);
    this.alarmLight.color.setHex(color);
    this.alarmLight.intensity = disarmed ? 0.15 : armed ? 0.9 : 0.5;
    this.alarmPulseActive = triggered || pending;
    this.dirty = true;
  }

  updateAlarm() {
    if (!this.alarmPulseActive) return false;
    const seconds = Date.now() / 1000;
    const pulse = (Math.sin(seconds * 6) + 1) / 2;
    const triggered = this.alarmState === 'triggered';
    this.alarmRingMaterials.forEach((material) => {
      material.opacity = triggered ? 0.32 + pulse * 0.48 : 0.16 + pulse * 0.3;
    });
    this.alarmBeaconMaterial.opacity = 0.45 + pulse * 0.55;
    this.alarmGlowMaterial.opacity = triggered ? 0.25 + pulse * 0.45 : 0.12 + pulse * 0.25;
    this.alarmGlow.scale.setScalar(1 + pulse * (triggered ? 0.5 : 0.25));
    this.alarmLight.intensity = triggered ? 1.4 + pulse * 4.2 : 0.35 + pulse * 1.2;
    this.dirty = true;
    return true;
  }

  setApplianceStates(states) {
    this.applianceStates = states || {};
    this.applyApplianceStates();
  }

  applyApplianceStates() {
    this.applianceMeshes.forEach((mesh, key) => {
      const state = this.applianceStates[key] || {};
      const led = mesh.userData.ledMaterial;
      if (led) {
        led.emissive.setHex(state.running ? 0x34d399 : 0x000000);
        led.emissiveIntensity = state.running ? 2 : 0;
      }
    });
    this.dirty = true;
  }

  updateAppliances(delta) {
    let animating = false;
    this.applianceMeshes.forEach((mesh, key) => {
      const state = this.applianceStates[key];
      if (!state?.running || !mesh.userData.drum) return;
      const speed = 0.9 + Math.min(2.6, (state.power || 0) / 450);
      this.applianceSpin[key] = (this.applianceSpin[key] + speed * delta) % (Math.PI * 2);
      mesh.userData.drum.rotation.z = this.applianceSpin[key];
      animating = true;
    });
    if (animating) this.dirty = true;
    return animating;
  }

  wallBounds(segment) {
    return segment.horizontal
      ? {
          axis: 'x',
          at: segment.z1,
          start: Math.min(segment.x1, segment.x2),
          end: Math.max(segment.x1, segment.x2),
        }
      : {
          axis: 'z',
          at: segment.x1,
          start: Math.min(segment.z1, segment.z2),
          end: Math.max(segment.z1, segment.z2),
        };
  }

  wallHoles(segment, floor) {
    const wall = this.wallBounds(segment);
    const holes = [];

    const addHole = (rect, sill, height, extra) => {
      const opening = normalizeWallRect(rect);
      if (!opening || opening.axis !== wall.axis) return;
      if (Math.abs(opening.at - wall.at) > 0.02) return;
      const from = Math.max(opening.start, wall.start);
      const to = Math.min(opening.end, wall.end);
      if (to - from < 0.05) return;
      holes.push({
        offset: from - wall.start,
        width: to - from,
        sill: Math.max(0, sill),
        height: Math.min(height, floor.height - Math.max(0, sill)),
        ...extra,
      });
    };

    this.windows
      .filter((window) => window.floor === floor.id)
      .forEach((window) =>
        addHole(window.rect, window.sill, window.height, { type: 'window', window })
      );

    this.doors
      .filter((door) => door.floor === floor.id)
      .forEach((door) => addHole(door.rect, 0, door.height, { type: 'door', door }));

    return holes.sort((a, b) => a.offset - b.offset);
  }

  buildWall(segment, floor, wallMaterial) {
    const wall = this.wallBounds(segment);
    const length = wall.end - wall.start;
    const holes = this.wallHoles(segment, floor);

    // The wall runs a little below the floor so door holes (sill 0) never
    // touch the outer contour, which keeps the triangulation clean.
    const base = -0.06;
    const shape = new THREE.Shape();
    shape.moveTo(0, base);
    shape.lineTo(length, base);
    shape.lineTo(length, floor.height);
    shape.lineTo(0, floor.height);
    shape.lineTo(0, base);

    holes.forEach((hole) => {
      const path = new THREE.Path();
      path.moveTo(hole.offset, hole.sill);
      path.lineTo(hole.offset + hole.width, hole.sill);
      path.lineTo(hole.offset + hole.width, hole.sill + hole.height);
      path.lineTo(hole.offset, hole.sill + hole.height);
      path.lineTo(hole.offset, hole.sill);
      shape.holes.push(path);
    });

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: WALL_THICKNESS,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geometry.translate(0, 0, -WALL_THICKNESS / 2);

    const wallGroup = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallGroup.add(mesh);

    holes.forEach((hole) => {
      if (hole.type === 'window') this.addWindow(wallGroup, hole);
      else this.addDoor(wallGroup, hole);
    });

    this.addBaseboards(wallGroup, length, holes);
    this.addExteriorCladding(wallGroup, wall, floor, length, holes);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.05, WALL_THICKNESS + 0.02),
      this.roofEdgeMaterial
    );
    cap.position.set(length / 2, floor.height, 0);
    cap.castShadow = true;
    wallGroup.add(cap);

    if (wall.axis === 'x') {
      wallGroup.position.set(wall.start, 0, wall.at);
    } else {
      wallGroup.position.set(wall.at, 0, wall.start);
      wallGroup.rotation.y = -Math.PI / 2;
    }
    return wallGroup;
  }

  addExteriorCladding(wallGroup, wall, floor, length, holes) {
    const inside = (x, z) =>
      this.rooms.some(
        (room) =>
          room.floor === floor.id &&
          (room.rects || []).some(
            ([x1, z1, x2, z2]) => x > x1 + 1e-6 && x < x2 - 1e-6 && z > z1 + 1e-6 && z < z2 - 1e-6
          )
      );

    const horizontal = wall.axis === 'x';
    const middle = (wall.start + wall.end) / 2;
    const probe = WALL_THICKNESS / 2 + 0.22;
    const faces = [];
    [-1, 1].forEach((sign) => {
      const px = horizontal ? middle : wall.at + sign * probe;
      const pz = horizontal ? wall.at + sign * probe : middle;
      if (!inside(px, pz)) faces.push(sign);
    });
    if (faces.length === 0) return;

    const sorted = [...holes].sort((a, b) => a.offset - b.offset);
    const fullSpans = [];
    let cursor = 0;
    sorted.forEach((hole) => {
      if (hole.offset - cursor > 0.05) fullSpans.push([cursor, hole.offset]);
      cursor = Math.max(cursor, hole.offset + hole.width);
    });
    if (length - cursor > 0.05) fullSpans.push([cursor, length]);

    const panels = fullSpans.map(([start, end]) => ({
      start,
      end,
      bottom: 0,
      top: floor.height,
    }));
    sorted.forEach((hole) => {
      if (hole.sill > 0.06) {
        panels.push({
          start: hole.offset,
          end: hole.offset + hole.width,
          bottom: 0,
          top: hole.sill,
        });
      }
      const top = hole.sill + hole.height;
      if (floor.height - top > 0.06) {
        panels.push({
          start: hole.offset,
          end: hole.offset + hole.width,
          bottom: top,
          top: floor.height,
        });
      }
    });

    const offset = WALL_THICKNESS / 2 + 0.012;
    faces.forEach((sign) => {
      panels.forEach((panel) => {
        const width = panel.end - panel.start;
        const height = panel.top - panel.bottom;
        if (width < 0.04 || height < 0.04) return;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, 0.024),
          this.sidingMaterial
        );
        mesh.position.set(panel.start + width / 2, panel.bottom + height / 2, sign * offset);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wallGroup.add(mesh);
      });
    });
  }

  addBaseboards(wallGroup, length, holes) {
    const height = 0.09;
    const depth = 0.026;
    const gaps = holes
      .filter((hole) => hole.sill < 0.06)
      .map((hole) => [hole.offset, hole.offset + hole.width])
      .sort((a, b) => a[0] - b[0]);

    const spans = [];
    let cursor = 0;
    gaps.forEach(([start, end]) => {
      if (start - cursor > 0.06) spans.push([cursor, start]);
      cursor = Math.max(cursor, end);
    });
    if (length - cursor > 0.06) spans.push([cursor, length]);

    const offset = WALL_THICKNESS / 2 + depth / 2 - 0.002;
    spans.forEach(([start, end]) => {
      const width = end - start;
      [-offset, offset].forEach((z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.trimMaterial);
        mesh.position.set(start + width / 2, height / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wallGroup.add(mesh);
      });
    });
  }

  addWindow(wallGroup, hole) {
    const bar = 0.055;
    const depth = WALL_THICKNESS + 0.04;
    const addBar = (width, height, x, y) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.frameMaterial);
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallGroup.add(mesh);
    };

    const { offset, width, sill, height } = hole;
    const centerX = offset + width / 2;
    const centerY = sill + height / 2;

    addBar(bar, height, offset + bar / 2, centerY);
    addBar(bar, height, offset + width - bar / 2, centerY);
    addBar(width, bar, centerX, sill + bar / 2);
    addBar(width, bar, centerX, sill + height - bar / 2);
    addBar(0.035, height - bar * 2, centerX, centerY);
    addBar(width - bar * 2, 0.035, centerX, centerY);

    const glassMaterial = this.glassMaterial.clone();
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width - bar * 2, height - bar * 2, 0.02),
      glassMaterial
    );
    glass.position.set(centerX, centerY, 0);
    wallGroup.add(glass);
    if (hole.window) {
      this.windowEntries.push({ window: hole.window, material: glassMaterial });
    }

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.16, 0.05, WALL_THICKNESS + 0.14),
      this.trimMaterial
    );
    board.position.set(centerX, sill - 0.05, 0);
    board.castShadow = true;
    wallGroup.add(board);
  }

  addDoor(wallGroup, hole) {
    const door = hole.door;
    const bar = 0.06;
    const width = hole.width;
    const height = hole.height;

    const isGlass = door.style === 'glass';
    const isGarage = door.style === 'garage';
    const isEntry = door.style === 'entry';
    const darkFrame = isGlass || isGarage || isEntry;

    const addFrameBar = (barWidth, barHeight, x, y) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(barWidth, barHeight, WALL_THICKNESS + 0.03),
        darkFrame ? this.frameMaterial : this.trimMaterial
      );
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallGroup.add(mesh);
    };

    addFrameBar(bar, height, hole.offset + bar / 2, height / 2);
    addFrameBar(bar, height, hole.offset + width - bar / 2, height / 2);
    addFrameBar(width, bar, hole.offset + width / 2, height - bar / 2);

    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.028, WALL_THICKNESS + 0.14),
      this.thresholdMaterial
    );
    threshold.position.set(hole.offset + width / 2, 0.014, 0);
    threshold.receiveShadow = true;
    wallGroup.add(threshold);

    const leafWidth = width - bar * 2 - 0.01;
    const leafHeight = height - bar - 0.015;

    const leafMaterial = new THREE.MeshStandardMaterial({
      color: isGarage ? 0x3a3d3c : isEntry ? 0x1f2325 : 0xf2ede3,
      roughness: isGarage ? 0.85 : 0.6,
      metalness: isGarage ? 0.05 : 0,
    });

    const leaf = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, leafHeight, 0.05), leafMaterial);
    panel.castShadow = true;
    panel.receiveShadow = true;
    leaf.add(panel);

    if (isGlass) {
      const paneMaterial = this.glassMaterial.clone();
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(leafWidth - 0.24, leafHeight - 0.42, 0.06),
        paneMaterial
      );
      pane.position.set(0, 0.05, 0);
      leaf.add(pane);
      if (door.room) {
        this.glassDoorEntries.push({
          roomKey: `${door.floor}:${door.room}`,
          material: paneMaterial,
        });
      }
    }

    if (isGarage) {
      const grooveMaterial = new THREE.MeshStandardMaterial({ color: 0x7b7a74, roughness: 0.9 });
      for (let row = 1; row <= 3; row += 1) {
        const groove = new THREE.Mesh(
          new THREE.BoxGeometry(leafWidth - 0.06, 0.025, 0.06),
          grooveMaterial
        );
        groove.position.y = leafHeight / 2 - (leafHeight / 4) * row;
        leaf.add(groove);
      }
    } else {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.14), this.handleMaterial);
      handle.position.set(leafWidth / 2 - 0.12, 0, 0.08);
      leaf.add(handle);
      const handleBack = handle.clone();
      handleBack.position.z = -0.08;
      leaf.add(handleBack);
    }

    const direction = door.hinge === 'end' ? -1 : 1;
    const pivot = new THREE.Group();

    if (door.lift) {
      pivot.position.set(hole.offset + width / 2, leafHeight, 0);
      leaf.position.set(0, -leafHeight / 2, 0);
      pivot.add(leaf);
      wallGroup.add(pivot);
      this.doorEntries.push({
        id: door.id,
        pivot,
        axis: 'x',
        closed: 0,
        open: (door.swing || 1) * -1.15,
        value: 0,
        target: 0,
      });
      return;
    }

    const hingeX = door.hinge === 'end' ? hole.offset + width - bar : hole.offset + bar;
    pivot.position.set(hingeX, 0, 0);
    leaf.position.set((direction * leafWidth) / 2, leafHeight / 2, 0);
    pivot.add(leaf);
    wallGroup.add(pivot);
    this.doorEntries.push({
      id: door.id,
      pivot,
      axis: 'y',
      closed: 0,
      open: (door.swing || 1) * direction * 1.55,
      value: 0,
      target: 0,
    });
  }

  setDoorStates(states) {
    const next = states || {};
    (this.doorEntries || []).forEach((entry) => {
      entry.target = next[entry.id] ? 1 : 0;
    });
    this.dirty = true;
  }

  updateDoors() {
    let animating = false;
    (this.doorEntries || []).forEach((entry) => {
      if (Math.abs(entry.value - entry.target) < 0.002) {
        entry.value = entry.target;
        return;
      }
      entry.value += (entry.target - entry.value) * 0.16;
      if (Math.abs(entry.target - entry.value) < 0.003) entry.value = entry.target;
      entry.pivot.rotation[entry.axis] = entry.closed + (entry.open - entry.closed) * entry.value;
      animating = true;
    });
    if (animating) this.dirty = true;
    return animating;
  }

  createFloorMaterial(finish, width, depth) {
    if (finish === 'concrete') {
      const material = new THREE.MeshStandardMaterial({
        color: FLOOR_COLORS.concrete,
        roughness: 0.98,
        metalness: 0,
      });
      material.userData.baseColor = material.color.clone();
      return material;
    }

    const base = this.floorTextures[finish] || this.floorTextures.wood;
    const map = base.clone();
    map.needsUpdate = true;
    map.repeat.set(
      Math.max(1, width / FLOOR_TEXTURE_METERS),
      Math.max(1, depth / FLOOR_TEXTURE_METERS)
    );
    map.anisotropy = this.maxAnisotropy;
    this.ownedTextures.push(map);

    const material = new THREE.MeshStandardMaterial({
      color: FLOOR_COLORS[finish] || 0xffffff,
      map,
      roughness: finish === 'tile' ? 0.55 : 0.92,
      metalness: 0,
      emissive: new THREE.Color(0x000000),
    });
    material.userData.baseColor = material.color.clone();
    return material;
  }

  buildLabels() {
    this.rooms.forEach((room) => {
      const el = document.createElement('div');
      el.style.cssText = LABEL_STYLE;
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
      el.style.display = 'none';
      el.dataset.roomId = room.id;
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onSelectRoom?.(room.id);
      });

      const name = document.createElement('span');
      name.style.cssText = LABEL_NAME_STYLE;
      name.textContent = room.label;

      const stats = document.createElement('span');
      stats.style.cssText = LABEL_STATS_STYLE;

      el.append(name, stats);
      this.labelHost?.appendChild(el);
      this.labelEls.set(room.id, el);
      this.labelStatsEls.set(room.id, stats);
    });
  }

  buildFixtures() {
    this.fixtures.forEach(({ root }) => {
      root.parent?.remove(root);
      disposeObject(root);
    });
    this.fixtures.clear();

    this.rooms.forEach((room) => {
      const floor = this.floors.find((item) => item.id === room.floor);
      const group = this.floorGroups.get(room.floor);
      const container = group?.userData?.fixtures;
      if (!floor || !container) return;

      const entityIds = this.roomLights[room.id] || [];
      const positions = fixturePositions(room, entityIds.length);

      entityIds.forEach((entityId, index) => {
        const color = new THREE.Color(1, 0.72, 0.35);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 18, 12),
          new THREE.MeshStandardMaterial({
            color: 0x4d4a45,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0,
            roughness: 0.4,
          })
        );
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.36, 16, 12),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );

        const position = positions[index] || getRoomCenter(room);
        mesh.position.set(position.x, floor.height - 0.44, position.z);
        glow.position.copy(mesh.position);

        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.23, 0.18, 22, 1, true),
          new THREE.MeshStandardMaterial({
            color: 0x2c3033,
            roughness: 0.45,
            metalness: 0.4,
            side: THREE.DoubleSide,
          })
        );
        shade.position.copy(mesh.position).add(new THREE.Vector3(0, 0.15, 0));
        shade.castShadow = true;

        const cord = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.006, 0.28, 6),
          new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.8 })
        );
        cord.position.copy(mesh.position).add(new THREE.Vector3(0, 0.32, 0));

        const rose = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16),
          this.frameMaterial
        );
        rose.position.set(position.x, floor.height - 0.02, position.z);

        const root = new THREE.Group();
        root.add(mesh, glow, shade, cord, rose);
        mesh.userData = { kind: 'light', entityId };
        container.add(root);
        this.fixtures.set(entityId, {
          mesh,
          glow,
          root,
          roomId: room.id,
          floorId: room.floor,
        });
      });
    });

    this.dirty = true;
  }

  setRoomLights(roomLights) {
    const signature = this.rooms
      .map((room) => `${room.id}:${(roomLights?.[room.id] || []).join(',')}`)
      .join(';');
    if (signature === this.fixtureSignature) return;
    this.fixtureSignature = signature;
    this.roomLights = roomLights || {};
    this.buildFixtures();
    this.applyEntitiesToScene();
  }

  setEntities(entities) {
    this.entities = entities || {};
    this.applyEntitiesToScene();
  }

  applyEntitiesToScene() {
    const roomStats = new Map();

    this.fixtures.forEach(({ mesh, glow, roomId, floorId }, entityId) => {
      const entity = this.entities[entityId];
      const isOn = entity?.state === 'on';
      const { r, g, b } = getLightColor(entity);
      const color = new THREE.Color(r / 255, g / 255, b / 255);
      const brightness = Number.isFinite(entity?.attributes?.brightness)
        ? Math.max(0.25, entity.attributes.brightness / 255)
        : 1;

      if (isOn) {
        mesh.material.color.copy(color);
        mesh.material.emissive.copy(color);
        mesh.material.emissiveIntensity = 2.2 + brightness * 2.4;
        glow.material.color.copy(color);
        glow.material.opacity = 0.22 + brightness * 0.18;

        const key = `${floorId}:${roomId}`;
        const stats = roomStats.get(key) || {
          count: 0,
          brightness: 0,
          r: 0,
          g: 0,
          b: 0,
        };
        stats.count += 1;
        stats.brightness += brightness;
        stats.r += color.r * brightness;
        stats.g += color.g * brightness;
        stats.b += color.b * brightness;
        roomStats.set(key, stats);
      } else {
        mesh.material.color.setHex(0x4d4a45);
        mesh.material.emissive.setHex(0x000000);
        mesh.material.emissiveIntensity = 0;
        glow.material.opacity = 0;
      }
    });

    const roomColor = (stats) =>
      new THREE.Color(
        stats.r / Math.max(0.001, stats.brightness),
        stats.g / Math.max(0.001, stats.brightness),
        stats.b / Math.max(0.001, stats.brightness)
      );

    this.roomPointLights.forEach((light, key) => {
      const stats = roomStats.get(key);
      if (!stats) {
        light.intensity = 0;
        return;
      }
      const averageBrightness = stats.brightness / stats.count;
      light.color.copy(roomColor(stats));
      light.intensity = Math.min(36, (3.2 + stats.count * 4.5) * (0.55 + averageBrightness * 0.45));
    });

    this.roomFloorMaterials.forEach((value, key) => {
      const stats = roomStats.get(key);
      const materials = Array.isArray(value) ? value : [value];
      materials.forEach((material) => {
        const base = material.userData.baseColor;
        if (stats) {
          if (base) material.color.copy(base);
          material.emissive.copy(roomColor(stats));
          material.emissiveIntensity = Math.min(0.85, 0.3 + stats.count * 0.15);
        } else {
          if (base) material.color.copy(base).multiplyScalar(0.42);
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
        }
      });
    });

    this.roomGlowMaterials.forEach((value, key) => {
      const stats = roomStats.get(key);
      const materials = Array.isArray(value) ? value : [value];
      materials.forEach((material) => {
        if (stats) {
          material.color.copy(roomColor(stats));
          material.opacity = Math.min(0.8, 0.28 + stats.count * 0.14);
        } else {
          material.opacity = 0;
        }
      });
    });

    const baseGlassColor = this.glassMaterial.color;
    const baseGlassOpacity = this.glassMaterial.opacity;
    const applyGlass = (material, roomKey) => {
      const stats = roomKey ? roomStats.get(roomKey) : null;
      if (stats) {
        const glowColor = new THREE.Color(0xffb758).lerp(roomColor(stats), 0.25);
        material.color.copy(glowColor);
        material.emissive.copy(glowColor);
        material.emissiveIntensity = 2.4;
        material.transparent = false;
        material.depthWrite = true;
        material.opacity = 1;
      } else {
        material.color.copy(baseGlassColor);
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
        material.transparent = true;
        material.depthWrite = false;
        material.opacity = baseGlassOpacity;
      }
      material.needsUpdate = true;
    };
    this.windowEntries.forEach((entry) => applyGlass(entry.material, entry.roomKey));
    this.glassDoorEntries.forEach((entry) => applyGlass(entry.material, entry.roomKey));

    this.applySelection();
    this.dirty = true;
  }

  applySelection() {
    this.roomFloorMaterials.forEach((value, key) => {
      if (!this.selectedRoomId || key.split(':')[1] !== this.selectedRoomId) return;
      const materials = Array.isArray(value) ? value : [value];
      materials.forEach((material) => {
        material.emissive.setHex(0x2b5d8a);
        material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.5);
      });
    });
  }

  setRoomStats(stats) {
    this.stats = stats || {};
    this.rooms.forEach((room) => {
      const el = this.labelStatsEls.get(room.id);
      if (!el) return;
      el.textContent = this.formatStats ? this.formatStats(this.stats[room.id]) : '';
    });
    this.dirty = true;
  }

  setShowLabels(showLabels) {
    this.showLabels = Boolean(showLabels);
    this.applyLabelsVisibility();
    this.dirty = true;
  }

  applyLabelsVisibility() {
    this.rooms.forEach((room) => {
      const el = this.labelEls.get(room.id);
      const statsEl = this.labelStatsEls.get(room.id);
      if (!el) return;
      const floorVisible = this.visibleFloor === 'all' || this.visibleFloor === room.floor;
      el.dataset.floorVisible = floorVisible ? '1' : '0';
      el.style.display = this.showLabels ? '' : 'none';
      if (statsEl) statsEl.style.display = this.showLabels ? '' : 'none';
    });
    this.dirty = true;
  }

  setVisibleFloor(floorId) {
    this.visibleFloor = floorId;
    this.floorGroups.forEach((group, id) => {
      group.visible = floorId === 'all' || floorId === id;
    });
    this.applyLabelsVisibility();
    this.dirty = true;
  }

  setSelectedRoom(roomId) {
    this.selectedRoomId = roomId || null;
    this.applyEntitiesToScene();
  }

  resetView(immediate = false) {
    // Frame the main house; the detached garage is allowed to sit outside the
    // initial view on narrow screens and can be reached by zooming out.
    const framedRooms = this.rooms.filter((room) => room.id !== 'garage');
    const boxes = framedRooms.map(getRoomBounds);
    const minX = Math.min(...boxes.map((box) => box.x1));
    const maxX = Math.max(...boxes.map((box) => box.x2));
    const minZ = Math.min(...boxes.map((box) => box.z1));
    const maxZ = Math.max(...boxes.map((box) => box.z2));
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const aspect = this.camera.aspect || 1;
    const fit = Math.max(1, Math.min(2.8, 1.2 / aspect));

    this.controls.target.set(centerX, 0.9, centerZ);
    this.camera.position.set(centerX + 5.8 * fit, 0.9 + 13.2 * fit, centerZ + 8.2 * fit);
    this.controls.update();
    this.dirty = true;
    if (!immediate) this.controls.update();
  }

  start() {
    const render = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(render);
      const now = Date.now();
      const delta = Math.min(0.1, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      const changed = this.controls.update();
      const doors = this.updateDoors();
      const appliances = this.updateAppliances(delta);
      const alarm = this.updateAlarm();
      if (!changed && !this.dirty && !doors && !appliances && !alarm) return;
      this.dirty = false;
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
    };
    this.raf = requestAnimationFrame(render);
  }

  updateLabels() {
    if (!this.showLabels) return;
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    if (!width || !height) return;

    this.rooms.forEach((room) => {
      const el = this.labelEls.get(room.id);
      if (!el) return;
      const floorVisible = this.visibleFloor === 'all' || this.visibleFloor === room.floor;
      if (!floorVisible) {
        el.style.opacity = '0';
        return;
      }
      const floor = this.floors.find((item) => item.id === room.floor);
      const center = getRoomCenter(room);
      this.projected.set(
        center.x,
        (floor?.elevation || 0) + (floor?.height || 2.6) + 0.2,
        center.z
      );
      this.projected.project(this.camera);

      const visible = this.projected.z < 1;
      el.style.opacity = visible ? '1' : '0';
      if (!visible) return;

      const x = (this.projected.x * 0.5 + 0.5) * width;
      const y = (-this.projected.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,0)`;
    });
  }

  handlePointerDown(event) {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  }

  handlePointerUp(event) {
    if (!this.pointerDown) return;
    const distance = Math.hypot(
      event.clientX - this.pointerDown.x,
      event.clientY - this.pointerDown.y
    );
    this.pointerDown = null;
    if (distance > 6) return;
    this.pick(event);
  }

  handlePointerMove(event) {
    const hit = this.intersect(event);
    this.canvas.style.cursor = hit ? 'pointer' : 'grab';
  }

  intersect(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const targets = [];
    this.fixtures.forEach(({ mesh, floorId }) => {
      if (this.floorGroups.get(floorId)?.visible !== false) targets.push(mesh);
    });
    this.pickMeshes.forEach((pick) => {
      if (pick.parent?.visible !== false) targets.push(pick);
    });

    const intersections = this.raycaster.intersectObjects(targets, false);
    return intersections.find((hit) => hit.object.userData?.kind) || null;
  }

  pick(event) {
    const hit = this.intersect(event);
    if (!hit) {
      this.onSelectRoom?.(null);
      return;
    }
    if (hit.object.userData.kind === 'light') {
      this.onToggleLight?.(hit.object.userData.entityId);
      return;
    }
    if (hit.object.userData.kind === 'room') {
      this.onSelectRoom?.(hit.object.userData.roomId);
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (!this.hasUserInteracted) this.resetView(true);
    this.dirty = true;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.controls.dispose();
    this.labelEls.forEach((el) => el.remove());
    this.ownedTextures.forEach((texture) => texture.dispose());
    this.environmentTexture?.dispose();
    disposeObject(this.scene);
    this.renderer.dispose();
  }
}
