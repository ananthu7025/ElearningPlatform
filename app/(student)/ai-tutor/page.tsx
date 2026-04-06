'use client'

import { useState, useRef, useEffect } from 'react'
import StudentLayout from '@/components/layouts/StudentLayout'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AiTutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m LexAI, your law exam preparation assistant. Ask me anything about CLAT, AILET, constitutional law, or any legal topic!' }
  ])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || streaming) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const token  = parsed.choices?.[0]?.delta?.content ?? ''
            if (token) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + token,
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <StudentLayout title="LexAI — AI Tutor">

      <div className="card" style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <div className="card-body flex-grow-1 overflow-auto p-4" style={{ minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} className={`d-flex gap-3 mb-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="avatar avatar-sm flex-shrink-0">
                <span className={`avatar-initial rounded-circle ${m.role === 'assistant' ? 'bg-label-primary' : 'bg-label-success'}`}>
                  {m.role === 'assistant' ? 'AI' : 'Me'}
                </span>
              </div>
              <div
                className={`rounded-3 px-3 py-2 small ${m.role === 'assistant' ? 'bg-body-tertiary' : 'bg-primary text-white'}`}
                style={{ maxWidth: '75%', whiteSpace: 'pre-wrap' }}
              >
                {m.content}
                {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                  <span className="ms-1 opacity-50">▋</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="card-footer p-3 border-top">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Ask about CLAT, constitutional law, legal concepts…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={streaming}
            />
            <button className="btn btn-primary" onClick={send} disabled={streaming || !input.trim()}>
              {streaming
                ? <span className="spinner-border spinner-border-sm" />
                : <i className="ti tabler-send" />}
            </button>
          </div>
          <small className="text-body-secondary mt-2 d-block">Press Enter to send · LexAI may make mistakes on recent developments</small>
        </div>
      </div>

    </StudentLayout>
  )
}
