"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { getTrophyDesign } from "./designs";

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
type VariantMats = { cup: MatProps; base: MatProps; pedestal: MatProps; label: string };

const VARIANTS: Record<TrophyVariant, VariantMats> = {
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

// Bright accent used for gems, laces, and emblems on every design
const ACCENT: MatProps = { color: "#ffffff", metalness: 1, roughness: 0.04, envMapIntensity: 5 };
const GEM: MatProps    = { color: "#e8f4ff", metalness: 0.4, roughness: 0.05, envMapIntensity: 6 };

// ─── Shared stem + base plates every design sits on ──────────────────────────
function TrophyBase({ v, stem = true }: { v: VariantMats; stem?: boolean }) {
  return (
    <>
      {stem && (
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.068, 0.09, 0.58, 32]} />
          <meshStandardMaterial {...v.cup} />
        </mesh>
      )}
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
    </>
  );
}

// ─── 2024 · Classic Cup (the original two-handled cup) ────────────────────────
function ClassicCup({ v }: { v: VariantMats }) {
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
    <>
      <mesh castShadow>
        <latheGeometry args={[points, 64]} />
        <meshStandardMaterial {...v.cup} side={THREE.DoubleSide} />
      </mesh>

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
        <meshStandardMaterial {...ACCENT} />
      </mesh>

      <TrophyBase v={v} />
    </>
  );
}

// ─── 2025 · Golden Pigskin (Lombardi-style football on a pyre) ────────────────
function FootballTrophy({ v }: { v: VariantMats }) {
  return (
    <>
      {/* Football, tilted like a kick about to happen */}
      <group position={[0, 0.62, 0]} rotation={[0, 0, -0.45]}>
        <mesh castShadow scale={[0.55, 1, 0.55]}>
          <sphereGeometry args={[0.52, 48, 32]} />
          <meshStandardMaterial {...v.cup} />
        </mesh>
        {/* Lace spine */}
        <mesh position={[0, 0, 0.282]}>
          <boxGeometry args={[0.022, 0.4, 0.02]} />
          <meshStandardMaterial {...ACCENT} />
        </mesh>
        {/* Laces */}
        {[-0.14, -0.07, 0, 0.07, 0.14].map((y) => (
          <mesh key={y} position={[0, y, 0.285]}>
            <boxGeometry args={[0.11, 0.028, 0.02]} />
            <meshStandardMaterial {...ACCENT} />
          </mesh>
        ))}
      </group>

      {/* Pyramid stand */}
      <mesh castShadow position={[0, -0.28, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.42, 0.85, 4]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      <TrophyBase v={v} stem={false} />
    </>
  );
}

// ─── 2026 · Crystal Spire (faceted obelisk with floating shards) ──────────────
function SpireTrophy({ v }: { v: VariantMats }) {
  return (
    <>
      <mesh castShadow position={[0, 0.55, 0]} scale={[0.5, 1.6, 0.5]}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>

      {/* Floating shards */}
      <Float speed={2.2} rotationIntensity={0.6} floatIntensity={0.5}>
        <mesh position={[0.55, 0.3, 0.12]} rotation={[0.4, 0.2, 0.5]}>
          <octahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial {...v.base} />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.5}>
        <mesh position={[-0.52, 0.62, -0.14]} rotation={[0.2, 0.6, 0.3]}>
          <octahedronGeometry args={[0.13, 0]} />
          <meshStandardMaterial {...v.base} />
        </mesh>
      </Float>
      <Float speed={2.6} rotationIntensity={0.6} floatIntensity={0.5}>
        <mesh position={[0.18, 1.05, -0.42]} rotation={[0.7, 0.1, 0.2]}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial {...v.base} />
        </mesh>
      </Float>

      {/* Hex plinth */}
      <mesh castShadow position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.38, 0.22, 6]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      <TrophyBase v={v} stem={false} />
    </>
  );
}

// ─── 2023 · Winged Chalice (wide bowl with swept wings) ───────────────────────
function ChaliceTrophy({ v }: { v: VariantMats }) {
  const points = [
    new THREE.Vector2(0.06, 0.0),
    new THREE.Vector2(0.34, 0.08),
    new THREE.Vector2(0.56, 0.28),
    new THREE.Vector2(0.62, 0.5),
    new THREE.Vector2(0.56, 0.66),
    new THREE.Vector2(0.58, 0.74),
  ];
  return (
    <>
      <mesh castShadow>
        <latheGeometry args={[points, 64]} />
        <meshStandardMaterial {...v.cup} side={THREE.DoubleSide} />
      </mesh>

      {/* Rim band */}
      <mesh position={[0, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.58, 0.028, 12, 64]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      {/* Swept wings */}
      <mesh castShadow position={[-0.74, 0.58, 0]} rotation={[0, 0, 0.95]} scale={[1, 1, 0.32]}>
        <coneGeometry args={[0.2, 0.75, 24]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>
      <mesh castShadow position={[0.74, 0.58, 0]} rotation={[0, 0, -0.95]} scale={[1, 1, 0.32]}>
        <coneGeometry args={[0.2, 0.75, 24]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>

      <TrophyBase v={v} />
    </>
  );
}

// ─── 2022 · Championship Ring (upright ring with a gem bezel) ─────────────────
function RingTrophy({ v }: { v: VariantMats }) {
  return (
    <>
      <group position={[0, 0.52, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.4, 0.15, 24, 64]} />
          <meshStandardMaterial {...v.cup} />
        </mesh>
        {/* Bezel */}
        <mesh position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.16, 0.21, 0.12, 8]} />
          <meshStandardMaterial {...v.base} />
        </mesh>
        {/* Gem */}
        <mesh position={[0, 0.68, 0]} rotation={[0, Math.PI / 8, 0]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial {...GEM} />
        </mesh>
      </group>

      {/* Mount between ring and stem */}
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.14, 32]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      <TrophyBase v={v} />
    </>
  );
}

// ─── 2021 · Star Pillar (extruded star atop a column) ─────────────────────────
function StarTrophy({ v }: { v: VariantMats }) {
  const starGeometry = useMemo(() => {
    const outer = 0.5;
    const inner = 0.21;
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    geo.center();
    return geo;
  }, []);

  return (
    <>
      <mesh castShadow position={[0, 0.98, 0]} geometry={starGeometry}>
        <meshStandardMaterial {...v.cup} />
      </mesh>

      {/* Orb between star and column */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.09, 24, 16]} />
        <meshStandardMaterial {...ACCENT} />
      </mesh>

      {/* Column */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.13, 0.78, 32]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      <TrophyBase v={v} stem={false} />
    </>
  );
}

