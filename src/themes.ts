export type BackgroundThemeId = 'home' | 'aurora' | 'prairie' | 'ocean'

export interface BackgroundTheme {
  id: BackgroundThemeId
  name: string
  fullName: string
  englishName: string
  icon: string
  description: string
  // Palette settings for Three.js scene background, fog, and lights
  palette: {
    background: string
    fogColor: string
    fogNear: number
    fogFar: number
    hemiSky: string
    hemiGround: string
    hemiIntensity: number
    keyColor: string
    keyIntensity: number
    keyPosition: [number, number, number]
    fillColor: string
    fillIntensity: number
    fillPosition: [number, number, number]
    ambientGlow: string
    ambientGlowIntensity: number
    lampMultiplier: number
    lampWarmth: string
  }
  // CSS shell background token
  shellBg: string
  shellLine: string
  textColor: string
  navActiveBg: string
}

export const BACKGROUND_THEMES: Record<BackgroundThemeId, BackgroundTheme> = {
  home: {
    id: 'home',
    name: '现代简约',
    fullName: '现代高级简约家庭内',
    englishName: 'Modern Studio',
    icon: '🏠',
    description: '温润极简的现代室内工作室，柔和漫射日光与沉静建筑质感',
    palette: {
      background: '#ded9d0',
      fogColor: '#ded9d0',
      fogNear: 12,
      fogFar: 25,
      hemiSky: '#fff8ef',
      hemiGround: '#8f877d',
      hemiIntensity: 2.3,
      keyColor: '#fff5e4',
      keyIntensity: 2.8,
      keyPosition: [-4, 8, 5],
      fillColor: '#dbe5f2',
      fillIntensity: 1.2,
      fillPosition: [5, 3, -4],
      ambientGlow: '#e8dcce',
      ambientGlowIntensity: 0.4,
      lampMultiplier: 0.8,
      lampWarmth: '#ffe4b5',
    },
    shellBg: '#ded9d0',
    shellLine: 'rgba(35, 33, 29, 0.14)',
    textColor: '#1d1c1a',
    navActiveBg: 'rgba(29, 28, 26, 0.08)',
  },
  aurora: {
    id: 'aurora',
    name: '极光',
    fullName: '极地幻境极光',
    englishName: 'Aurora Borealis',
    icon: '🌌',
    description: '深邃纯净的北极夜空，星光闪烁，绿色与青紫色的极光在空中静谧流动',
    palette: {
      background: '#070f1e',
      fogColor: '#070f1e',
      fogNear: 10,
      fogFar: 28,
      hemiSky: '#2ec4b6',
      hemiGround: '#040912',
      hemiIntensity: 1.2,
      keyColor: '#90b4ff',
      keyIntensity: 1.5,
      keyPosition: [-4, 7, 5],
      fillColor: '#7209b7',
      fillIntensity: 0.9,
      fillPosition: [5, 4, -4],
      ambientGlow: '#20bf6b',
      ambientGlowIntensity: 1.1,
      lampMultiplier: 1.4,
      lampWarmth: '#ffd166',
    },
    shellBg: '#070f1e',
    shellLine: 'rgba(46, 196, 182, 0.22)',
    textColor: '#e8f7f5',
    navActiveBg: 'rgba(46, 196, 182, 0.16)',
  },
  prairie: {
    id: 'prairie',
    name: '草原',
    fullName: '开阔晴空与金色原野',
    englishName: 'Golden Prairie',
    icon: '🌾',
    description: '辽阔辽远的绿草与金黄原野地平线，开阔晴空，微风拂面',
    palette: {
      background: '#a4cbeb',
      fogColor: '#a4cbeb',
      fogNear: 14,
      fogFar: 30,
      hemiSky: '#fdf0d5',
      hemiGround: '#588157',
      hemiIntensity: 2.6,
      keyColor: '#fff1c5',
      keyIntensity: 3.2,
      keyPosition: [-3, 9, 6],
      fillColor: '#94d2bd',
      fillIntensity: 1.4,
      fillPosition: [6, 3, -3],
      ambientGlow: '#e9c46a',
      ambientGlowIntensity: 0.5,
      lampMultiplier: 0.4,
      lampWarmth: '#ffeaa7',
    },
    shellBg: '#95bee0',
    shellLine: 'rgba(49, 87, 44, 0.18)',
    textColor: '#1a2e1b',
    navActiveBg: 'rgba(49, 87, 44, 0.12)',
  },
  ocean: {
    id: 'ocean',
    name: '海边',
    fullName: '海风与蔚蓝海岸',
    englishName: 'Ocean Coast',
    icon: '🌊',
    description: '海天一色的蔚蓝海洋，清爽海风，波光粼粼的浪花与沿海阳光',
    palette: {
      background: '#48bfe3',
      fogColor: '#48bfe3',
      fogNear: 13,
      fogFar: 28,
      hemiSky: '#caf0f8',
      hemiGround: '#0077b6',
      hemiIntensity: 2.7,
      keyColor: '#fffbf0',
      keyIntensity: 3.3,
      keyPosition: [-4, 8, 5],
      fillColor: '#90e0ef',
      fillIntensity: 1.6,
      fillPosition: [5, 2, -4],
      ambientGlow: '#0096c7',
      ambientGlowIntensity: 0.6,
      lampMultiplier: 0.5,
      lampWarmth: '#ffd166',
    },
    shellBg: '#48bfe3',
    shellLine: 'rgba(3, 4, 94, 0.18)',
    textColor: '#03045e',
    navActiveBg: 'rgba(0, 119, 182, 0.15)',
  },
}

export const THEME_LIST = Object.values(BACKGROUND_THEMES)
export const DEFAULT_THEME_ID: BackgroundThemeId = 'home'
