import type { LightingMode } from './lighting'

export type BackgroundThemeId = 'home' | 'aurora' | 'prairie' | 'ocean'

export type EnvironmentPalette = {
  background: string
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  keyColor: string
  keyIntensity: number
  fillColor: string
  fillIntensity: number
  lampMultiplier: number
  lampWarmth: string
}

type BackgroundTheme = {
  id: BackgroundThemeId
  name: string
  fullName: string
  description: string
  preview?: string
  palette: EnvironmentPalette
  night: EnvironmentPalette
}

export const BACKGROUND_THEMES: Record<BackgroundThemeId, BackgroundTheme> = {
  home: {
    id: 'home', name: 'Interior', fullName: 'Modern office · 现代办公室',
    description: 'City light, stone & walnut',
    preview: '/images/environments/home-office-c76bf3d06e.webp',
    palette: { background: '#d9ddda', hemiSky: '#f4f7f3', hemiGround: '#a0a39d', hemiIntensity: 2.25, keyColor: '#fff4e5', keyIntensity: 2.3, fillColor: '#dce8ef', fillIntensity: 1.25, lampMultiplier: 0.8, lampWarmth: '#ffe8cd' },
    night: { background: '#858b87', hemiSky: '#e1e8e6', hemiGround: '#93978e', hemiIntensity: 1.55, keyColor: '#f5e8d2', keyIntensity: 1.1, fillColor: '#c9dae6', fillIntensity: 0.95, lampMultiplier: 0.7, lampWarmth: '#ffe8cd' },
  },
  aurora: {
    id: 'aurora', name: 'Aurora', fullName: 'Northern lights · 极光',
    description: 'Quiet skies above the Arctic',
    palette: { background: '#101e2a', hemiSky: '#c4dcd7', hemiGround: '#788892', hemiIntensity: 1.65, keyColor: '#e3ebf0', keyIntensity: 1.25, fillColor: '#adccc6', fillIntensity: 0.9, lampMultiplier: 0.85, lampWarmth: '#ffe6c7' },
    night: { background: '#0c1720', hemiSky: '#b8d4d0', hemiGround: '#6f7d89', hemiIntensity: 1.25, keyColor: '#d1dbe4', keyIntensity: 0.85, fillColor: '#abc8c1', fillIntensity: 0.8, lampMultiplier: 0.9, lampWarmth: '#ffe6c7' },
  },
  prairie: {
    id: 'prairie', name: 'Meadow', fullName: 'Open grassland · 草原',
    description: 'Rolling hills, a slow summer breeze',
    palette: { background: '#b7c2bd', hemiSky: '#f5efdc', hemiGround: '#969775', hemiIntensity: 2.25, keyColor: '#fff0d1', keyIntensity: 2.3, fillColor: '#dce5e6', fillIntensity: 1.15, lampMultiplier: 0.65, lampWarmth: '#ffe5bd' },
    night: { background: '#454e50', hemiSky: '#dedac8', hemiGround: '#7d816c', hemiIntensity: 1.35, keyColor: '#f1dfbf', keyIntensity: 0.9, fillColor: '#cad7e1', fillIntensity: 0.85, lampMultiplier: 0.8, lampWarmth: '#ffe5bd' },
  },
  ocean: {
    id: 'ocean', name: 'Coast', fullName: 'Coastal horizon · 海边',
    description: 'Sea mist & silver-blue water',
    palette: { background: '#b3c9ca', hemiSky: '#f1f4ee', hemiGround: '#889da3', hemiIntensity: 2.3, keyColor: '#fff2da', keyIntensity: 2.4, fillColor: '#d3e6ea', fillIntensity: 1.25, lampMultiplier: 0.65, lampWarmth: '#ffe7c6' },
    night: { background: '#3e535e', hemiSky: '#cedde2', hemiGround: '#718a95', hemiIntensity: 1.35, keyColor: '#e6e3d7', keyIntensity: 0.9, fillColor: '#c5d8e3', fillIntensity: 0.9, lampMultiplier: 0.8, lampWarmth: '#ffe7c6' },
  },
}

export const THEME_LIST = Object.values(BACKGROUND_THEMES)
export const DEFAULT_THEME_ID: BackgroundThemeId = 'home'
export const THEME_KEY = 'peter-workbench-theme'

export function resolveTheme(value: string | null): BackgroundThemeId {
  return THEME_LIST.some((theme) => theme.id === value) ? value as BackgroundThemeId : DEFAULT_THEME_ID
}

export function environmentIsDark(theme: BackgroundThemeId, lighting: LightingMode) {
  return theme === 'aurora' || lighting === 'night'
}

// Exponential convergence is stable even after a suspended tab or a very slow frame.
export function advanceThemeWeights(weights: number[], theme: BackgroundThemeId, delta: number, reduced: boolean) {
  const alpha = reduced ? 1 : 1 - Math.exp(-Math.max(0, delta) * 3.5)
  return THEME_LIST.map((item, index) => weights[index] + ((item.id === theme ? 1 : 0) - weights[index]) * alpha)
}
