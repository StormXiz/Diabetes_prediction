"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Palmera low-poly: tronco (cilindro curvado con una leve inclinación) +
 * 6 hojas planas dispuestas en abanico. Todo en primitivas — sin modelos
 * externos — en los mismos tonos de marca (emerald) para que no desentone
 * con el resto del sitio a pesar del tema "naturaleza".
 */
function Palm({ position, scale = 1, sway = 0 }: { position: [number, number, number]; scale?: number; sway: number }) {
  const frondColor = "#059669"; // emerald-600
  const fronds = 6;

  return (
    <group position={position} scale={scale} rotation={[0, 0, sway]}>
      {/* Tronco */}
      <mesh position={[0, 1.4, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.08, 0.14, 2.8, 6]} />
        <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
      </mesh>
      {/* Copa de hojas */}
      <group position={[0.1, 2.9, 0]}>
        {Array.from({ length: fronds }).map((_, i) => (
          <mesh key={i} rotation={[0.9, 0, (i / fronds) * Math.PI * 2]} position={[0, 0.1, 0]}>
            <coneGeometry args={[0.22, 1.6, 4]} />
            <meshStandardMaterial color={frondColor} roughness={0.6} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const PALM_LAYOUT: { position: [number, number, number]; scale: number }[] = [
  { position: [-4.5, -2, -2], scale: 1.1 },
  { position: [4.2, -2, -3], scale: 1.4 },
  { position: [-2.5, -2, -5], scale: 0.9 },
  { position: [2.8, -2, -1], scale: 0.8 },
  { position: [-6, -2, -6], scale: 1.2 },
  { position: [6, -2, -5], scale: 1 },
];

export default function ForestScene({ reducedMotion }: { reducedMotion: boolean }) {
  const { isDark } = useTheme();
  const groupRef = useRef<THREE.Group>(null);

  const fireflyCount = 60;
  const fireflyPositions = useMemo(() => {
    const positions = new Float32Array(fireflyCount * 3);
    for (let i = 0; i < fireflyCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={isDark ? 0.4 : 0.9} />
      <directionalLight position={[6, 8, 4]} intensity={isDark ? 0.6 : 1.2} color="#ffffff" />

      {PALM_LAYOUT.map((p, i) => (
        <Float key={i} speed={reducedMotion ? 0 : 0.8} rotationIntensity={0} floatIntensity={reducedMotion ? 0 : 0.3}>
          <Palm position={p.position} scale={p.scale} sway={0} />
        </Float>
      ))}

      <Points positions={fireflyPositions}>
        <PointMaterial
          transparent
          color={isDark ? "#a7f3d0" : "#059669"}
          size={0.06}
          sizeAttenuation
          depthWrite={false}
          opacity={isDark ? 0.6 : 0.25}
        />
      </Points>
    </group>
  );
}
