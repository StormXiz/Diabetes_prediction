"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/components/ThemeProvider";

/**
 * "Célula" central (icosaedro wireframe + esfera sólida) con dos satélites y
 * un campo de partículas — la misma metáfora de la resistencia a la insulina
 * que ya usábamos en <GlucoseDiagram> del landing, ahora en 3D real.
 * Gira siguiendo el mouse; si el usuario pide reduced-motion, se congela.
 */
export default function HeroScene({ reducedMotion }: { reducedMotion: boolean }) {
  const { isDark } = useTheme();

  const primaryColor = useMemo(() => new THREE.Color("#059669"), []); // emerald-600
  const accentColor = useMemo(() => new THREE.Color("#2563eb"), []); // blue-600

  const particleCount = 180;
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    return positions;
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    if (reducedMotion) return;
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, (state.pointer.x * Math.PI) / 10, 0.05);
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, (state.pointer.y * Math.PI) / 10, 0.05);
    if (groupRef.current) {
      groupRef.current.rotation.y = mouse.current.x;
      groupRef.current.rotation.x = -mouse.current.y;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={isDark ? 0.5 : 1} />
      <directionalLight position={[10, 10, 5]} intensity={isDark ? 1 : 2} color="#ffffff" />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} color={accentColor} />

      {/* Célula central */}
      <Float speed={reducedMotion ? 0 : 2} rotationIntensity={reducedMotion ? 0 : 0.5} floatIntensity={reducedMotion ? 0 : 1}>
        <mesh>
          <icosahedronGeometry args={[1.5, 3]} />
          <meshPhysicalMaterial color={primaryColor} wireframe transparent opacity={0.3} roughness={0} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color={primaryColor}
            transparent
            opacity={isDark ? 0.8 : 0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </Float>

      {/* Satélites */}
      <Float speed={reducedMotion ? 0 : 3} rotationIntensity={reducedMotion ? 0 : 1} floatIntensity={reducedMotion ? 0 : 2}>
        <mesh position={[2.5, 1.5, -2]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={accentColor} transparent opacity={isDark ? 0.7 : 0.5} roughness={0.1} />
        </mesh>
      </Float>

      <Float speed={reducedMotion ? 0 : 1.5} rotationIntensity={reducedMotion ? 0 : 0.5} floatIntensity={reducedMotion ? 0 : 1.5}>
        <mesh position={[-2, -1.5, -1]}>
          <octahedronGeometry args={[0.6, 1]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.6}
            roughness={0.2}
            transmission={1}
            thickness={0.5}
          />
        </mesh>
      </Float>

      <Points positions={particlesPosition}>
        <PointMaterial
          transparent
          color={isDark ? "#ffffff" : "#059669"}
          size={0.05}
          sizeAttenuation
          depthWrite={false}
          opacity={isDark ? 0.4 : 0.2}
        />
      </Points>
    </group>
  );
}
