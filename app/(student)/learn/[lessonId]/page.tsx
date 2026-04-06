'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'react-query'
import { useState } from 'react'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

// Mux Player — install: npm i @mux/mux-player-react
// import MuxPlayer from '@mux/mux-player-react'

export default function LessonPlayerPage() {
  const { lessonId } = useParams<{ lessonId: string }>()

  const { data, isLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  const markComplete = useMutation(() =>
    api.post('/progress', { lessonId, completed: true })
  )

  const lesson = data?.lesson

  function renderContent() {
    if (!lesson) return null

    switch (lesson.type) {
      case 'VIDEO':
        return lesson.muxPlaybackId ? (
          <div className="ratio ratio-16x9 rounded overflow-hidden mb-4">
            {/* <MuxPlayer playbackId={lesson.muxPlaybackId} /> */}
            <div className="d-flex align-items-center justify-content-center bg-dark text-white">
              <div className="text-center">
                <i className="ti tabler-video" style={{ fontSize: 48 }} />
                <p className="mt-2 mb-0">Video: {lesson.muxPlaybackId}</p>
                <small className="opacity-75">MuxPlayer renders here in production</small>
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">Video not yet processed</div>
        )

      case 'TEXT':
        return (
          <div className="card mb-4">
            <div className="card-body prose" dangerouslySetInnerHTML={{ __html: lesson.content ?? '<p>No content</p>' }} />
          </div>
        )

      case 'QUIZ':
        return (
          <div className="alert alert-info">
            <i className="ti tabler-list-check me-2" />
            Quiz lesson — quiz engine renders here
          </div>
        )

      case 'ASSIGNMENT':
        return (
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="mb-2"><i className="ti tabler-paperclip me-2" />Assignment</h6>
              <p className="text-body-secondary small mb-3">{lesson.assignment?.description ?? 'Upload your submission below.'}</p>
              <input type="file" className="form-control" />
              <button className="btn btn-primary mt-3" onClick={() => markComplete.mutate()}>
                Submit Assignment
              </button>
            </div>
          </div>
        )

      default:
        return <div className="alert alert-secondary">Content type: {lesson.type}</div>
    }
  }

  return (
    <StudentLayout>
      {isLoading ? (
        <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" role="status" /></div>
      ) : !lesson ? (
        <div className="alert alert-danger">Lesson not found</div>
      ) : (
        <>
          <div className="mb-4">
            <h4 className="mb-1">{lesson.title}</h4>
            <small className="text-body-secondary">
              <span className={`badge bg-label-${lesson.type === 'VIDEO' ? 'primary' : lesson.type === 'TEXT' ? 'info' : 'warning'} rounded-pill me-2`}>
                {lesson.type}
              </span>
              {lesson.duration > 0 && `${Math.round(lesson.duration / 60)} min`}
            </small>
          </div>

          {renderContent()}

          <div className="d-flex justify-content-between align-items-center mt-4">
            <button className="btn btn-outline-secondary" onClick={() => history.back()}>
              <i className="ti tabler-arrow-left me-1" />Back
            </button>
            <button
              className={`btn ${markComplete.isSuccess ? 'btn-success' : 'btn-primary'}`}
              onClick={() => markComplete.mutate()}
              disabled={markComplete.isLoading || markComplete.isSuccess}
            >
              {markComplete.isLoading ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : markComplete.isSuccess ? (
                <i className="ti tabler-check me-1" />
              ) : (
                <i className="ti tabler-check me-1" />
              )}
              {markComplete.isSuccess ? 'Completed!' : 'Mark Complete'}
            </button>
          </div>
        </>
      )}
    </StudentLayout>
  )
}
