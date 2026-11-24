import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
  ArrowRight,
  Compass,
  Box,
  GitFork,
} from 'lucide-react';
import { PageId } from '../../engine/types';
import {
  createArchitecturalGridFloor,
  createCompositeNodeAssembly,
  createContactShadowTexture,
  createCurvedConduit,
  createLabelTexture,
  createOnDemandScheduler,
  createRendererAndStudio,
  disposeObjectTree,
} from './threeUtils';

export interface HierarchyNodeSpec {
  id: string;
  label: string;
  shortTag: string;
  parentId: string | null;
  style: 'root' | 'top-down' | 'bottom-up' | 'lr-sub';
  accentHex: number;
  accentCss: string;
  position: [number, number, number];
  description: string;
  strategy: string;
  targetPage: PageId;
}

export const HIERARCHY_NODES: HierarchyNodeSpec[] = [
  {
    id: 'parser',
    label: 'Parser',
    shortTag: 'Syntax Analyzer',
    parentId: null,
    style: 'root',
    accentHex: 0xb82e64,
    accentCss: '#b82e64',
    position: [0.6, 3.6, 0],
    description:
      'Constructs a parse tree from the lexer token stream according to a Context-Free Grammar (CFG).',
    strategy: 'Branches into Top-Down (Root → Leaves) and Bottom-Up (Leaves → Root) paradigms.',
    targetPage: 'dashboard',
  },
  {
    id: 'top-down',
    label: 'Top-Down Parser',
    shortTag: 'Leftmost Derivation',
    parentId: 'parser',
    style: 'top-down',
    accentHex: 0xd63d76,
    accentCss: '#d63d76',
    position: [-4.9, 1.35, 0.35],
    description:
      'Builds the parse tree from the Start Symbol down to the leaves via leftmost derivations. Rejects left recursion.',
    strategy: 'Includes Recursive Descent (procedure-driven) and LL(1) (predictive table-driven).',
    targetPage: 'll1',
  },
  {
    id: 'bottom-up',
    label: 'Bottom-Up Parser',
    shortTag: 'Shift-Reduce',
    parentId: 'parser',
    style: 'bottom-up',
    accentHex: 0x8f3a68,
    accentCss: '#8f3a68',
    position: [4.6, 1.35, -0.15],
    description:
      'Reduces input tokens upward into the Start Symbol by finding handles in a reverse rightmost derivation.',
    strategy: 'Includes Operator Precedence (OPP) and the powerful LR automaton family.',
    targetPage: 'lr-overview',
  },
  {
    id: 'rd',
    label: 'Recursive Descent',
    shortTag: 'Top-Down · Functions',
    parentId: 'top-down',
    style: 'top-down',
    accentHex: 0xe05286,
    accentCss: '#e05286',
    position: [-7.1, -1.0, 0.7],
    description:
      'Implements one recursive procedure per non-terminal with optional backtracking across alternatives.',
    strategy: 'Direct grammar-to-code mapping; ideal for hand-written compiler front-ends.',
    targetPage: 'rd',
  },
  {
    id: 'll1',
    label: 'LL(1) Parser',
    shortTag: 'Top-Down · Predictive',
    parentId: 'top-down',
    style: 'top-down',
    accentHex: 0xc93b72,
    accentCss: '#c93b72',
    position: [-2.7, -1.0, 0.7],
    description:
      'Non-recursive O(n) predictive stack parser powered by algorithmic FIRST and FOLLOW tables.',
    strategy: 'Requires left-recursion elimination and left factoring for conflict-free M[A, a].',
    targetPage: 'll1',
  },
  {
    id: 'opp',
    label: 'Operator Precedence',
    shortTag: 'Bottom-Up · OPP',
    parentId: 'bottom-up',
    style: 'bottom-up',
    accentHex: 0xa24476,
    accentCss: '#a24476',
    position: [1.3, -1.0, 0.45],
    description:
      'Expression-focused shift-reduce parser comparing terminal precedence relations (<, =, >) from FIRSTVT/LASTVT.',
    strategy: 'Parses ambiguous arithmetic rules directly without ε-productions or adjacent non-terminals.',
    targetPage: 'opp',
  },
  {
    id: 'lr',
    label: 'LR Parser',
    shortTag: 'Bottom-Up · DFA',
    parentId: 'bottom-up',
    style: 'bottom-up',
    accentHex: 0x7e2f5c,
    accentCss: '#7e2f5c',
    position: [6.0, -1.0, -0.35],
    description:
      'Deterministic shift-reduce automaton driven by canonical item-set states and ACTION/GOTO tables.',
    strategy: 'Splits into four strength tiers: LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1).',
    targetPage: 'lr-overview',
  },
  {
    id: 'lr0',
    label: 'LR(0)',
    shortTag: '0 Lookahead',
    parentId: 'lr',
    style: 'lr-sub',
    accentHex: 0x994270,
    accentCss: '#994270',
    position: [2.1, -3.35, 0.45],
    description:
      'Builds Closure/GOTO DFA states without lookahead; reduces across every terminal column.',
    strategy: 'Simplest LR foundation; flags Shift/Reduce conflicts on arithmetic grammars.',
    targetPage: 'lr0',
  },
  {
    id: 'slr1',
    label: 'SLR(1)',
    shortTag: 'FOLLOW Lookahead',
    parentId: 'lr',
    style: 'lr-sub',
    accentHex: 0x8a3763,
    accentCss: '#8a3763',
    position: [4.7, -3.35, -0.3],
    description:
      'Uses the same compact LR(0) DFA states, restricting reductions of A → α strictly to FOLLOW(A).',
    strategy: 'Handles left-recursive arithmetic grammars cleanly in linear O(n) time.',
    targetPage: 'slr1',
  },
  {
    id: 'lalr1',
    label: 'LALR(1)',
    shortTag: 'Merged LR(1) Cores',
    parentId: 'lr',
    style: 'lr-sub',
    accentHex: 0x762b55,
    accentCss: '#762b55',
    position: [7.3, -3.35, 0.45],
    description:
      'Merges CLR(1) states sharing identical LR(0) cores and combines their lookahead sets.',
    strategy: 'Industry standard (Yacc/Bison): compact SLR(1) size with near-CLR(1) power.',
    targetPage: 'lalr1',
  },
  {
    id: 'clr1',
    label: 'CLR(1)',
    shortTag: 'Canonical LR(1)',
    parentId: 'lr',
    style: 'lr-sub',
    accentHex: 0x622146,
    accentCss: '#622146',
    position: [9.9, -3.35, -0.3],
    description:
      'Tracks exact per-item lookahead terminals inside every LR(1) state for maximum 1-token power.',
    strategy: 'Solves conflicts that fail SLR(1) and LALR(1), at the cost of additional DFA states.',
    targetPage: 'clr1',
  },
];

