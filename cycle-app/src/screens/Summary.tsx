import React from 'react'
import type { OnboardingData } from '../types'
import { VIBES } from '../types'
import { TREATMENT_LABELS } from '../lib/constants'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell } from '../components/ui'

interface Props {
  data: OnboardingData
  onStartFree: () => void
  onUnlock: () => void
}

const COMPONENT_LABELS: Record<string, string> = {
  quote: 'Quote', anthem: 'Anthem', meditation: 'Meditation',
  journal: 'Journal', affirmation: 'Affirmation',
  gratitude: 'Gratitude', breathing: 'Breathing',
}

const Summary: React.FC<Props> = ({ data, onStartFree, onUnlock }) => {
  const visible = useFadeIn(80)
  const vibe = VIBES.find(v => v.key === data.vibe) || VIBES[0]

  const componentSummary = data.components.slice(0, 4).map(c => COMPONENT_LABELS[c] || c).join(' · ') + (data.components.length > 4 ? ` +${data.components.length - 4}` : '')

  return (
    <ScreenShell bg="#1C0F0C" visible={visible} transition="opacity 0.5s ease">
      <div style={{ height: 3, background: 'rgba(232,165,152,0.15)' }}>
        <div style={{ height: '100%', width: '96%', background: 'linear-gradient(90deg, #C4614A, #D4956A)', borderRadius: 2 }} />
      </div>

      <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#E8A598' }}>All set</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: '#FDF6F0', lineHeight: 1.1, fontStyle: 'italic', margin: 0 }}>
          Ready for you,<br /><span style={{ color: '#E8A598' }}>{data.name}.</span>
        </h1>
        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(253,246,240,0.4)' }}>Here's your journey</p>

        <div style={{ background: 'rgba(232,165,152,0.07)', border: '1px solid rgba(232,165,152,0.15)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#E8A598', marginBottom: 10 }}>✦ Day 1 preview</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: '#FDF6F0', lineHeight: 1.5, marginBottom: 10 }}>"She believed she could, so she did."</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #C4614A, #5a1a0a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎵</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#FDF6F0' }}>Bichota</div>
              <div style={{ fontSize: 10, color: 'rgba(253,246,240,0.4)' }}>Karol G</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,165,152,0.1)', borderRadius: 14, padding: '4px 14px' }}>
          {[
            { icon: '💊', key: 'Treatment', val: `${TREATMENT_LABELS[data.treatment] || data.treatment} · ${data.cycleDays} days` },
            { icon: '✨', key: 'Daily content', val: componentSummary },
            { icon: vibe.emoji, key: 'Vibe', val: vibe.label },
            { icon: '🎵', key: 'Music', val: data.genres.slice(0, 3).join(' · ') },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(232,165,152,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{row.icon}</div>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(253,246,240,0.35)', marginBottom: 2 }}>{row.key}</div>
                <div style={{ fontSize: 12, color: '#FDF6F0' }}>{row.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button onClick={onStartFree} style={{ width: '100%', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Begin free · Day 1 →</button>
        <button onClick={onUnlock} style={{ width: '100%', background: 'transparent', color: '#E8A598', border: '1px solid rgba(232,165,152,0.3)', borderRadius: 14, padding: '15px', fontSize: 14, cursor: 'pointer' }}>Unlock full journey · from £5.99</button>
        <div style={{ textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(253,246,240,0.25)', letterSpacing: '0.08em' }}>3 days free · no card needed</div>
      </div>
    </ScreenShell>
  )
}

export default Summary
