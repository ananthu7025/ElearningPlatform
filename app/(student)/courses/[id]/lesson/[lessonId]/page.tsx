'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useState } from 'react'
import Link from 'next/link'
import MuxPlayer from '@mux/mux-player-react'
import api from '@/lib/api'

const TABS = [
  { id: 'Overview', icon: 'ti tabler-info-circle' },
  { id: 'Q&A',      icon: 'ti tabler-message-question' },
  { id: 'Notes',    icon: 'ti tabler-notebook' },
]

export default function VideoLessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>()
  const qc = useQueryClient()
  const [activeTab, setActiveTab]     = useState('Overview')
  const [noteText, setNoteText]       = useState('')
  const [questionText, setQuestionText] = useState('')

  const { data: lessonData, isLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then(r => r.data)
  )
  const { data: doubtsData } = useQuery(['doubts', lessonId], () =>
    api.get(`/doubts?lessonId=${lessonId}`).then(r => r.data)
  )

  const lesson  = lessonData?.lesson
  const doubts  = doubtsData?.doubts ?? []

  const markComplete = useMutation(
    (payload: any) => api.post('/progress', { lessonId, ...payload }),
    { onSuccess: () => qc.invalidateQueries(['courseProgress', courseId]) }
  )

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-body-tertiary gap-3">
      <div className="spinner-border text-primary" style={{ width: 36, height: 36 }} />
      <p className="small text-body-secondary mb-0">Loading lesson…</p>
    </div>
  )

  if (!lesson) return (
    <div className="d-flex align-items-center justify-content-center vh-100">
      <div className="alert alert-danger d-flex align-items-center gap-2 shadow-sm">
        <i className="ti tabler-alert-circle fs-5"></i> Lesson not found.
      </div>
    </div>
  )

  // ── Page ─────────────────────────────────────────────────────────────────────
  return (
    <div className="d-flex flex-column lesson-shell">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="lesson-topbar bg-white border-bottom shadow-sm d-flex align-items-center gap-3 px-4 flex-shrink-0">
        <Link
          href={`/courses/${courseId}`}
          className="d-flex align-items-center gap-2 text-decoration-none text-body-secondary lesson-back"
        >
          <div className="avatar avatar-xs bg-label-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
            <i className="ti tabler-arrow-left" style={{ fontSize: 12 }}></i>
          </div>
          <span className="small fw-medium d-none d-sm-inline">Back to Course</span>
        </Link>

        <div className="vr mx-1 opacity-25" style={{ height: 28 }}></div>

        <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
          <i className="ti tabler-player-play-filled text-primary flex-shrink-0 small"></i>
          <span className="small fw-bold text-heading text-truncate">{lesson.title}</span>
        </div>

        <div className="d-flex align-items-center gap-4 ms-auto flex-shrink-0">
          <div className="d-none d-md-flex flex-column align-items-end gap-1">
            <span className="extra-small text-body-secondary">
              Progress <span className="fw-bold text-primary">45%</span>
            </span>
            <div className="progress rounded-pill" style={{ width: 110, height: 5 }}>
              <div className="progress-bar bg-primary" style={{ width: '45%' }}></div>
            </div>
          </div>

          <button
            className={`btn btn-sm fw-bold px-4 rounded-pill ${
              markComplete.isSuccess ? 'btn-success' : 'btn-primary'
            }`}
            onClick={() => markComplete.mutate({ completed: true })}
            disabled={markComplete.isLoading || markComplete.isSuccess}
          >
            {markComplete.isLoading ? (
              <span className="spinner-border spinner-border-sm"></span>
            ) : markComplete.isSuccess ? (
              <><i className="ti tabler-check me-1"></i>Completed</>
            ) : (
              'Mark Complete'
            )}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* ── Left: Video + Lesson Info ──────────────────────────────────────── */}
        <div className="d-flex flex-column flex-grow-1 overflow-auto">

          {/* Video Player */}
          <div className="bg-black flex-shrink-0 position-relative" style={{ aspectRatio: '16/9', maxHeight: '70vh' }}>
            {lesson.muxPlaybackId ? (
              <MuxPlayer
                playbackId={lesson.muxPlaybackId}
                metadata={{ video_title: lesson.title }}
                style={{ width: '100%', height: '100%', display: 'block' }}
                onEnded={() => markComplete.mutate({ completed: true })}
              />
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-white">
                <div
                  className="rounded-circle bg-white bg-opacity-10 d-flex align-items-center justify-content-center mb-3"
                  style={{ width: 72, height: 72 }}
                >
                  <i className="ti tabler-video-off fs-2 opacity-50"></i>
                </div>
                <p className="small opacity-50 mb-0">Video is being processed. Check back shortly.</p>
              </div>
            )}
          </div>

          {/* Lesson Info Panel */}
          <div className="bg-white border-bottom px-4 px-md-5 py-4 flex-shrink-0">
            <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
              <button className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                <i className="ti tabler-chevron-left small me-1"></i>Previous
              </button>
              <button className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                Next<i className="ti tabler-chevron-right small ms-1"></i>
              </button>
              <span className="badge bg-label-primary rounded-pill px-3 ms-auto">
                <i className="ti tabler-video small me-1"></i>VIDEO
              </span>
            </div>

            <h5 className="fw-bold text-heading mb-2">{lesson.title}</h5>

            <div className="d-flex align-items-center gap-4 flex-wrap small text-body-secondary">
              <span className="d-flex align-items-center gap-1">
                <i className="ti tabler-clock small"></i>
                {lesson.durationSeconds ? `${Math.round(lesson.durationSeconds / 60)} min` : '15 min'}
              </span>
              <span className="d-flex align-items-center gap-1">
                <i className="ti tabler-eye small"></i>
                Free preview available
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
        <aside className="d-none d-lg-flex flex-column flex-shrink-0 bg-white border-start" style={{ width: 380 }}>

          {/* Tab Headers */}
          <div className="d-flex border-bottom flex-shrink-0" style={{ background: 'var(--bs-body-bg)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-grow-1 border-0 py-3 small fw-bold d-flex align-items-center justify-content-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-primary tab-active'
                    : 'bg-transparent text-body-secondary'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.id}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div className="flex-grow-1 overflow-auto">

            {/* Overview */}
            {activeTab === 'Overview' && (
              <div className="p-4 animate-fadein">
                <p className="extra-small fw-bold text-body-secondary text-uppercase ls-wider mb-3">About this Lesson</p>
                <div
                  className="small text-heading lh-base mb-5"
                  dangerouslySetInnerHTML={{ __html: lesson.content || 'No description available for this lesson.' }}
                />

                <p className="extra-small fw-bold text-body-secondary text-uppercase ls-wider mb-3">Lesson Resources</p>
                <div className="d-flex flex-column gap-3">
                  {[{ name: 'Case Briefs.pdf', size: '2.4 MB', icon: 'ti tabler-file-text', color: 'danger' }].map(r => (
                    <div key={r.name} className="card border-0 rounded-3" style={{ background: 'var(--bs-body-bg)' }}>
                      <div className="card-body p-3 d-flex align-items-center gap-3">
                        <div className={`avatar avatar-sm bg-label-${r.color} rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`}>
                          <i className={`${r.icon} small`}></i>
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <p className="small fw-bold text-heading mb-0 text-truncate">{r.name}</p>
                          <p className="extra-small text-body-secondary mb-0">{r.size}</p>
                        </div>
                        <button className="btn btn-icon btn-sm btn-text-secondary">
                          <i className="ti tabler-download"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Q&A */}
            {activeTab === 'Q&A' && (
              <div className="p-4 animate-fadein">
                <div className="card border-0 rounded-3 mb-5" style={{ background: 'var(--bs-body-bg)' }}>
                  <div className="card-body p-4">
                    <p className="small fw-bold text-heading mb-3">
                      <i className="ti tabler-message-question text-primary me-2"></i>Ask a Question
                    </p>
                    <textarea
                      className="form-control bg-white border-0 shadow-none small mb-3"
                      rows={3}
                      placeholder="What would you like to know about this lesson?"
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                      style={{ resize: 'none' }}
                    />
                    <button
                      className="btn btn-primary btn-sm rounded-pill px-4 fw-bold"
                      disabled={!questionText.trim()}
                    >
                      Post Question
                    </button>
                  </div>
                </div>

                <p className="extra-small fw-bold text-body-secondary text-uppercase ls-wider mb-3">
                  Discussions ({doubts.length})
                </p>

                {doubts.length === 0 ? (
                  <div className="text-center py-5">
                    <div
                      className="avatar avatar-lg bg-label-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                    >
                      <i className="ti tabler-message-2 fs-4 text-primary"></i>
                    </div>
                    <p className="small fw-bold text-heading mb-1">No questions yet</p>
                    <p className="extra-small text-body-secondary mb-0">Be the first to start the discussion!</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-4">
                    {doubts.map((d: any) => (
                      <div key={d.id} className="pb-4 border-bottom">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div className="avatar avatar-xs bg-label-primary rounded-circle d-flex align-items-center justify-content-center">
                            <span className="extra-small fw-bold">U</span>
                          </div>
                          <span className="extra-small fw-bold text-heading">Student</span>
                          <span className="extra-small text-body-secondary">· 2h ago</span>
                        </div>
                        <p className="extra-small text-heading lh-base mb-2">{d.question}</p>
                        <div className="ms-4 ps-3 border-start border-2 border-primary rounded-end py-2 px-3 bg-primary-subtle">
                          <p className="extra-small text-body-secondary fst-italic mb-0">Awaiting tutor response…</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {activeTab === 'Notes' && (
              <div className="p-4 animate-fadein">
                <div className="alert alert-info border-0 bg-label-info rounded-3 d-flex align-items-center gap-2 small mb-4 py-3">
                  <i className="ti tabler-lock text-info flex-shrink-0"></i>
                  Personal notes are private and only visible to you.
                </div>

                <div className="card border rounded-3 shadow-none mb-4">
                  <div className="card-body p-4">
                    <textarea
                      className="form-control border-0 p-0 shadow-none small"
                      rows={5}
                      placeholder="Capture key concepts, timestamps, or anything worth remembering…"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      style={{ resize: 'none' }}
                    />
                    <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
                      <span className="extra-small text-body-secondary d-flex align-items-center gap-1">
                        <i className="ti tabler-cloud-check small text-success"></i>
                        Auto-saved
                      </span>
                      <button
                        className="btn btn-primary btn-sm rounded-pill px-4 extra-small fw-bold"
                        disabled={!noteText.trim()}
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center py-5 opacity-50">
                  <i className="ti tabler-notes fs-2 text-body-secondary d-block mb-2"></i>
                  <p className="extra-small text-body-secondary mb-0">No saved notes yet.</p>
                </div>
              </div>
            )}

          </div>
        </aside>
      </div>

      <style jsx>{`
        .lesson-shell { height: 100vh; overflow: hidden; }
        .lesson-topbar { height: 60px; z-index: 50; }
        .lesson-back:hover { color: var(--bs-primary) !important; }
        .tab-active { box-shadow: inset 0 -2px 0 var(--bs-primary); }
        .animate-fadein { animation: fadein 0.2s ease-out; }
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .ls-wider { letter-spacing: 0.06em; }
        .extra-small { font-size: 0.75rem !important; }
        .bg-primary-subtle { background-color: rgba(115,103,240,0.06) !important; }
      `}</style>
    </div>
  )
}
