import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWallSegments, getBrightnessPercent, getLightColor, getRoomBounds, getRoomCenter, getSunPose } from './houseScene';
import { buildFurnitureItem } from './houseFurniture';
import { getDeviceArtSrc } from '../config/deviceArt';

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
  'display:flex',
  'align-items:center',
  'gap:4px',
  'padding:3px 9px',
  'border-radius:999px',
  'border:1px solid rgba(255,255,255,.14)',
  'background:rgba(10,14,20,.66)',
  'color:#f8fafc',
  'font:600 11px/1.3 ui-sans-serif,system-ui,sans-serif',
  'letter-spacing:.02em',
  'backdrop-filter:blur(10px)',
  'box-shadow:0 4px 14px rgba(0,0,0,.28)',
].join(';');

const LABEL_STATS_STYLE = [
  'padding:1px 7px',
  'border-radius:999px',
  'background:rgba(10,14,20,.45)',
  'color:#ffd28a',
  'font:600 10px/1.3 ui-sans-serif,system-ui,sans-serif',
  'text-shadow:0 1px 4px rgba(0,0,0,.6)',
].join(';');

const TOOLTIP_STYLE = [
  'position:absolute',
  'left:0',
  'top:0',
  'display:none',
  'pointer-events:none',
  'padding:4px 8px',
  'border-radius:8px',
  'background:rgba(10,13,16,.78)',
  'color:#fff',
  'font:600 11px/1.3 ui-sans-serif,system-ui,sans-serif',
  'white-space:nowrap',
  'transform:translate(-50%,-160%)',
  'backdrop-filter:blur(6px)',
  'box-shadow:0 6px 18px rgba(0,0,0,.35)',
  'z-index:3',
  'will-change:transform',
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
    roof = null,
    onSelectRoom,
    onFocusRoom,
    onSelectLight,
    getOffLabel,
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
    this.roofConfig = roof;
    this.initialDoorStates = doorStates;
    this.initialAlarmState = alarmState;
    this.initialApplianceStates = applianceStates;
    this.onSelectRoom = onSelectRoom;
    this.onFocusRoom = onFocusRoom;
    this.onSelectLight = onSelectLight;
    this.lastRoomPick = null;
    this.getOffLabel = getOffLabel;
    this.formatStats = formatStats;

    this.disposed = false;
    this.dirty = true;
    this.active = false;
    this.raf = null;
    this.onScreen = true;
    this.floorGroups = new Map();
    this.pickMeshes = [];
    this.fixtureHitMeshes = [];
    this.roomFloorMaterials = new Map();
    this.roomGlowMaterials = new Map();
    this.roomPointLights = new Map();
    this.doorEntries = [];
    this.fixtures = new Map();
    this.roomArt = {};
    this.artSignature = '';
    this.artRoots = [];
    this.artTextures = new Map();
    this.pendingArt = new Map();
    this.artLoader = new THREE.TextureLoader();
    this.showArt = true;
    this.applianceMeshes = new Map();
    this.applianceStates = {};
    this.applianceSpin = { washer: 0, dryer: 0 };
    this.windowEntries = [];
    this.glassDoorEntries = [];
    this.alarmState = null;
    this.alarmPulseActive = false;
    this.alarmRingMaterials = [];
    this.alarmBeaconMaterial = null;
    this.alarmGlowMaterial = null;
    this.alarmLight = null;
    this.lastFrame = Date.now();
    this.fixtureSignature = '';
    this.lightSignature = '';
    this.doorSignature = '';
    this.applianceSignature = '';
    this.statsSignature = '';
    this.sunStateApplied = false;
    this.sunElevation = undefined;
    this.sunAzimuth = undefined;
    this.hoveredLightId = null;
    this.tooltipEl = null;
    this.labelEls = new Map();
    this.labelStatsEls = new Map();
    this.stats = {};
    this.visibleFloor = 'all';
    this.showLabels = false;
    this.selectedRoomId = null;
    this.ownedTextures = [];
    this.environmentTexture = null;
    this.cameraAnimation = null;
    this.exploded = false;
    this.explodeOffset = 0;
    this.roofVisible = false;
    this.roofGroup = null;
    this.daylight = 0.5;

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

    // Shared fixture geometry/materials. Lamp colours live on per-lamp
    // materials, but the shapes are reused across every rebuild.
    this.fixtureGeometries = {
      bulb: new THREE.SphereGeometry(0.09, 18, 12),
      glow: new THREE.SphereGeometry(0.36, 16, 12),
      hit: new THREE.SphereGeometry(0.3, 12, 8),
      shade: new THREE.CylinderGeometry(0.05, 0.23, 0.18, 22, 1, true),
      cord: new THREE.CylinderGeometry(0.006, 0.006, 0.28, 6),
      rose: new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16),
    };
    this.hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3033,
      roughness: 0.45,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });
    this.cordMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.8 });

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 70;
    this.controls.addEventListener('change', () => {
      this.dirty = true;
      this.scheduleFrame();
    });
    this.controls.addEventListener('start', () => {
      this.hasUserInteracted = true;
    });

    this.addLights();
    this.buildEnvironment();
    this.buildGround();
    this.buildFloors();
    this.buildRoof();
    this.buildAlarmVisuals();
    this.setSunState();
    this.setDoorStates(this.initialDoorStates);
    this.setAlarmState(this.initialAlarmState);
    this.setApplianceStates(this.initialApplianceStates);
    this.buildLabels();
    this.buildTooltip();
    this.resetView(true);

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || canvas);
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.onScreen = entries.some((entry) => entry.isIntersecting);
        this.handleVisibility();
      });
      this.intersectionObserver.observe(canvas);
    }
    this.resize();

    this.setVisibleFloor('ground');
    this.setSelectedRoom(null);
    this.applyLabelsVisibility();
    this.start();
  }

  addLights() {
    // Dusk ambience: unlit rooms should read as genuinely dark, with the
    // per-room point lights below doing the heavy lifting once a lamp is on.
    this.hemisphere = new THREE.HemisphereLight(0xaebfdc, 0x1b2018, 0.28);
    this.ambient = new THREE.AmbientLight(0xb9c6de, 0.03);
    this.scene.add(this.hemisphere, this.ambient);

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
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0x8fa2c4, 0.12);
    fill.position.set(-14, 9, -12);
    this.scene.add(fill);
  }

  setSunState(elevation, azimuth) {
    if (
      this.sunStateApplied &&
      this.sunElevation === elevation &&
      this.sunAzimuth === azimuth
    ) {
      return;
    }
    this.sunStateApplied = true;
    this.sunElevation = elevation;
    this.sunAzimuth = azimuth;
    const pose = getSunPose(elevation, azimuth, 34);
    this.daylight = pose.daylight;
    this.sun.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.sun.intensity = pose.intensity;
    this.sun.color.setRGB(pose.color.r, pose.color.g, pose.color.b);
    this.hemisphere.intensity = 0.07 + pose.daylight * 0.34;
    this.ambient.intensity = 0.02 + pose.daylight * 0.06;
    this.renderer.toneMappingExposure = 0.8 + pose.daylight * 0.18;

    // Window glass reads cold and reflective in daylight and near-black at
    // night; lit rooms still override this per pane in applyEntitiesToScene.
    const light = pose.daylight;
    this.glassMaterial.color.setRGB(
      0.1 + 0.52 * light,
      0.15 + 0.62 * light,
      0.2 + 0.66 * light
    );
    this.glassMaterial.opacity = 0.3 + light * 0.14;
    this.glassMaterial.envMapIntensity = 0.7 + light * 1.6;

    this.applyEntitiesToScene();
    this.requestFrame();
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
      new THREE.PlaneGeometry(15, 10),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(-0.3, 0.005, 0);
    this.scene.add(contactShadow);

    const drive = new THREE.Mesh(
      new THREE.PlaneGeometry(7.0, 6.0),
      new THREE.MeshStandardMaterial({ color: 0x8f8b83, roughness: 0.95 })
    );
    drive.rotation.x = -Math.PI / 2;
    drive.position.set(-10.4, -0.012, 7.4);
    drive.receiveShadow = true;
    this.scene.add(drive);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 5.2),
      new THREE.MeshStandardMaterial({ color: 0xa9a196, roughness: 0.95 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0.885, -0.011, 6.6);
    path.receiveShadow = true;
    this.scene.add(path);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.08, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x9a7951, roughness: 0.92 })
    );
    deck.position.set(3.2, 0.0, -5.0);
    deck.receiveShadow = true;
    deck.castShadow = true;
    this.scene.add(deck);

    const deckEdge = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x7c6040, roughness: 0.95 })
    );
    deckEdge.position.set(3.2, 0.06, -5.99);
    this.scene.add(deckEdge);

    const stepMaterial = new THREE.MeshStandardMaterial({ color: 0xb5ada1, roughness: 0.95 });
    const porchSteps = [
      { width: 2.0, depth: 0.5, height: 0.14, z: 4.2 },
      { width: 2.4, depth: 0.4, height: 0.07, z: 4.55 },
    ];
    porchSteps.forEach((step) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(step.width, step.height, step.depth),
        stepMaterial
      );
      mesh.position.set(0.885, step.height / 2 - 0.01, step.z);
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

  buildRoof() {
    if (!this.roofConfig) return;
    const rooms = this.rooms.filter((room) => room.floor === 'ground' && room.id !== 'garage');
    if (rooms.length === 0) return;

    const boxes = rooms.map(getRoomBounds);
    const minX = Math.min(...boxes.map((box) => box.x1));
    const maxX = Math.max(...boxes.map((box) => box.x2));
    const maxZ = Math.max(...boxes.flatMap((box) => [Math.abs(box.z1), Math.abs(box.z2)]));
    const centerX = (minX + maxX) / 2;
    const groundHeight = this.floors.find((floor) => floor.id === 'ground')?.height || 3;

    const overhang = this.roofConfig.overhang ?? 0.45;
    const thickness = this.roofConfig.thickness ?? 0.14;
    const ridgeHeight = this.roofConfig.ridgeHeight ?? 7;
    const eaveHeight = this.roofConfig.eaveHeight ?? 4.2;
    const eaveZ = maxZ + overhang;
    const width = maxX - minX + overhang * 2;
    const rise = ridgeHeight - eaveHeight;
    const slopeLength = Math.hypot(eaveZ, rise);
    const angle = Math.atan2(rise, eaveZ);
    const eaveYAtWall = eaveHeight + overhang * (rise / eaveZ);

    const group = new THREE.Group();
    group.name = 'roof';

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: ROOF_COLOR,
      roughness: 0.42,
      metalness: 0.3,
    });

    [-1, 1].forEach((sign) => {
      const plane = new THREE.Mesh(
        new THREE.BoxGeometry(width, thickness, slopeLength),
        roofMaterial
      );
      plane.position.set(centerX, (ridgeHeight + eaveHeight) / 2, (sign * eaveZ) / 2);
      plane.rotation.x = sign * angle;
      plane.castShadow = true;
      plane.receiveShadow = true;
      group.add(plane);
    });

    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.16, 0.34),
      this.roofEdgeMaterial
    );
    ridge.position.set(centerX, ridgeHeight + 0.04, 0);
    ridge.castShadow = true;
    group.add(ridge);

    // Gable walls close the ends above the ground floor wall top.
    const gable = new THREE.Shape();
    gable.moveTo(-maxZ, groundHeight);
    gable.lineTo(maxZ, groundHeight);
    gable.lineTo(maxZ, eaveYAtWall);
    gable.lineTo(0, ridgeHeight);
    gable.lineTo(-maxZ, eaveYAtWall);
    gable.lineTo(-maxZ, groundHeight);
    const gableGeometry = new THREE.ExtrudeGeometry(gable, {
      depth: 0.12,
      bevelEnabled: false,
      curveSegments: 1,
    });
    gableGeometry.translate(0, 0, -0.06);
    [-1, 1].forEach((sign) => {
      const mesh = new THREE.Mesh(gableGeometry, this.sidingMaterial);
      mesh.rotation.y = Math.PI / 2;
      mesh.position.x = sign > 0 ? maxX + 0.02 : minX - 0.02;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    });

    // Exterior band under the eaves on the long facades, so the roof does not
    // float above the ground floor walls.
    const bandHeight = eaveYAtWall - groundHeight;
    [-1, 1].forEach((sign) => {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(maxX - minX, bandHeight, WALL_THICKNESS),
        this.sidingMaterial
      );
      band.position.set(centerX, groundHeight + bandHeight / 2, sign * maxZ);
      band.castShadow = true;
      band.receiveShadow = true;
      group.add(band);
    });

    const garage = this.rooms.find((room) => room.id === 'garage');
    if (garage) {
      const bounds = getRoomBounds(garage);
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(bounds.x2 - bounds.x1 + 0.3, 0.16, bounds.z2 - bounds.z1 + 0.3),
        roofMaterial
      );
      slab.position.set(
        (bounds.x1 + bounds.x2) / 2,
        groundHeight + 0.08,
        (bounds.z1 + bounds.z2) / 2
      );
      slab.castShadow = true;
      slab.receiveShadow = true;
      group.add(slab);
    }

    this.roofGroup = group;
    group.visible = this.roofVisible && !this.exploded;
    this.scene.add(group);
  }

  setRoofVisible(value) {
    this.roofVisible = Boolean(value);
    if (this.roofGroup) this.roofGroup.visible = this.roofVisible && !this.exploded;
    this.requestFrame();
  }

  setExploded(value) {
    this.exploded = Boolean(value);
    if (this.roofGroup) this.roofGroup.visible = this.roofVisible && !this.exploded;
    this.requestFrame();
  }

  updateExplode(delta) {
    const target = this.exploded ? 2.4 : 0;
    if (Math.abs(this.explodeOffset - target) < 0.005) {
      if (this.explodeOffset === target) return false;
      this.explodeOffset = target;
    } else {
      this.explodeOffset += (target - this.explodeOffset) * Math.min(1, delta * 6.5);
    }
    this.floorGroups.forEach((group, id) => {
      const floor = this.floors.find((item) => item.id === id);
      const lift = id === 'ground' ? 0 : this.explodeOffset;
      group.position.y = (floor?.elevation || 0) + lift;
    });
    this.dirty = true;
    return true;
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

      const art = new THREE.Group();
      art.name = `art_${floor.id}`;
      group.add(art);
      group.userData.art = art;

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
    // Footprint from the plan: the flight starts by the front door and rises
    // north between the bathroom wall and the kitchen return.
    const steps = 16;
    const rise = 3.0 / steps;
    const startZ = 3.7;
    const endZ = 1.3;
    const run = (startZ - endZ) / steps;
    const width = 1.0;
    const centerX = -0.38;

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
    beacon.position.set(1.95, 1.55, 3.45);
    glow.position.copy(beacon.position);
    this.alarmGlow = glow;
    this.scene.add(beacon, glow);

    this.alarmLight = new THREE.PointLight(0xff3b30, 0, 5.5, 2);
    this.alarmLight.position.set(1.95, 2.1, 3.6);
    this.scene.add(this.alarmLight);
  }

  setAlarmState(state) {
    const next = state || '';
    if (this.alarmState === next) return;
    this.alarmState = next;
    this.applyAlarmState();
    this.requestFrame();
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
    const signature = Object.keys(states || {})
      .sort()
      .map((key) => {
        const state = states[key] || {};
        return `${key}:${state.running ? 1 : 0}:${Math.round(state.power || 0)}`;
      })
      .join('|');
    if (signature === this.applianceSignature) return;
    this.applianceSignature = signature;
    this.applianceStates = states || {};
    this.applyApplianceStates();
    this.requestFrame();
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
    const signature = (this.doors || []).map((door) => (next[door.id] ? '1' : '0')).join('');
    if (signature === this.doorSignature) return;
    this.doorSignature = signature;
    (this.doorEntries || []).forEach((entry) => {
      entry.target = next[entry.id] ? 1 : 0;
    });
    this.requestFrame();
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
        if (event.detail >= 2) this.onFocusRoom?.(room.id);
        else this.onSelectRoom?.(room.id);
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
    this.fixtures.forEach(({ root, mesh, glow }) => {
      root.parent?.remove(root);
      mesh.material?.dispose();
      glow.material?.dispose();
    });
    this.fixtures.clear();
    this.fixtureHitMeshes = [];

    const geometries = this.fixtureGeometries;

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
          geometries.bulb,
          new THREE.MeshStandardMaterial({
            color: 0x4d4a45,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0,
            roughness: 0.4,
          })
        );
        const glow = new THREE.Mesh(
          geometries.glow,
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        const hit = new THREE.Mesh(geometries.hit, this.hitMaterial);
        hit.userData = { kind: 'light', entityId, floorId: room.floor };
        this.fixtureHitMeshes.push(hit);

        const position = positions[index] || getRoomCenter(room);
        mesh.position.set(position.x, floor.height - 0.44, position.z);
        glow.position.copy(mesh.position);
        hit.position.copy(mesh.position);

        const shade = new THREE.Mesh(geometries.shade, this.shadeMaterial);
        shade.position.copy(mesh.position).add(new THREE.Vector3(0, 0.15, 0));
        shade.castShadow = true;

        const cord = new THREE.Mesh(geometries.cord, this.cordMaterial);
        cord.position.copy(mesh.position).add(new THREE.Vector3(0, 0.32, 0));

        const rose = new THREE.Mesh(geometries.rose, this.frameMaterial);
        rose.position.set(position.x, floor.height - 0.02, position.z);

        const root = new THREE.Group();
        root.add(mesh, glow, hit, shade, cord, rose);
        container.add(root);
        this.fixtures.set(entityId, {
          mesh,
          glow,
          hit,
          root,
          entityId,
          roomId: room.id,
          floorId: room.floor,
        });
      });
    });

    this.dirty = true;
  }

  getArtTexture(artKey, onLoad) {
    if (!artKey) return null;
    const cached = this.artTextures.get(artKey);
    if (cached) {
      if (cached.image) onLoad?.(cached);
      else {
        const pending = this.pendingArt.get(artKey);
        if (pending) pending.add(onLoad);
        else if (onLoad) this.pendingArt.set(artKey, new Set([onLoad]));
      }
      return cached;
    }
    const src = getDeviceArtSrc(artKey);
    if (!src) return null;
    const pending = new Set();
    if (onLoad) pending.add(onLoad);
    this.pendingArt.set(artKey, pending);
    const texture = this.artLoader.load(
      src,
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = this.maxAnisotropy;
        pending.forEach((callback) => callback(loaded));
        pending.clear();
        this.requestFrame();
      },
      undefined,
      () => pending.clear()
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    this.artTextures.set(artKey, texture);
    return texture;
  }

  sizeArtSprite(sprite, texture) {
    const image = texture?.image;
    const aspect =
      image?.naturalWidth && image?.naturalHeight ? image.naturalWidth / image.naturalHeight : 0.9;
    const maxWidth = 1.15;
    const maxHeight = 1.1;
    let width = maxWidth;
    let height = maxWidth / aspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspect;
    }
    sprite.scale.set(width, height, 1);
  }

  buildArt() {
    this.artRoots.forEach(({ root, material, shadowMaterial, shadowGeometry }) => {
      root.parent?.remove(root);
      material.dispose();
      shadowMaterial.dispose();
      shadowGeometry.dispose();
    });
    this.artRoots = [];

    this.rooms.forEach((room) => {
      const container = this.floorGroups.get(room.floor)?.userData?.art;
      if (!container) return;
      container.visible = this.showArt;
      const items = (this.roomArt[room.id] || []).filter((item) => item.artKey).slice(0, 3);
      if (items.length === 0) return;

      const center = getRoomCenter(room);
      const spacing = 0.9;
      const shadowGeometry = new THREE.CircleGeometry(0.44, 22);

      items.forEach((item, index) => {
        const x = center.x + (index - (items.length - 1) / 2) * spacing;
        const z = center.z + 0.35;
        const material = new THREE.SpriteMaterial({
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        });
        const sprite = new THREE.Sprite(material);
        const fit = (texture) => {
          material.map = texture;
          material.needsUpdate = true;
          this.sizeArtSprite(sprite, texture);
        };
        const texture = this.getArtTexture(item.artKey, fit);
        if (texture) fit(texture);
        sprite.position.set(x, 1.35, z);

        const shadowMaterial = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(x, 0.025, z);

        const root = new THREE.Group();
        root.add(sprite, shadow);
        container.add(root);
        this.artRoots.push({ root, material, shadow, shadowMaterial, shadowGeometry });
      });
    });

    this.dirty = true;
  }

  setRoomArt(roomArt) {
    const signature = this.rooms
      .map(
        (room) =>
          `${room.id}:${(roomArt?.[room.id] || [])
            .map((item) => `${item.entityId}:${item.artKey}`)
            .join(',')}`
      )
      .join(';');
    if (signature === this.artSignature) return;
    this.artSignature = signature;
    this.roomArt = roomArt || {};
    this.buildArt();
    this.requestFrame();
  }

  setShowArt(showArt) {
    const next = Boolean(showArt);
    if (next === this.showArt) return;
    this.showArt = next;
    this.floorGroups.forEach((group) => {
      if (group.userData.art) group.userData.art.visible = next;
    });
    this.requestFrame();
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
    this.requestFrame();
  }

  /** Only the state of bound lamps affects the scene materials. */
  getLightSignature() {
    let signature = '';
    this.fixtures.forEach((_, entityId) => {
      const entity = this.entities[entityId];
      const attrs = entity?.attributes || {};
      signature += `${entityId}:${entity?.state || ''}:${attrs.brightness ?? ''}:${
        attrs.color_temp_kelvin ?? ''
      }:${(attrs.rgb_color || []).join(',')};`;
    });
    return signature;
  }

  setEntities(entities) {
    this.entities = entities || {};
    const signature = this.getLightSignature();
    if (signature === this.lightSignature) return;
    this.applyEntitiesToScene();
    this.requestFrame();
  }

  applyEntitiesToScene() {
    const roomStats = new Map();

    this.fixtures.forEach(({ mesh, glow, roomId, floorId }, entityId) => {
      const entity = this.entities[entityId];
      const isOn = entity?.state === 'on';
      const { r, g, b } = getLightColor(entity);
      const color = new THREE.Color(r / 255, g / 255, b / 255);
      // Keep the whole 0-100% dimming range, with a small floor so a lamp at
      // 1% still reads as lit instead of vanishing.
      const brightness = Number.isFinite(entity?.attributes?.brightness)
        ? Math.min(1, Math.max(0.06, entity.attributes.brightness / 255))
        : 1;

      if (isOn) {
        mesh.material.color.copy(color);
        mesh.material.emissive.copy(color);
        mesh.material.emissiveIntensity = 1.2 + brightness * 3.4;
        glow.material.color.copy(color);
        glow.material.opacity = 0.1 + brightness * 0.3;

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
      // Scale the room light with the dimmer level, so 20% is clearly dimmer
      // than 100% instead of almost the same.
      light.intensity = Math.min(
        36,
        (2.4 + stats.count * 5.0) * (0.18 + averageBrightness * 0.82)
      );
    });

    this.roomFloorMaterials.forEach((value, key) => {
      const stats = roomStats.get(key);
      const materials = Array.isArray(value) ? value : [value];
      materials.forEach((material) => {
        const base = material.userData.baseColor;
        if (stats) {
          const lit = 0.35 + (stats.brightness / stats.count) * 0.65;
          if (base) material.color.copy(base);
          material.emissive.copy(roomColor(stats));
          material.emissiveIntensity = Math.min(0.85, (0.3 + stats.count * 0.15) * lit);
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
          const lit = 0.3 + (stats.brightness / stats.count) * 0.7;
          material.color.copy(roomColor(stats));
          material.opacity = Math.min(0.8, (0.28 + stats.count * 0.14) * lit);
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
        material.emissiveIntensity = 2.4 * (0.35 + (stats.brightness / stats.count) * 0.65);
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

    this.lightSignature = this.getLightSignature();
    this.applyHover();
    this.applySelection();
    this.requestFrame();
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

  applyHover() {
    this.fixtures.forEach((entry, entityId) => {
      const hovered = entityId === this.hoveredLightId;
      entry.glow.scale.setScalar(hovered ? 1.5 : 1);
      if (hovered && entry.glow.material.opacity < 0.16) entry.glow.material.opacity = 0.16;
    });
  }

  setHoveredLight(entityId) {
    const next = entityId && this.fixtures.has(entityId) ? entityId : null;
    if (next === this.hoveredLightId) return;
    this.hoveredLightId = next;
    this.applyEntitiesToScene();
    this.requestFrame();
    if (!next) this.hideTooltip();
  }

  buildTooltip() {
    const el = document.createElement('div');
    el.style.cssText = TOOLTIP_STYLE;
    this.labelHost?.appendChild(el);
    this.tooltipEl = el;
  }

  updateTooltip(event, entityId) {
    if (!this.tooltipEl) return;
    const entity = this.entities[entityId];
    const name =
      entity?.attributes?.friendly_name ||
      entityId.split('.')[1]?.replace(/_/g, ' ') ||
      entityId;
    const detail =
      entity?.state === 'on' ? `${getBrightnessPercent(entity)}%` : this.getOffLabel?.() || 'Off';
    this.tooltipEl.textContent = `${name} · ${detail}`;
    const host = this.labelHost?.getBoundingClientRect();
    if (!host) return;
    const x = event.clientX - host.left;
    const y = event.clientY - host.top;
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.transform = `translate(-50%,-160%) translate3d(${x}px,${y}px,0)`;
  }

  hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.style.display = 'none';
  }

  setRoomStats(stats) {
    const signature = this.rooms
      .map((room) => {
        const value = stats?.[room.id];
        return `${room.id}:${value?.lightsOn ?? 0}:${value?.lightsTotal ?? 0}:${
          value?.temperature ?? ''
        }:${value?.humidity ?? ''}`;
      })
      .join('|');
    if (signature === this.statsSignature) return;
    this.statsSignature = signature;
    this.stats = stats || {};
    this.rooms.forEach((room) => {
      const el = this.labelStatsEls.get(room.id);
      if (!el) return;
      el.textContent = this.formatStats ? this.formatStats(this.stats[room.id]) : '';
    });
    this.requestFrame();
  }

  setShowLabels(showLabels) {
    const next = Boolean(showLabels);
    if (next === this.showLabels) return;
    this.showLabels = next;
    this.applyLabelsVisibility();
    this.requestFrame();
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
    if (this.visibleFloor === floorId) return;
    this.visibleFloor = floorId;
    this.floorGroups.forEach((group, id) => {
      group.visible = floorId === 'all' || floorId === id;
    });
    this.hoveredLightId = null;
    this.hideTooltip();
    this.applyLabelsVisibility();
    this.requestFrame();
  }

  setSelectedRoom(roomId) {
    const next = roomId || null;
    if (next === this.selectedRoomId) return;
    this.selectedRoomId = next;
    this.applyEntitiesToScene();
    this.requestFrame();
  }

  viewGoal(preset = 'overview') {
    const aspect = this.camera.aspect || 1;
    // Show the detached garage on wide screens; on narrow screens it would
    // force the main house to become too small.
    const includeGarage = preset === 'overview' && aspect >= 1.35;
    const framedRooms = this.rooms.filter(
      (room) => includeGarage || room.id !== 'garage'
    );
    const boxes = framedRooms.map(getRoomBounds);
    const minX = Math.min(...boxes.map((box) => box.x1));
    const maxX = Math.max(...boxes.map((box) => box.x2));
    const minZ = Math.min(...boxes.map((box) => box.z1));
    const maxZ = Math.max(...boxes.map((box) => box.z2));
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const fit = Math.max(1, Math.min(2.8, 1.2 / aspect)) * 1.04;
    // The closed roof hides the interior, so pull the camera back to frame the
    // whole house instead of the open-top dollhouse view.
    const roofFit = this.roofVisible ? 1.8 : 1;

    const position = new THREE.Vector3();
    const target = new THREE.Vector3(centerX, 0.9, centerZ);

    if (preset === 'top') {
      position.set(centerX, 20 * fit * roofFit, centerZ + 0.01);
      target.set(centerX, 0, centerZ);
    } else if (preset === 'entrance') {
      position.set(
        centerX + 2.6 * roofFit,
        6.2 * fit * (this.roofVisible ? 1.9 : 1),
        maxZ + 8.4 * fit * roofFit
      );
      target.set(centerX, 1.5, centerZ + 1.2);
    } else if (preset === 'garden') {
      position.set(
        centerX - 2.2 * roofFit,
        6.4 * fit * (this.roofVisible ? 1.9 : 1),
        minZ - 8.8 * fit * roofFit
      );
      target.set(centerX, 1.4, centerZ - 1.2);
    } else {
      position.set(
        centerX + 5.8 * fit * roofFit,
        0.9 + 13.2 * fit * roofFit,
        centerZ + 8.2 * fit * roofFit
      );
    }
    return { position, target };
  }

  focusRoom(roomId) {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) return;
    const box = getRoomBounds(room);
    const centerX = (box.x1 + box.x2) / 2;
    const centerZ = (box.z1 + box.z2) / 2;
    const floor = this.floors.find((item) => item.id === room.floor);
    const baseY = floor?.elevation || 0;
    const span = Math.max(box.x2 - box.x1, box.z2 - box.z1, 2.4);
    const distance = Math.max(4.2, span * 1.55);
    const position = new THREE.Vector3(
      centerX + distance * 0.35,
      baseY + distance * 0.62,
      centerZ + distance * 0.78
    );
    const target = new THREE.Vector3(centerX, baseY + 0.9, centerZ);
    this.flyTo(position, target, 650);
  }

  flyTo(position, target, duration = 620) {
    this.cameraAnimation = {
      fromPosition: this.camera.position.clone(),
      toPosition: position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      startedAt: Date.now(),
      duration,
    };
    this.controls.enableDamping = false;
    this.hasUserInteracted = true;
    this.requestFrame();
  }

  setViewPreset(preset) {
    const { position, target } = this.viewGoal(preset);
    this.flyTo(position, target);
  }

  resetView(immediate = false) {
    const { position, target } = this.viewGoal('overview');
    if (immediate) {
      this.cameraAnimation = null;
      this.controls.enableDamping = true;
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
      this.requestFrame();
      return;
    }
    this.flyTo(position, target);
  }

  updateCamera() {
    const animation = this.cameraAnimation;
    if (!animation) return false;
    const elapsed = Date.now() - animation.startedAt;
    const t = Math.min(1, elapsed / animation.duration);
    const eased = t * t * (3 - 2 * t);
    this.camera.position.lerpVectors(animation.fromPosition, animation.toPosition, eased);
    this.controls.target.lerpVectors(animation.fromTarget, animation.toTarget, eased);
    if (t >= 1) {
      this.cameraAnimation = null;
      this.controls.enableDamping = true;
    }
    this.dirty = true;
    return true;
  }

  requestFrame() {
    this.dirty = true;
    this.scheduleFrame();
  }

  scheduleFrame() {
    if (this.disposed || !this.active || this.raf) return;
    this.raf = requestAnimationFrame(() => this.renderFrame());
  }

  setActive(active) {
    const next = Boolean(active) && !this.disposed;
    if (next === this.active) return;
    this.active = next;
    if (next) {
      this.lastFrame = Date.now();
      this.scheduleFrame();
    } else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  handleVisibility() {
    this.setActive(!document.hidden && this.onScreen);
  }

  start() {
    this.setActive(!document.hidden && this.onScreen);
  }

  renderFrame() {
    this.raf = null;
    if (this.disposed || !this.active) return;
    const now = Date.now();
    const delta = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const changed = this.controls.update();
    const doors = this.updateDoors();
    const appliances = this.updateAppliances(delta);
    const alarm = this.updateAlarm();
    const camera = this.updateCamera();
    const explode = this.updateExplode(delta);
    if (!changed && !this.dirty && !doors && !appliances && !alarm && !camera && !explode) {
      return;
    }
    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
    if (changed || doors || appliances || alarm || camera || explode) {
      this.scheduleFrame();
    }
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
      const lift = room.floor === 'ground' ? 0 : this.explodeOffset;
      this.projected.set(
        center.x,
        (floor?.elevation || 0) + lift + (floor?.height || 2.6) + 0.2,
        center.z
      );
      this.projected.project(this.camera);

      const visible = this.projected.z < 1 && this.projected.z > -1;
      el.style.opacity = visible ? '1' : '0';
      if (!visible) return;

      const x = (this.projected.x * 0.5 + 0.5) * width;
      const y = (-this.projected.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,0)`;
    });
  }

  handlePointerDown(event) {
    this.pointerDown = { x: event.clientX, y: event.clientY };
    this.hideTooltip();
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
    const data = hit?.object?.userData;
    const lightId = data?.kind === 'light' ? data.entityId : null;
    this.setHoveredLight(lightId);
    this.canvas.style.cursor = hit ? 'pointer' : 'grab';
    if (lightId && !this.pointerDown) this.updateTooltip(event, lightId);
    else this.hideTooltip();
  }

  handlePointerLeave() {
    this.setHoveredLight(null);
    this.hideTooltip();
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
    this.fixtureHitMeshes.forEach((hit) => {
      if (this.floorGroups.get(hit.userData.floorId)?.visible !== false) targets.push(hit);
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
    const data = hit.object.userData;
    if (data.kind === 'light') {
      const rect = this.canvas.getBoundingClientRect();
      this.hideTooltip();
      this.onSelectLight?.(data.entityId, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      return;
    }
    if (data.kind === 'room') {
      const now = Date.now();
      if (
        this.lastRoomPick &&
        this.lastRoomPick.roomId === data.roomId &&
        now - this.lastRoomPick.at < 350
      ) {
        this.lastRoomPick = null;
        this.onFocusRoom?.(data.roomId);
        return;
      }
      this.lastRoomPick = { roomId: data.roomId, at: now };
      this.onSelectRoom?.(data.roomId);
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
    this.requestFrame();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.controls.dispose();
    this.labelEls.forEach((el) => el.remove());
    this.tooltipEl?.remove();
    this.ownedTextures.forEach((texture) => texture.dispose());
    this.artTextures.forEach((texture) => texture.dispose());
    this.environmentTexture?.dispose();
    Object.values(this.fixtureGeometries || {}).forEach((geometry) => geometry.dispose());
    this.hitMaterial?.dispose();
    this.shadeMaterial?.dispose();
    this.cordMaterial?.dispose();
    disposeObject(this.scene);
    this.renderer.dispose();
  }
}
