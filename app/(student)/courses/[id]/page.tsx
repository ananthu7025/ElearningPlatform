'use client'

import { useParams } from 'next/navigation'
import { useQuery } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

const LESSON_ICON: Record<string, string> = {
  VIDEO:      'tabler-video',
  TEXT:       'tabler-file-text',
  QUIZ:       'tabler-list-check',
  ASSIGNMENT: 'tabler-paperclip',
  LIVE:       'tabler-broadcast',
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: curriculumData, isLoading } = useQuery(['studentCurriculum', id], () =>
    api.get(`/courses/${id}/curriculum`).then((r) => r.data)
  )

  const { data: progressData } = useQuery(['courseProgress', id], () =>
    api.get(`/enrollments/${id}/progress`).then((r) => r.data).catch(() => ({ progress: [] })),
    { retry: false }
  )

  const modules  = curriculumData?.modules ?? []
  const progress = progressData?.progress ?? []
  const completedIds = new Set(progress.filter((p: any) => p.completedAt).map((p: any) => p.lessonId))

  const totalLessons    = modules.reduce((s: number, m: any) => s + m.lessons.length, 0)
  const completedLessons = completedIds.size
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <StudentLayout>

      {/* ── Progress header ─────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="fw-semibold">Course Progress</span>
            <span className="text-body-secondary small">{completedLessons}/{totalLessons} lessons</span>
          </div>
          <div className="progress mb-1" style={{ height: 10 }}>
            <div className={`progress-bar ${pct === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
          </div>
          <small className="text-body-secondary">{pct}% complete</small>
        </div>
      </div>

      {/* ── Curriculum ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Course Content</h5>
        </div>
        {isLoading ? (
          <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" role="status" /></div>
        ) : (
          <div className="list-group list-group-flush">
            {modules.map((mod: any) => {
              const modCompleted = mod.lessons.every((l: any) => completedIds.has(l.id))
              return (
                <div key={mod.id}>
                  <div className="list-group-item bg-body-tertiary px-4 py-2 d-flex align-items-center justify-content-between">
                    <span className="fw-semibold small">{mod.title}</span>
                    <div className="d-flex align-items-center gap-2">
                      {modCompleted && <i className="ti tabler-check text-success" />}
                      <small className="text-body-secondary">{mod.lessons.length} lessons</small>
                    </div>
                  </div>
                  {mod.lessons.map((lesson: any) => {
                    const done = completedIds.has(lesson.id)
                    return (
                      <Link
                        key={lesson.id}
                        href={`/learn/${lesson.id}`}
                        className={`list-group-item list-group-item-action px-5 py-2 d-flex align-items-center gap-3 ${done ? 'text-success' : ''}`}
                      >
                        <i className={`ti ${done ? 'tabler-check-circle' : LESSON_ICON[lesson.type] ?? 'tabler-file'} ${done ? 'text-success' : 'text-body-secondary'}`} />
                        <span className="flex-grow-1 small">{lesson.title}</span>
                        {lesson.isFree && <span className="badge bg-label-success rounded-pill small">Free</span>}
                        {lesson.duration > 0 && (
                          <small className="text-body-secondary">{Math.round(lesson.duration / 60)}m</small>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </StudentLayout>
  )
}
