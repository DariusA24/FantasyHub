"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type TrophyVariant = "classic" | "diamond" | "obsidian" | "ruby" | "emerald";

type Champion = {
  season: string;
  winnerName: string;
  teamName: string | null;
  wins: number;
  losses: number;
  ties: number;
  variant?: TrophyVariant;
};

// ─── Variant material configs ─────────────────────────────────────────────────
type MatProps = { color: string; metalness: number; roughness: number; envMapIntensity: number };

const VARIANTS: Record<TrophyVariant, { cup: MatProps; base: MatProps; pedestal: MatProps; label: string }> = {
  classic: {
    label: "Gold Classic",
    cup:      { color: "#F4D06F", metalness: 1,    roughness: 0.12, envMapIntensity: 3   },
    base:     { color: "#b8860b", metalness: 1,    roughness: 0.25, envMapIntensity: 2   },
    pedestal: { color: "#1a1828", metalness: 0.05, roughness: 0.8,  envMapIntensity: 0.3 },
  },
  diamond: {
    label: "Silver Diamond",
    cup:      { color: "#d0e8f8", metalness: 1,    roughness: 0.06, envMapIntensity: 4   },
    base:     { color: "#7090b0", metalness: 1,    roughness: 0.18, envMapIntensity: 3   },
    pedestal: { color: "#0e1a2a", metalness: 0.1,  roughness: 0.75, envMapIntensity: 0.5 },
  },
  obsidian: {
    label: "Obsidian Dark",
    cup:      { color: "#2a2a3a", metalness: 1,    roughness: 0.08, envMapIntensity: 5   },
    base:     { color: "#c9a227", metalness: 1,    roughness: 0.2,  envMapIntensity: 2   },
    pedestal: { color: "#0a0a0e", metalness: 0.15, roughness: 0.85, envMapIntensity: 0.4 },
  },
  ruby: {
    label: "Ruby Fire",
    cup:      { color: "#c0183a", metalness: 0.8,  roughness: 0.15, envMapIntensity: 3   },
    base:     { color: "#7a0010", metalness: 0.9,  roughness: 0.25, envMapIntensity: 2   },
    pedestal: { color: "#1a0808", metalness: 0.05, roughness: 0.8,  envMapIntensity: 0.3 },
  },
  emerald: {
    label: "Emerald",
    cup:      { color: "#14a060", metalness: 0.8,  roughness: 0.15, envMapIntensity: 3   },
    base:     { color: "#0a6040", metalness: 0.9,  roughness: 0.25, envMapIntensity: 2   },
    pedestal: { color: "#081a10", metalness: 0.05, roughness: 0.8,  envMapIntensity: 0.3 },
  },
};

