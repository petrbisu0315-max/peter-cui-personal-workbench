import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { advanceThemeWeights, THEME_LIST } from '../themes'
import type { BackgroundThemeId } from '../themes'
import { useReducedMotion } from '../useReducedMotion'
import type { LightingMix } from './AccentLights'
import fragmentShader from './environment.frag.glsl?raw'

export const environmentVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`

export function EnvironmentBackground({ theme, mix }: { theme: BackgroundThemeId; mix: LightingMix }) {
  const reduced = useReducedMotion()
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({
    uWeights: { value: new THREE.Vector4(...THEME_LIST.map((item) => item.id === theme ? 1 : 0)) },
    uTime: { value: 0 },
    uNight: { value: mix.current.value },
    uAspect: { value: 1.65 },
    uView: { value: new THREE.Vector2() },
  }), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    if (reduced && material.current) material.current.uniforms.uTime.value = 0
  }, [reduced])

  useFrame(({ camera, size }, delta) => {
    if (!material.current) return
    // Mutate the material's uniforms: R3F may copy the supplied uniform wrappers.
    const live = material.current.uniforms
    live.uWeights.value.fromArray(advanceThemeWeights(live.uWeights.value.toArray(), theme, delta, reduced))
    live.uNight.value = mix.current.value
    live.uAspect.value = size.width / Math.max(size.height, 1)
    if (!reduced && !document.hidden) live.uTime.value += Math.min(delta, 0.1)
    camera.getWorldDirection(direction)
    live.uView.value.set(direction.x * .018, direction.y * .012)
  })

  return (
    <mesh name="Environment backdrop" renderOrder={-1000} frustumCulled={false} raycast={() => undefined}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={environmentVertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  )
}
