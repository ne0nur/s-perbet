import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Bounds } from '@react-three/drei'
import * as THREE from 'three'

const BALL_URL = import.meta.env.BASE_URL + 'ball.glb'

function BallModel({ isHovered, isKicked, onKick }: { isHovered: boolean; isKicked: boolean; onKick?: () => void }) {
  const ref = useRef<THREE.Group>(null!)
  const { scene } = useGLTF(BALL_URL)
  const kickProgress = useRef(0)

  useFrame((_, delta) => {
    if (ref.current) {
      // Rotation um Y-Achse (schneller bei Hover)
      const speedMultiplier = isHovered ? 6 : 1
      ref.current.rotation.y += delta * 0.3 * speedMultiplier

      // Kick-Animation (Flip & Hop)
      if (isKicked) {
        kickProgress.current = Math.min(1, kickProgress.current + delta * 1.1)
        const t = kickProgress.current
        
        // 360-Grad Flip um X- und Z-Achse (sanfter Bogen)
        ref.current.rotation.x = Math.sin(t * Math.PI) * Math.PI * 1.5
        ref.current.rotation.z = Math.sin(t * Math.PI) * Math.PI * 0.75
      } else {
        kickProgress.current = 0
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, 8 * delta)
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, 0, 8 * delta)
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
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-3, -1, -2]} intensity={0.3} />

        <Bounds fit clip observe margin={1.15}>
          <Center>
            <BallModel isHovered={isHovered} isKicked={isKicked} onKick={onKick} />
          </Center>
        </Bounds>
      </Canvas>
    </div>
  )
}

useGLTF.preload(BALL_URL)