// ─── Cup body via lathe ───────────────────────────────────────────────────────
function CupBody({ matProps }: { matProps: MatProps }) {
  const points = [
    new THREE.Vector2(0.08, 0.0),
    new THREE.Vector2(0.18, 0.12),
    new THREE.Vector2(0.36, 0.32),
    new THREE.Vector2(0.46, 0.56),
    new THREE.Vector2(0.44, 0.78),
    new THREE.Vector2(0.42, 0.92),
    new THREE.Vector2(0.44, 1.02),
  ];
  return (
    <mesh castShadow>
      <latheGeometry args={[points, 64]} />
      <meshStandardMaterial {...matProps} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Trophy ───────────────────────────────────────────────────────────────────
function Trophy({ variant }: { variant: TrophyVariant }) {
  const v = VARIANTS[variant];
  return (
    <group position={[0, 0.9, 0]}>
      <CupBody matProps={v.cup} />

      {/* Left handle */}
      <mesh position={[-0.54, 0.56, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.038, 16, 32, Math.PI]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>

      {/* Right handle */}
      <mesh position={[0.54, 0.56, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.038, 16, 32, Math.PI]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>

      {/* Star emblem */}
      <mesh position={[0, 0.46, 0.445]}>
        <cylinderGeometry args={[0.13, 0.13, 0.018, 5]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.04} envMapIntensity={5} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.068, 0.09, 0.58, 32]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>

      {/* Collar knob */}
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.19, 0.14, 0.1, 32]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      {/* Base plate */}
      <mesh position={[0, -0.72, 0]}>
        <cylinderGeometry args={[0.36, 0.4, 0.08, 32]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      {/* Base */}
      <mesh position={[0, -0.84, 0]}>
        <cylinderGeometry args={[0.4, 0.46, 0.16, 32]} />
        <meshStandardMaterial {...v.base} />
      </mesh>
    </group>
  );
}

// ─── Pedestal ─────────────────────────────────────────────────────────────────
function Pedestal({ variant }: { variant: TrophyVariant }) {
  const v = VARIANTS[variant];
  const goldTrim = <meshStandardMaterial {...v.base} />;

  return (
    <group position={[0, -1.1, 0]}>
      {/* Main column */}
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.3, 1.2, 1.3]} />
        <meshStandardMaterial {...v.pedestal} />
      </mesh>

      {/* Gold top trim */}
      <mesh position={[0, 1.21, 0]}>
        <boxGeometry args={[1.38, 0.07, 1.38]} />
        {goldTrim}
      </mesh>

      {/* Gold bottom trim */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[1.38, 0.07, 1.38]} />
        {goldTrim}
      </mesh>

      {/* Step 1 */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[1.56, 0.16, 1.56]} />
        <meshStandardMaterial {...v.pedestal} />
      </mesh>

      {/* Step 2 */}
      <mesh receiveShadow position={[0, -0.3, 0]}>
        <boxGeometry args={[1.82, 0.22, 1.82]} />
        <meshStandardMaterial {...v.pedestal} />
      </mesh>

      {/* Base gold trim */}
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[1.88, 0.04, 1.88]} />
        {goldTrim}
      </mesh>
    </group>
  );
}

// ─── Floor ────────────────────────────────────────────────────────────────────
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.55, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#08060e" metalness={0.4} roughness={0.9} />
    </mesh>
  );
}

// ─── Lights ───────────────────────────────────────────────────────────────────
function Lights() {
  return (
    <>
      {/* Ambient base so nothing goes pitch black */}
      <ambientLight intensity={0.35} color="#ffe8c0" />

      {/* Primary spotlight — wide enough to fully illuminate trophy + pedestal */}
      <spotLight
        position={[0, 10, 3]}
        angle={0.35}
        penumbra={0.6}
        intensity={300}
        color="#fff8e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Secondary front fill from lower angle */}
      <spotLight
        position={[0, 4, 7]}
        angle={0.45}
        penumbra={1}
        intensity={120}
        color="#fff4d0"
        castShadow={false}
      />

      {/* Blue-tinted back rim for depth */}
      <pointLight position={[0, 5, -5]} intensity={20} color="#3355cc" distance={18} />

      {/* Warm floor bounce */}
      <pointLight position={[0, -1, 1]} intensity={15} color="#d4900a" distance={8} />

      {/* Gold side fills */}
      <pointLight position={[4, 3, 2]}  intensity={12} color="#F4D06F" distance={10} />
      <pointLight position={[-4, 3, 2]} intensity={12} color="#F4D06F" distance={10} />
    </>
  );
}

// ─── Rotating scene ───────────────────────────────────────────────────────────
function Scene({ variant }: { variant: TrophyVariant }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.4} rotationIntensity={0.04} floatIntensity={0.1}>
        <Trophy variant={variant} />
      </Float>
      <Pedestal variant={variant} />
    </group>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function TrophyScene({ champion }: { champion: Champion }) {
  const variant: TrophyVariant = (champion.variant as TrophyVariant) ?? "classic";
  return (
    <div style={{ width: "100%", height: 560 }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.2, 8.5], fov: 38 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 2.0,
        }}
      >
        <Suspense fallback={null}>
          <Lights />
          <Scene variant={variant} />
          <Floor />
          <Environment preset="night" />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
