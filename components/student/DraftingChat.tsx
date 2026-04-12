'use client'

import { useRef, useState } from 'react'
import api from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  scenarioId: string
  draftText: string
}

export default function DraftingChat({ scenarioId, draftText }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  function scrollBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    scrollBottom()

    // Append placeholder for assistant reply
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(
        `/api/practice-lab/scenarios/${scenarioId}/drafting?action=chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftText, messages: newMessages }),
          credentials: 'include',
        }
      )

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
          return next
        })
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const { content } = JSON.parse(payload)
            if (content) {
              setMessages((prev) => {
                const next = [...prev]
                next[next.length - 1] = {
                  role: 'assistant',
                  content: next[next.length - 1].content + content,
                }
                return next
              })
              scrollBottom()
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: 'Connection error. Please try again.' }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="card h-100 d-flex flex-column" style={{ minHeight: 420 }}>
      <div className="card-header d-flex align-items-center gap-2">
        <span className="avatar avatar-sm bg-label-primary rounded">
          <i className="ti tabler-robot" style={{ fontSize: 16 }} />
        </span>
        <div>
          <h6 className="mb-0">LexAI Tutor</h6>
          <small className="text-body-secondary">Ask me about your draft</small>
        </div>
      </div>

      {/* Messages */}
      <div className="card-body overflow-auto flex-grow-1 p-3" style={{ maxHeight: 340 }}>
        {messages.length === 0 && (
          <div className="text-center py-4 text-body-secondary">
            <i className="ti tabler-message-dots d-block mb-2" style={{ fontSize: 28 }} />
            <small>Ask LexAI about your draft — why you missed an issue, how to improve a clause, drafting tips, and more.</small>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`d-flex mb-3 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
            <div
              className={`px-3 py-2 rounded small ${
                m.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-body-tertiary text-body'
              }`}
              style={{ maxWidth: '85%', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
            >
              {m.content || (streaming && i === messages.length - 1 ? (
                <span className="d-flex align-items-center gap-1 text-body-secondary">
                  <span className="spinner-grow spinner-grow-sm" />
                  <span className="spinner-grow spinner-grow-sm" style={{ animationDelay: '0.15s' }} />
                  <span className="spinner-grow spinner-grow-sm" style={{ animationDelay: '0.3s' }} />
                </span>
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="card-footer p-3 border-top">
        <div className="d-flex gap-2 align-items-end">
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="Ask about your draft… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={streaming}
            style={{ resize: 'none' }}
          />
          <button
            className="btn btn-primary btn-sm px-3"
            onClick={send}
            disabled={!input.trim() || streaming}
          >
            {streaming ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <i className="ti tabler-send" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
