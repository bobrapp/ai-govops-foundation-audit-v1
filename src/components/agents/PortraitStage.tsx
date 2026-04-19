// 3D portrait stage for /agents/chat header.
// Renders the active speaker's JPG portrait as a textured plane on a stylised
// pedestal. Camera dollies smoothly when the active speaker changes (handoff).
// Falls back to a flat <img> if WebGL is unavailable.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { portraitFor } from "@/data/agent-personas";

interface PortraitStageProps {
  speakerSlug: string | null;
  speakerName?: string;
  isChief?: boolean;
  className?: string;
}

const PortraitBust = ({ src, isChief }: { src: string; isChief: boolean }) => {
  const tex = useLoader(THREE.TextureLoader, src);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle parallax tilt with mouse
      const { x, y } = state.pointer;
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, x * 0.18, 0.06);
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -y * 0.12, 0.06);
    }
    if (glowRef.current) {
      glowRef.current.rotation.z += 0.0015;
    }
  });

  // Determine plane aspect from texture once loaded
  const aspect = tex.image ? tex.image.width / tex.image.height : 0.8;
  const planeH = 2.4;
  const planeW = planeH * aspect;

  return (
    <group>
      {/* Soft halo */}
      <mesh ref={glowRef} position={[0, 0.1, -0.4]}>
        <ringGeometry args={[1.45, 1.95, 96]} />
        <meshBasicMaterial
          color={isChief ? "#f4b942" : "#7aa2f7"}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Portrait plane */}
      <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.25}>
        <mesh ref={meshRef} castShadow>
          <planeGeometry args={[planeW, planeH, 1, 1]} />
          <meshStandardMaterial
            map={tex}
            transparent
            roughness={0.55}
            metalness={0.15}
            emissive={isChief ? "#3a2a08" : "#0a1a30"}
            emissiveIntensity={0.25}
          />
        </mesh>
      </Float>

      {/* Pedestal */}
      <mesh position={[0, -1.55, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.25, 0.18, 64]} />
        <meshStandardMaterial color="#1a1f2e" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, -1.7, 0]}>
        <cylinderGeometry args={[1.25, 1.4, 0.12, 64]} />
        <meshStandardMaterial color="#0d111c" roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
};

// Smooth camera dolly that nudges position on speaker change
const CameraDolly = ({ trigger }: { trigger: string | null }) => {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.1, 4.6));
  const wobble = useRef(0);

  useEffect(() => {
    // On handoff, dolly back briefly then return — feels like a "cut to new speaker"
    wobble.current = 1;
    const offsetX = (Math.random() - 0.5) * 0.6;
    target.current.set(offsetX, 0.1 + (Math.random() - 0.5) * 0.2, 5.3);
    const t = setTimeout(() => {
      target.current.set(0, 0.1, 4.6);
    }, 380);
    return () => clearTimeout(t);
  }, [trigger]);

  useFrame(() => {
    camera.position.lerp(target.current, 0.07);
    camera.lookAt(0, 0, 0);
  });
  return null;
};

export const PortraitStage = ({
  speakerSlug,
  speakerName,
  isChief = false,
  className,
}: PortraitStageProps) => {
  const [glError, setGlError] = useState(false);
  const src = useMemo(() => portraitFor(speakerSlug), [speakerSlug]);

  if (!src) {
    return (
      <div className={`grid place-items-center bg-card-grad ${className ?? ""}`}>
        <span className="text-xs font-mono text-muted-foreground">no portrait</span>
      </div>
    );
  }

  if (glError) {
    return (
      <div className={`relative overflow-hidden ${className ?? ""}`}>
        <img src={src} alt={speakerName ?? "speaker"} className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/0 to-background/0" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.1, 4.6], fov: 38 }}
        onCreated={({ gl }) => {
          try {
            gl.setClearColor(new THREE.Color("#0a0d18"), 1);
          } catch {
            setGlError(true);
          }
        }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        fallback={<div className="text-xs text-muted-foreground p-4">3D unavailable</div>}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[2.5, 3, 4]}
            intensity={1.2}
            castShadow
            color={isChief ? "#fff3cf" : "#dce6ff"}
          />
          <directionalLight position={[-3, -1, 2]} intensity={0.4} color="#5a7fb8" />
          <Environment preset="city" />
          <PortraitBust src={src} isChief={isChief} />
          <CameraDolly trigger={speakerSlug} />
        </Suspense>
      </Canvas>
      {/* Caption overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background via-background/70 to-transparent">
        <div className="text-[10px] font-mono uppercase tracking-wider text-primary/80">
          {isChief ? "Chief auditor speaking" : "Active speaker"}
        </div>
        <div className="text-sm font-semibold truncate">{speakerName ?? "—"}</div>
      </div>
    </div>
  );
};