interface Hierarchy3DSceneProps {
  onOpenPage: (page: PageId) => void;
  heightClass?: string;
  defaultDockOpen?: boolean;
}

const CAMERA_PRESETS = {
  overview: { pos: new THREE.Vector3(1.05, 1.55, 23.4), target: new THREE.Vector3(1.05, -0.1, 0) },
  topDown: { pos: new THREE.Vector3(-5.0, 1.4, 11.4), target: new THREE.Vector3(-4.8, -0.1, 0.5) },
  bottomUp: { pos: new THREE.Vector3(6.2, 1.4, 13.4), target: new THREE.Vector3(5.8, -1.5, 0) },
};

export const Hierarchy3DScene: React.FC<Hierarchy3DSceneProps> = ({
  onOpenPage,
  heightClass = 'h-[640px]',
  defaultDockOpen = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'map'>('3d');
  const [selectedId, setSelectedId] = useState<string>('parser');
  const [hoveredNode, setHoveredNode] = useState<{
    spec: HierarchyNodeSpec;
    x: number;
    y: number;
  } | null>(null);
  const [dockOpen, setDockOpen] = useState(defaultDockOpen);
  const [contextLost, setContextLost] = useState(false);

  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const cameraGoalRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const rebuildHighlightRef = useRef<() => void>(() => {});

  const selectedSpec =
    HIERARCHY_NODES.find((n) => n.id === selectedId) || HIERARCHY_NODES[0];

  const focusPreset = (preset: keyof typeof CAMERA_PRESETS) => {
    cameraGoalRef.current = {
      pos: CAMERA_PRESETS[preset].pos.clone(),
      target: CAMERA_PRESETS[preset].target.clone(),
    };
    requestRenderRef.current();
  };

  const selectNodeAndFocus = (id: string) => {
    setSelectedId(id);
    const spec = HIERARCHY_NODES.find((n) => n.id === id);
    if (spec) {
      const [x, y, z] = spec.position;
      cameraGoalRef.current = {
        pos: new THREE.Vector3(x * 0.68 + 0.5, y + 1.9, z + 10.2),
        target: new THREE.Vector3(x, y, z),
      };
    }
    requestRenderRef.current();
  };

  useEffect(() => {
    rebuildHighlightRef.current();
    requestRenderRef.current();
  }, [selectedId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 620;
    const { renderer, scene, isSoftwareGl, envTexture } = createRendererAndStudio(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      scheduler.requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 140);
    camera.position.copy(CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.update();

    controls.addEventListener('start', () => {
      cameraGoalRef.current = null;
    });

    // Warm architectural beige floor & subtle zone pads
    const floorGroup = createArchitecturalGridFloor(-4.5, 42);
    scene.add(floorGroup);

    const tdPad = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 40),
      new THREE.MeshBasicMaterial({
        color: 0xf4b6ce,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    tdPad.rotation.x = -Math.PI / 2;
    tdPad.position.set(-4.9, -4.46, 0.6);
    scene.add(tdPad);

    const buPad = new THREE.Mesh(
      new THREE.CircleGeometry(6.2, 40),
      new THREE.MeshBasicMaterial({
        color: 0xd9b3c8,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    buPad.rotation.x = -Math.PI / 2;
    buPad.position.set(5.7, -4.46, 0.0);
    scene.add(buPad);

    const shadowTex = createContactShadowTexture();
    const nodeGroup = new THREE.Group();
    const edgeGroup = new THREE.Group();
    const pulseGroup = new THREE.Group();
    scene.add(edgeGroup);
    scene.add(pulseGroup);
    scene.add(nodeGroup);

    const hitTargets: THREE.Mesh[] = [];
    const nodeRecords = new Map<
      string,
      {
        root: THREE.Group;
        ring: THREE.Mesh;
        beacon: THREE.Mesh;
        selectHalo: THREE.Mesh;
        spec: HierarchyNodeSpec;
      }
    >();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Build all 11 composite porcelain & rose-gold 3D nodes
    for (const spec of HIERARCHY_NODES) {
      const containerGrp = new THREE.Group();
      containerGrp.position.set(...spec.position);

      const scale = spec.id === 'parser' ? 1.16 : spec.style === 'lr-sub' ? 0.9 : 1.02;
      const assembly = createCompositeNodeAssembly({
        style: spec.style,
        accentHex: spec.accentHex,
        selected: spec.id === selectedRef.current,
        scale,
      });
      containerGrp.add(assembly);

      // Soft contact shadow directly under node plinth
      const shadowDisc = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0 * scale, 2.0 * scale),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        })
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = -0.46 * scale;
      containerGrp.add(shadowDisc);

      // Selection ground halo ring
      const selectHalo = new THREE.Mesh(
        new THREE.RingGeometry(0.82 * scale, 1.02 * scale, 32),
        new THREE.MeshBasicMaterial({
          color: spec.accentHex,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      selectHalo.rotation.x = -Math.PI / 2;
      selectHalo.position.y = -0.43 * scale;
      selectHalo.visible = spec.id === selectedRef.current;
      containerGrp.add(selectHalo);

      // Crisp high-DPI pure white label card above node (toneMapped: false for zero washout)
      const tex = createLabelTexture(spec.label, {
        subtext: spec.shortTag,
        borderColor: spec.accentCss,
        accentBarColor: spec.accentCss,
        bgColor: '#ffffff',
        textColor: '#22131a',
        subtextColor: '#5f4350',
        maxAnisotropy: maxAniso,
      });
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(
        spec.style === 'lr-sub' ? 2.16 : 2.8,
        spec.style === 'lr-sub' ? 0.7 : 0.84,
        1
      );
      sprite.position.set(0, 1.28 * scale, 0);
      sprite.renderOrder = 10;
      containerGrp.add(sprite);

      // Invisible raycast sphere collider
      const collider = new THREE.Mesh(
        new THREE.SphereGeometry(1.05 * scale, 10, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      collider.userData.nodeId = spec.id;
      containerGrp.add(collider);
      hitTargets.push(collider);

      const ring = assembly.children[2] as THREE.Mesh;
      const beacon = assembly.children[4] as THREE.Mesh;
      nodeRecords.set(spec.id, { root: containerGrp, ring, beacon, selectHalo, spec });
      nodeGroup.add(containerGrp);
    }

    // Build parent-child curved conduits + directional arrows + pulse beads
    interface EdgePulse {
      curve: THREE.CubicBezierCurve3;
      bead: THREE.Mesh;
      phase: number;
      childId: string;
      parentId: string;
      pipe: THREE.Mesh;
    }
    const edgePulses: EdgePulse[] = [];
    const beadGeo = new THREE.SphereGeometry(0.11, 12, 10);

    for (const spec of HIERARCHY_NODES) {
      if (!spec.parentId) continue;
      const parent = HIERARCHY_NODES.find((n) => n.id === spec.parentId);
      if (!parent) continue;

      const start = new THREE.Vector3(...parent.position).add(new THREE.Vector3(0, -0.48, 0));
      const end = new THREE.Vector3(...spec.position).add(new THREE.Vector3(0, 0.56, 0));
      const { mesh: pipe, arrow, curve } = createCurvedConduit(
        start,
        end,
        spec.accentHex,
        0.048,
        false,
        true
      );
      edgeGroup.add(pipe);
      if (arrow) edgeGroup.add(arrow);

      const beadMat = new THREE.MeshStandardMaterial({
        color: 0xfff5f8,
        emissive: new THREE.Color(spec.accentHex),
        emissiveIntensity: 0.75,
        roughness: 0.15,
      });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      const phase = Math.random();
      curve.getPoint(phase, bead.position);
      pulseGroup.add(bead);

      edgePulses.push({
        curve,
        bead,
        phase,
        childId: spec.id,
        parentId: parent.id,
        pipe,
      });
    }

    const getAncestorIds = (id: string): Set<string> => {
      const set = new Set<string>([id]);
      let cur = HIERARCHY_NODES.find((n) => n.id === id);
      while (cur?.parentId) {
        set.add(cur.parentId);
        cur = HIERARCHY_NODES.find((n) => n.id === cur!.parentId);
      }
      return set;
    };

    let hoveredId: string | null = null;

    const applyVisualHighlights = () => {
      const activeId = selectedRef.current;
      const chain = getAncestorIds(activeId);

      for (const [id, rec] of nodeRecords.entries()) {
        const isSelected = id === activeId;
        const isHovered = id === hoveredId;
        const inChain = chain.has(id);

        const ringMat = rec.ring.material as THREE.MeshStandardMaterial;
        const beaconMat = rec.beacon.material as THREE.MeshStandardMaterial;

        ringMat.emissiveIntensity = isSelected ? 0.65 : isHovered ? 0.42 : inChain ? 0.25 : 0.08;
        beaconMat.emissiveIntensity = isSelected ? 0.9 : isHovered ? 0.6 : 0.26;
        rec.selectHalo.visible = isSelected || isHovered;
        const targetScale = isSelected ? 1.12 : isHovered ? 1.06 : 1.0;
        rec.root.scale.setScalar(targetScale);
      }

      for (const ep of edgePulses) {
        const activeEdge = chain.has(ep.childId) && chain.has(ep.parentId);
        const mat = ep.pipe.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = activeEdge ? 0.48 : 0.06;
        mat.opacity = activeEdge ? 0.98 : 0.72;
      }
    };

    rebuildHighlightRef.current = applyVisualHighlights;
    applyVisualHighlights();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let lastTimestamp = performance.now();
    const scheduler = createOnDemandScheduler(renderer, isSoftwareGl, () => {
      const now = performance.now();
      const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
      lastTimestamp = now;
      let needsMoreFrames = false;

      if (cameraGoalRef.current) {
        const goal = cameraGoalRef.current;
        const alpha = isSoftwareGl ? 1 : 1 - Math.exp(-6.5 * dt);
        camera.position.lerp(goal.pos, alpha);
        controls.target.lerp(goal.target, alpha);
        if (
          camera.position.distanceTo(goal.pos) < 0.05 &&
          controls.target.distanceTo(goal.target) < 0.05
        ) {
          camera.position.copy(goal.pos);
          controls.target.copy(goal.target);
          cameraGoalRef.current = null;
        } else {
          needsMoreFrames = true;
        }
      }

      if (!isSoftwareGl) {
        for (const ep of edgePulses) {
          ep.phase = (ep.phase + dt * 0.32) % 1;
          ep.curve.getPoint(ep.phase, ep.bead.position);
        }
        needsMoreFrames = true;
      }

      controls.update();
      renderer.render(scene, camera);
      return needsMoreFrames;
    });

    requestRenderRef.current = scheduler.requestRender;
    controls.addEventListener('change', scheduler.requestRender);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastMoveTime = 0;

    const getHitNode = (ev: PointerEvent): HierarchyNodeSpec | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length === 0) return null;
      const nid = hits[0].object.userData.nodeId as string;
      return HIERARCHY_NODES.find((n) => n.id === nid) || null;
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveTime < 45) return;
      lastMoveTime = now;
      const hit = getHitNode(ev);
      const nextId = hit ? hit.id : null;
      if (nextId !== hoveredId) {
        hoveredId = nextId;
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
        applyVisualHighlights();
        scheduler.requestRender();
      }
      if (hit) {
        const rect = container.getBoundingClientRect();
        setHoveredNode({
          spec: hit,
          x: Math.min(Math.max(ev.clientX - rect.left, 140), rect.width - 160),
          y: Math.max(ev.clientY - rect.top - 16, 48),
        });
      } else {
        setHoveredNode(null);
      }
    };

    const onPointerDown = (ev: PointerEvent) => {
      const hit = getHitNode(ev);
      if (hit) {
        setSelectedId(hit.id);
        const [x, y, z] = hit.position;
        cameraGoalRef.current = {
          pos: new THREE.Vector3(x * 0.68 + 0.5, y + 1.9, z + 10.2),
          target: new THREE.Vector3(x, y, z),
        };
        scheduler.requestRender();
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let lastW = width;
    let lastH = height;
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0 && (w !== lastW || h !== lastH)) {
        lastW = w;
        lastH = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        controls.update();
        renderer.render(scene, camera);
        scheduler.requestRender();
      }
    });
    resizeObserver.observe(container);

    controls.update();
    renderer.render(scene, camera);
    scheduler.requestRender();

    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      scheduler.dispose();
      shadowTex.dispose();
      disposeObjectTree(scene);
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-[#E2CFBE] bg-[#F5EDE3] shadow-xs`}
      data-testid="hierarchy-3d-viewport"
      data-selected-node={selectedId}
    >
      {/* Isolated WebGL mount container (kept mounted so toggling to Clear Map never recreates context) */}
      <div ref={mountRef} className={`w-full h-full ${viewMode === 'map' ? 'invisible' : 'visible'}`} />

      {contextLost && viewMode === '3d' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F5EDE3] text-[#4C3640] text-sm p-6 text-center">
          3D viewport context paused. Switch to Clear Map view or use the hierarchy controls below.
        </div>
      )}

      {/* Clear 2D Interactive Taxonomy Map Overlay */}
      {viewMode === 'map' && (
        <div
          className="absolute inset-0 z-10 overflow-auto bg-[#F7F1E8] px-4 pt-16 pb-20 flex flex-col items-center justify-center"
          aria-label="Clear 2D Parser Hierarchy Map"
        >
          <div className="w-full max-w-4xl space-y-4">
            {/* Tier 1: Root Parser */}
            <div className="flex justify-center">
              {(() => {
                const root = HIERARCHY_NODES[0];
                const isSel = selectedId === root.id;
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedId(root.id)}
                    className={`px-5 py-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSel
                        ? 'bg-[#C93B72] text-white border-[#9D2454] shadow-md'
                        : 'bg-[#FFFDF9] text-[#2B1B22] border-[#DFC6B4] hover:border-[#C93B72]'
                    }`}
                  >
                    <div className="font-display font-bold text-sm">{root.label}</div>
                    <div className={`text-[11px] font-mono ${isSel ? 'text-[#FDE6EF]' : 'text-[#785D68]'}`}>
                      {root.shortTag}
                    </div>
                  </button>
                );
              })()}
            </div>

            {/* Connector Split */}
            <div className="flex justify-center">
              <div className="w-[56%] h-5 border-t-2 border-l-2 border-r-2 border-[#D4B6C4] rounded-t-lg relative">
                <div className="w-0.5 h-3 bg-[#D4B6C4] absolute -top-3 left-1/2 -translate-x-1/2" />
              </div>
            </div>

            {/* Tier 2 + 3 + 4: Two Clear Columns (Top-Down vs Bottom-Up) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Top-Down Branch */}
              <div className="md:col-span-5 rounded-xl bg-[#FFFDF9] border border-[#EBC5D4] p-3.5 space-y-3 shadow-xs">
                {(() => {
                  const td = HIERARCHY_NODES.find((n) => n.id === 'top-down')!;
                  const isSel = selectedId === td.id;
                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedId(td.id)}
                      className={`w-full text-left px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#FCEAF1] border-[#C93B72]'
                          : 'bg-[#FDF6F9] border-[#F0D3DF] hover:border-[#C93B72]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#9D2454]">{td.label}</span>
                        <span className="text-[10px] font-mono text-[#B42A60]">Root → Leaves</span>
                      </div>
                      <p className="text-[11px] text-[#5A404B] mt-0.5">
                        Expands from start symbol down to tokens.
                      </p>
                    </button>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2.5 pl-2 border-l-2 border-[#E6B2C7]">
                  {['rd', 'll1'].map((id) => {
                    const node = HIERARCHY_NODES.find((n) => n.id === id)!;
                    const isSel = selectedId === node.id;
                    return (
                      <div
                        key={id}
                        className={`rounded-lg border p-2.5 space-y-1.5 transition-all ${
                          isSel
                            ? 'bg-[#FCEAF1] border-[#C93B72] shadow-xs'
                            : 'bg-[#FAF4EC] border-[#E4D4C3] hover:border-[#D99BB3]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(node.id)}
                          className="w-full text-left cursor-pointer"
                        >
                          <div className="font-display font-bold text-xs text-[#2B1B22]">
                            {node.label}
                          </div>
                          <div className="text-[10px] font-mono text-[#B42A60]">{node.shortTag}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPage(node.targetPage)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B42A60] hover:underline cursor-pointer"
                        >
                          Open <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom-Up Branch */}
              <div className="md:col-span-7 rounded-xl bg-[#FFFDF9] border border-[#DCC0D2] p-3.5 space-y-3 shadow-xs">
                {(() => {
                  const bu = HIERARCHY_NODES.find((n) => n.id === 'bottom-up')!;
                  const isSel = selectedId === bu.id;
                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedId(bu.id)}
                      className={`w-full text-left px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#F3E5EE] border-[#7E2F5C]'
                          : 'bg-[#FAF3F7] border-[#E5CFE0] hover:border-[#7E2F5C]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-[#732A53]">{bu.label}</span>
                        <span className="text-[10px] font-mono text-[#7E2F5C]">Leaves → Root</span>
                      </div>
                      <p className="text-[11px] text-[#5A404B] mt-0.5">
                        Shifts tokens and reduces handles back to the start symbol.
                      </p>
                    </button>
                  );
                })()}

                <div className="space-y-2.5 pl-2 border-l-2 border-[#CFAAC0]">
                  {/* OPP */}
                  {(() => {
                    const opp = HIERARCHY_NODES.find((n) => n.id === 'opp')!;
                    const isSel = selectedId === opp.id;
                    return (
                      <div
                        className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 transition-all ${
                          isSel
                            ? 'bg-[#F3E5EE] border-[#7E2F5C] shadow-xs'
                            : 'bg-[#FAF4EC] border-[#E4D4C3] hover:border-[#B987A4]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(opp.id)}
                          className="text-left cursor-pointer"
                        >
                          <div className="font-display font-bold text-xs text-[#2B1B22]">{opp.label}</div>
                          <div className="text-[10px] font-mono text-[#7E2F5C]">{opp.shortTag}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPage(opp.targetPage)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7E2F5C] hover:underline cursor-pointer shrink-0"
                        >
                          Open <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* LR Family + 4 Sub-tiers in clean 2x2 grid */}
                  <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-2.5 space-y-2">
                    {(() => {
                      const lr = HIERARCHY_NODES.find((n) => n.id === 'lr')!;
                      return (
                        <button
                          type="button"
                          onClick={() => setSelectedId(lr.id)}
                          className="font-display font-bold text-xs text-[#732A53] hover:underline cursor-pointer text-left"
                        >
                          LR Parser Family (LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1))
                        </button>
                      );
                    })()}
                    <div className="grid grid-cols-2 gap-1.5">
                      {['lr0', 'slr1', 'lalr1', 'clr1'].map((id) => {
                        const node = HIERARCHY_NODES.find((n) => n.id === id)!;
                        const isSel = selectedId === node.id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setSelectedId(node.id);
                              onOpenPage(node.targetPage);
                            }}
                            className={`rounded-md border px-2.5 py-1.5 text-left transition-all cursor-pointer min-w-0 ${
                              isSel
                                ? 'bg-[#7E2F5C] text-white border-[#622146]'
                                : 'bg-[#FFFDF9] text-[#2B1B22] border-[#E0CFC0] hover:border-[#7E2F5C] hover:bg-[#F3E5EE]'
                            }`}
                          >
                            <div className="font-mono font-bold text-xs truncate">{node.label}</div>
                            <div
                              className={`text-[10px] leading-tight mt-0.5 truncate ${
                                isSel ? 'text-[#F6DCEB]' : 'text-[#785D68]'
                              }`}
                            >
                              {node.shortTag}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Overlay Bar: Legend + 3D / Clear Map Switcher */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-3 text-xs text-[#4C3640] bg-[#FFFDF9]/95 border border-[#E4D3C3] rounded-lg px-3.5 py-2 shadow-xs">
          <span className="flex items-center gap-1.5 font-semibold text-[#B42A60]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#D63D76] inline-block" />
            Top-Down
          </span>
          <span className="text-[#C7B3A4]" aria-hidden="true">/</span>
          <span className="flex items-center gap-1.5 font-semibold text-[#7E2F5C]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#8F3A68] inline-block" />
            Bottom-Up
          </span>
          {viewMode === '3d' && (
            <span className="hidden md:inline text-[#7D616C]">· Drag to rotate · Click any node</span>
          )}
        </div>

        <div
          className="pointer-events-auto inline-flex items-center gap-1 p-1 rounded-lg bg-[#FFFDF9]/95 border border-[#E4D3C3] shadow-xs"
          role="tablist"
          aria-label="Hierarchy view mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === '3d'}
            onClick={() => setViewMode('3d')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === '3d'
                ? 'bg-[#C93B72] text-white font-semibold'
                : 'text-[#5A404B] hover:text-[#2B1B22]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'map'}
            onClick={() => setViewMode('map')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'map'
                ? 'bg-[#C93B72] text-white font-semibold'
                : 'text-[#5A404B] hover:text-[#2B1B22]'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            Clear Map
          </button>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-20 w-72 -translate-x-1/2 -translate-y-full rounded-lg bg-[#FFFDF9] border border-[#E4C2D0] p-3 shadow-lg"
          style={{ left: hoveredNode.x, top: hoveredNode.y }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-display font-semibold text-sm text-[#2B1B22]">
              {hoveredNode.spec.label}
            </span>
            <span className="text-[11px] font-mono text-[#8F1F4C]">
              {hoveredNode.spec.shortTag}
            </span>
          </div>
          <p className="text-xs text-[#4C3640] leading-relaxed">
            {hoveredNode.spec.description}
          </p>
        </div>
      )}

      {/* Unified Collapsible Bottom Control & Inspector Dock */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 w-[min(940px,95%)] z-20 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockOpen((v) => !v)}
          className="mb-1.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#FFFDF9]/95 border border-[#DFC9B7] text-xs font-medium text-[#4C3640] hover:text-[#B42A60] hover:border-[#D99BB3] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          aria-expanded={dockOpen}
        >
          {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          {dockOpen ? 'Hide Inspector & Controls' : 'Show Inspector & Controls'}
        </button>

        {dockOpen && (
          <div className="w-full rounded-xl bg-[#FFFDF9]/98 border border-[#E4D3C3] p-4 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#EFE3D7]">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 text-xs text-[#785D68] mb-0.5">
                  <span className="font-mono font-semibold text-[#B42A60]">
                    {selectedSpec.shortTag}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Selected 3D Node</span>
                </div>
                <h3 className="font-display font-semibold text-base text-[#2B1B22]">
                  {selectedSpec.label}
                </h3>
                <p className="text-xs text-[#4C3640] mt-0.5 leading-relaxed">
                  {selectedSpec.description} {selectedSpec.strategy}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => focusPreset('overview')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F4E9DD] text-[#4C3640] hover:bg-[#EBDAC9] transition-colors cursor-pointer whitespace-nowrap"
                  aria-label="Reset 3D camera overview"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset View
                </button>
                <button
                  type="button"
                  onClick={() => focusPreset('topDown')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#FCEAF1] text-[#9D2454] hover:bg-[#F8D9E6] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Top-Down
                </button>
                <button
                  type="button"
                  onClick={() => focusPreset('bottomUp')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F3E5EE] text-[#732A53] hover:bg-[#E9D4E2] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Bottom-Up
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPage(selectedSpec.targetPage)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {selectedSpec.id === 'slr1' ||
                  selectedSpec.id === 'lalr1' ||
                  selectedSpec.id === 'clr1'
                    ? `View ${selectedSpec.label} Theory`
                    : `Open ${selectedSpec.label}`}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-3" role="group" aria-label="Select 3D parser hierarchy node">
              {HIERARCHY_NODES.map((node) => {
                const active = node.id === selectedId;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => selectNodeAndFocus(node.id)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#FCEAF1] text-[#8F1F4C] border border-[#E0A4BE] font-semibold'
                        : 'bg-[#F8F0E6] text-[#4C3640] border border-[#E4D4C3] hover:border-[#D9A7BC] hover:text-[#2B1B22]'
                    }`}
                  >
                    {node.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
