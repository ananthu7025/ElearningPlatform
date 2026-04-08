'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import { useEffect } from 'react'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

const TYPE_ROUTE_MAP: Record<string, string> = {
  VIDEO: 'lesson',
  PDF: 'pdf',
  QUIZ: 'quiz',
  LIVE: 'live',
  ASSIGNMENT: 'assignment',
}

export default function LessonRedirectPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const router = useRouter()

  const { data, isLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  useEffect(() => {
    if (data?.lesson) {
      const lesson = data.lesson
      const courseId = lesson.module?.courseId
      const typeRoute = TYPE_ROUTE_MAP[lesson.type] || 'lesson'
      
      if (courseId) {
        router.replace(`/courses/${courseId}/${typeRoute}/${lessonId}`)
      }
    }
  }, [data, lessonId, router])

  return (
    <StudentLayout>
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-50">
        <div className="spinner-border text-primary mb-4" role="status"></div>
        <p className="text-body-secondary fw-medium">Loading high-fidelity player...</p>
      </div>
    </StudentLayout>
  )
}
