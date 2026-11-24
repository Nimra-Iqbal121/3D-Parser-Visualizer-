import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let cachedSoftwareGl: boolean | null = null;

/**
 * Detects software WebGL renderers (SwiftShader, llvmpipe, WARP) strictly from the GPU renderer string.
 */
export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return true;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export interface StudioSetup {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  isSoftwareGl: boolean;
  envTexture: THREE.Texture;
}

/**
 * Creates a bright, high-clarity warm alabaster-beige architectural studio with
 * RoomEnvironment studio reflections and balanced 3-point rose-warm lighting.
 */
export function createRendererAndStudio(
  width: number,
  height: number,
  bgHex = 0xf5ede3
): StudioSetup {
  const isSoftwareGl = detectSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.max(width, 1), Math.max(height, 1));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgHex);
  scene.fog = new THREE.FogExp2(bgHex, 0.0065);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();

  // Warm daylight studio key light
  const keyLight = new THREE.DirectionalLight(0xfff9f2, 2.05);
  keyLight.position.set(11, 18, 13);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 48;
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 18;
    keyLight.shadow.camera.bottom = -18;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  // Soft ivory-sky / warm-sand bounce hemisphere fill
  const hemiLight = new THREE.HemisphereLight(0xfff5f8, 0xe2cdb8, 1.15);
  scene.add(hemiLight);

  // Gentle rose rim light from opposite side for crisp silhouette separation
  const rimLight = new THREE.DirectionalLight(0xf9c6d8, 0.95);
  rimLight.position.set(-12, 9, -11);
  scene.add(rimLight);

  return { renderer, scene, isSoftwareGl, envTexture };
}

/**
 * Generates a high-DPI procedural CanvasTexture label card designed for effortless readability
 * on the warm beige studio canvas (crisp ivory plate, colored top accent strip, espresso ink).
 */
