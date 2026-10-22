import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getLightColor, getRoomBounds, getRoomCenter } from './houseScene';

const WALL_THICKNESS = 0.12;
const WALL_COLOR = 0xcfc9bd;
const FLOOR_COLOR = 0x8b8578;
const FLOOR_LIT_COLOR = 0xb99a63;
const GROUND_COLOR = 0x3f473d;
const MAX_POINT_LIGHTS = 14;

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

function wallSegmentsForRoom(room) {
  return (room.rects || []).flatMap(([x1, z1, x2, z2]) => [
    { horizontal: true, x1, z1, x2, z2: z1 },
    { horizontal: false, x1: x2, z1, x2, z2 },
    { horizontal: true, x1, z1: z2, x2, z2 },
    { horizontal: false, x1, z1, x2: x1, z2 },
  ]);
}

function segmentKey(segment) {
  const round = (value) => Math.round(value * 1000) / 1000;
  const points = [
    [round(segment.x1), round(segment.z1)],
    [round(segment.x2), round(segment.z2)],
  ]
    .map(([x, z]) => `${x},${z}`)
    .sort();
  return points.join('|');
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else if (child.material) child.material.dispose();
  });
}

export class HouseScene {
  constructor({ canvas, labelHost, rooms, floors, onSelectRoom, onToggleLight, formatStats }) {
    this.canvas = canvas;
    this.labelHost = labelHost;
    this.rooms = rooms;
    this.floors = floors;
    this.onSelectRoom = onSelectRoom;
    this.onToggleLight = onToggleLight;
    this.formatStats = formatStats;

    this.disposed = false;
    this.dirty = true;
    this.floorGroups = new Map();
    this.pickMeshes = [];
    this.roomFloorMaterials = new Map();
    this.fixtures = new Map();
    this.fixtureSignature = '';
    this.labelEls = new Map();
    this.labelStatsEls = new Map();
    this.stats = {};
    this.visibleFloor = 'ground';
    this.showSensors = true;
    this.selectedRoomId = null;

    this.entities = {};
    this.roomLights = {};
    this.pointerDown = null;
    this.hasUserInteracted = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.projected = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);

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

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x35322c, 1.55));

    const sun = new THREE.DirectionalLight(0xffffff, 1.9);
    sun.position.set(11, 18, 9);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
    fill.position.set(-12, 8, -10);
    this.scene.add(fill);

    this.buildGround();
    this.buildFloors();
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

  buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 46),
      new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(70, 70, 0xffffff, 0xffffff);
    grid.material.transparent = true;
    grid.material.opacity = 0.05;
    grid.position.y = 0.001;
    this.scene.add(grid);

    const drive = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 5),
      new THREE.MeshStandardMaterial({ color: 0x565149, roughness: 1 })
    );
    drive.rotation.x = -Math.PI / 2;
    drive.position.set(-10.2, -0.015, 4.9);
    this.scene.add(drive);
  }

  buildFloors() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: 0.92,
      metalness: 0,
    });

    this.floors.forEach((floor) => {
      const group = new THREE.Group();
      group.position.y = floor.elevation;
      group.name = `floor_${floor.id}`;

      const rooms = this.rooms.filter((room) => room.floor === floor.id);

      rooms.forEach((room) => {
        (room.rects || []).forEach(([x1, z1, x2, z2]) => {
          const width = x2 - x1;
          const depth = z2 - z1;

          const material = new THREE.MeshStandardMaterial({
            color: FLOOR_COLOR,
            roughness: 0.95,
            metalness: 0,
            emissive: new THREE.Color(0x000000),
          });
          const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), material);
          slab.position.set((x1 + x2) / 2, -0.05, (z1 + z2) / 2);
          group.add(slab);
          this.roomFloorMaterials.set(`${floor.id}:${room.id}`, material);

          const pick = new THREE.Mesh(
            new THREE.BoxGeometry(width, 0.08, depth),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
          );
          pick.position.set((x1 + x2) / 2, 0.04, (z1 + z2) / 2);
          pick.userData = { kind: 'room', roomId: room.id };
          group.add(pick);
          this.pickMeshes.push(pick);
        });
      });

      // One wall per unique edge, shared walls between rooms are drawn once.
      const seen = new Set();
      rooms.forEach((room) => {
        wallSegmentsForRoom(room).forEach((segment) => {
          const key = segmentKey(segment);
          if (seen.has(key)) return;
          seen.add(key);

          const length = Math.hypot(segment.x2 - segment.x1, segment.z2 - segment.z1) + WALL_THICKNESS;
          const geometry = segment.horizontal
            ? new THREE.BoxGeometry(length, floor.height, WALL_THICKNESS)
            : new THREE.BoxGeometry(WALL_THICKNESS, floor.height, length);
          const wall = new THREE.Mesh(geometry, wallMaterial);
          wall.position.set(
            (segment.x1 + segment.x2) / 2,
            floor.height / 2,
            (segment.z1 + segment.z2) / 2
          );
          group.add(wall);
        });
      });

      const fixtures = new THREE.Group();
      fixtures.name = `fixtures_${floor.id}`;
      group.add(fixtures);
      group.userData.fixtures = fixtures;

      this.scene.add(group);
      this.floorGroups.set(floor.id, group);
    });
  }

  buildLabels() {
    this.rooms.forEach((room) => {
      const el = document.createElement('div');
      el.style.cssText = LABEL_STYLE;
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
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
    this.fixtures.forEach(({ mesh, glow, light }) => {
      mesh.parent?.remove(mesh);
      glow.parent?.remove(glow);
      light.parent?.remove(light);
      mesh.geometry.dispose();
      mesh.material.dispose();
      glow.geometry.dispose();
      glow.material.dispose();
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
          new THREE.SphereGeometry(0.085, 18, 12),
          new THREE.MeshStandardMaterial({
            color: 0x4d4a45,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0,
            roughness: 0.4,
          })
        );
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 16, 12),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );

        const position = positions[index] || getRoomCenter(room);
        mesh.position.set(position.x, floor.height - 0.2, position.z);
        glow.position.copy(mesh.position);

        const light = new THREE.PointLight(color, 0, 6.5, 2);
        light.position.copy(mesh.position);

        mesh.userData = { kind: 'light', entityId };
        container.add(mesh, glow, light);
        this.fixtures.set(entityId, { mesh, glow, light, roomId: room.id });
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
    const lightsOnByRoom = new Map();
    let activePointLights = 0;

    this.fixtures.forEach(({ mesh, glow, light, roomId }, entityId) => {
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
        mesh.material.emissiveIntensity = 1.6 + brightness * 2.2;
        glow.material.color.copy(color);
        glow.material.opacity = 0.16 + brightness * 0.12;
        light.color.copy(color);
        light.intensity = activePointLights < MAX_POINT_LIGHTS ? 3 + brightness * 7 : 0;
        activePointLights += 1;
        lightsOnByRoom.set(roomId, (lightsOnByRoom.get(roomId) || 0) + 1);
      } else {
        mesh.material.color.setHex(0x4d4a45);
        mesh.material.emissive.setHex(0x000000);
        mesh.material.emissiveIntensity = 0;
        glow.material.opacity = 0;
        light.intensity = 0;
      }
    });

    this.roomFloorMaterials.forEach((material, key) => {
      const lightsOn = lightsOnByRoom.get(key.split(':')[1]) || 0;
      if (lightsOn > 0) {
        material.emissive.setHex(0x6b4a1c);
        material.emissiveIntensity = Math.min(0.5, 0.22 + lightsOn * 0.08);
        material.color.setHex(FLOOR_LIT_COLOR);
      } else {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
        material.color.setHex(FLOOR_COLOR);
      }
    });

    this.applySelection();
    this.dirty = true;
  }

  applySelection() {
    this.roomFloorMaterials.forEach((material, key) => {
      if (!this.selectedRoomId || key.split(':')[1] !== this.selectedRoomId) return;
      material.emissive.setHex(0x2b5d8a);
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.55);
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

  setShowSensors(showSensors) {
    this.showSensors = Boolean(showSensors);
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
      if (statsEl) statsEl.style.display = this.showSensors ? '' : 'none';
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
    const fit = Math.max(1, Math.min(2.2, 0.95 / aspect));

    this.controls.target.set(centerX, 1.1, centerZ);
    this.camera.position.set(centerX + 10.5 * fit, 1.1 + 10.4 * fit, centerZ + 13 * fit);
    this.controls.update();
    this.dirty = true;
    if (!immediate) this.controls.update();
  }

  start() {
    const render = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(render);
      const changed = this.controls.update();
      if (!changed && !this.dirty) return;
      this.dirty = false;
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
    };
    this.raf = requestAnimationFrame(render);
  }

  updateLabels() {
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
      this.projected.set(center.x, (floor?.elevation || 0) + (floor?.height || 2.6) + 0.2, center.z);
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
    const distance = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
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
    this.fixtures.forEach(({ mesh }) => {
      if (mesh.parent?.parent?.visible !== false) targets.push(mesh);
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
    disposeObject(this.scene);
    this.renderer.dispose();
  }
}
