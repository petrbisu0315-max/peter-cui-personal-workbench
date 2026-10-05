import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { BackgroundThemeId } from '../themes'

interface Props {
  theme: BackgroundThemeId
}

export function AtmosphericBackdrop({ theme }: Props) {
  const scene = useThree((state) => state.scene)

  // 512x320 canvas provides high visual fidelity with negligible CPU/GPU cost
  const [canvas, ctx] = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 320
    const g = c.getContext('2d')!
    return [c, g]
  }, [])

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [canvas])

  // Attach texture to scene.background
  useEffect(() => {
    scene.background = texture
    return () => {
      scene.background = null
      texture.dispose()
    }
  }, [scene, texture])

  // Pre-generate static star coordinates
  const stars = useMemo(() => {
    const arr: { x: number; y: number; r: number; alpha: number; speed: number }[] = []
    for (let i = 0; i < 90; i++) {
      arr.push({
        x: Math.random() * 512,
        y: Math.random() * 200,
        r: Math.random() * 1.5 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 2.5 + 1.0,
      })
    }
    return arr
  }, [])

  // Smooth transition weights between the 4 themes
  const weights = useRef({
    home: theme === 'home' ? 1 : 0,
    aurora: theme === 'aurora' ? 1 : 0,
    prairie: theme === 'prairie' ? 1 : 0,
    ocean: theme === 'ocean' ? 1 : 0,
  })

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    // Interpolate theme weights
    const rate = Math.min(1, delta * 3.8)
    const targetHome = theme === 'home' ? 1 : 0
    const targetAurora = theme === 'aurora' ? 1 : 0
    const targetPrairie = theme === 'prairie' ? 1 : 0
    const targetOcean = theme === 'ocean' ? 1 : 0

    weights.current.home += (targetHome - weights.current.home) * rate
    weights.current.aurora += (targetAurora - weights.current.aurora) * rate
    weights.current.prairie += (targetPrairie - weights.current.prairie) * rate
    weights.current.ocean += (targetOcean - weights.current.ocean) * rate

    const { home, aurora, prairie, ocean } = weights.current
    const w = 512
    const h = 320

    // Clear canvas
    ctx.clearRect(0, 0, w, h)

    // 1. HOME: Modern Minimalist Luxury Studio
    if (home > 0.01) {
      ctx.save()
      ctx.globalAlpha = home
      const homeGrad = ctx.createLinearGradient(0, 0, 0, h)
      homeGrad.addColorStop(0, '#e5e0d7')
      homeGrad.addColorStop(0.5, '#ded9d0')
      homeGrad.addColorStop(1, '#cbcfd4')
      ctx.fillStyle = homeGrad
      ctx.fillRect(0, 0, w, h)

      // Soft architectural ambient light falloff
      const ambientLight = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.45, w * 0.65)
      ambientLight.addColorStop(0, 'rgba(255, 250, 240, 0.45)')
      ambientLight.addColorStop(0.6, 'rgba(255, 245, 230, 0.12)')
      ambientLight.addColorStop(1, 'rgba(0, 0, 0, 0.08)')
      ctx.fillStyle = ambientLight
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    // 2. AURORA: Northern Lights Night Sky
    if (aurora > 0.01) {
      ctx.save()
      ctx.globalAlpha = aurora
      const auroraSky = ctx.createLinearGradient(0, 0, 0, h)
      auroraSky.addColorStop(0, '#040814')
      auroraSky.addColorStop(0.55, '#071326')
      auroraSky.addColorStop(1, '#02060d')
      ctx.fillStyle = auroraSky
      ctx.fillRect(0, 0, w, h)

      // Stars
      for (const s of stars) {
        const twinkle = Math.sin(time * s.speed + s.x) * 0.3 + 0.7
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * twinkle})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Undulating Aurora Curtains (multi-layered flowing sine waves)
      const layers = [
        { yBase: 125, amp: 26, freq: 0.018, speed: 0.85, color1: 'rgba(46, 196, 182, 0.55)', color2: 'rgba(56, 176, 0, 0.35)' },
        { yBase: 145, amp: 34, freq: 0.024, speed: -0.65, color1: 'rgba(72, 229, 194, 0.48)', color2: 'rgba(114, 9, 183, 0.38)' },
        { yBase: 165, amp: 22, freq: 0.032, speed: 1.1, color1: 'rgba(64, 219, 140, 0.42)', color2: 'rgba(32, 201, 151, 0.25)' },
      ]

      for (const l of layers) {
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 8) {
          const y = l.yBase + Math.sin(x * l.freq + time * l.speed) * l.amp + Math.cos(x * 0.012 - time * 0.5) * 12
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()

        const curtainGrad = ctx.createLinearGradient(0, l.yBase - l.amp, 0, l.yBase + l.amp + 80)
        curtainGrad.addColorStop(0, l.color1)
        curtainGrad.addColorStop(0.5, l.color2)
        curtainGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = curtainGrad
        ctx.fill()
      }
      ctx.restore()
    }

    // 3. PRAIRIE: Vast Open Sunny Horizon & Meadow
    if (prairie > 0.01) {
      ctx.save()
      ctx.globalAlpha = prairie
      // Sky to warm horizon
      const prairieSky = ctx.createLinearGradient(0, 0, 0, h)
      prairieSky.addColorStop(0, '#6ea6da')
      prairieSky.addColorStop(0.48, '#bde0fe')
      prairieSky.addColorStop(0.68, '#fde2a3')
      prairieSky.addColorStop(0.78, '#e9c46a')
      prairieSky.addColorStop(1, '#4f772d')
      ctx.fillStyle = prairieSky
      ctx.fillRect(0, 0, w, h)

      // Warm Golden Sun Disc
      const sunGrad = ctx.createRadialGradient(w * 0.62, h * 0.46, 8, w * 0.62, h * 0.46, 95)
      sunGrad.addColorStop(0, 'rgba(255, 252, 235, 0.95)')
      sunGrad.addColorStop(0.3, 'rgba(255, 225, 140, 0.5)')
      sunGrad.addColorStop(1, 'rgba(255, 210, 110, 0)')
      ctx.fillStyle = sunGrad
      ctx.fillRect(0, 0, w, h)

      // Rolling distant green meadow hills
      ctx.beginPath()
      ctx.moveTo(0, h * 0.73)
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.73 + Math.sin(x * 0.015) * 8 + Math.cos(x * 0.008) * 6
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h * 0.73 + Math.sin(w * 0.015) * 8 + Math.cos(w * 0.008) * 6)
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fillStyle = '#4f772d'
      ctx.fill()

      // Foreground grass slope
      ctx.beginPath()
      ctx.moveTo(0, h * 0.82)
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.82 + Math.cos(x * 0.018) * 10
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h * 0.82 + Math.cos(w * 0.018) * 10)
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fillStyle = '#31572c'
      ctx.fill()
      ctx.restore()
    }

    // 4. OCEAN: Coastal Seaside with Cascading Waves
    if (ocean > 0.01) {
      ctx.save()
      ctx.globalAlpha = ocean
      // Azure sky to ocean horizon
      const oceanSky = ctx.createLinearGradient(0, 0, 0, h)
      oceanSky.addColorStop(0, '#48cae4')
      oceanSky.addColorStop(0.48, '#ade8f4')
      oceanSky.addColorStop(0.55, '#0096c7')
      oceanSky.addColorStop(0.72, '#0077b6')
      oceanSky.addColorStop(1, '#023e8a')
      ctx.fillStyle = oceanSky
      ctx.fillRect(0, 0, w, h)

      // Sun reflection shimmer on horizon
      const sunShimmer = ctx.createRadialGradient(w * 0.5, h * 0.54, 4, w * 0.5, h * 0.54, 80)
      sunShimmer.addColorStop(0, 'rgba(255, 255, 240, 0.7)')
      sunShimmer.addColorStop(0.4, 'rgba(255, 245, 200, 0.25)')
      sunShimmer.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = sunShimmer
      ctx.fillRect(0, 0, w, h)

      // Flowing animated ocean wave ripples (cascading wave bands)
      const waveLines = [
        { yBase: h * 0.62, speed: 1.4, amp: 4, width: 2, color: 'rgba(224, 251, 252, 0.6)' },
        { yBase: h * 0.71, speed: 1.9, amp: 6, width: 3, color: 'rgba(202, 240, 248, 0.5)' },
        { yBase: h * 0.81, speed: 2.3, amp: 8, width: 4, color: 'rgba(144, 224, 239, 0.45)' },
        { yBase: h * 0.91, speed: 2.8, amp: 10, width: 5, color: 'rgba(255, 255, 255, 0.4)' },
      ]

      for (const wl of waveLines) {
        ctx.beginPath()
        ctx.strokeStyle = wl.color
        ctx.lineWidth = wl.width
        for (let x = 0; x <= w; x += 10) {
          const y = wl.yBase + Math.sin(x * 0.035 - time * wl.speed) * wl.amp + Math.cos(x * 0.015 + time * 0.5) * 3
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    // Flag texture for upload to GPU
    texture.needsUpdate = true
  })

  return null
}
