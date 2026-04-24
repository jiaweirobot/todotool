import { useState, useEffect, useCallback } from 'react'

const isTauri = '__TAURI_INTERNALS__' in window

export const THEMES = [
  { id: 'dawn', name: '晨雾', emoji: '🌅' },
  { id: 'midnight', name: '暗夜', emoji: '🌙' },
  { id: 'sakura', name: '樱花', emoji: '🌸' },
  { id: 'ocean', name: '海洋', emoji: '🌊' },
  { id: 'forest', name: '森林', emoji: '🌿' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

interface ThemeVars {
  [key: string]: string
}

const THEME_VARS: Record<ThemeId, ThemeVars> = {
  dawn: {
    '--bg-primary': '#faf8f5',
    '--bg-gradient': 'linear-gradient(145deg, #fef3e2 0%, #fce7f3 35%, #ede9fe 70%, #e0f2fe 100%)',
    '--bg-card': 'rgba(255, 255, 255, 0.72)',
    '--bg-card-hover': 'rgba(255, 255, 255, 0.88)',
    '--bg-input': 'rgba(255, 255, 255, 0.5)',
    '--bg-titlebar': 'rgba(255, 255, 255, 0.6)',
    '--border-color': 'rgba(0, 0, 0, 0.06)',
    '--border-light': 'rgba(0, 0, 0, 0.03)',
    '--text-primary': '#1c1917',
    '--text-secondary': '#a855f7',
    '--text-muted': '#9ca3af',
    '--text-placeholder': '#c4b5a0',
    '--text-title-bar': '#44403c',
    '--accent': '#a855f7',
    '--accent-glow': 'rgba(168, 85, 247, 0.1)',
    '--deploy-bg': 'linear-gradient(135deg, #f59e0b 0%, #f97316 40%, #ef4444 100%)',
    '--deploy-text': '#fff',
    '--urgency-low': '#22c55e',
    '--urgency-medium': '#a855f7',
    '--urgency-high': '#ef4444',
    '--urgency-urgent': '#f97316',
    '--check-color': '#a855f7',
    '--check-glow': 'rgba(168, 85, 247, 0.2)',
    '--completed-opacity': '0.4',
    '--shadow-card': '0 1px 3px rgba(0, 0, 0, 0.04)',
    '--shadow-card-hover': '0 8px 24px rgba(168, 85, 247, 0.08)',
    '--pin-active': '#f59e0b',
    '--pin-inactive': '#d1d5db',
    '--scrollbar-thumb': 'rgba(0, 0, 0, 0.08)',
    '--scrollbar-hover': 'rgba(0, 0, 0, 0.14)',
  },
  midnight: {
    '--bg-primary': '#0f0f14',
    '--bg-gradient': 'linear-gradient(145deg, #0f0f14 0%, #16131e 35%, #111520 70%, #0d1117 100%)',
    '--bg-card': 'rgba(255, 255, 255, 0.05)',
    '--bg-card-hover': 'rgba(255, 255, 255, 0.08)',
    '--bg-input': 'rgba(255, 255, 255, 0.04)',
    '--bg-titlebar': 'rgba(255, 255, 255, 0.06)',
    '--border-color': 'rgba(255, 255, 255, 0.07)',
    '--border-light': 'rgba(255, 255, 255, 0.03)',
    '--text-primary': '#f0ecf8',
    '--text-secondary': '#d4b4fe',
    '--text-muted': '#8078a0',
    '--text-placeholder': '#4d4566',
    '--text-title-bar': '#e0d8ee',
    '--accent': '#c084fc',
    '--accent-glow': 'rgba(192, 132, 252, 0.1)',
    '--deploy-bg': 'linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)',
    '--deploy-text': '#fff',
    '--urgency-low': '#34d399',
    '--urgency-medium': '#c084fc',
    '--urgency-high': '#fb7185',
    '--urgency-urgent': '#fb923c',
    '--check-color': '#c084fc',
    '--check-glow': 'rgba(192, 132, 252, 0.25)',
    '--completed-opacity': '0.35',
    '--shadow-card': '0 1px 3px rgba(0, 0, 0, 0.3)',
    '--shadow-card-hover': '0 8px 24px rgba(192, 132, 252, 0.06)',
    '--pin-active': '#fbbf24',
    '--pin-inactive': '#3d3650',
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.06)',
    '--scrollbar-hover': 'rgba(255, 255, 255, 0.12)',
  },
  sakura: {
    '--bg-primary': '#fdf2f8',
    '--bg-gradient': 'linear-gradient(145deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 60%, #fdf2f8 100%)',
    '--bg-card': 'rgba(255, 255, 255, 0.7)',
    '--bg-card-hover': 'rgba(255, 255, 255, 0.85)',
    '--bg-input': 'rgba(255, 255, 255, 0.5)',
    '--bg-titlebar': 'rgba(255, 228, 240, 0.6)',
    '--border-color': 'rgba(236, 72, 153, 0.08)',
    '--border-light': 'rgba(236, 72, 153, 0.04)',
    '--text-primary': '#4a1942',
    '--text-secondary': '#ec4899',
    '--text-muted': '#c9a0b8',
    '--text-placeholder': '#dbb8cc',
    '--text-title-bar': '#9d174d',
    '--accent': '#ec4899',
    '--accent-glow': 'rgba(236, 72, 153, 0.1)',
    '--deploy-bg': 'linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%)',
    '--deploy-text': '#fff',
    '--urgency-low': '#34d399',
    '--urgency-medium': '#ec4899',
    '--urgency-high': '#ef4444',
    '--urgency-urgent': '#f97316',
    '--check-color': '#ec4899',
    '--check-glow': 'rgba(236, 72, 153, 0.2)',
    '--completed-opacity': '0.4',
    '--shadow-card': '0 1px 3px rgba(236, 72, 153, 0.04)',
    '--shadow-card-hover': '0 8px 24px rgba(236, 72, 153, 0.08)',
    '--pin-active': '#ec4899',
    '--pin-inactive': '#e4b8ce',
    '--scrollbar-thumb': 'rgba(236, 72, 153, 0.1)',
    '--scrollbar-hover': 'rgba(236, 72, 153, 0.2)',
  },
  ocean: {
    '--bg-primary': '#0c1222',
    '--bg-gradient': 'linear-gradient(145deg, #0c1222 0%, #0f1b35 35%, #0a1628 70%, #071018 100%)',
    '--bg-card': 'rgba(56, 189, 248, 0.04)',
    '--bg-card-hover': 'rgba(56, 189, 248, 0.08)',
    '--bg-input': 'rgba(255, 255, 255, 0.04)',
    '--bg-titlebar': 'rgba(56, 189, 248, 0.06)',
    '--border-color': 'rgba(56, 189, 248, 0.08)',
    '--border-light': 'rgba(56, 189, 248, 0.04)',
    '--text-primary': '#e8f4fe',
    '--text-secondary': '#5ecbfa',
    '--text-muted': '#5a90aa',
    '--text-placeholder': '#345568',
    '--text-title-bar': '#a0dcfc',
    '--accent': '#38bdf8',
    '--accent-glow': 'rgba(56, 189, 248, 0.1)',
    '--deploy-bg': 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)',
    '--deploy-text': '#fff',
    '--urgency-low': '#34d399',
    '--urgency-medium': '#38bdf8',
    '--urgency-high': '#fb7185',
    '--urgency-urgent': '#fb923c',
    '--check-color': '#38bdf8',
    '--check-glow': 'rgba(56, 189, 248, 0.25)',
    '--completed-opacity': '0.35',
    '--shadow-card': '0 1px 3px rgba(0, 0, 0, 0.3)',
    '--shadow-card-hover': '0 8px 24px rgba(56, 189, 248, 0.06)',
    '--pin-active': '#38bdf8',
    '--pin-inactive': '#264055',
    '--scrollbar-thumb': 'rgba(56, 189, 248, 0.08)',
    '--scrollbar-hover': 'rgba(56, 189, 248, 0.15)',
  },
  forest: {
    '--bg-primary': '#f0fdf4',
    '--bg-gradient': 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 30%, #d1fae5 60%, #ecfdf5 100%)',
    '--bg-card': 'rgba(255, 255, 255, 0.68)',
    '--bg-card-hover': 'rgba(255, 255, 255, 0.82)',
    '--bg-input': 'rgba(255, 255, 255, 0.5)',
    '--bg-titlebar': 'rgba(220, 252, 231, 0.6)',
    '--border-color': 'rgba(34, 197, 94, 0.08)',
    '--border-light': 'rgba(34, 197, 94, 0.04)',
    '--text-primary': '#14532d',
    '--text-secondary': '#16a34a',
    '--text-muted': '#86a896',
    '--text-placeholder': '#a8c8b4',
    '--text-title-bar': '#166534',
    '--accent': '#16a34a',
    '--accent-glow': 'rgba(22, 163, 74, 0.1)',
    '--deploy-bg': 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    '--deploy-text': '#fff',
    '--urgency-low': '#22c55e',
    '--urgency-medium': '#16a34a',
    '--urgency-high': '#ef4444',
    '--urgency-urgent': '#f97316',
    '--check-color': '#16a34a',
    '--check-glow': 'rgba(22, 163, 74, 0.2)',
    '--completed-opacity': '0.4',
    '--shadow-card': '0 1px 3px rgba(22, 163, 74, 0.04)',
    '--shadow-card-hover': '0 8px 24px rgba(22, 163, 74, 0.08)',
    '--pin-active': '#16a34a',
    '--pin-inactive': '#a8c8b4',
    '--scrollbar-thumb': 'rgba(22, 163, 74, 0.1)',
    '--scrollbar-hover': 'rgba(22, 163, 74, 0.2)',
  },
}

function applyTheme(id: ThemeId): void {
  const vars = THEME_VARS[id]
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>('dawn')

  useEffect(() => {
    applyTheme('dawn')
    if (!isTauri) return
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<string | null>('get_setting', { key: 'theme' }).then(val => {
        if (val && val in THEME_VARS) {
          setThemeState(val as ThemeId)
          applyTheme(val as ThemeId)
        }
      })
    })
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    applyTheme(id)
    if (isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('set_setting', { key: 'theme', value: id })
      })
    }
  }, [])

  return { theme, setTheme, themes: THEMES }
}
