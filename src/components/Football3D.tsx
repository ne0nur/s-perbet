import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Bounds } from '@react-three/drei'
import * as THREE from 'three'

const BALL_URL = import.meta.env.BASE_URL + 'ball.glb'

function BallModel() {
  const ref = useRef<THREE.Group>(null!)
  const { scene } = useGLTF(BALL_URL)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.3
    }
  })

  return <primitive ref={ref} object={scene} />
}

export function Football3D({ className }: { className?: string }) {
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

        <Bounds fit clip observe margin={0.8}>
          <Center>
            <BallModel />
          </Center>
        </Bounds>
      </Canvas>
    </div>
  )
}

useGLTF.preload(BALL_URL)
