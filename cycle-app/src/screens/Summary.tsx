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
      <div className="progress-track" style={{ background: 'rgba(232,165,152,0.15)' }}>
        <div className="progress-fill" style={{ width: '96%', background: 'linear-gradient(90deg, #C4614A, #D4956A)' }} />
      </div>

      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: '#E8A598' }}>All set</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: '#FDF6F0', lineHeight: 1.1, fontStyle: 'italic', margin: 0 }}>
          Ready for you,<br /><span style={{ color: '#E8A598' }}>{data.name}.</span>
        </h1>
        <p className="subtext" style={{ color: 'rgba(253,246,240,0.4)' }}>Here's your journey</p>

        <div style={{ background: 'rgba(232,165,152,0.07)', border: '1px solid rgba(232,165,152,0.15)', borderRadius: 14, padding: '14px 16px' }}>
          <div className="mono-hint" style={{ color: '#E8A598', marginBottom: 10 }}>✦ Day 1 preview</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: '#FDF6F0', lineHeight: 1.5, marginBottom: 10 }}>"She believed she could, so she did."</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
            <div className="icon-box flex-center" style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #C4614A, #5a1a0a)', fontSize: 14 }}>🎵</div>
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
              <div className="icon-box flex-center" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(232,165,152,0.1)', fontSize: 12 }}>{row.icon}</div>
              <div>
                <div className="mono-hint" style={{ color: 'rgba(253,246,240,0.35)', marginBottom: 2, letterSpacing: '0.15em', fontSize: 7 }}>{row.key}</div>
                <div style={{ fontSize: 12, color: '#FDF6F0' }}>{row.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="spacer" />
        <button onClick={onStartFree} className="btn-primary" style={{ background: '#C4614A' }}>Begin free · Day 1 →</button>
        <button onClick={onUnlock} className="btn-ghost" style={{ color: '#E8A598', border: '1px solid rgba(232,165,152,0.3)' }}>Unlock full journey · from £5.99</button>
        <div className="mono-xs text-center" style={{ color: 'rgba(253,246,240,0.25)' }}>3 days free · no card needed</div>
      </div>
    </ScreenShell>
  )
}

export default Summary
