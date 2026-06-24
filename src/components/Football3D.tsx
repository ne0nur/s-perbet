import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const BALL_URL = import.meta.env.BASE_URL + 'ball.glb'

function BallModel() {
  const ref = useRef<THREE.Group>(null!)
  const { scene } = useGLTF(BALL_URL)

  // Färbe die Materialien — das Modell hat 2 graue Default-Materialien
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material]

        materials.forEach((mat, i) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            // Material 0 = schwarze Pentagon-Patches
            if (i === 0) {
              mat.color.set('#1a1a1a')
              mat.roughness = 0.7
              mat.metalness = 0.05
            }
            // Material 1 = weiße Hexagon-Patches
            else {
              mat.color.set('#f5f0e5')
              mat.roughness = 0.6
              mat.metalness = 0.02
            }
          }
        })
      }
    })
  }, [scene])

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
        <ambientLight intensity={0.4} />
        <hemisphereLight
          args={['#ffffff', '#1a1a2e', 0.3]}
        />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.4}
          castShadow={false}
        />
        <directionalLight
          position={[-3, -1, -2]}
          intensity={0.25}
        />
        <pointLight
          position={[1, 2, 3]}
          intensity={0.5}
          color="#fff8e7"
        />
        <BallModel />
      </Canvas>
    </div>
  )
}

// Preload the model
useGLTF.preload(BALL_URL)
