import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingData, VibeKey } from '../types'
import { VIBES, ALL_EXTRA_GENRES } from '../types'
import { resolveVibe, resolveTypo, deriveTheme } from '../lib/theme'
import { TREATMENT_LABELS, TREATMENT_EMOJIS, ALL_COMPONENTS, NOTIFICATION_CONTENT } from '../lib/constants'
import { deleteAccount } from '../lib/db'
import { startSpotifyAuth, getSpotifyStatus, disconnectSpotify, isSpotifyConfigured } from '../lib/spotify'
import { track } from '../lib/posthog'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, Card, SectionLabel, Toggle } from '../components/ui'
import LanguagePicker from '../components/LanguagePicker'
import { LANGUAGES } from '../i18n'

interface Props {
  data: OnboardingData
  dayNumber: number
  onUpdateData: (patch: Partial<OnboardingData>) => void
  onDeleteAccount: () => void
  onLogout: () => void
  onBack: () => void
}

type EditMode = null | 'name' | 'treatment' | 'cycleDays' | 'vibe' | 'genres' | 'components' | 'notifyTime' | 'privacy' | 'language'

const Settings: React.FC<Props> = ({ data, dayNumber, onUpdateData, onDeleteAccount, onLogout, onBack }) => {
  const { t, i18n } = useTranslation()
  const visible = useFadeIn()
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [editName, setEditName] = useState(data.name)
  const [editCycleDays, setEditCycleDays] = useState(data.cycleDays)
  const [editTreatment, setEditTreatment] = useState(data.treatment)
  const [editOtherText, setEditOtherText] = useState('')
  const [editHour, setEditHour] = useState(8)
  const [editMinute, setEditMinute] = useState(0)
  const [editPeriod, setEditPeriod] = useState<'AM' | 'PM'>('AM')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [spotifyConnected, setSpotifyConnected] = useState(() => localStorage.getItem('spotify_connected') === '1')
  const [spotifyDisplayName, setSpotifyDisplayName] = useState(() => localStorage.getItem('spotify_display_name') || '')
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [spotifyError, setSpotifyError] = useState<string | null>(() => {
    const err = localStorage.getItem('spotify_auth_error')
    if (err) localStorage.removeItem('spotify_auth_error')
    return err
  })
  const spotifyConfigured = isSpotifyConfigured()

  // Check Spotify status on mount
  React.useEffect(() => {
    if (!spotifyConfigured) return
    getSpotifyStatus(data.name).then(status => {
      setSpotifyConnected(status.connected)
      if (status.connected && status.displayName) {
        setSpotifyDisplayName(status.displayName)
        localStorage.setItem('spotify_connected', '1')
        localStorage.setItem('spotify_display_name', status.displayName)
      } else if (!status.connected) {
        localStorage.removeItem('spotify_connected')
        localStorage.removeItem('spotify_display_name')
      }
    })
  }, [data.name])

  const handleSpotifyConnect = () => {
    if (!spotifyConfigured) return
    setSpotifyError(null)
    setSpotifyLoading(true)
    startSpotifyAuth()
  }

  const handleSpotifyDisconnect = async () => {
    setSpotifyLoading(true)
    const ok = await disconnectSpotify(data.name)
    if (ok) {
      setSpotifyConnected(false)
      setSpotifyDisplayName('')
      localStorage.removeItem('spotify_connected')
      localStorage.removeItem('spotify_display_name')
      track('spotify_disconnected', {})
    }
    setSpotifyLoading(false)
  }

  const [notifyEnabled, setNotifyEnabled] = useState(() => localStorage.getItem('notify_enabled') !== '0')
  const [notifyContent, setNotifyContent] = useState(() => localStorage.getItem('notify_content') || 'surprise')
  const [eveningReflection, setEveningReflection] = useState(() => localStorage.getItem('notify_evening') === '1')

  // Parse stored 24h time into 12h components
  const parseStoredTime = () => {
    let stored = localStorage.getItem('notify_time')
    if (!stored || stored === '03:00') { stored = '08:00'; localStorage.setItem('notify_time', stored) }
    const [hStr, mStr] = stored.split(':')
    let h24 = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    const p: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM'
    let h12 = h24 % 12
    if (h12 === 0) h12 = 12
    return { h12, m, p }
  }
  const parsed = parseStoredTime()
  const [notifyHour, setNotifyHour] = useState(parsed.h12)
  const [notifyMinute, setNotifyMinute] = useState(parsed.m)
  const [notifyPeriod, setNotifyPeriod] = useState<'AM' | 'PM'>(parsed.p)

  const to24hStr = (h: number, m: number, p: 'AM' | 'PM') => {
    let h24 = p === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12)
    return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const vibe = resolveVibe(data.vibe)
  const typo = resolveTypo(data.vibe)
  const { isDark, textColor, mutedColor, cardBg, cardBorder } = deriveTheme(vibe)
  const allGenres = [...new Set([...VIBES.flatMap(v => v.genres), ...ALL_EXTRA_GENRES])]

  const saveNotifications = (overrides?: { h?: number; m?: number; p?: 'AM' | 'PM'; enabled?: boolean; content?: string; evening?: boolean }) => {
    const h = overrides?.h ?? notifyHour
    const m = overrides?.m ?? notifyMinute
    const p = overrides?.p ?? notifyPeriod
    const enabled = overrides?.enabled ?? notifyEnabled
    localStorage.setItem('notify_enabled', enabled ? '1' : '0')
    localStorage.setItem('notify_time', to24hStr(h, m, p))
    localStorage.setItem('notify_content', overrides?.content ?? notifyContent)
    localStorage.setItem('notify_evening', (overrides?.evening ?? eveningReflection) ? '1' : '0')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    await deleteAccount(data.name)
    localStorage.clear()
    onDeleteAccount()
  }

  const row = (icon: string, label: string, value: string, onClick?: () => void) => (
    <button onClick={onClick} className="settings-row" style={{ cursor: onClick ? 'pointer' : 'default', borderBottom: `1px solid ${cardBorder}` }}>
      <div className="settings-icon" style={{ background: `${vibe.accent}15` }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="mono-hint" style={{ color: vibe.accent, marginBottom: 2, letterSpacing: '0.15em' }}>{label}</div>
        <div style={{ fontSize: 13, color: textColor, fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight }}>{value}</div>
      </div>
      {onClick && <div style={{ color: mutedColor, fontSize: 16 }}>›</div>}
    </button>
  )

  return (
    <ScreenShell bg={vibe.bg} visible={visible}>
      <div style={{ padding: '20px 24px 16px' }}>
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: typo.bodyFont, fontSize: 13, fontWeight: 500, color: vibe.accent }}>
            <span style={{ fontSize: 16 }}>‹</span> {t('back').replace('← ', '')}
          </button>
        </div>
        <SectionLabel color={vibe.accent}>{t('settings.heading')}</SectionLabel>
        <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 30, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.1, margin: 0 }}>{t('settings.yourJourney')}</h1>
      </div>

      <div className="flex-col gap-16" style={{ padding: '0 24px 120px' }}>
        <Card cardBg={cardBg} cardBorder={cardBorder} className="card-flush">
          {row('👤', t('settings.name'), data.name, () => { setEditName(data.name); setEditMode('name') })}
          {row('💊', t('settings.treatment'), t(`treatments.${data.treatment}`) || data.treatment, () => { setEditTreatment(data.treatment); setEditOtherText(''); setEditMode('treatment') })}
          {row('📅', t('settings.cycle'), t('settings.daysDay', { days: data.cycleDays, day: dayNumber }), () => { setEditCycleDays(data.cycleDays); setEditMode('cycleDays') })}
          {row(vibe.emoji, t('settings.vibe'), t(`vibes.${data.vibe}`), () => setEditMode('vibe'))}
          {row('🎵', t('settings.musicGenres'), data.genres.slice(0, 3).join(' · ') + (data.genres.length > 3 ? ` +${data.genres.length - 3}` : ''), () => setEditMode('genres'))}
          {row('✨', t('settings.dailyComponents'), t('settings.nSelected', { n: data.components.length }), () => setEditMode('components'))}
          {(() => { const cl = LANGUAGES.find(l => i18n.language === l.code || i18n.language?.startsWith(l.code)) || LANGUAGES[0]; return row(`${cl.flag}`, t('settings.language'), cl.label, () => setEditMode('language')) })()}
        </Card>

        {/* Music / Spotify section */}
        <div className="mono-hint" style={{ color: mutedColor }}>MUSIC</div>
        <Card cardBg={cardBg} cardBorder={cardBorder}>
          {!spotifyConfigured ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={mutedColor}><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                <span style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: mutedColor }}>Spotify</span>
              </div>
              <div style={{ fontFamily: typo.bodyFont, fontSize: 12, color: mutedColor, lineHeight: 1.5 }}>
                Spotify connection is not configured yet.
              </div>
            </div>
          ) : spotifyConnected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor }}>{spotifyDisplayName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1DB954' }} />
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#1DB954', letterSpacing: '0.1em' }}>CONNECTED</span>
                  </div>
                </div>
              </div>
              <button onClick={handleSpotifyDisconnect} disabled={spotifyLoading} style={{
                width: '100%', background: 'transparent', border: `1px solid ${cardBorder}`,
                borderRadius: 10, padding: '10px', cursor: 'pointer',
                fontFamily: typo.bodyFont, fontSize: 12, color: mutedColor,
              }}>
                {spotifyLoading ? 'Disconnecting...' : 'Disconnect Spotify'}
              </button>
            </div>
          ) : (
            <div>
              {spotifyError && (
                <div style={{ fontFamily: typo.bodyFont, fontSize: 12, color: '#E8675A', textAlign: 'center', marginBottom: 10, lineHeight: 1.4 }}>
                  {spotifyError}
                </div>
              )}
              <button onClick={handleSpotifyConnect} disabled={spotifyLoading} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: '#1DB954', border: 'none', borderRadius: 12, padding: '14px 20px',
                cursor: 'pointer', transition: 'opacity 0.15s',
                opacity: spotifyLoading ? 0.7 : 1,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              <span style={{ fontFamily: typo.bodyFont, fontWeight: 700, fontSize: 14, color: 'white' }}>
                {spotifyLoading ? 'Connecting...' : 'Connect Spotify'}
              </span>
            </button>
            </div>
          )}
        </Card>

        <div className="mono-hint" style={{ color: mutedColor }}>{t('settings.notificationsSection')}</div>
        <Card cardBg={cardBg} cardBorder={cardBorder}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor }}>Your daily dose of love</div>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 11, color: mutedColor }}>A little reminder to open your heart</div>
            </div>
            <Toggle value={notifyEnabled} onChange={v => { setNotifyEnabled(v); saveNotifications() }} accent={vibe.accent} isDark={isDark} />
          </div>

          {notifyEnabled && (
            <>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel color={vibe.accent}>{t('settings.time')}</SectionLabel>
                <button onClick={() => { setEditHour(notifyHour); setEditMinute(notifyMinute); setEditPeriod(notifyPeriod); setEditMode('notifyTime') }} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  background: isDark ? 'rgba(255,255,255,0.05)' : `${vibe.accent}08`,
                  border: `1.5px solid ${vibe.accent}30`, borderRadius: 12, padding: '12px 16px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <span style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 18, color: textColor, letterSpacing: 0.5 }}>
                    {notifyHour}:{String(notifyMinute).padStart(2, '0')} {notifyPeriod}
                  </span>
                  <span style={{ fontFamily: typo.bodyFont, fontSize: 12, color: vibe.accent, fontWeight: 500 }}>{t('change')}</span>
                </button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <SectionLabel color={vibe.accent}>{t('settings.whatToShow')}</SectionLabel>
                <div className="flex-col gap-6">
                  {NOTIFICATION_CONTENT.map(opt => (
                    <button key={opt.id} onClick={() => { setNotifyContent(opt.id); saveNotifications() }} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: notifyContent === opt.id ? `${vibe.accent}15` : 'transparent',
                      border: `1px solid ${notifyContent === opt.id ? vibe.accent : cardBorder}`,
                      borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}>
                      <div className="radio" style={{ borderColor: notifyContent === opt.id ? vibe.accent : mutedColor, background: notifyContent === opt.id ? vibe.accent : 'transparent' }} />
                      <span style={{ fontFamily: typo.bodyFont, fontSize: 13, color: textColor, fontWeight: notifyContent === opt.id ? 600 : typo.bodyWeight }}>{t(`notifications.${opt.id === 'quote' ? 'todaysQuote' : opt.id === 'affirmation' ? 'todaysAffirmation' : opt.id === 'song' ? 'todaysSong' : 'surpriseMe'}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

        </Card>

        <div className="mono-hint" style={{ color: mutedColor }}>{t('settings.account')}</div>
        <Card cardBg={cardBg} cardBorder={cardBorder} className="card-flush">
          <button onClick={onLogout} className="settings-row" style={{ cursor: 'pointer', borderBottom: `1px solid ${cardBorder}` }}>
            <div className="settings-icon" style={{ background: `${vibe.accent}15` }}>🚪</div>
            <div style={{ flex: 1 }}>
              <div className="mono-hint" style={{ color: vibe.accent, marginBottom: 2, letterSpacing: '0.15em' }}>{t('settings.logOut')}</div>
              <div style={{ fontSize: 13, color: textColor, fontFamily: typo.bodyFont }}>{t('settings.logOutSubtext')}</div>
            </div>
            <div style={{ color: mutedColor, fontSize: 16 }}>›</div>
          </button>
          <button onClick={() => setEditMode('privacy')} className="settings-row" style={{ cursor: 'pointer', borderBottom: `1px solid ${cardBorder}` }}>
            <div className="settings-icon" style={{ background: `${vibe.accent}15` }}>🔒</div>
            <div style={{ flex: 1 }}>
              <div className="mono-hint" style={{ color: vibe.accent, marginBottom: 2, letterSpacing: '0.15em' }}>{t('settings.privacyPolicy')}</div>
              <div style={{ fontSize: 13, color: textColor, fontFamily: typo.bodyFont }}>{t('settings.privacySubtext')}</div>
            </div>
            <div style={{ color: mutedColor, fontSize: 16 }}>›</div>
          </button>
          <button onClick={() => setConfirmDelete(true)} className="settings-row" style={{ cursor: 'pointer' }}>
            <div className="settings-icon" style={{ background: 'rgba(220,38,38,0.1)' }}>🗑️</div>
            <div style={{ flex: 1 }}>
              <div className="mono-hint" style={{ color: '#DC2626', marginBottom: 2, letterSpacing: '0.15em' }}>{t('settings.deleteAccount')}</div>
              <div style={{ fontSize: 13, color: '#DC2626', fontFamily: typo.bodyFont }}>{t('settings.deleteSubtext')}</div>
            </div>
          </button>
        </Card>

        <div className="mono-xs text-center" style={{ color: mutedColor, marginTop: 8 }}>{t('settings.footer')}</div>
      </div>

      {/* Edit overlays */}
      {editMode === 'name' && (
        <div className="modal-overlay modal-bottom">
          <div className="modal-sheet" style={{ background: vibe.bg }}>
            <SectionLabel color={vibe.accent}>{t('settings.editName')}</SectionLabel>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder={t('onboardingName.placeholder')}
              style={{
                width: '100%', boxSizing: 'border-box', margin: '12px 0 20px', padding: '14px 16px',
                background: isDark ? 'rgba(255,255,255,0.07)' : `${vibe.accent}08`,
                border: `1.5px solid ${vibe.accent}40`, borderRadius: 12,
                fontFamily: typo.bodyFont, fontSize: 15, color: textColor, outline: 'none',
              }}
            />
            <button onClick={() => { if (editName.trim()) { onUpdateData({ name: editName.trim() }); setEditMode(null) } }} className="btn-primary" style={{ background: vibe.accent, marginBottom: 10 }}>{t('save')}</button>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: `${vibe.accent}20`, border: `1px solid ${vibe.accent}40`, borderRadius: 14, padding: '14px', fontSize: 14, color: vibe.accent, cursor: 'pointer' }}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {editMode === 'treatment' && (
        <div className="modal-overlay modal-bottom">
          <div className="modal-sheet" style={{ background: vibe.bg }}>
            <SectionLabel color={vibe.accent}>{t('settings.treatmentPlan')}</SectionLabel>
            <div className="flex-col gap-6" style={{ margin: '12px 0 20px' }}>
              {Object.entries(TREATMENT_LABELS).map(([key, label]) => {
                const sel = editTreatment === key || (key === 'other' && editTreatment !== '' && !Object.keys(TREATMENT_LABELS).includes(editTreatment))
                return (
                  <div key={key}>
                    <button onClick={() => setEditTreatment(key)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      background: sel ? `${vibe.accent}15` : 'transparent',
                      border: `1px solid ${sel ? vibe.accent : cardBorder}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: 18 }}>{TREATMENT_EMOJIS[key] || '✨'}</span>
                      <span style={{ fontFamily: typo.bodyFont, fontSize: 14, color: textColor, fontWeight: sel ? 600 : typo.bodyWeight, flex: 1 }}>{t(`treatments.${key}`) || label}</span>
                      {sel && <div style={{ width: 14, height: 14, borderRadius: '50%', background: vibe.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>✓</div>}
                    </button>
                    {key === 'other' && sel && (
                      <input
                        autoFocus
                        value={editOtherText}
                        onChange={e => setEditOtherText(e.target.value)}
                        placeholder="What are you going through?"
                        style={{
                          width: '100%', boxSizing: 'border-box', marginTop: 8, padding: '12px 14px',
                          background: isDark ? 'rgba(255,255,255,0.07)' : `${vibe.accent}08`,
                          border: `1.5px solid ${vibe.accent}40`, borderRadius: 10,
                          fontFamily: typo.bodyFont, fontSize: 14, color: textColor, outline: 'none',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={() => {
              const isOther = editTreatment === 'other' || (!Object.keys(TREATMENT_LABELS).includes(editTreatment) && editTreatment !== '')
              const val = isOther ? (editOtherText.trim() || 'other') : editTreatment
              onUpdateData({ treatment: val })
              setEditMode(null)
            }} className="btn-primary" style={{ background: vibe.accent, marginBottom: 10 }}>{t('save')}</button>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: `${vibe.accent}20`, border: `1px solid ${vibe.accent}40`, borderRadius: 14, padding: '14px', fontSize: 14, color: vibe.accent, cursor: 'pointer' }}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {editMode === 'cycleDays' && (
        <div className="modal-overlay modal-bottom">
          <div className="modal-sheet" style={{ background: vibe.bg }}>
            <SectionLabel color={vibe.accent}>{t('settings.cycleDuration')}</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '16px 0 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: isDark ? 'rgba(255,255,255,0.06)' : 'white', border: `1.5px solid ${vibe.accent}25`, borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => setEditCycleDays(d => Math.max(1, d - 1))} style={{ width: 48, height: 56, background: 'none', border: 'none', color: vibe.accent, fontSize: 22, cursor: 'pointer', fontWeight: 300 }}>−</button>
                <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 32, fontWeight: typo.headingWeight, color: textColor, width: 60, textAlign: 'center', borderLeft: `1px solid ${vibe.accent}20`, borderRight: `1px solid ${vibe.accent}20`, lineHeight: '56px' }}>{editCycleDays}</div>
                <button onClick={() => setEditCycleDays(d => Math.min(30, d + 1))} style={{ width: 48, height: 56, background: 'none', border: 'none', color: vibe.accent, fontSize: 22, cursor: 'pointer', fontWeight: 300 }}>+</button>
              </div>
              <span style={{ fontFamily: typo.bodyFont, fontSize: 14, color: mutedColor }}>{t('onboardingCycleLength.daysInCycle')}</span>
            </div>
            <button onClick={() => { onUpdateData({ cycleDays: editCycleDays }); setEditMode(null) }} className="btn-primary" style={{ background: vibe.accent, marginBottom: 10 }}>{t('save')}</button>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: `${vibe.accent}20`, border: `1px solid ${vibe.accent}40`, borderRadius: 14, padding: '14px', fontSize: 14, color: vibe.accent, cursor: 'pointer' }}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {editMode === 'vibe' && (
        <div className="modal-overlay modal-bottom">
          <div className="modal-sheet" style={{ background: vibe.bg }}>
            <SectionLabel color={vibe.accent}>{t('settings.chooseVibe')}</SectionLabel>
            <div className="grid-2" style={{ margin: '12px 0 20px' }}>
              {VIBES.map(v => (
                <button key={v.key} onClick={() => { onUpdateData({ vibe: v.key }); setEditMode(null) }} style={{
                  background: data.vibe === v.key ? `${v.accent}18` : `${v.accent}08`,
                  border: data.vibe === v.key ? `2px solid ${v.accent}` : `1.5px solid ${v.accent}33`,
                  borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
                  boxShadow: data.vibe === v.key ? `0 0 0 3px ${v.accent}33` : 'none',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{v.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{t(`vibes.${v.key}`)}</div>
                  <div style={{ fontSize: 10, color: mutedColor }}>{t(`vibeTaglines.${v.key}`)}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: `${vibe.accent}20`, border: `1px solid ${vibe.accent}40`, borderRadius: 14, padding: '14px', fontSize: 14, color: vibe.accent, cursor: 'pointer' }}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {editMode === 'genres' && (
        <div className="modal-overlay modal-bottom">
          <div className="modal-sheet" style={{ background: vibe.bg }}>
            <SectionLabel color={vibe.accent}>{t('settings.musicGenres')}</SectionLabel>
            <div className="flex-wrap gap-8" style={{ margin: '12px 0 20px' }}>
              {allGenres.map(g => {
                const sel = data.genres.includes(g)
                return <button key={g} onClick={() => { const next = sel ? data.genres.filter(x => x !== g) : [...data.genres, g]; if (next.length > 0) onUpdateData({ genres: next }) }} className="chip" style={{ background: sel ? vibe.accent : `${vibe.accent}12`, border: `1.5px solid ${sel ? vibe.accent : `${vibe.accent}30`}`, color: sel ? 'white' : textColor, padding: '7px 14px' }}>{g}</button>
              })}
            </div>
            <button onClick={() => setEditMode(null)} className="btn-primary" style={{ background: vibe.accent }}>{t('done')}</button>
          </div>
        </div>
      )}

      {editMode === 'components' && (
        <div className="modal-overlay modal-bottom">
          <div className="modal-sheet" style={{ background: vibe.bg }}>
            <SectionLabel color={vibe.accent}>{t('settings.dailyComponents')}</SectionLabel>
            <div className="grid-2" style={{ margin: '12px 0 20px' }}>
              {ALL_COMPONENTS.map(c => {
                const sel = data.components.includes(c.id)
                return (
                  <button key={c.id} onClick={() => { const next = sel ? data.components.filter(x => x !== c.id) : [...data.components, c.id]; if (next.length > 0) onUpdateData({ components: next }) }} className="sel-btn" style={{
                    gap: 8, background: sel ? `${vibe.accent}12` : 'transparent',
                    border: `1.5px solid ${sel ? vibe.accent : cardBorder}`,
                  }}>
                    <span style={{ fontSize: 18 }}>{c.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: sel ? 600 : 400, color: sel ? textColor : mutedColor }}>{t(`components.${c.id}`)}</span>
                    {sel && <div className="check-circle" style={{ position: 'absolute', top: 5, right: 7, width: 14, height: 14, background: vibe.accent }}>✓</div>}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setEditMode(null)} className="btn-primary" style={{ background: vibe.accent }}>{t('done')}</button>
          </div>
        </div>
      )}

      {editMode === 'notifyTime' && (
        <div className="modal-overlay modal-bottom">
          <div className="modal-sheet" style={{ background: vibe.bg }}>
            <SectionLabel color={vibe.accent}>{t('settings.setReminderTime')}</SectionLabel>
            <div style={{ fontFamily: typo.bodyFont, fontSize: 12, color: mutedColor, marginBottom: 16 }}>{t('settings.recommendTime')}</div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 }}>
              {/* Hour */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setEditHour(editHour >= 12 ? 1 : editHour + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: mutedColor, padding: 4 }}>▲</button>
                <div style={{
                  fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 32, color: textColor,
                  background: isDark ? 'rgba(255,255,255,0.06)' : `${vibe.accent}08`,
                  border: `1.5px solid ${vibe.accent}40`, borderRadius: 12, padding: '8px 16px', minWidth: 56, textAlign: 'center',
                }}>{editHour}</div>
                <button onClick={() => setEditHour(editHour <= 1 ? 12 : editHour - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: mutedColor, padding: 4 }}>▼</button>
              </div>

              <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 32, color: textColor }}>:</div>

              {/* Minute */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setEditMinute(editMinute >= 55 ? 0 : editMinute + 5)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: mutedColor, padding: 4 }}>▲</button>
                <div style={{
                  fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 32, color: textColor,
                  background: isDark ? 'rgba(255,255,255,0.06)' : `${vibe.accent}08`,
                  border: `1.5px solid ${vibe.accent}40`, borderRadius: 12, padding: '8px 16px', minWidth: 56, textAlign: 'center',
                }}>{String(editMinute).padStart(2, '0')}</div>
                <button onClick={() => setEditMinute(editMinute <= 0 ? 55 : editMinute - 5)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: mutedColor, padding: 4 }}>▼</button>
              </div>

              {/* AM/PM */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                {(['AM', 'PM'] as const).map(p => (
                  <button key={p} onClick={() => setEditPeriod(p)} style={{
                    background: editPeriod === p ? vibe.accent : 'transparent',
                    border: `1.5px solid ${editPeriod === p ? vibe.accent : `${vibe.accent}40`}`,
                    borderRadius: 10, padding: '8px 14px', fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 600,
                    color: editPeriod === p ? 'white' : textColor, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{p}</button>
                ))}
              </div>
            </div>

            <button onClick={() => { setNotifyHour(editHour); setNotifyMinute(editMinute); setNotifyPeriod(editPeriod); saveNotifications({ h: editHour, m: editMinute, p: editPeriod }); setEditMode(null) }} className="btn-primary" style={{ background: vibe.accent, marginBottom: 10 }}>{t('save')}</button>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: `${vibe.accent}20`, border: `1px solid ${vibe.accent}40`, borderRadius: 14, padding: '14px', fontSize: 14, color: vibe.accent, cursor: 'pointer' }}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {editMode === 'privacy' && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100, background: vibe.bg, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ maxWidth: 440, margin: '0 auto', padding: '20px 24px 40px' }}>
            <div className="flex-between" style={{ marginBottom: 24 }}>
              <button onClick={() => setEditMode(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: typo.bodyFont, fontSize: 13, fontWeight: 500, color: vibe.accent }}>
                <span style={{ fontSize: 16 }}>‹</span> {t('back').replace('← ', '')}
              </button>
            </div>
            <div style={{ marginBottom: 32 }}>
              <SectionLabel color={vibe.accent}>{t('privacy.legal')}</SectionLabel>
              <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 28, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.1, margin: '0 0 6px' }}>{t('privacy.title')}</h1>
              <div style={{ fontFamily: typo.bodyFont, fontSize: 11, color: mutedColor }}>{t('privacy.lastUpdated')}</div>
            </div>
            {([
              { title: t('privacy.whatWeCollect'), content: t('privacy.whatWeCollectText') },
              { title: t('privacy.howUsed'), content: t('privacy.howUsedText') },
              { title: t('privacy.thirdParty'), items: [{ label: t('privacy.anthropic'), detail: t('privacy.anthropicDetail') }, { label: t('privacy.posthog'), detail: t('privacy.posthogDetail') }] },
              { title: t('privacy.whereStored'), content: t('privacy.whereStoredText') },
              { title: t('privacy.gdprRights'), items: [{ label: t('privacy.rightAccess'), detail: t('privacy.rightAccessDetail') }, { label: t('privacy.rightRectification'), detail: t('privacy.rightRectificationDetail') }, { label: t('privacy.rightErasure'), detail: t('privacy.rightErasureDetail') }, { label: t('privacy.rightPortability'), detail: t('privacy.rightPortabilityDetail') }, { label: t('privacy.rightWithdraw'), detail: t('privacy.rightWithdrawDetail') }] },
              { title: t('privacy.retention'), content: t('privacy.retentionText') },
              { title: t('privacy.children'), content: t('privacy.childrenText') },
              { title: t('privacy.contact'), content: t('privacy.contactText') },
            ] as { title: string; content?: string; items?: { label: string; detail: string }[] }[]).map((section, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 18, color: textColor, marginBottom: 8 }}>{section.title}</div>
                {section.content && <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>{section.content}</div>}
                {section.items && (
                  <div className="flex-col" style={{ gap: 10 }}>
                    {section.items.map((item, j) => (
                      <div key={j} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : `${vibe.accent}06`, borderRadius: 12, padding: '12px 14px', border: `1px solid ${cardBorder}` }}>
                        <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor, marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 12, color: mutedColor, lineHeight: 1.5 }}>{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ background: `${vibe.accent}10`, borderRadius: 12, padding: '14px 16px', marginTop: 8 }}>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 12, color: vibe.accent, marginBottom: 4 }}>{t('privacy.inShort')}</div>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 12, color: mutedColor, lineHeight: 1.5 }}>{t('privacy.inShortText')}</div>
            </div>
            <button onClick={() => setEditMode(null)} className="btn-primary" style={{ background: vibe.accent, marginTop: 24 }}>{t('close')}</button>
          </div>
        </div>
      )}

      <LanguagePicker open={editMode === 'language'} onClose={() => setEditMode(null)} accent={vibe.accent} bg={vibe.bg} isDark={isDark} />

      {confirmDelete && (
        <div className="modal-overlay modal-overlay-dark modal-center">
          <div style={{ width: '100%', maxWidth: 340, background: isDark ? '#1a0a08' : '#fff', borderRadius: 20, padding: '28px 24px' }}>
            <div className="text-center" style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: typo.headingFont, fontWeight: typo.headingWeight, fontSize: 22, color: '#DC2626', textAlign: 'center', marginBottom: 8 }}>{t('settings.deleteConfirm')}</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: isDark ? 'rgba(253,246,240,0.6)' : '#666', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
              {t('settings.deleteWarning')}
            </div>
            <button onClick={handleDeleteAccount} disabled={deleting} style={{ width: '100%', background: '#DC2626', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 600, fontSize: 14, cursor: deleting ? 'default' : 'pointer', marginBottom: 10 }}>
              {deleting ? t('settings.deleting') : t('settings.deleteYes')}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost" style={{ color: mutedColor, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '13px' }}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </ScreenShell>
  )
}

export default Settings
