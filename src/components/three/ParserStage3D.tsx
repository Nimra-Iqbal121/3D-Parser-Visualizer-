import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw, Layers, GitBranch, Network } from 'lucide-react';
import { LRState, ParseStep, ParseTreeNode } from '../../engine/types';
import {
  createArchitecturalGridFloor,
  createContactShadowTexture,
  createCurvedConduit,
  createLabelTexture,
  createOnDemandScheduler,
  createRendererAndStudio,
  disposeObjectTree,
} from './threeUtils';

export type Stage3DMode = 'stack' | 'tree' | 'dfa';

interface ParserStage3DProps {
  step: ParseStep | null;
  family: 'Top-Down' | 'Bottom-Up';
  lrStates?: LRState[];
  defaultMode?: Stage3DMode;
  heightClass?: string;
}

interface TreeLayoutItem {
  node: ParseTreeNode;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
}

interface TreeLayoutResult {
  items: TreeLayoutItem[];
  spanX: number;
  spanY: number;
}

/**
 * Computes clean non-overlapping 3D coordinates and bounding dimensions for any live parse tree snapshot.
 */
function layoutParseTree(root: ParseTreeNode): TreeLayoutResult {
  const items: TreeLayoutItem[] = [];
  let leafIndex = 0;

  function traverse(node: ParseTreeNode, depth: number): { x: number; y: number } {
    const y = 3.2 - depth * 1.55;
    if (!node.children || node.children.length === 0) {
      const x = leafIndex * 1.95;
      leafIndex++;
      items.push({ node, x, y });
      return { x, y };
    }
    const childPositions = node.children.map((c) => traverse(c, depth + 1));
    const minX = childPositions[0].x;
    const maxX = childPositions[childPositions.length - 1].x;
    const x = (minX + maxX) / 2;

    for (let i = 0; i < node.children.length; i++) {
      const childId = node.children[i].id;
      const found = items.find((it) => it.node.id === childId);
      if (found) {
        found.parentX = x;
        found.parentY = y;
      }
    }

    items.push({ node, x, y });
    return { x, y };
  }

  traverse(root, 0);

  let spanX = 4;
  let spanY = 3;
  if (items.length > 0) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const it of items) {
      if (it.x < minX) minX = it.x;
      if (it.x > maxX) maxX = it.x;
      if (it.y < minY) minY = it.y;
      if (it.y > maxY) maxY = it.y;
    }
    spanX = Math.max(maxX - minX + 2.4, 4);
    spanY = Math.max(maxY - minY + 2.2, 3);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2 - 0.1;
    for (const it of items) {
      it.x -= cx;
      it.y -= cy;
      if (it.parentX !== undefined) it.parentX -= cx;
      if (it.parentY !== undefined) it.parentY -= cy;
    }
  }

  return { items, spanX, spanY };
}

