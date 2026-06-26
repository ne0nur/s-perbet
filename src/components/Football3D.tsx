import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Bounds } from '@react-three/drei'
import * as THREE from 'three'

const BALL_URL = import.meta.env.BASE_URL + 'ball.glb'

function BallModel({ isHovered, isKicked, onKick }: { isHovered: boolean; isKicked: boolean; onKick?: () => void }) {
  const ref = useRef<THREE.Group>(null!)
  const { scene } = useGLTF(BALL_URL)
  const kickProgress = useRef(0)

  useFrame((state, delta) => {
    if (ref.current) {
      const mouse = state.pointer
      // Rotation um Y-Achse (schneller bei Hover)
      const speedMultiplier = isHovered ? 4 : 1
      ref.current.rotation.y += delta * 0.25 * speedMultiplier

      // Kick-Animation (Flip & Hop)
      if (isKicked) {
        kickProgress.current = Math.min(1, kickProgress.current + delta * 1.1)
        const t = kickProgress.current
        
        // 360-Grad Flip um X- und Z-Achse (sanfter Bogen)
        ref.current.rotation.x = Math.sin(t * Math.PI) * Math.PI * 1.5
        ref.current.rotation.z = Math.sin(t * Math.PI) * Math.PI * 0.75
      } else {
        kickProgress.current = 0
        // Lerp towards mouse coordinates for interactive tilt
        const targetRx = -mouse.y * 0.35
        const targetRz = mouse.x * 0.35
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, targetRx, 5 * delta)
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, targetRz, 5 * delta)
      }
    }
  })

  return (
    <primitive 
      ref={ref} 
      object={scene} 
      onClick={(e: { stopPropagation: () => void }) => {
        e.stopPropagation()
        if (onKick) onKick()
      }} 
    />
  )
}

interface Football3DProps {
  className?: string
  isHovered?: boolean
  isKicked?: boolean
  onKick?: () => void
}

export function Football3D({ className, isHovered = false, isKicked = false, onKick }: Football3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Studio-Beleuchtung Setup */}
        <ambientLight intensity={0.25} />
        {/* Key Light (Hauptlicht) */}
        <directionalLight position={[5, 5, 4]} intensity={1.8} />
        {/* Fill Light (Fülllicht für kühle Schatten) */}
        <directionalLight position={[-5, -2, 2]} intensity={0.5} color="#a5b4fc" />
        {/* Rim Light (Gegenlicht für goldene Konturen) */}
        <directionalLight position={[-3, 4, -4]} intensity={2.2} color="#ffe1a7" />

        <Bounds fit clip observe margin={1.45}>
          <Center>
            <BallModel isHovered={isHovered} isKicked={isKicked} onKick={onKick} />
          </Center>
        </Bounds>
      </Canvas>
    </div>
  )
}

useGLTF.preload(BALL_URL)
