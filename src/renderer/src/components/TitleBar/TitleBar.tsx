import { useState, useEffect } from 'react'
import { Slider, Modal, message } from 'antd'
import { MinusOutlined, CloseOutlined, SettingOutlined, PushpinOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons'
import { useTheme, THEMES } from '../../hooks/useTheme'
import type { ThemeId } from '../../hooks/useTheme'
import styles from './TitleBar.module.css'

const APP_VERSION = '1.0.0'

const isTauri = '__TAURI_INTERNALS__' in window
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
const isDesktop = isTauri && !isMobile

async function tauriInvoke(cmd: string, args?: Record<string, unknown>): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke(cmd, args)
}

interface TitleBarProps {
  onAdd: () => void
}

export function TitleBar({ onAdd }: TitleBarProps): JSX.Element {
  const [opacity, setOpacity] = useState(100)
  const [pinned, setPinned] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (!isDesktop) return
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<string | null>('get_setting', { key: 'opacity' }).then(val => {
        if (val) {
          const v = Number(val)
          setOpacity(v)
          document.documentElement.style.opacity = String(v / 100)
        }
      })
      invoke<string | null>('get_setting', { key: 'alwaysOnTop' }).then(val => {
        if (val === 'true') {
          setPinned(true)
          invoke('set_always_on_top', { onTop: true })
        }
      })
    })
  }, [])

  const handleOpacityChange = (val: number) => {
    setOpacity(val)
    document.documentElement.style.opacity = String(val / 100)
    tauriInvoke('set_setting', { key: 'opacity', value: String(val) })
  }

  const handlePin = () => {
    const next = !pinned
    setPinned(next)
    tauriInvoke('set_always_on_top', { onTop: next })
    tauriInvoke('set_setting', { key: 'alwaysOnTop', value: String(next) })
  }

  const handleCheckUpdate = async () => {
    if (!isDesktop) return
    setChecking(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const version = await invoke<string | null>('check_update')
      if (version) {
        message.success(`已更新到 ${version}，正在重启...`)
        await invoke('restart_app')
      } else {
        message.info('当前已是最新版本')
      }
    } catch {
      message.warning('检查更新失败，请稍后再试')
    } finally {
      setChecking(false)
    }
  }

  const handleDragStart = async (e: React.MouseEvent) => {
    if (!isDesktop) return
    if ((e.target as HTMLElement).closest(`.${styles.controls}`) ||
        (e.target as HTMLElement).closest(`.${styles.addBtn}`)) return
    e.preventDefault()
    await tauriInvoke('start_dragging')
  }

  return (
    <>
      <div className={`${styles.titleBar} ${isMobile ? styles.titleBarMobile : ''}`} onMouseDown={handleDragStart}>
        <div className={styles.titleText}>
          <span className={styles.title}>TodoTool</span>
        </div>

        <div className={styles.centerActions}>
          <button className={styles.addBtn} onClick={onAdd} title="新建任务">
            <PlusOutlined />
            <span>新建</span>
          </button>
        </div>

        <div className={styles.controls}>
          {isDesktop && (
            <button
              className={`${styles.controlBtn} ${pinned ? styles.pinActive : ''}`}
              onClick={handlePin}
              title={pinned ? '取消置顶' : '窗口置顶'}
            >
              <PushpinOutlined />
            </button>
          )}
          <button className={styles.controlBtn} onClick={() => setSettingsOpen(true)}>
            <SettingOutlined />
          </button>
          {isDesktop && (
            <>
              <button className={styles.controlBtn} onClick={() => tauriInvoke('minimize_window')}>
                <MinusOutlined />
              </button>
              <button className={`${styles.controlBtn} ${styles.closeBtn}`} onClick={() => tauriInvoke('close_window')}>
                <CloseOutlined />
              </button>
            </>
          )}
        </div>
      </div>

      <Modal
        title="设置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        footer={null}
        width={320}
        destroyOnClose
      >
        <div className={styles.settingsPanel}>
          <div className={styles.settingsSection}>
            <div className={styles.settingsLabel}>主题</div>
            <div className={styles.themeGrid}>
              {THEMES.map(t => (
                <div
                  key={t.id}
                  className={`${styles.themeBtn} ${theme === t.id ? styles.themeBtnActive : ''}`}
                  role="button"
                  tabIndex={0}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setTheme(t.id as ThemeId)
                  }}
                >
                  <span className={styles.themeEmoji}>{t.emoji}</span>
                  <span className={styles.themeName}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
          {isDesktop && (
            <div className={styles.settingsSection}>
              <div className={styles.settingsLabel}>透明度 {opacity}%</div>
              <Slider min={30} max={100} value={opacity} onChange={handleOpacityChange} />
            </div>
          )}
          <div className={styles.settingsSection}>
            <div className={styles.versionRow}>
              <span className={styles.versionText}>v{APP_VERSION}</span>
              {isDesktop && (
                <button className={styles.updateBtn} onClick={handleCheckUpdate} disabled={checking}>
                  <SyncOutlined spin={checking} />
                  <span>{checking ? '检查中...' : '检查更新'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
