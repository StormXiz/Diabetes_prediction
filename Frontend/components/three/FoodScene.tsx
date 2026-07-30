"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/components/ThemeProvider";

// Frutas/vegetales estilizados (esferas y cápsulas con color) flotando — evoca
// alimentación sana sin cargar modelos 3D pesados. Paleta de marca + tonos comida.
const ITEMS: { pos: [number, number, number]; color: string; scale: number; kind: "sphere" | "capsule" | "berry" }[] = [
  { pos: [-2.6, 0.8, 0], color: "#ef4444", scale: 1, kind: "sphere" },     // manzana/tomate
  { pos: [2.4, 1.2, -1], color: "#f59e0b", scale: 0.8, kind: "sphere" },    // naranja
  { pos: [0, -1.2, 0.5], color: "#059669", scale: 1.1, kind: "capsule" },   // pepino/vegetal
  { pos: [-1.8, -1.4, -1.5], color: "#7c3aed", scale: 0.55, kind: "berry" }, // uva/mora
  { pos: [2.2, -0.9, 0.5], color: "#84cc16", scale: 0.7, kind: "sphere" },  // lima
  { pos: [-2.9, -0.2, -2], color: "#2563eb", scale: 0.45, kind: "berry" },  // arándano
];

export default function FoodScene({ reducedMotion }: { reducedMotion: boolean }) {
  const { isDark } = useTheme();
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, (state.pointer.x * Math.PI) / 14, 0.05);
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, (state.pointer.y * Math.PI) / 14, 0.05);
    groupRef.current.rotation.y = mouse.current.x;
    groupRef.current.rotation.x = -mouse.current.y;
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={isDark ? 0.6 : 1.1} />
      <directionalLight position={[6, 8, 5]} intensity={isDark ? 1.1 : 1.8} />
      <directionalLight position={[-8, -6, -4]} intensity={0.4} color="#38bdf8" />

      {ITEMS.map((it, i) => (
        <Float
          key={i}
          speed={reducedMotion ? 0 : 1.5 + i * 0.2}
          rotationIntensity={reducedMotion ? 0 : 0.6}
          floatIntensity={reducedMotion ? 0 : 1.4}
        >
          <mesh position={it.pos} scale={it.scale}>
            {it.kind === "sphere" && <sphereGeometry args={[0.7, 32, 32]} />}
            {it.kind === "berry" && <icosahedronGeometry args={[0.7, 1]} />}
            {it.kind === "capsule" && <capsuleGeometry args={[0.35, 0.9, 8, 16]} />}
            <meshStandardMaterial color={it.color} roughness={0.35} metalness={0.15} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}