export const ParserStage3D: React.FC<ParserStage3DProps> = ({
  step,
  family,
  lrStates,
  defaultMode = 'stack',
  heightClass = 'h-[430px]',
}) => {
  const hasDFA = Boolean(lrStates && lrStates.length > 0);
  const [mode, setMode] = useState<Stage3DMode>(defaultMode);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const autoCameraRef = useRef<boolean>(true);

  const resetCameraForMode = (targetMode: Stage3DMode) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    autoCameraRef.current = true;
    if (targetMode === 'stack') {
      cam.position.set(0.35, 1.9, 13.4);
      ctrl.target.set(0.35, 0.05, 0);
    } else if (targetMode === 'tree') {
      cam.position.set(0, 1.4, 13.2);
      ctrl.target.set(0, 0.05, 0);
    } else {
      const count = lrStates?.length ?? 8;
      const dist = Math.max(15.2, Math.min(24.0, 11.5 + count * 0.72));
      cam.position.set(0, dist * 0.56, dist);
      ctrl.target.set(0, -0.1, 0);
    }
    ctrl.update();
    requestRenderRef.current();
  };

  // Mount Three.js renderer once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 430;
    const { renderer, scene, isSoftwareGl, envTexture } = createRendererAndStudio(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 150);
    const controls = new OrbitControls(camera, renderer.domElement);
    if (defaultMode === 'dfa') {
      const count = lrStates?.length ?? 8;
      const dist = Math.max(15.2, Math.min(24.0, 11.5 + count * 0.72));
      camera.position.set(0, dist * 0.56, dist);
      controls.target.set(0, -0.1, 0);
    } else if (defaultMode === 'tree') {
      camera.position.set(0, 1.4, 13.2);
      controls.target.set(0, 0.05, 0);
    } else {
      camera.position.set(0.35, 1.9, 13.4);
      controls.target.set(0.35, 0.05, 0);
    }
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 4;
    controls.maxDistance = 42;
    controls.update();

    controls.addEventListener('start', () => {
      autoCameraRef.current = false;
    });

    const floor = createArchitecturalGridFloor(-3.4, 34);
    scene.add(floor);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    sceneRef.current = scene;
    dynamicGroupRef.current = dynamicGroup;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    controlsRef.current = controls;

    const scheduler = createOnDemandScheduler(renderer, isSoftwareGl, () => {
      controls.update();
      renderer.render(scene, camera);
      return false;
    });
    requestRenderRef.current = scheduler.requestRender;
    controls.addEventListener('change', scheduler.requestRender);

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
      controls.dispose();
      scheduler.dispose();
      disposeObjectTree(scene);
      envTexture.dispose();
      renderer.dispose();
      sceneRef.current = null;
      dynamicGroupRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // Rebuild 3D content whenever mode, step, or lrStates change
  useEffect(() => {
    const group = dynamicGroupRef.current;
    const renderer = rendererRef.current;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!group || !renderer) return;

    disposeObjectTree(group);
    group.clear();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const shadowTex = createContactShadowTexture();
    const primaryHex = family === 'Top-Down' ? 0xd63d76 : 0x8f3a68;
    const primaryCss = family === 'Top-Down' ? '#c93b72' : '#7e2f5c';

    // ==================== MODE 1: 3D PARSING STACK & INPUT CONVEYOR ====================
    if (mode === 'stack') {
      const stackSymbols = step?.stack ?? ['$'];
      const remaining = step?.remainingInput ?? ['$'];
      const op = step?.operation ?? 'init';

      // Stack pedestal base on the left
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.88, 2.15, 0.28, 16),
        new THREE.MeshStandardMaterial({
          color: 0xfffaf3,
          roughness: 0.5,
          metalness: 0.08,
        })
      );
      pedestal.position.set(-3.1, -3.12, 0);
      group.add(pedestal);

      const baseRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.9, 0.055, 10, 32),
        new THREE.MeshStandardMaterial({
          color: primaryHex,
          roughness: 0.26,
          metalness: 0.4,
        })
      );
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.set(-3.1, -2.96, 0);
      group.add(baseRing);

      const stackShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 5.2),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
      );
      stackShadow.rotation.x = -Math.PI / 2;
      stackShadow.position.set(-3.1, -3.35, 0);
      group.add(stackShadow);

      // Show up to 9 top stack blocks cleanly scaled
      const visibleStack = stackSymbols.slice(-9);
      const blockH = visibleStack.length > 6 ? 0.54 : 0.68;
      const gap = 0.09;

      visibleStack.forEach((sym, idx) => {
        const isTop = idx === visibleStack.length - 1;
        const isHighlighted = idx >= visibleStack.length - (step?.highlightCount ?? 1);
        const y = -2.56 + idx * (blockH + gap);

        const blockColor =
          op === 'accept' && isTop
            ? 0x1e8a62
            : op === 'error' && isTop
            ? 0xc42042
            : op === 'reduce' && isHighlighted
            ? 0x8f3a68
            : op === 'shift' && isHighlighted
            ? 0xd63d76
            : isTop
            ? primaryHex
            : 0xd9c2b2;

        const blockFill = isTop
          ? op === 'accept'
            ? 0xe8f6ef
            : op === 'error'
            ? 0xfdecef
            : 0xfce6ef
          : isHighlighted
          ? 0xf6e6ee
          : 0xfffaf3;

        const blockGroup = new THREE.Group();
        blockGroup.position.set(-3.1, y, 0);

        const core = new THREE.Mesh(
          new THREE.BoxGeometry(2.48, blockH, 1.38),
          new THREE.MeshStandardMaterial({
            color: blockFill,
            roughness: 0.35,
            metalness: 0.08,
          })
        );
        blockGroup.add(core);

        const sideMat = new THREE.MeshStandardMaterial({
          color: blockColor,
          roughness: 0.28,
          metalness: 0.36,
        });
        const leftCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, blockH * 0.92, 1.44), sideMat);
        leftCap.position.x = -1.26;
        blockGroup.add(leftCap);
        const rightCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, blockH * 0.92, 1.44), sideMat);
        rightCap.position.x = 1.26;
        blockGroup.add(rightCap);

        const borderCss =
          op === 'accept' && isTop
            ? '#166a4a'
            : op === 'error' && isTop
            ? '#b51d3d'
            : isTop
            ? primaryCss
            : '#d6bfb0';

        const tex = createLabelTexture(sym, {
          width: 300,
          height: 92,
          fontSize: sym.length > 5 ? 32 : 42,
          bgColor: isTop ? '#ffffff' : '#fdf8f1',
          borderColor: borderCss,
          accentBarColor: borderCss,
          textColor: '#22131a',
          maxAnisotropy: maxAniso,
        });
        const labelPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(2.12, blockH * 0.84),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
        );
        labelPlane.position.z = 0.71;
        blockGroup.add(labelPlane);

        // Active top-of-stack indicator collar + "TOP" pointer badge
        if (isTop) {
          const halo = new THREE.Mesh(
            new THREE.TorusGeometry(1.66, 0.045, 8, 30),
            new THREE.MeshStandardMaterial({
              color: blockColor,
              emissive: new THREE.Color(blockColor),
              emissiveIntensity: 0.32,
              roughness: 0.22,
            })
          );
          halo.rotation.x = Math.PI / 2;
          halo.position.y = blockH * 0.54;
          blockGroup.add(halo);

          const topBadgeTex = createLabelTexture('TOP', {
            width: 150,
            height: 64,
            fontSize: 28,
            bgColor: '#c93b72',
            borderColor: '#9d2454',
            accentBarColor: '#9d2454',
            textColor: '#ffffff',
            maxAnisotropy: maxAniso,
          });
          const topBadge = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: topBadgeTex,
              transparent: true,
              depthTest: false,
              toneMapped: false,
            })
          );
          topBadge.scale.set(1.02, 0.44, 1);
          topBadge.position.set(-2.05, 0, 0.2);
          topBadge.renderOrder = 15;
          blockGroup.add(topBadge);
        }

        group.add(blockGroup);
      });

      const topStackY = -2.56 + Math.max(visibleStack.length - 1, 0) * (blockH + gap);

      // Section label above Stack (cleanly positioned below top-left tabs)
      const stackTitleTex = createLabelTexture('PARSING STACK', {
        subtext: `${stackSymbols.length} symbol${stackSymbols.length === 1 ? '' : 's'}`,
        borderColor: primaryCss,
        accentBarColor: primaryCss,
        bgColor: '#ffffff',
        width: 360,
        height: 112,
        fontSize: 28,
        maxAnisotropy: maxAniso,
      });
      const stackTitle = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: stackTitleTex,
          transparent: true,
          depthTest: false,
          toneMapped: false,
        })
      );
      stackTitle.scale.set(2.55, 0.8, 1);
      stackTitle.position.set(-3.1, Math.min(2.75, Math.max(1.95, topStackY + 1.25)), 0);
      group.add(stackTitle);

      // Right side: Remaining Input Token Conveyor (balanced margin for up to 6 tokens)
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(7.45, 0.22, 1.65),
        new THREE.MeshStandardMaterial({ color: 0xe6d4c2, roughness: 0.72, metalness: 0.08 })
      );
      rail.position.set(3.0, -1.72, 0);
      group.add(rail);

      const railTrim = new THREE.Mesh(
        new THREE.BoxGeometry(7.48, 0.05, 1.68),
        new THREE.MeshStandardMaterial({ color: 0xc93b72, roughness: 0.35, metalness: 0.3 })
      );
      railTrim.position.set(3.0, -1.59, 0);
      group.add(railTrim);

      const visibleInput = remaining.slice(0, 6);
      visibleInput.forEach((tok, idx) => {
        const isCurrent = idx === 0;
        const x = 0.02 + idx * 1.18;

        const tokGroup = new THREE.Group();
        tokGroup.position.set(x, -0.96 + (isCurrent ? 0.2 : 0), 0);

        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1.04, 1.0, 1.04),
          new THREE.MeshStandardMaterial({
            color: isCurrent ? 0xf8d7e6 : 0xfffaf3,
            roughness: 0.32,
            metalness: 0.08,
          })
        );
        tokGroup.add(cube);

        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.14, 1.1),
          new THREE.MeshStandardMaterial({
            color: isCurrent ? 0xc93b72 : 0xcfb8a8,
            roughness: 0.28,
            metalness: 0.35,
          })
        );
        cap.position.y = 0.55;
        tokGroup.add(cap);

        const tex = createLabelTexture(tok, {
          width: 210,
          height: 98,
          fontSize: tok.length > 4 ? 32 : 44,
          bgColor: '#ffffff',
          borderColor: isCurrent ? '#c93b72' : '#cfb6a6',
          accentBarColor: isCurrent ? '#c93b72' : '#cfb6a6',
          textColor: '#22131a',
          maxAnisotropy: maxAniso,
        });
        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(0.92, 0.66),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
        );
        plate.position.z = 0.54;
        tokGroup.add(plate);

        if (isCurrent) {
          // Downward pointer cone directly above active lookahead token
          const pointerCone = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.42, 12),
            new THREE.MeshStandardMaterial({
              color: 0xc93b72,
              roughness: 0.24,
              metalness: 0.3,
            })
          );
          pointerCone.rotation.x = Math.PI;
          pointerCone.position.set(0, 1.08, 0);
          tokGroup.add(pointerCone);
        }

        group.add(tokGroup);
      });

      const inputTitleTex = createLabelTexture('REMAINING INPUT', {
        subtext: `Lookahead: "${remaining[0] ?? '$'}"`,
        borderColor: '#c93b72',
        accentBarColor: '#c93b72',
        bgColor: '#ffffff',
        width: 370,
        height: 112,
        fontSize: 27,
        maxAnisotropy: maxAniso,
      });
      const inputTitle = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: inputTitleTex,
          transparent: true,
          depthTest: false,
          toneMapped: false,
        })
      );
      inputTitle.scale.set(2.8, 0.85, 1);
      inputTitle.position.set(3.0, 0.85, 0);
      group.add(inputTitle);

      // Action bridge conduit with directional arrowhead between Stack and Lookahead
      const actionHex =
        op === 'accept'
          ? 0x1e8a62
          : op === 'error'
          ? 0xc42042
          : op === 'reduce'
          ? 0x8f3a68
          : 0xc93b72;
      const { mesh: bridge, arrow } = createCurvedConduit(
        new THREE.Vector3(-1.72, topStackY, 0),
        new THREE.Vector3(-0.56, -0.76, 0),
        actionHex,
        0.055,
        true,
        true
      );
      group.add(bridge);
      if (arrow) group.add(arrow);

      // Action floating banner in upper right
      const actionBorder =
        op === 'accept'
          ? '#166a4a'
          : op === 'error'
          ? '#b51d3d'
          : op === 'reduce'
          ? '#7e2f5c'
          : '#c93b72';
      const actionTex = createLabelTexture((step?.operation ?? 'READY').toUpperCase(), {
        subtext: step?.actionLabel?.slice(0, 34) ?? 'Step through parsing',
        borderColor: actionBorder,
        accentBarColor: actionBorder,
        bgColor: '#ffffff',
        textColor: actionBorder,
        subtextColor: '#4c3640',
        width: 500,
        height: 122,
        fontSize: 29,
        maxAnisotropy: maxAniso,
      });
      const actionSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: actionTex,
          transparent: true,
          depthTest: false,
          toneMapped: false,
        })
      );
      actionSprite.scale.set(3.85, 0.94, 1);
      actionSprite.position.set(2.95, 2.38, 0);
      group.add(actionSprite);
    }

    // ==================== MODE 2: 3D PARSE TREE (AUTO-FITTED) ====================
    if (mode === 'tree') {
      const root = step?.treeSnapshot;
      if (!root) {
        const emptyTex = createLabelTexture('Parse Tree Pending', {
          subtext: 'Step forward to watch nodes grow in 3D',
          borderColor: primaryCss,
          accentBarColor: primaryCss,
          bgColor: '#ffffff',
          width: 480,
          height: 122,
          fontSize: 30,
          maxAnisotropy: maxAniso,
        });
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: emptyTex,
            transparent: true,
            depthTest: false,
            toneMapped: false,
          })
        );
        sp.scale.set(4.8, 1.2, 1);
        sp.position.set(0, 0.3, 0);
        group.add(sp);
      } else {
        const { items: laidOut, spanX, spanY } = layoutParseTree(root);

        // Auto-fit camera distance so wide or tall trees never clip off-screen
        if (autoCameraRef.current && cam && ctrl) {
          const fovRad = (cam.fov * Math.PI) / 180;
          const aspect = cam.aspect || 1.65;
          const distY = (spanY * 0.68) / Math.tan(fovRad / 2);
          const distX = (spanX * 0.62) / (Math.tan(fovRad / 2) * aspect);
          const fitZ = Math.max(9.8, Math.min(26, Math.max(distX, distY) + 1.8));
          cam.position.set(0, 0.85, fitZ);
          ctrl.target.set(0, 0.05, 0);
          ctrl.update();
        }

        for (const item of laidOut) {
          const { node, x, y, parentX, parentY } = item;
          const isTerm = node.isTerminal;
          const nodeHex =
            node.status === 'error'
              ? 0xc42042
              : node.status === 'reduced'
              ? 0x8f3a68
              : node.status === 'active'
              ? 0xd63d76
              : isTerm
              ? 0x26825d
              : primaryHex;
          const borderCss =
            node.status === 'error'
              ? '#b51d3d'
              : node.status === 'reduced'
              ? '#7e2f5c'
              : isTerm
              ? '#1e7452'
              : primaryCss;

          const nGroup = new THREE.Group();
          nGroup.position.set(x, y, 0);

          const geo = isTerm
            ? new THREE.CylinderGeometry(0.48, 0.48, 0.34, 20)
            : new THREE.CylinderGeometry(0.56, 0.5, 0.4, 6);
          const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({
              color: isTerm ? 0xeaf6f0 : 0xfce7f0,
              roughness: 0.36,
              metalness: 0.08,
            })
          );
          mesh.rotation.x = Math.PI / 2;
          nGroup.add(mesh);

          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(isTerm ? 0.5 : 0.58, 0.055, 10, 24),
            new THREE.MeshStandardMaterial({
              color: nodeHex,
              roughness: 0.25,
              metalness: 0.38,
              emissive: new THREE.Color(nodeHex),
              emissiveIntensity: node.status === 'active' || node.status === 'reduced' ? 0.35 : 0.08,
            })
          );
          nGroup.add(rim);

          const tex = createLabelTexture(node.symbol, {
            width: 220,
            height: 92,
            fontSize: node.symbol.length > 5 ? 30 : 42,
            bgColor: isTerm ? '#f0fbf5' : '#ffffff',
            borderColor: borderCss,
            accentBarColor: borderCss,
            textColor: '#22131a',
            maxAnisotropy: maxAniso,
          });
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: tex,
              transparent: true,
              depthTest: false,
              toneMapped: false,
            })
          );
          sprite.scale.set(1.42, 0.6, 1);
          sprite.position.set(0, 0, 0.46);
          sprite.renderOrder = 10;
          nGroup.add(sprite);

          group.add(nGroup);

          if (parentX !== undefined && parentY !== undefined) {
            const { mesh: tube } = createCurvedConduit(
              new THREE.Vector3(parentX, parentY - 0.46, 0),
              new THREE.Vector3(x, y + 0.46, 0),
              nodeHex,
              0.042,
              node.status === 'active' || node.status === 'reduced'
            );
            group.add(tube);
          }
        }
      }
    }

    // ==================== MODE 3: 3D LR STATE MACHINE (DFA) ====================
    if (mode === 'dfa' && lrStates && lrStates.length > 0) {
      const count = lrStates.length;
      const radius = Math.max(5.0, Math.min(9.6, count * 0.72));
      const positions = new Map<number, THREE.Vector3>();

      if (autoCameraRef.current && cam && ctrl) {
        const dist = Math.max(15.2, Math.min(24.5, 11.2 + count * 0.74));
        cam.position.set(0, dist * 0.56, dist);
        ctrl.target.set(0, -0.1, 0);
        ctrl.update();
      }

      lrStates.forEach((st, idx) => {
        if (count <= 14) {
          const angle = (idx / count) * Math.PI * 2 - Math.PI * 0.75;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius * 0.76;
          const y = idx === 0 ? 0.35 : Math.sin(angle * 2) * 0.45;
          positions.set(st.id, new THREE.Vector3(x, y, z));
        } else {
          const cols = Math.ceil(Math.sqrt(count));
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const x = (col - (cols - 1) / 2) * 3.1;
          const z = (row - Math.floor(count / cols) / 2) * 3.1;
          positions.set(st.id, new THREE.Vector3(x, 0, z));
        }
      });

      const activeStateId = step?.activeState ?? 0;
      const fromStateId = step?.fromState;
      const activeSym = step?.transitionSymbol;

      for (const st of lrStates) {
        const pos = positions.get(st.id)!;
        const isActive = st.id === activeStateId;
        const isMerged = Boolean(st.mergedFrom && st.mergedFrom.length > 1);
        const towerHex = isActive ? 0xd63d76 : isMerged ? 0x9b3b72 : 0x8d5f72;

        const tower = new THREE.Group();
        tower.position.copy(pos);

        // Ground shadow disc
        const sh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.3, 2.3),
          new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
        );
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = -0.62;
        tower.add(sh);

        // Active glowing floor ring
        if (isActive) {
          const activeRing = new THREE.Mesh(
            new THREE.RingGeometry(0.9, 1.18, 32),
            new THREE.MeshBasicMaterial({
              color: 0xd63d76,
              transparent: true,
              opacity: 0.75,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          activeRing.rotation.x = -Math.PI / 2;
          activeRing.position.y = -0.58;
          tower.add(activeRing);
        }

        // Porcelain plinth with stronger contrast against warm beige floor
        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(0.74, 0.86, 0.24, 16),
          new THREE.MeshStandardMaterial({
            color: isActive ? 0xfff5f9 : 0xf2e3d5,
            roughness: 0.42,
            metalness: 0.1,
          })
        );
        plinth.position.y = -0.48;
        tower.add(plinth);

        // Sculpted column with rich dusty-rose / berry / rose-pink differentiation
        const h = Math.min(1.75, 0.78 + st.items.length * 0.08);
        const colMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.49, 0.57, h, 8),
          new THREE.MeshStandardMaterial({
            color: isActive ? 0xd63d76 : isMerged ? 0xc780a8 : 0xdfaec3,
            roughness: 0.34,
            metalness: 0.14,
          })
        );
        colMesh.position.y = -0.36 + h / 2;
        tower.add(colMesh);

        // Crown collar
        const collar = new THREE.Mesh(
          new THREE.TorusGeometry(0.58, 0.064, 10, 28),
          new THREE.MeshStandardMaterial({
            color: isActive ? 0xfff3f8 : towerHex,
            emissive: new THREE.Color(towerHex),
            emissiveIntensity: isActive ? 0.6 : 0.18,
            roughness: 0.22,
            metalness: 0.4,
          })
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.y = -0.36 + h;
        tower.add(collar);

        // Crisp high-DPI state label (toneMapped: false)
        const tex = createLabelTexture(st.label, {
          subtext: `${st.items.length} item${st.items.length === 1 ? '' : 's'}`,
          width: 260,
          height: 102,
          fontSize: 34,
          bgColor: isActive ? '#fff2f7' : '#ffffff',
          borderColor: isActive ? '#c93b72' : isMerged ? '#7e2f5c' : '#9c6e80',
          accentBarColor: isActive ? '#c93b72' : isMerged ? '#7e2f5c' : '#9c6e80',
          textColor: isActive ? '#9d2454' : '#22131a',
          subtextColor: '#5f4350',
          maxAnisotropy: maxAniso,
        });
        const label = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false,
            toneMapped: false,
          })
        );
        label.scale.set(1.78, 0.72, 1);
        label.position.set(0, h + 0.44, 0);
        label.renderOrder = 12;
        tower.add(label);

        group.add(tower);
      }

      // Transitions between states
      for (const st of lrStates) {
        const fromPos = positions.get(st.id)!;
        for (const [sym, targetId] of Object.entries(st.transitions)) {
          const toPos = positions.get(targetId);
          if (!toPos) continue;
          const isHot = fromStateId === st.id && activeStateId === targetId && activeSym === sym;
          const edgeHex = isHot ? 0xc93b72 : 0x6f3354;

          let midPoint: THREE.Vector3;
          if (st.id === targetId) {
            const loopCenter = fromPos.clone().add(new THREE.Vector3(0, 1.45, 0));
            const loop = new THREE.Mesh(
              new THREE.TorusGeometry(0.55, isHot ? 0.068 : 0.044, 8, 24),
              new THREE.MeshStandardMaterial({
                color: edgeHex,
                emissive: new THREE.Color(edgeHex),
                emissiveIntensity: isHot ? 0.48 : 0.12,
              })
            );
            loop.position.copy(loopCenter);
            group.add(loop);
            midPoint = loopCenter.clone().add(new THREE.Vector3(0, 0.64, 0));
          } else {
            const start = fromPos.clone().add(new THREE.Vector3(0, 0.24, 0));
            const end = toPos.clone().add(new THREE.Vector3(0, 0.24, 0));
            const mid = start.clone().add(end).multiplyScalar(0.5);
            mid.y += isHot ? 1.4 : 0.92;
            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
            const tube = new THREE.Mesh(
              new THREE.TubeGeometry(curve, 18, isHot ? 0.074 : 0.046, 8, false),
              new THREE.MeshStandardMaterial({
                color: edgeHex,
                emissive: new THREE.Color(edgeHex),
                emissiveIntensity: isHot ? 0.5 : 0.12,
                transparent: true,
                opacity: isHot ? 1.0 : 0.88,
              })
            );
            group.add(tube);

            const arrowPos = curve.getPoint(0.76);
            const tangent = curve.getTangent(0.76).normalize();
            const cone = new THREE.Mesh(
              new THREE.ConeGeometry(isHot ? 0.18 : 0.13, isHot ? 0.42 : 0.3, 10),
              new THREE.MeshStandardMaterial({
                color: edgeHex,
                emissive: new THREE.Color(edgeHex),
                emissiveIntensity: isHot ? 0.5 : 0.15,
              })
            );
            cone.position.copy(arrowPos);
            cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
            group.add(cone);
            midPoint = curve.getPoint(0.5).add(new THREE.Vector3(0, 0.28, 0));
          }

          if (isHot || count <= 14) {
            const symTex = createLabelTexture(sym, {
              width: 150,
              height: 78,
              fontSize: 38,
              bgColor: isHot ? '#c93b72' : '#ffffff',
              borderColor: isHot ? '#8f1f4c' : '#8f5b72',
              accentBarColor: isHot ? '#8f1f4c' : '#8f5b72',
              textColor: isHot ? '#ffffff' : '#22131a',
              maxAnisotropy: maxAniso,
            });
            const symSprite = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: symTex,
                transparent: true,
                depthTest: false,
                toneMapped: false,
              })
            );
            symSprite.scale.set(isHot ? 1.08 : 0.9, isHot ? 0.56 : 0.48, 1);
            symSprite.position.copy(midPoint);
            symSprite.renderOrder = isHot ? 22 : 10;
            group.add(symSprite);
          }
        }
      }
    }

    shadowTex.dispose();
    requestRenderRef.current();
  }, [mode, step, family, lrStates]);

  const handleModeChange = (nextMode: Stage3DMode) => {
    setMode(nextMode);
    resetCameraForMode(nextMode);
  };

  // Active DFA state quick summary for clarity inside DFA view
  const activeDfaState =
    mode === 'dfa' && lrStates && lrStates.length > 0
      ? lrStates[step?.activeState ?? 0] ?? lrStates[0]
      : null;

  return (
    <div
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-[#E2CFBE] bg-[#F5EDE3] shadow-xs`}
      data-testid="parser-stage-3d"
      data-mode={mode}
    >
      <div ref={mountRef} className="w-full h-full" />

      {/* Compact Top Control Bar inside 3D Viewport */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        <div
          className="pointer-events-auto inline-flex items-center gap-1 p-1 rounded-lg bg-[#FFFDF9]/95 border border-[#E2CFBE] shadow-xs"
          role="tablist"
          aria-label="3D visualization mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'stack'}
            onClick={() => handleModeChange('stack')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'stack'
                ? 'bg-[#FCEAF1] text-[#8F1F4C] border border-[#E6B0C6] font-semibold'
                : 'text-[#5A404B] hover:text-[#2B1B22]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            3D Stack &amp; Input
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'tree'}
            onClick={() => handleModeChange('tree')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'tree'
                ? 'bg-[#FCEAF1] text-[#8F1F4C] border border-[#E6B0C6] font-semibold'
                : 'text-[#5A404B] hover:text-[#2B1B22]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            3D Parse Tree
          </button>
          {hasDFA && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'dfa'}
              onClick={() => handleModeChange('dfa')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'dfa'
                  ? 'bg-[#F3E5EE] text-[#732A53] border border-[#D7B2C9] font-semibold'
                  : 'text-[#5A404B] hover:text-[#2B1B22]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              3D LR State Machine
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => resetCameraForMode(mode)}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#FFFDF9]/95 border border-[#E2CFBE] text-[#4C3640] hover:text-[#B42A60] hover:border-[#D9A7BC] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          aria-label="Reset 3D stage camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Camera
        </button>
      </div>

      {/* Live Active State Mini-Overlay when viewing 3D LR State Machine */}
      {activeDfaState && (
        <div className="pointer-events-none hidden sm:block absolute bottom-12 left-3 max-w-[270px] rounded-lg bg-[#FFFDF9]/95 border border-[#E2CFBE] px-3 py-2 shadow-xs">
          <div className="text-[11px] font-mono font-semibold text-[#B42A60] mb-0.5">
            Active State {activeDfaState.label} ({activeDfaState.items.length} item
            {activeDfaState.items.length === 1 ? '' : 's'})
          </div>
          <div className="font-mono text-[10px] text-[#4C3640] space-y-0.5">
            {activeDfaState.items.slice(0, 3).map((it, i) => {
              const before = it.rhs.slice(0, it.dot).join(' ');
              const after = it.rhs.slice(it.dot).join(' ');
              return (
                <div key={i} className="truncate">
                  {it.lhs} → {[before, '·', after].filter(Boolean).join(' ')}
                </div>
              );
            })}
            {activeDfaState.items.length > 3 && (
              <div className="text-[#8A6D79]">+{activeDfaState.items.length - 3} more items</div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Caption Strip */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-[#4C3640] bg-[#FFFDF9]/95 border border-[#E2CFBE] rounded-lg px-3 py-1.5 shadow-xs">
        <span className="truncate font-mono font-medium text-[#2B1B22]">
          {step ? `Step ${step.stepNumber}: ${step.actionLabel}` : 'Run parser to synchronize 3D stage'}
        </span>
        <span className="hidden sm:inline text-[#7D616C] shrink-0 ml-3">
          Drag to rotate · Scroll to zoom
        </span>
      </div>
    </div>
  );
};
