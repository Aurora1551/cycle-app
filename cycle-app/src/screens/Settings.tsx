import React, { useState, useEffect } from 'react'
import type { OnboardingData, VibeKey } from '../types'
import { VIBES, VIBE_TYPO, ALL_EXTRA_GENRES } from '../types'
import { supabase, supabaseEnabled } from '../lib/supabase'

interface Props {
  data: OnboardingData
  dayNumber: number
  onUpdateData: (patch: Partial<OnboardingData>) => void
  onDeleteAccount: () => void
}

const TREATMENT_LABELS: Record<string, string> = {
  'egg-freezing': 'Egg Freezing', ivf: 'IVF', iui: 'IUI',
  'egg-donation': 'Egg Donation', other: 'Other',
}

const ALL_COMPONENTS = [
  { id: 'quote', emoji: '💬', label: 'Quote' },
  { id: 'anthem', emoji: '🎵', label: 'Anthem' },
  { id: 'affirmation', emoji: '🌟', label: 'Affirmation' },
  { id: 'journal', emoji: '✍️', label: 'Journal' },
  { id: 'gratitude', emoji: '🙏', label: 'Gratitude' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation' },
  { id: 'breathing', emoji: '🌬️', label: 'Breathing' },
]

const NOTIFICATION_TIMES = ['06:00', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '12:00', '19:00', '20:00', '21:00']
const NOTIFICATION_CONTENT = [
  { id: 'quote', label: "Today's quote" },
  { id: 'affirmation', label: "Today's affirmation" },
  { id: 'song', label: "Today's song" },
  { id: 'surprise', label: "Surprise me daily" },
]

type EditMode = null | 'vibe' | 'genres' | 'components'

const Settings: React.FC<Props> = ({ data, dayNumber, onUpdateData, onDeleteAccount }) => {
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Notification prefs local state
  const [notifyEnabled, setNotifyEnabled] = useState(() => localStorage.getItem('notify_enabled') !== '0')
  const [notifyTime, setNotifyTime] = useState(() => localStorage.getItem('notify_time') || '08:00')
  const [notifyContent, setNotifyContent] = useState(() => localStorage.getItem('notify_content') || 'surprise')
  const [eveningReflection, setEveningReflection] = useState(() => localStorage.getItem('notify_evening') === '1')

  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibe.bg)
  const textColor = isDark ? '#FDF6F0' : vibe.text
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : vibe.muted
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : `${vibe.accent}20`
  const typo = data.vibe ? VIBE_TYPO[data.vibe] : VIBE_TYPO.fierce

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const saveNotifications = () => {
    localStorage.setItem('notify_enabled', notifyEnabled ? '1' : '0')
    localStorage.setItem('notify_time', notifyTime)
    localStorage.setItem('notify_content', notifyContent)
    localStorage.setItem('notify_evening', eveningReflection ? '1' : '0')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    if (supabaseEnabled) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('journal_entries').delete().eq('user_id', user.id)
        await supabase.from('daily_content').delete().eq('user_id', user.id)
        await supabase.from('profiles').delete().eq('id', user.id)
        await supabase.auth.signOut()
      }
    }
    localStorage.clear()
    onDeleteAccount()
  }

  // Collect all unique genres
  const allGenres = [...new Set([...VIBES.flatMap(v => v.genres), ...ALL_EXTRA_GENRES])]

  const row = (icon: string, label: string, value: string, onClick?: () => void) => (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', borderBottom: `1px solid ${cardBorder}` }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${vibe.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: textColor, fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight }}>{value}</div>
      </div>
      {onClick && <div style={{ color: mutedColor, fontSize: 16 }}>›</div>}
    </button>
  )

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 46, height: 26, borderRadius: 13, background: value ? vibe.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  )

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibe.bg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <div style={{ padding: '20px 24px 16px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 6 }}>
          Settings
        </div>
        <h1 style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontSize: 30, fontWeight: typo.headingWeight, color: textColor, lineHeight: 1.1, margin: 0 }}>
          Your journey
        </h1>
      </div>

      <div style={{ padding: '0 24px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Profile */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden' }}>
          {row('👤', 'Name', data.name)}
          {row('💊', 'Treatment', TREATMENT_LABELS[data.treatment] || data.treatment)}
          {row('📅', 'Cycle', `${data.cycleDays} days · Day ${dayNumber}`)}
        </div>

        {/* Personalisation */}
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor }}>Personalisation</div>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden' }}>
          {row(vibe.emoji, 'Vibe', vibe.label, () => setEditMode('vibe'))}
          {row('🎵', 'Music genres', data.genres.slice(0, 3).join(' · ') + (data.genres.length > 3 ? ` +${data.genres.length - 3}` : ''), () => setEditMode('genres'))}
          {row('✨', 'Daily components', `${data.components.length} selected`, () => setEditMode('components'))}
        </div>

        {/* Notifications */}
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor }}>Notifications</div>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor }}>Morning reminder</div>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 11, color: mutedColor }}>Daily nudge to open your day</div>
            </div>
            <Toggle value={notifyEnabled} onChange={v => { setNotifyEnabled(v); saveNotifications() }} />
          </div>

          {notifyEnabled && (
            <>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 8 }}>Time</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {NOTIFICATION_TIMES.map(t => (
                    <button
                      key={t}
                      onClick={() => { setNotifyTime(t); saveNotifications() }}
                      style={{ background: notifyTime === t ? vibe.accent : (isDark ? 'rgba(255,255,255,0.07)' : `${vibe.accent}10`), border: `1px solid ${notifyTime === t ? vibe.accent : 'transparent'}`, borderRadius: 20, padding: '5px 11px', fontFamily: "'DM Mono', monospace", fontSize: 10, color: notifyTime === t ? 'white' : textColor, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 8 }}>What to show</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {NOTIFICATION_CONTENT.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setNotifyContent(opt.id); saveNotifications() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, background: notifyContent === opt.id ? `${vibe.accent}15` : 'transparent', border: `1px solid ${notifyContent === opt.id ? vibe.accent : cardBorder}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${notifyContent === opt.id ? vibe.accent : mutedColor}`, background: notifyContent === opt.id ? vibe.accent : 'transparent', flexShrink: 0, transition: 'all 0.15s' }} />
                      <span style={{ fontFamily: typo.bodyFont, fontSize: 13, color: textColor, fontWeight: notifyContent === opt.id ? 600 : typo.bodyWeight }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 13, color: textColor }}>Evening reflection</div>
              <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 11, color: mutedColor }}>Off by default</div>
            </div>
            <Toggle value={eveningReflection} onChange={v => { setEveningReflection(v); saveNotifications() }} />
          </div>

          <div style={{ background: `${vibe.accent}10`, borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.08em' }}>
              Max 2 notifications per day · no spam ever
            </div>
          </div>
        </div>

        {/* Account */}
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor }}>Account</div>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderBottom: `1px solid ${cardBorder}` }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${vibe.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔒</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 2 }}>Privacy Policy</div>
              <div style={{ fontSize: 13, color: textColor, fontFamily: typo.bodyFont }}>View our privacy policy</div>
            </div>
            <div style={{ color: mutedColor, fontSize: 16 }}>›</div>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🗑️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#DC2626', marginBottom: 2 }}>Delete Account</div>
              <div style={{ fontSize: 13, color: '#DC2626', fontFamily: typo.bodyFont }}>Permanently delete all data</div>
            </div>
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, letterSpacing: '0.08em' }}>
            Cycle · v1.0 · GDPR compliant · EU data
          </div>
        </div>
      </div>

      {/* Edit Vibe overlay */}
      {editMode === 'vibe' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: 390, background: vibe.bg, borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 16 }}>Choose your vibe</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {VIBES.map(v => {
                const isSelected = data.vibe === v.key
                return (
                  <button
                    key={v.key}
                    onClick={() => { onUpdateData({ vibe: v.key }); setEditMode(null) }}
                    style={{ background: isSelected ? v.bg : `${v.bg}44`, border: isSelected ? `2px solid ${v.accent}` : `1.5px solid ${v.accent}33`, borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isSelected ? `0 0 0 3px ${v.accent}33` : 'none' }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{v.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'Karla', sans-serif", color: v.text, marginBottom: 2 }}>{v.label}</div>
                    <div style={{ fontSize: 10, color: v.muted }}>{v.tagline}</div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: `${vibe.accent}20`, border: `1px solid ${vibe.accent}40`, borderRadius: 14, padding: '14px', fontFamily: typo.bodyFont, fontSize: 14, color: vibe.accent, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Genres overlay */}
      {editMode === 'genres' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: 390, background: vibe.bg, borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 16 }}>Music genres</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {allGenres.map(g => {
                const isSelected = data.genres.includes(g)
                return (
                  <button
                    key={g}
                    onClick={() => {
                      const next = isSelected ? data.genres.filter(x => x !== g) : [...data.genres, g]
                      if (next.length > 0) onUpdateData({ genres: next })
                    }}
                    style={{ background: isSelected ? vibe.accent : `${vibe.accent}12`, border: `1.5px solid ${isSelected ? vibe.accent : `${vibe.accent}30`}`, borderRadius: 20, padding: '7px 14px', fontFamily: typo.bodyFont, fontSize: 12, color: isSelected ? 'white' : textColor, cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: vibe.accent, color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}

      {/* Edit Components overlay */}
      {editMode === 'components' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: 390, background: vibe.bg, borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: vibe.accent, marginBottom: 16 }}>Daily components</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {ALL_COMPONENTS.map(c => {
                const isSelected = data.components.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      const next = isSelected ? data.components.filter(x => x !== c.id) : [...data.components, c.id]
                      if (next.length > 0) onUpdateData({ components: next })
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: isSelected ? `${vibe.accent}12` : 'transparent', border: `1.5px solid ${isSelected ? vibe.accent : cardBorder}`, borderRadius: 12, padding: '12px 10px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                  >
                    <span style={{ fontSize: 18 }}>{c.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? textColor : mutedColor, fontFamily: typo.bodyFont }}>{c.label}</span>
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 5, right: 7, width: 14, height: 14, borderRadius: '50%', background: vibe.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 700 }}>✓</div>
                    )}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setEditMode(null)} style={{ width: '100%', background: vibe.accent, color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Done</button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '0 24px' }}>
          <div style={{ width: '100%', maxWidth: 340, background: isDark ? '#1a0a08' : '#fff', borderRadius: 20, padding: '28px 24px' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: typo.headingFont, fontStyle: typo.headingStyle, fontWeight: typo.headingWeight, fontSize: 22, color: '#DC2626', textAlign: 'center', marginBottom: 8 }}>Delete account?</div>
            <div style={{ fontFamily: typo.bodyFont, fontWeight: typo.bodyWeight, fontSize: 13, color: isDark ? 'rgba(253,246,240,0.6)' : '#666', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
              This permanently deletes all your data including journal entries, progress, and account information. This cannot be undone.
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{ width: '100%', background: '#DC2626', color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 14, cursor: deleting ? 'default' : 'pointer', marginBottom: 10 }}
            >
              {deleting ? 'Deleting...' : 'Yes, delete everything'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ width: '100%', background: 'transparent', color: mutedColor, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '13px', fontFamily: typo.bodyFont, fontSize: 14, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
