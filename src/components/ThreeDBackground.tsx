import React, { useEffect, useRef, useState } from "react";

interface Point3D {
  ox: number; // original coordinates
  oy: number;
  oz: number;
  x: number;  // active coordinates after rotation
  y: number;
  z: number;
  colorType: "violet" | "indigo";
  phase: number;      // unique angle offset for organic floating drift
  driftSpeed: number; // speed of floating bobbing
  pulseSpeed: number; // speed of bubble pulsing size
  sizeMultiplier: number; // custom base scale
}

export default function ThreeDBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, speedFactor: 1 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle window resizing cleanly to prevent canvas stretching
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial sizing

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1 range
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;

      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Run the premium 3D projection rendering engine with interactive glass bubbles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const points: Point3D[] = [];
    const numPoints = 140; // Increased count for richer density
    const sphereRadius = 260; // Slightly larger volume span

    // Generate random 3D coordinates on a spherical volume using polar math
    for (let i = 0; i < numPoints; i++) {
      // theta (azimuthal angle): 0 to 2PI
      const theta = Math.random() * Math.PI * 2;
      // phi (polar angle): 0 to PI
      const phi = Math.acos(Math.random() * 2 - 1);
      // distribute points elegantly
      const r = sphereRadius * (0.35 + 0.65 * Math.sqrt(Math.random()));

      const ox = r * Math.sin(phi) * Math.cos(theta);
      const oy = r * Math.sin(phi) * Math.sin(theta);
      const oz = r * Math.cos(phi);

      points.push({
        ox,
        oy,
        oz,
        x: ox,
        y: oy,
        z: oz,
        colorType: Math.random() > 0.45 ? "violet" : "indigo",
        phase: Math.random() * Math.PI * 2,
        driftSpeed: 0.001 + Math.random() * 0.002,
        pulseSpeed: 0.002 + Math.random() * 0.003,
        sizeMultiplier: 0.7 + Math.random() * 0.6,
      });
    }

    const fov = 420; // perspective field of view
    let angleX = 0;
    let angleY = 0;
    let time = 0;

    const render = () => {
      const { width, height } = dimensions;
      const cx = width / 2;
      const cy = height / 2;
      time += 0.5;

      // Draw premium subtle radial background gradient matching an elegant off-white palette
      const bgGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(width, height) * 0.85);
      bgGradient.addColorStop(0, "#fbfbfd");
      bgGradient.addColorStop(0.6, "#f6f8fb");
      bgGradient.addColorStop(1, "#edf1f6");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Smoothly interpolate mouse movement for fluid easing
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      // Calculate distance from center for interactive swirl speed acceleration
      const mouseDistance = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
      mouse.speedFactor += (1 + mouseDistance * 3.5 - mouse.speedFactor) * 0.04;

      // Baseline elegant drift + dynamic interactive movement
      const baseSpeedX = 0.0012;
      const baseSpeedY = 0.0016;
      
      const speedX = baseSpeedX + mouse.y * 0.006 * mouse.speedFactor;
      const speedY = baseSpeedY + mouse.x * 0.006 * mouse.speedFactor;

      angleX += speedX;
      angleY += speedY;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const projectedPoints: { 
        x: number; 
        y: number; 
        scale: number; 
        depth: number; 
        colorType: "violet" | "indigo";
        pulse: number;
        driftX: number;
        driftY: number;
      }[] = [];

      // Rotate, drift organically, and project points in 3D Space
      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // 1. Organic local drift / bobbing (making the constellation feel fluid and alive)
        const dX = Math.sin(time * p.driftSpeed + p.phase) * 15;
        const dY = Math.cos(time * p.driftSpeed * 1.2 + p.phase) * 15;
        const dZ = Math.sin(time * p.driftSpeed * 0.8 + p.phase) * 12;

        const currentOx = p.ox + dX;
        const currentOy = p.oy + dY;
        const currentOz = p.oz + dZ;

        // 3D rotation matrices
        // Y-axis rotation
        let x1 = currentOx * cosY - currentOz * sinY;
        let z1 = currentOx * sinY + currentOz * cosY;

        // X-axis rotation
        let y2 = currentOy * cosX - z1 * sinX;
        let z2 = currentOy * sinX + z1 * cosX;

        p.x = x1;
        p.y = y2;
        p.z = z2;

        // Perspective scale formula: scale = fov / (fov + z)
        const scale = fov / (fov + p.z);
        
        // Projected 2D screen coordinates
        const projX = cx + p.x * scale;
        const projY = cy + p.y * scale;

        // Bubble dynamic size pulsing
        const pulse = 1 + Math.sin(time * p.pulseSpeed) * 0.12;

        projectedPoints.push({
          x: projX,
          y: projY,
          scale,
          depth: p.z,
          colorType: p.colorType,
          pulse,
          driftX: dX,
          driftY: dY,
        });
      }

      // Constellation Connection Lines: Check the distance between projected nodes
      ctx.lineWidth = 0.55;
      for (let i = 0; i < projectedPoints.length; i++) {
        const p1 = projectedPoints[i];

        for (let j = i + 1; j < projectedPoints.length; j++) {
          const p2 = projectedPoints[j];

          // Calculate projected Euclidean distance
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // If close enough, draw a faint, delicate semi-transparent connection line
          if (dist < 130) {
            // Stronger transparency falloff for a cleaner visual constellation look
            const opacity = Math.max(0, (1 - dist / 130) * 0.15 * Math.min(p1.scale, p2.scale));
            
            // Faint, smooth color blend gradient for the connection line
            const lineGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            const color1 = p1.colorType === "violet" ? `rgba(139, 92, 246, ${opacity})` : `rgba(99, 102, 241, ${opacity})`;
            const color2 = p2.colorType === "violet" ? `rgba(139, 92, 246, ${opacity})` : `rgba(99, 102, 241, ${opacity})`;
            lineGrad.addColorStop(0, color1);
            lineGrad.addColorStop(1, color2);

            ctx.strokeStyle = lineGrad;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Sort points by depth (Z-buffer) so background particles are correctly drawn behind foreground ones
      const sortedIndices = Array.from({ length: projectedPoints.length }, (_, i) => i)
        .sort((a, b) => projectedPoints[b].depth - projectedPoints[a].depth);

      // Render nodes as rich 3D shaded spheres / glass bubbles
      for (let i = 0; i < sortedIndices.length; i++) {
        const idx = sortedIndices[i];
        const p = projectedPoints[idx];
        const origPoint = points[idx];

        const scale = p.scale;
        
        // Base bubble size scaled by projection scale and dynamic size pulse
        const baseSize = 3.6 * scale * origPoint.sizeMultiplier;
        const finalSize = Math.max(0.6, baseSize * p.pulse);

        // Opacity based on depth (front is brighter, back is dimmer)
        const depthOpacity = Math.max(0.08, Math.min(0.92, (scale * 0.48)));

        // Create elegant 3D radial shading (Spherical glass bubble effect!)
        // Offset the gradient center slightly up-left to simulate light casting a specular highlight
        const gradientX = p.x - finalSize * 0.28;
        const gradientY = p.y - finalSize * 0.28;
        const bubbleGrad = ctx.createRadialGradient(
          gradientX, gradientY, finalSize * 0.05,
          p.x, p.y, finalSize
        );

        if (p.colorType === "violet") {
          // Inner spec highlight fading to soft violet border
          bubbleGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.9, depthOpacity + 0.3)})`);
          bubbleGrad.addColorStop(0.35, `rgba(167, 139, 250, ${depthOpacity * 0.8})`); // violet-400
          bubbleGrad.addColorStop(1, `rgba(139, 92, 246, ${depthOpacity * 0.95})`);    // violet-500
        } else {
          // Inner spec highlight fading to soft indigo border
          bubbleGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.9, depthOpacity + 0.3)})`);
          bubbleGrad.addColorStop(0.35, `rgba(129, 140, 248, ${depthOpacity * 0.8})`); // indigo-400
          bubbleGrad.addColorStop(1, `rgba(99, 102, 241, ${depthOpacity * 0.95})`);    // indigo-500
        }

        // Draw bubble shadow / soft outer ambient glow
        ctx.shadowColor = p.colorType === "violet" ? "rgba(139, 92, 246, 0.2)" : "rgba(99, 102, 241, 0.2)";
        ctx.shadowBlur = scale > 1.0 ? finalSize * 1.2 : 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = finalSize * 0.25;

        // Draw main bubble node
        ctx.fillStyle = bubbleGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, finalSize, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow config for drawing line overlays & orbits safely
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw a tiny bright specular reflection spot at the top-left for extra visual realism
        ctx.fillStyle = `rgba(255, 255, 255, ${depthOpacity * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x - finalSize * 0.38, p.y - finalSize * 0.38, finalSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // High premium visual accent: Outer subtle floating glass bubble halo ring
        if (scale > 0.9) {
          const haloOpacity = Math.max(0.02, Math.min(0.24, 0.18 * scale));
          ctx.strokeStyle = p.colorType === "violet" 
            ? `rgba(139, 92, 246, ${haloOpacity})` 
            : `rgba(99, 102, 241, ${haloOpacity})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          // Halo slightly larger than bubble, with dynamic breathing
          ctx.arc(p.x, p.y, finalSize * (2.1 + Math.sin(time * origPoint.pulseSpeed * 0.5) * 0.1), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [dimensions]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="fixed inset-0 -z-10 pointer-events-none block"
    />
  );
}
