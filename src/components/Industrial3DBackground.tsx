import React, { useEffect, useRef, useState } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Spark3D {
  x: number;
  y: number;
  z: number;
  vy: number;
  size: number;
  alpha: number;
}

export default function Industrial3DBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep track of mouse position for parallax camera rotation
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update canvas size reactively
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      setDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    handleResize();

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Map to -1 to 1 range
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current.targetX = x * 0.4; // max tilt rad
      mouseRef.current.targetY = y * 0.4;
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Run the 3D Math Engine loop on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    // Initialize 3D Floating Sparks (sparks drift upwards in industrial space)
    const sparks: Spark3D[] = Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 800,
      y: Math.random() * 600 - 300,
      z: Math.random() * 600 - 100,
      vy: -(Math.random() * 0.8 + 0.4),
      size: Math.random() * 1.5 + 1,
      alpha: Math.random() * 0.5 + 0.3,
    }));

    // Generate vertices for a 3D Gear Cog
    const makeGear = (teeth: number, innerRadius: number, outerRadius: number, thickness: number) => {
      const vertices: Point3D[] = [];
      const faces: number[][] = []; // indices of connected vertices

      // Front and back gear faces
      const zFront = -thickness / 2;
      const zBack = thickness / 2;

      for (let i = 0; i < teeth * 2; i++) {
        const theta = (i * Math.PI) / teeth;
        const isOuter = i % 2 === 0;
        const r = isOuter ? outerRadius : innerRadius;

        const cosVal = Math.cos(theta);
        const sinVal = Math.sin(theta);

        // Vertices at outer/inner radius
        // Front ring (Z = -thickness/2)
        vertices.push({ x: r * cosVal, y: r * sinVal, z: zFront });
        // Back ring (Z = thickness/2)
        vertices.push({ x: r * cosVal, y: r * sinVal, z: zBack });

        // Vertices at internal shaft ring (to show mechanical spokes)
        const innerShaftR = innerRadius * 0.4;
        vertices.push({ x: innerShaftR * cosVal, y: innerShaftR * sinVal, z: zFront });
        vertices.push({ x: innerShaftR * cosVal, y: innerShaftR * sinVal, z: zBack });
      }

      return { vertices, teeth };
    };

    // Instantiate two gears: One main, and one interlocking helper gear
    const gear1 = makeGear(16, 120, 150, 40);
    const gear2 = makeGear(10, 75, 95, 30);

    // Structural columns/scaffold coordinates in 3D
    const scaffolding: { p1: Point3D; p2: Point3D; isSupport: boolean }[] = [];
    const colPositions = [
      { x: -350, z: 250 },
      { x: -150, z: 150 },
      { x: 200, z: 300 },
      { x: 350, z: 100 },
    ];

    // Build vertical lattice columns
    colPositions.forEach((pos) => {
      const height = 300;
      // Vertical pillars
      scaffolding.push({
        p1: { x: pos.x, y: 150, z: pos.z },
        p2: { x: pos.x, y: 150 - height, z: pos.z },
        isSupport: false,
      });
      scaffolding.push({
        p1: { x: pos.x + 20, y: 150, z: pos.z },
        p2: { x: pos.x + 20, y: 150 - height, z: pos.z },
        isSupport: false,
      });
      // Horizontal struts every 60px
      for (let h = 0; h < height; h += 60) {
        scaffolding.push({
          p1: { x: pos.x, y: 150 - h, z: pos.z },
          p2: { x: pos.x + 20, y: 150 - h, z: pos.z },
          isSupport: true,
        });
        // Diagonal braces
        scaffolding.push({
          p1: { x: pos.x, y: 150 - h, z: pos.z },
          p2: { x: pos.x + 20, y: 150 - h - 60, z: pos.z },
          isSupport: true,
        });
      }
    });

    // 3D Point projection helper
    // Rotates point by camera pitch/yaw, translates, and applies perspective projection
    const project = (
      p: Point3D,
      pitch: number,
      yaw: number,
      centerX: number,
      centerY: number,
      rotZ: number = 0,
      trans: Point3D = { x: 0, y: 0, z: 0 }
    ) => {
      // 1. Initial local Z-rotation (used for spinning gears)
      let rx = p.x;
      let ry = p.y;
      let rz = p.z;

      if (rotZ !== 0) {
        const cosZ = Math.cos(rotZ);
        const sinZ = Math.sin(rotZ);
        rx = p.x * cosZ - p.y * sinZ;
        ry = p.x * sinZ + p.y * cosZ;
      }

      // 2. Add local translation
      rx += trans.x;
      ry += trans.y;
      rz += trans.z;

      // 3. Apply Camera Yaw (around Y axis)
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      let x1 = rx * cosYaw - rz * sinYaw;
      let z1 = rx * sinYaw + rz * cosYaw;
      let y1 = ry;

      // 4. Apply Camera Pitch (around X axis)
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      let y2 = y1 * cosPitch - z1 * sinPitch;
      let z2 = y1 * sinPitch + z1 * cosPitch;

      // 5. Shift perspective depth
      const cameraDistance = 750;
      const depth = z2 + cameraDistance;

      if (depth <= 50) return null; // Behind camera clipping

      // Fov perspective scaling factor
      const fov = 600;
      const scale = fov / depth;

      return {
        x: centerX + x1 * scale,
        y: centerY + y2 * scale,
        scale,
        depth,
      };
    };

    const render = () => {
      // Clear canvas with deep dark blue slate background
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;

      // Smooth interpolation for camera tilt (lerp)
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Camera orientation (pitch and yaw based on mouse and subtle drift)
      const cameraPitch = 0.65 + mouse.y; // looking down onto the deck
      const cameraYaw = mouse.x + Math.sin(angle * 0.15) * 0.05; // slowly oscillating yaw

      angle += 0.015; // master rotation ticker

      // --- 1. RENDER 3D HORIZONTAL DECK BLUEPRINT GRID ---
      ctx.lineWidth = 1;
      const gridSpacing = 50;
      const gridLines = 14;

      for (let i = -gridLines; i <= gridLines; i++) {
        const offset = i * gridSpacing;

        // Lines parallel to Z axis (going into distance)
        const p1_Z = { x: offset, y: 150, z: -gridLines * gridSpacing };
        const p2_Z = { x: offset, y: 150, z: gridLines * gridSpacing };

        const proj1_Z = project(p1_Z, cameraPitch, cameraYaw, cx, cy);
        const proj2_Z = project(p2_Z, cameraPitch, cameraYaw, cx, cy);

        if (proj1_Z && proj2_Z) {
          // Fog depth fade
          const avgDepth = (proj1_Z.depth + proj2_Z.depth) / 2;
          const alpha = Math.max(0, 1 - avgDepth / 1100) * 0.12;
          ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(proj1_Z.x, proj1_Z.y);
          ctx.lineTo(proj2_Z.x, proj2_Z.y);
          ctx.stroke();
        }

        // Lines parallel to X axis (transverse)
        const p1_X = { x: -gridLines * gridSpacing, y: 150, z: offset };
        const p2_X = { x: gridLines * gridSpacing, y: 150, z: offset };

        const proj1_X = project(p1_X, cameraPitch, cameraYaw, cx, cy);
        const proj2_X = project(p2_X, cameraPitch, cameraYaw, cx, cy);

        if (proj1_X && proj2_X) {
          const avgDepth = (proj1_X.depth + proj2_X.depth) / 2;
          const alpha = Math.max(0, 1 - avgDepth / 1100) * 0.12;
          ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(proj1_X.x, proj1_X.y);
          ctx.lineTo(proj2_X.x, proj2_X.y);
          ctx.stroke();
        }
      }

      // --- 2. RENDER COG GEAR #1 (Large Emerald Master Gear) ---
      // Local rotation offset, translated slightly left and below grid
      const gear1Trans = { x: -160, y: 30, z: -50 };
      const gear1Rot = angle * 0.5;
      const projectedG1: any[] = [];

      gear1.vertices.forEach((v) => {
        projectedG1.push(project(v, cameraPitch, cameraYaw, cx, cy, gear1Rot, gear1Trans));
      });

      // Draw Gear 1 outer rims & teeth
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.28)";
      ctx.fillStyle = "rgba(16, 185, 129, 0.02)";

      // Draw Front Ring Face
      ctx.beginPath();
      for (let i = 0; i < gear1.teeth * 2; i++) {
        const p = projectedG1[i * 4]; // step of 4 (front outer ring)
        if (p) {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fill();

      // Draw Back Ring Face
      ctx.beginPath();
      for (let i = 0; i < gear1.teeth * 2; i++) {
        const p = projectedG1[i * 4 + 1]; // step of 4 (back outer ring)
        if (p) {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      ctx.stroke();

      // Draw connecting thickness spars (the gear outer tooth slides)
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      for (let i = 0; i < gear1.teeth * 2; i++) {
        const pFront = projectedG1[i * 4];
        const pBack = projectedG1[i * 4 + 1];
        if (pFront && pBack) {
          ctx.beginPath();
          ctx.moveTo(pFront.x, pFront.y);
          ctx.lineTo(pBack.x, pBack.y);
          ctx.stroke();
        }
      }

      // Draw interior spokes & hub
      ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
      for (let i = 0; i < gear1.teeth * 2; i += 2) {
        const pOuter = projectedG1[i * 4];
        const pInner = projectedG1[i * 4 + 2]; // Inner ring front
        const pInnerBack = projectedG1[i * 4 + 3]; // Inner ring back
        if (pOuter && pInner && pInnerBack) {
          ctx.beginPath();
          ctx.moveTo(pOuter.x, pOuter.y);
          ctx.lineTo(pInner.x, pInner.y);
          ctx.stroke();

          // Connect inner face hub rings
          ctx.beginPath();
          ctx.moveTo(pInner.x, pInner.y);
          ctx.lineTo(pInnerBack.x, pInnerBack.y);
          ctx.stroke();
        }
      }

      // --- 3. RENDER COG GEAR #2 (Teal Companion Gear) ---
      // Positioned to perfectly interlock teeth with gear 1. Rotates counter-clockwise.
      const gear2Trans = { x: 100, y: 10, z: -50 };
      // Phase-offset by half tooth rotation to mesh perfectly
      const gear2Rot = -angle * 0.8 + Math.PI / 10; 
      const projectedG2: any[] = [];

      gear2.vertices.forEach((v) => {
        projectedG2.push(project(v, cameraPitch, cameraYaw, cx, cy, gear2Rot, gear2Trans));
      });

      ctx.strokeStyle = "rgba(45, 212, 191, 0.22)"; // Cyan/Teal shade
      ctx.fillStyle = "rgba(45, 212, 191, 0.01)";

      // Front Face G2
      ctx.beginPath();
      for (let i = 0; i < gear2.teeth * 2; i++) {
        const p = projectedG2[i * 4];
        if (p) {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fill();

      // Back Face G2
      ctx.beginPath();
      for (let i = 0; i < gear2.teeth * 2; i++) {
        const p = projectedG2[i * 4 + 1];
        if (p) {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      ctx.stroke();

      // G2 tooth connection spars
      ctx.strokeStyle = "rgba(45, 212, 191, 0.12)";
      for (let i = 0; i < gear2.teeth * 2; i++) {
        const pFront = projectedG2[i * 4];
        const pBack = projectedG2[i * 4 + 1];
        if (pFront && pBack) {
          ctx.beginPath();
          ctx.moveTo(pFront.x, pFront.y);
          ctx.lineTo(pBack.x, pBack.y);
          ctx.stroke();
        }
      }

      // --- 4. RENDER SCAFFOLDING & LATTICE LADDERS (Structural Theme) ---
      scaffolding.forEach((beam) => {
        const p1 = project(beam.p1, cameraPitch, cameraYaw, cx, cy);
        const p2 = project(beam.p2, cameraPitch, cameraYaw, cx, cy);

        if (p1 && p2) {
          const avgDepth = (p1.depth + p2.depth) / 2;
          const alpha = Math.max(0, 1 - avgDepth / 1200);

          if (beam.isSupport) {
            // Secondary trusses: thinner, slightly dimmer
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.16})`; // Indigo tint
          } else {
            // Main load-carrying steel bars
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 0.22})`; // Emerald theme
          }

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Draw micro-nodes at vertices of columns
          if (!beam.isSupport && Math.sin(angle * 0.5 + p1.x) > 0.6) {
            ctx.fillStyle = `rgba(52, 211, 153, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // --- 5. RENDER DYNAMIC FLOATING SPARKS / ENERGY (Rising Upwards) ---
      ctx.fillStyle = "#34d399";
      sparks.forEach((spark) => {
        // Update physics
        spark.y += spark.vy;
        // Float drift
        spark.x += Math.sin(angle * 0.6 + spark.z) * 0.15;

        // Wrap around bottom if exits top
        if (spark.y < -350) {
          spark.y = 200;
          spark.x = (Math.random() - 0.5) * 800;
        }

        const proj = project(spark, cameraPitch, cameraYaw, cx, cy);
        if (proj) {
          // Glow intensity scales with proximity (smaller depth = closer = brighter)
          const alphaFactor = Math.max(0, 1 - proj.depth / 950);
          const currentAlpha = spark.alpha * alphaFactor;

          ctx.fillStyle = `rgba(52, 211, 153, ${currentAlpha})`;
          ctx.beginPath();
          // Draw tiny sparks
          const size = spark.size * proj.scale;
          ctx.arc(proj.x, proj.y, Math.max(0.5, size), 0, Math.PI * 2);
          ctx.fill();

          // Rare highlight flare for some sparks
          if (spark.size > 2.0 && currentAlpha > 0.4) {
            ctx.fillStyle = `rgba(16, 185, 129, ${currentAlpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, size * 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Loop animation
      animId = requestAnimationFrame(render);
    };

    // Trigger loop
    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [dimensions]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 bg-slate-950 overflow-hidden select-none pointer-events-none">
      {/* Background canvas container */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full block"
      />

      {/* Futuristic Ambient Shading Mask Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.85)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950 to-transparent" />

      {/* Tiny Industrial Diagnostics Corner Annotations */}
      <div className="absolute top-12 left-8 font-mono text-[8px] font-black tracking-widest text-emerald-500/20 leading-relaxed hidden sm:block">
        PORTAL_VECTOR_LOCK: ONLINE<br />
        GEAR_YAW_BIAS: LERPMOUSE_0.4<br />
        3D_ENGINE: CANV_RENDERER_V1
      </div>

      <div className="absolute bottom-12 right-8 font-mono text-[8px] font-black tracking-widest text-teal-400/20 text-right leading-relaxed hidden sm:block">
        BUILD_LATTICE: SCAFFOLD_GRID_300<br />
        SECTOR: DECENTRAL_PORTAL_CORE<br />
        LATENCY_VER: OK_120HZ
      </div>
    </div>
  );
}
