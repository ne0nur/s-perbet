import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function BallModel() {
  const ref = useRef<THREE.Group>(null!)
  const { scene } = useGLTF('/ball.glb')

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.3
      ref.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.15
    }
  })

  return (
    <primitive
      ref={ref}
      object={scene}
      scale={1.5}
      position={[0, 0, 0]}
    />
  )
}

export function Football3D({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.2}
          castShadow={false}
        />
        <directionalLight
          position={[-3, -1, -2]}
          intensity={0.3}
        />
        <BallModel />
      </Canvas>
    </div>
  )
}

// Preload the model
useGLTF.preload('/ball.glb')