// ─── 2020 · Globe Trophy (orbiting-ring world champion globe) ─────────────────
function GlobeTrophy({ v }: { v: VariantMats }) {
  return (
    <>
      <group position={[0, 0.55, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.45, 48, 32]} />
          <meshStandardMaterial {...v.cup} />
        </mesh>
        {/* Equator band */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.455, 0.016, 12, 64]} />
          <meshStandardMaterial {...v.base} />
        </mesh>
        {/* Meridian band */}
        <mesh rotation={[0, 0.4, 0]}>
          <torusGeometry args={[0.455, 0.016, 12, 64]} />
          <meshStandardMaterial {...v.base} />
        </mesh>
        {/* Tilted orbit ring */}
        <mesh rotation={[1.15, 0.3, 0]}>
          <torusGeometry args={[0.64, 0.026, 12, 64]} />
          <meshStandardMaterial {...v.base} />
        </mesh>
      </group>

      {/* Cradle */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 0.18, 32]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      <TrophyBase v={v} />
    </>
  );
}

// ─── Pre-2020 · Founders Cup (shared lidded loving cup for all early years) ───
function VintageTrophy({ v }: { v: VariantMats }) {
  // Urn-shaped body: bulbous belly narrowing to a collared neck
  const points = [
    new THREE.Vector2(0.07, 0.0),
    new THREE.Vector2(0.3,  0.06),
    new THREE.Vector2(0.42, 0.22),
    new THREE.Vector2(0.44, 0.42),
    new THREE.Vector2(0.36, 0.62),
    new THREE.Vector2(0.3,  0.78),
    new THREE.Vector2(0.33, 0.9),
    new THREE.Vector2(0.4,  0.98),
  ];
  return (
    <>
      <mesh castShadow>
        <latheGeometry args={[points, 64]} />
        <meshStandardMaterial {...v.cup} side={THREE.DoubleSide} />
      </mesh>

      {/* Domed lid */}
      <mesh castShadow position={[0, 0.96, 0]} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>

      {/* Finial stem + orb */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.12, 16]} />
        <meshStandardMaterial {...v.base} />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.08, 24, 16]} />
        <meshStandardMaterial {...ACCENT} />
      </mesh>

      {/* Tall strap handles */}
      <mesh castShadow position={[-0.48, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.5, 1, 1]}>
        <torusGeometry args={[0.24, 0.035, 16, 32, Math.PI]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>
      <mesh castShadow position={[0.48, 0.6, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1.5, 1, 1]}>
        <torusGeometry args={[0.24, 0.035, 16, 32, Math.PI]} />
        <meshStandardMaterial {...v.cup} />
      </mesh>

      {/* Laurel bands around the belly */}
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.028, 12, 64]} />
        <meshStandardMaterial {...v.base} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.455, 0.018, 12, 64]} />
        <meshStandardMaterial {...v.base} />
      </mesh>

      {/* Engraved plaque on the front */}
      <mesh position={[0, 0.24, 0.42]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.26, 0.18, 0.02]} />
        <meshStandardMaterial {...ACCENT} />
      </mesh>

      <TrophyBase v={v} />
    </>
  );
}

// ─── Trophy: pick the design for the champion's season ────────────────────────
function Trophy({ variant, season }: { variant: TrophyVariant; season: string }) {
  const v = VARIANTS[variant];
  const { key } = getTrophyDesign(season);

  return (
    <group position={[0, 0.9, 0]}>
      {key === "cup"      && <ClassicCup v={v} />}
      {key === "football" && <FootballTrophy v={v} />}
      {key === "spire"    && <SpireTrophy v={v} />}
      {key === "chalice"  && <ChaliceTrophy v={v} />}
      {key === "ring"     && <RingTrophy v={v} />}
      {key === "star"     && <StarTrophy v={v} />}
      {key === "globe"    && <GlobeTrophy v={v} />}
      {key === "vintage"  && <VintageTrophy v={v} />}
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
function Scene({ variant, season }: { variant: TrophyVariant; season: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.4} rotationIntensity={0.04} floatIntensity={0.1}>
        <Trophy variant={variant} season={season} />
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
          <Scene variant={variant} season={champion.season} />
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