export function createLabelTexture(
  text: string,
  opts: {
    subtext?: string;
    bgColor?: string;
    borderColor?: string;
    accentBarColor?: string;
    textColor?: string;
    subtextColor?: string;
    width?: number;
    height?: number;
    fontSize?: number;
    maxAnisotropy?: number;
  } = {}
): THREE.CanvasTexture {
  const w = opts.width ?? 480;
  const h = opts.height ?? (opts.subtext ? 132 : 96);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const radius = 18;
  ctx.clearRect(0, 0, w, h);

  // Soft drop shadow for clean legibility against 3D geometry
  ctx.save();
  ctx.shadowColor = 'rgba(43, 27, 34, 0.22)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(8, 6, w - 16, h - 16, radius);
  ctx.fillStyle = opts.bgColor ?? '#ffffff';
  ctx.fill();
  ctx.restore();

  // Crisp colored accent stripe along top edge (clipped to rounded rect)
  const accentCol = opts.accentBarColor ?? opts.borderColor ?? '#c93b72';
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(8, 6, w - 16, h - 16, radius);
  ctx.clip();
  ctx.fillStyle = accentCol;
  ctx.fillRect(8, 6, w - 16, 11);
  ctx.restore();

  // Crisp outer border
  ctx.beginPath();
  ctx.roundRect(8, 6, w - 16, h - 16, radius);
  ctx.lineWidth = 4;
  ctx.strokeStyle = opts.borderColor ?? '#d99bb3';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.textColor ?? '#22131a';

  const baseSize = opts.fontSize ?? (text.length > 17 ? 32 : text.length > 11 ? 37 : 42);
  ctx.font = `800 ${baseSize}px "Plus Jakarta Sans", "JetBrains Mono", sans-serif`;

  if (opts.subtext) {
    ctx.fillText(text, w / 2, h * 0.44, w - 36);
    ctx.fillStyle = opts.subtextColor ?? '#5f4350';
    ctx.font = `700 23px "JetBrains Mono", monospace`;
    ctx.fillText(opts.subtext, w / 2, h * 0.77, w - 36);
  } else {
    ctx.fillText(text, w / 2, h * 0.53, w - 36);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(opts.maxAnisotropy ?? 4, 8);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a soft radial contact shadow texture for grounding 3D nodes & towers on the beige floor.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(72, 42, 54, 0.28)');
  grad.addColorStop(0.55, 'rgba(72, 42, 54, 0.1)');
  grad.addColorStop(1, 'rgba(72, 42, 54, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Adds a crisp warm-sand architectural reference floor & grid platform to ground 3D visualizers.
 */
export function createArchitecturalGridFloor(y = -3.8, size = 38): THREE.Group {
  const group = new THREE.Group();

  const floorGeo = new THREE.PlaneGeometry(size * 1.6, size * 1.6);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xefe5d8,
    roughness: 0.92,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y - 0.03;
  floor.receiveShadow = true;
  group.add(floor);

  const grid = new THREE.GridHelper(size, 26, 0xd4b6a8, 0xe4d3c3);
  grid.position.y = y;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.72;
  group.add(grid);

  return group;
}

/**
 * Creates a composite 5-part porcelain-and-rose-gold architectural 3D node assembly
 * (cream pedestal, blush/mauve sculpted body, metallic collar ring, upper crown, beacon core).
 */
export function createCompositeNodeAssembly(opts: {
  style: 'root' | 'top-down' | 'bottom-up' | 'lr-sub';
  accentHex: number;
  selected?: boolean;
  hovered?: boolean;
  scale?: number;
}): THREE.Group {
  const group = new THREE.Group();
  const s = opts.scale ?? 1;

  const porcelainMat = new THREE.MeshStandardMaterial({
    color: 0xfffaf3,
    roughness: 0.42,
    metalness: 0.08,
  });

  const bodyTint =
    opts.style === 'root'
      ? 0xefa5c2
      : opts.style === 'top-down'
      ? 0xf1b2cb
      : opts.style === 'bottom-up'
      ? 0xd8a6c2
      : 0xdeb0ca;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyTint,
    roughness: 0.36,
    metalness: 0.14,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: opts.accentHex,
    roughness: 0.25,
    metalness: 0.42,
    emissive: new THREE.Color(opts.accentHex),
    emissiveIntensity: opts.selected ? 0.42 : opts.hovered ? 0.26 : 0.08,
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: opts.selected ? 0xffedf4 : opts.accentHex,
    roughness: 0.18,
    metalness: 0.18,
    emissive: new THREE.Color(opts.accentHex),
    emissiveIntensity: opts.selected ? 0.75 : 0.28,
  });

  // 1. Cream porcelain base plinth
  const baseGeo =
    opts.style === 'top-down'
      ? new THREE.CylinderGeometry(0.66 * s, 0.76 * s, 0.18 * s, 6)
      : new THREE.CylinderGeometry(0.68 * s, 0.78 * s, 0.18 * s, 16);
  const base = new THREE.Mesh(baseGeo, porcelainMat);
  base.position.y = -0.35 * s;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Sculpted core body (distinct geometric silhouettes for Root, Top-Down, Bottom-Up, LR Sub)
  let bodyGeo: THREE.BufferGeometry;
  if (opts.style === 'root') {
    bodyGeo = new THREE.OctahedronGeometry(0.58 * s, 0);
  } else if (opts.style === 'top-down') {
    bodyGeo = new THREE.CylinderGeometry(0.48 * s, 0.36 * s, 0.58 * s, 6);
  } else if (opts.style === 'bottom-up') {
    bodyGeo = new THREE.CylinderGeometry(0.38 * s, 0.52 * s, 0.58 * s, 8);
  } else {
    bodyGeo = new THREE.BoxGeometry(0.72 * s, 0.5 * s, 0.72 * s);
  }
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.02 * s;
  body.castShadow = true;
  group.add(body);

  // 3. Satin rose/berry accent collar ring
  const ringGeo = new THREE.TorusGeometry(0.61 * s, 0.055 * s, 12, 32);
  const ring = new THREE.Mesh(ringGeo, trimMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.22 * s;
  group.add(ring);

  // 4. Upper crown trim
  const crownGeo =
    opts.style === 'top-down'
      ? new THREE.CylinderGeometry(0.3 * s, 0.46 * s, 0.15 * s, 6)
      : new THREE.CylinderGeometry(0.46 * s, 0.34 * s, 0.15 * s, 8);
  const crown = new THREE.Mesh(crownGeo, trimMat);
  crown.position.y = 0.37 * s;
  group.add(crown);

  // 5. Inner pearl/rose beacon core
  const beaconGeo = new THREE.SphereGeometry(0.2 * s, 16, 12);
  const beacon = new THREE.Mesh(beaconGeo, coreMat);
  beacon.position.y = opts.style === 'root' ? 0.64 * s : 0.54 * s;
  group.add(beacon);

  return group;
}

/**
 * Creates a smooth curved 3D TubeGeometry conduit connecting parent -> child with optional directional cone.
 */
export function createCurvedConduit(
  start: THREE.Vector3,
  end: THREE.Vector3,
  colorHex: number,
  radius = 0.044,
  highlighted = false,
  withArrow = false
): { mesh: THREE.Mesh; arrow?: THREE.Mesh; curve: THREE.CubicBezierCurve3 } {
  const midY = (start.y + end.y) * 0.5;
  const c1 = new THREE.Vector3(start.x, midY, start.z);
  const c2 = new THREE.Vector3(end.x, midY, end.z);
  const curve = new THREE.CubicBezierCurve3(start, c1, c2, end);
  const geo = new THREE.TubeGeometry(curve, 24, highlighted ? radius * 1.45 : radius, 10, false);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.32,
    metalness: 0.32,
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: highlighted ? 0.42 : 0.08,
    transparent: true,
    opacity: highlighted ? 1.0 : 0.86,
  });
  const mesh = new THREE.Mesh(geo, mat);

  let arrow: THREE.Mesh | undefined;
  if (withArrow) {
    const pos = curve.getPoint(0.86);
    const tangent = curve.getTangent(0.86).normalize();
    arrow = new THREE.Mesh(
      new THREE.ConeGeometry(highlighted ? 0.14 : 0.11, highlighted ? 0.34 : 0.26, 10),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.28,
        metalness: 0.35,
        emissive: new THREE.Color(colorHex),
        emissiveIntensity: highlighted ? 0.4 : 0.1,
      })
    );
    arrow.position.copy(pos);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  }

  return { mesh, arrow, curve };
}

/**
 * Software-WebGL-safe coalesced on-demand renderer scheduler (with GL fenceSync pacing).
 */
export function createOnDemandScheduler(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  renderCallback: () => boolean
) {
  let frameId = 0;
  let busy = false;
  let dirty = false;
  let disposed = false;

  function afterDraw(cb: () => void) {
    if (disposed) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 6);
    } else {
      frameId = window.setTimeout(cb, 80);
    }
  }

  function requestRender() {
    if (disposed) return;
    if (busy) {
      dirty = true;
      return;
    }
    busy = true;
    frameId = requestAnimationFrame(() => {
      if (disposed) return;
      dirty = false;
      const keepGoing = renderCallback();
      const done = () => {
        busy = false;
        if (!disposed && (dirty || keepGoing)) {
          requestRender();
        }
      };
      if (isSoftwareGl) afterDraw(done);
      else done();
    });
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frameId);
    clearTimeout(frameId);
  }

  return { requestRender, dispose };
}

/**
 * Recursively disposes geometries, materials, and textures attached to a Three.js Object3D subtree.
 */
export function disposeObjectTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial & { map?: THREE.Texture };
        if (std.map) std.map.dispose();
        m.dispose();
      }
    }
  });
}
