import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    borderRadius: 10,
    fontSize: 13,
    fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif",
  },
  components: {
    Input: { borderRadius: 10 },
    Button: { borderRadius: 10 },
    Modal: { borderRadiusLG: 16 },
  },
  cssVar: true,
}
