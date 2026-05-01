'use client'
import { useState, useRef } from 'react'

export default function TokenOptimizerPage() {
  const [input, setInput] = useState('')
  const [outputTR, setOutputTR] = useState('')
  const [outputEN, setOutputEN] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedTR, setCopiedTR] = useState(false)
  const [copiedEN, setCopiedEN] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tarayıcınız sesli girişi desteklemiyor. Chrome kullanın.')
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = 'tr-TR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const handleOptimize = async () => {
    if (!input.trim()) return
    setIsLoading(true)
    setError('')
    setOutputTR('')
    setOutputEN('')
    try {
      const res = await fetch('/api/token-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOutputTR(data.optimizedTR)
      setOutputEN(data.optimizedEN)
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyTR = () => {
    navigator.clipboard.writeText(outputTR)
    setCopiedTR(true)
    setTimeout(() => setCopiedTR(false), 2000)
  }

  const handleCopyEN = () => {
    navigator.clipboard.writeText(outputEN)
    setCopiedEN(true)
    setTimeout(() => setCopiedEN(false), 2000)
  }

  // Ortak Stiller
  const headerLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  }

  const boxContainerStyle: React.CSSProperties = {
    flex: 1,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    lineHeight: '1.6',
    overflowY: 'auto',
    minHeight: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 52px)',
      padding: '24px',
      gap: '16px',
      background: 'var(--bg-base)',
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Topbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Token Optimizer
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Promptunu yapıştır, token maliyetini düşür
          </div>
        </div>
        <div style={{
          alignSelf: 'flex-start',
          marginTop: '2px',
          fontSize: '10px',
          color: 'var(--text-muted)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
        }}>
          DeepSeek V4 Flash
        </div>
      </div>

      {/* İçerik alanı — üç kolon grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '16px',
        flex: 1,
        minHeight: 0,
        alignItems: 'stretch',
      }}>

        {/* KOLON 1 — Orijinal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={headerLabelStyle}>ORİJİNAL PROMPT</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Optimize etmek istediğin promptu buraya yapıştır..."
            style={{
              ...boxContainerStyle,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--border-strong)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {input.length > 0 ? `${input.length} karakter` : ''}
              </div>
              <button
                onClick={isListening ? stopListening : startListening}
                title={isListening ? 'Durdur' : 'Sesli giriş'}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: isListening ? '1px solid var(--danger)' : '1px solid var(--border-default)',
                  background: isListening ? 'rgba(248,113,113,0.1)' : 'var(--bg-elevated)',
                  color: isListening ? 'var(--danger)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.15s',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                🎙️
              </button>
              {isListening && (
                <span style={{ fontSize: '11px', color: 'var(--danger)', animation: 'pulse 1.5s infinite' }}>
                  Dinleniyor...
                </span>
              )}
            </div>
            <button
              onClick={handleOptimize}
              disabled={!input.trim() || isLoading}
              style={{
                background: input.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-elevated)',
                color: input.trim() && !isLoading ? 'var(--bg-base)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '8px 20px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {isLoading ? 'Optimize ediliyor...' : 'Optimize Et →'}
            </button>
          </div>
        </div>

        {/* KOLON 2 — Türkçe */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={headerLabelStyle}>
            TÜRKÇE OPTİMİZE
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px' }}>
              ~%20 token tasarrufu
            </span>
          </div>
          <div style={boxContainerStyle}>
            {error ? (
              <span style={{ color: 'var(--danger)' }}>{error}</span>
            ) : isLoading ? (
              <span style={{ color: 'var(--text-muted)' }}>DeepSeek düşünüyor...</span>
            ) : outputTR ? (
              outputTR
            ) : (
              'Optimize edilmiş prompt burada görünecek...'
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCopyTR}
              disabled={!outputTR}
              style={{
                background: copiedTR ? 'rgba(74,222,128,0.1)' : 'var(--bg-elevated)',
                color: copiedTR ? 'var(--success)' : outputTR ? 'var(--text-secondary)' : 'var(--text-muted)',
                border: `1px solid ${copiedTR ? 'rgba(74,222,128,0.2)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '8px 20px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: outputTR ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {copiedTR ? 'Kopyalandı ✓' : 'Kopyala'}
            </button>
          </div>
        </div>

        {/* KOLON 3 — İngilizce */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...headerLabelStyle, marginBottom: 0 }}>
              İNGİLİZCE OPTİMİZE
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px' }}>
                ~%40-60 token tasarrufu
              </span>
            </div>
            <div style={{
              background: 'rgba(74,222,128,0.1)',
              color: 'var(--success)',
              border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              fontSize: '9px',
              fontWeight: 600,
            }}>
              DAHA AZ TOKEN
            </div>
          </div>
          <div style={boxContainerStyle}>
            {error ? (
              <span style={{ color: 'var(--danger)' }}>{error}</span>
            ) : isLoading ? (
              <span style={{ color: 'var(--text-muted)' }}>DeepSeek düşünüyor...</span>
            ) : outputEN ? (
              outputEN
            ) : (
              'Optimize edilmiş prompt burada görünecek...'
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCopyEN}
              disabled={!outputEN}
              style={{
                background: copiedEN ? 'rgba(74,222,128,0.1)' : 'var(--bg-elevated)',
                color: copiedEN ? 'var(--success)' : outputEN ? 'var(--text-secondary)' : 'var(--text-muted)',
                border: `1px solid ${copiedEN ? 'rgba(74,222,128,0.2)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '8px 20px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: outputEN ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {copiedEN ? 'Kopyalandı ✓' : 'Kopyala'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
