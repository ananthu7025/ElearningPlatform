'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Link from 'next/link'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

type LessonType = 'VIDEO' | 'PDF' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE'

interface Lesson {
  id: string; title: string; type: LessonType
  orderIndex: number; durationSeconds?: number; isFreePreview: boolean
}
interface Module { id: string; title: string; orderIndex: number; lessons: Lesson[] }

type ModalType =
  | 'addModule' | 'editModule'
  | 'addLesson' | 'editLesson' | 'previewLesson'
  | 'uploadVideo' | 'addQuiz' | 'scheduleLive' | 'addAssignment' | 'uploadPdf'
  | null

interface QuizQuestion {
  text: string
  type: 'mcq' | 'tf' | 'short'
  options: string[]
  correct: number    // index for MCQ, 0=True/1=False for TF
  explanation: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<LessonType, string> = {
  VIDEO: 'tabler-video', PDF: 'tabler-file-text',
  QUIZ: 'tabler-file-analytics', ASSIGNMENT: 'tabler-file-report', LIVE: 'tabler-broadcast',
}
const TYPE_COLOR: Record<LessonType, string> = {
  VIDEO: 'primary', PDF: 'info', QUIZ: 'warning', ASSIGNMENT: 'danger', LIVE: 'success',
}
const TYPE_LABEL: Record<LessonType, string> = {
  VIDEO: 'Video', PDF: 'PDF', QUIZ: 'Quiz', ASSIGNMENT: 'Assignment', LIVE: 'Live Class',
}

const LESSON_MODAL_TYPES: ModalType[] = [
  'addLesson', 'editLesson', 'uploadVideo', 'uploadPdf', 'addQuiz', 'scheduleLive', 'addAssignment',
]
const MODAL_TITLE: Partial<Record<NonNullable<ModalType>, string>> = {
  addLesson: 'Add Lesson', editLesson: 'Edit Lesson',
  uploadVideo: 'Upload Video', uploadPdf: 'Upload PDF / Notes',
  addQuiz: 'Create Quiz', scheduleLive: 'Schedule Live Class', addAssignment: 'Add Assignment',
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CurriculumPage() {
  const { id } = useParams<{ id: string }>()
  const qc     = useQueryClient()

  // ── UI state ──────────────────────────────────────────────────────
  const [modal,         setModal]         = useState<ModalType>(null)
  const [isEdit,        setIsEdit]        = useState(false)
  const [targetMod,     setTargetMod]     = useState('')
  const [targetLessonId, setTargetLessonId] = useState('')
  const [openMods,      setOpenMods]      = useState<Set<string>>(new Set())
  const [draggingMod,   setDraggingMod]   = useState<string | null>(null)
  const [toast,         setToast]         = useState('')

  // ── Lesson form state ─────────────────────────────────────────────
  const [fModTitle, setFModTitle] = useState('')
  const [fTitle,    setFTitle]    = useState('')
  const [fType,     setFType]     = useState<LessonType>('VIDEO')
  const [fFree,     setFFree]     = useState(false)

  // ── Upload state ──────────────────────────────────────────────────
  const [videoFile,       setVideoFile]       = useState<File | null>(null)
  const [pdfFile,         setPdfFile]         = useState<File | null>(null)
  const [uploadProgress,  setUploadProgress]  = useState(0)
  const [uploading,       setUploading]       = useState(false)
  const [uploadError,     setUploadError]     = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef   = useRef<HTMLInputElement>(null)

  // ── Quiz builder state ────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizPassScore, setQuizPassScore] = useState(60)
  const [quizTimeLimit, setQuizTimeLimit] = useState(30)

  const newQuestion = (): QuizQuestion => ({ text: '', type: 'mcq', options: ['', '', '', ''], correct: 0, explanation: '' })
  const addQ    = ()              => setQuizQuestions((qs) => [...qs, newQuestion()])
  const removeQ = (qi: number)   => setQuizQuestions((qs) => qs.filter((_, i) => i !== qi))
  const updateQ = (qi: number, field: keyof QuizQuestion, val: unknown) =>
    setQuizQuestions((qs) => qs.map((q, i) => i === qi ? { ...q, [field]: val } : q))
  const updateOpt = (qi: number, oi: number, val: string) =>
    setQuizQuestions((qs) => qs.map((q, i) => i === qi
      ? { ...q, options: q.options.map((o, j) => j === oi ? val : o) } : q))

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const close     = () => {
    setModal(null); setIsEdit(false)
    setVideoFile(null); setPdfFile(null)
    setUploadProgress(0); setUploading(false); setUploadError(null)
    setQuizQuestions([]); setQuizPassScore(60); setQuizTimeLimit(30)
  }

  // ── Data ──────────────────────────────────────────────────────────
  const { data: courseData } = useQuery(['course', id], () => api.get(`/courses/${id}`).then((r) => r.data))
  const { data: currData, isLoading } = useQuery(['curriculum', id], () => api.get(`/courses/${id}/curriculum`).then((r) => r.data))

  const course          = courseData?.course
  const modules: Module[] = currData?.modules ?? []
  const totalLessons    = modules.reduce((a, m) => a + m.lessons.length, 0)
  const freeCount       = modules.reduce((a, m) => a + m.lessons.filter((l) => l.isFreePreview).length, 0)
  const targetLesson    = modules.flatMap((m) => m.lessons).find((l) => l.id === targetLessonId) ?? null

  // ── Mutations ─────────────────────────────────────────────────────
  const addModule = useMutation(
    (title: string) => api.post(`/courses/${id}/modules`, { title }),
    { onSuccess: () => { qc.invalidateQueries(['curriculum', id]); showToast('Module added.') } },
  )
  const editModule = useMutation(
    ({ moduleId, title }: { moduleId: string; title: string }) => api.put(`/modules/${moduleId}`, { title }),
    { onSuccess: () => { qc.invalidateQueries(['curriculum', id]); showToast('Module updated.') } },
  )
  const deleteModule = useMutation(
    (moduleId: string) => api.delete(`/modules/${moduleId}`),
    { onSuccess: () => { qc.invalidateQueries(['curriculum', id]); showToast('Module deleted.') } },
  )
  const reorderModules = useMutation(
    (moduleIds: string[]) => api.put(`/courses/${id}/modules/reorder`, { moduleIds }),
    { onSuccess: () => qc.invalidateQueries(['curriculum', id]) },
  )
  const addLesson = useMutation(
    (d: { moduleId: string; title: string; type: LessonType; isFreePreview: boolean }) =>
      api.post(`/modules/${d.moduleId}/lessons`, { title: d.title, type: d.type, isFreePreview: d.isFreePreview }),
    { onSuccess: () => { qc.invalidateQueries(['curriculum', id]) } },
  )
  const editLesson = useMutation(
    (d: { lessonId: string; title: string; isFreePreview: boolean }) =>
      api.put(`/lessons/${d.lessonId}`, { title: d.title, isFreePreview: d.isFreePreview }),
    { onSuccess: () => { qc.invalidateQueries(['curriculum', id]); showToast('Lesson updated.') } },
  )
  const deleteLesson = useMutation(
    (lessonId: string) => api.delete(`/lessons/${lessonId}`),
    { onSuccess: () => { qc.invalidateQueries(['curriculum', id]); showToast('Lesson deleted.') } },
  )

  // ── Drag-drop reorder ─────────────────────────────────────────────
  function onDrop(targetId: string) {
    if (!draggingMod || draggingMod === targetId) return
    const ids = modules.map((m) => m.id)
    const reordered = [...ids]
    reordered.splice(ids.indexOf(draggingMod), 1)
    reordered.splice(ids.indexOf(targetId), 0, draggingMod)
    setDraggingMod(null)
    reorderModules.mutate(reordered)
  }

  // ── Open helpers ──────────────────────────────────────────────────
  const toggleMod = (mid: string) =>
    setOpenMods((prev) => { const s = new Set(prev); s.has(mid) ? s.delete(mid) : s.add(mid); return s })

  function openAddLesson(mid: string, type: ModalType = 'addLesson') {
    setTargetMod(mid); setFTitle(''); setFFree(false); setUploadError(null)
    setVideoFile(null); setPdfFile(null); setUploadProgress(0)
    setQuizQuestions([]); setQuizPassScore(60); setQuizTimeLimit(30)
    if      (type === 'uploadVideo')    setFType('VIDEO')
    else if (type === 'uploadPdf')      setFType('PDF')
    else if (type === 'addQuiz')        setFType('QUIZ')
    else if (type === 'scheduleLive')   setFType('LIVE')
    else if (type === 'addAssignment')  setFType('ASSIGNMENT')
    else                                setFType('VIDEO')
    setModal(type ?? 'addLesson')
  }
  function openEditLesson(lesson: Lesson, mid: string) {
    setTargetMod(mid); setTargetLessonId(lesson.id)
    setFTitle(lesson.title); setFType(lesson.type); setFFree(lesson.isFreePreview)
    setIsEdit(true)
    setVideoFile(null); setPdfFile(null); setUploadProgress(0); setUploadError(null)
    setQuizQuestions([]); setQuizPassScore(60); setQuizTimeLimit(30)

    if      (lesson.type === 'VIDEO')      setModal('uploadVideo')
    else if (lesson.type === 'PDF')        setModal('uploadPdf')
    else if (lesson.type === 'QUIZ')       { setModal('addQuiz'); fetchQuizForEdit(lesson.id) }
    else if (lesson.type === 'LIVE')       setModal('scheduleLive')
    else if (lesson.type === 'ASSIGNMENT') setModal('addAssignment')
    else                                   setModal('editLesson')
  }

  async function fetchQuizForEdit(lessonId: string) {
    try {
      const res  = await api.get(`/lessons/${lessonId}/quiz`)
      const quiz = res.data.quiz
      if (!quiz) return
      setQuizPassScore(quiz.passingScore ?? 60)
      setQuizTimeLimit(quiz.timeLimitMinutes ?? 30)
      setQuizQuestions(
        (quiz.questions as any[]).map((q) => ({
          text:        q.questionText,
          type:        q.questionType as QuizQuestion['type'],
          options:     q.options?.length ? q.options : ['', '', '', ''],
          correct:     q.questionType === 'mcq'
                         ? Math.max(0, (q.options as string[]).indexOf(q.correctAnswer))
                         : q.correctAnswer === 'True' ? 0 : 1,
          explanation: q.explanation ?? '',
        })),
      )
    } catch { /* leave blank if fetch fails */ }
  }

  // ── Upload helpers ────────────────────────────────────────────────
  function uploadWithXHR(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)) }
      xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)))
      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.open('PUT', url)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  // ── Submit: add module ────────────────────────────────────────────
  function submitAddModule() {
    if (!fModTitle.trim()) return
    addModule.mutate(fModTitle.trim()); setFModTitle(''); close()
  }
  function submitEditModule() {
    if (!fModTitle.trim()) return
    editModule.mutate({ moduleId: targetMod, title: fModTitle.trim() }); setFModTitle(''); close()
  }

  // ── Submit: plain add/edit lesson ────────────────────────────────
  function submitAddLesson() {
    if (!fTitle.trim()) return
    addLesson.mutate(
      { moduleId: targetMod, title: fTitle.trim(), type: fType, isFreePreview: fFree },
      { onSuccess: () => { showToast('Lesson added.'); close() } },
    )
  }
  function submitEditLesson() {
    if (!fTitle.trim()) return
    editLesson.mutate({ lessonId: targetLessonId, title: fTitle.trim(), isFreePreview: fFree })
    close()
  }

  // ── Submit: video upload ──────────────────────────────────────────
  async function submitVideoUpload() {
    if (!fTitle.trim()) { setUploadError('Enter a title.'); return }
    if (!isEdit && !videoFile) { setUploadError('Select a video file.'); return }
    setUploading(true); setUploadError(null); setUploadProgress(0)
    try {
      if (isEdit) {
        // Update title + free preview
        await api.put(`/lessons/${targetLessonId}`, { title: fTitle.trim(), isFreePreview: fFree })
        // Optionally replace video
        if (videoFile) {
          const muxRes = await api.post('/upload/video', { lessonId: targetLessonId })
          await uploadWithXHR(muxRes.data.uploadUrl, videoFile)
          showToast('Video replaced — processing in the background.')
        } else {
          showToast('Lesson updated.')
        }
      } else {
        // 1. Create lesson
        const lessonRes = await api.post(`/modules/${targetMod}/lessons`, { title: fTitle.trim(), type: 'VIDEO', isFreePreview: fFree })
        const lessonId: string = lessonRes.data.lesson.id
        // 2. Get Mux direct-upload URL (passthrough = lessonId for webhook linking)
        const muxRes = await api.post('/upload/video', { lessonId })
        // 3. Upload file directly to Mux with progress
        await uploadWithXHR(muxRes.data.uploadUrl, videoFile!)
        showToast('Video lesson created — processing in the background.')
      }
      qc.invalidateQueries(['curriculum', id])
      close()
    } catch (e: any) {
      setUploadError(e.response?.data?.error?.message ?? e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Submit: PDF upload ────────────────────────────────────────────
  async function submitPdfUpload() {
    if (!fTitle.trim()) { setUploadError('Enter a title.'); return }
    if (!isEdit && !pdfFile) { setUploadError('Select a PDF file.'); return }
    setUploading(true); setUploadError(null); setUploadProgress(0)
    try {
      if (isEdit) {
        const updates: Record<string, unknown> = { title: fTitle.trim(), isFreePreview: fFree }
        if (pdfFile) {
          const presigned = await api.post('/upload/presigned', {
            fileName: pdfFile.name, contentType: pdfFile.type, folder: 'materials',
          })
          await uploadWithXHR(presigned.data.url, pdfFile)
          updates.pdfKey = presigned.data.key
        }
        await api.put(`/lessons/${targetLessonId}`, updates)
        showToast(pdfFile ? 'PDF replaced.' : 'Lesson updated.')
      } else {
        // 1. Get R2 presigned URL
        const presigned = await api.post('/upload/presigned', {
          fileName: pdfFile!.name, contentType: pdfFile!.type, folder: 'materials',
        })
        const { url, key } = presigned.data
        // 2. Upload to R2
        await uploadWithXHR(url, pdfFile!)
        // 3. Create lesson
        const lessonRes = await api.post(`/modules/${targetMod}/lessons`, { title: fTitle.trim(), type: 'PDF', isFreePreview: fFree })
        const lessonId: string = lessonRes.data.lesson.id
        // 4. Attach pdfKey
        await api.put(`/lessons/${lessonId}`, { pdfKey: key })
        showToast('PDF lesson created.')
      }
      qc.invalidateQueries(['curriculum', id])
      close()
    } catch (e: any) {
      setUploadError(e.response?.data?.error?.message ?? e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Submit: quiz ──────────────────────────────────────────────────
  async function submitQuiz() {
    if (!fTitle.trim())           { setUploadError('Enter a quiz title.'); return }
    if (quizQuestions.length < 1) { setUploadError('Add at least one question.'); return }
    const invalid = quizQuestions.find((q) => !q.text.trim())
    if (invalid) { setUploadError('All questions must have question text.'); return }

    setUploading(true); setUploadError(null)

    const questionsPayload = quizQuestions.map((q, i) => ({
      questionText:  q.text,
      questionType:  q.type,
      options:       q.type === 'mcq' ? q.options : (q.type === 'tf' ? ['True', 'False'] : []),
      correctAnswer: q.type === 'mcq' ? (q.options[q.correct] ?? '')
                   : q.type === 'tf'  ? (q.correct === 0 ? 'True' : 'False')
                   : '',
      explanation:   q.explanation,
      orderIndex:    i,
    }))

    try {
      if (isEdit) {
        // Update lesson title/free + replace quiz via PUT
        await api.put(`/lessons/${targetLessonId}`, { title: fTitle.trim(), isFreePreview: fFree })
        await api.put(`/lessons/${targetLessonId}/quiz`, {
          title:            fTitle.trim(),
          passingScore:     quizPassScore,
          timeLimitMinutes: quizTimeLimit,
          questions:        questionsPayload,
        })
        showToast(`Quiz updated — ${quizQuestions.length} questions saved.`)
      } else {
        // 1. Create lesson
        const lessonRes = await api.post(`/modules/${targetMod}/lessons`, { title: fTitle.trim(), type: 'QUIZ', isFreePreview: fFree })
        const lessonId: string = lessonRes.data.lesson.id
        // 2. Create quiz + questions
        await api.post(`/lessons/${lessonId}/quiz`, {
          title:            fTitle.trim(),
          passingScore:     quizPassScore,
          timeLimitMinutes: quizTimeLimit,
          questions:        questionsPayload,
        })
        showToast(`Quiz created with ${quizQuestions.length} questions.`)
      }
      qc.invalidateQueries(['curriculum', id])
      close()
    } catch (e: any) {
      setUploadError(e.response?.data?.error?.message ?? e.message ?? 'Failed to save quiz')
    } finally {
      setUploading(false)
    }
  }

  // ── Main submit dispatcher ────────────────────────────────────────
  function handleLessonSubmit() {
    if (modal === 'editLesson')    return submitEditLesson()
    if (modal === 'uploadVideo')   return submitVideoUpload()
    if (modal === 'uploadPdf')     return submitPdfUpload()
    if (modal === 'addQuiz')       return submitQuiz()
    // addLesson / scheduleLive / addAssignment
    submitAddLesson()
  }

  const isLessonModal = modal !== null && LESSON_MODAL_TYPES.includes(modal)
  const isAdding      = !isEdit
  const isBusy        = uploading || addLesson.isLoading || editLesson.isLoading

  return (
    <AdminLayout title="Edit Curriculum" breadcrumb={`Home / Courses / ${course?.title ?? '…'} / Curriculum`}>

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div className="position-fixed bottom-0 end-0 p-4" style={{ zIndex: 9999 }}>
          <div className="toast show align-items-center text-bg-primary border-0">
            <div className="d-flex">
              <div className="toast-body fw-semibold"><i className="ti tabler-circle-check me-2"></i>{toast}</div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToast('')} />
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-6">
        <div className="d-flex align-items-center gap-3">
          <Link href={`/admin/courses/${id}`} className="btn btn-icon btn-outline-secondary rounded-pill">
            <i className="ti tabler-arrow-left"></i>
          </Link>
          <div>
            <h5 className="mb-0 fw-bold">{course?.title ?? '…'}</h5>
            <small className="text-body-secondary">Curriculum Editor — {modules.length} modules · {totalLessons} lessons</small>
          </div>
        </div>
        <Link href={`/admin/courses/${id}`} className="btn btn-outline-secondary">
          <i className="ti tabler-eye me-1"></i>Preview Course
        </Link>
      </div>

      {/* ── Stat row ───────────────────────────────────────────────── */}
      <div className="row g-4 mb-6">
        {[
          { icon: 'tabler-layout-list',  color: 'primary', val: modules.length, label: 'Modules'      },
          { icon: 'tabler-files',        color: 'info',    val: totalLessons,   label: 'Total Lessons' },
          { icon: 'tabler-circle-check', color: 'success', val: freeCount,      label: 'Free Preview'  },
          { icon: 'tabler-lock',         color: 'warning', val: totalLessons - freeCount, label: 'Locked' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <span className="text-heading d-block small">{s.label}</span>
                    <h4 className="mb-0 mt-1 fw-bold">{s.val}</h4>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded bg-label-${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`}></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-6">

        {/* ── Curriculum builder ─────────────────────────────────── */}
        <div className="col-lg-8">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h5 className="mb-0 fw-bold">Course Modules</h5>
              <p className="mb-0 text-body-secondary small">Drag to reorder modules</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setFModTitle(''); setModal('addModule') }}>
              <i className="ti tabler-plus me-1"></i>Add Module
            </button>
          </div>

          {isLoading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : modules.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-5 text-body-secondary">
                <i className="ti tabler-books" style={{ fontSize: 40 }}></i>
                <p className="mt-2 mb-0">No modules yet. Click <strong>Add Module</strong> to start.</p>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {modules.map((mod) => (
                <div
                  key={mod.id} className="card shadow-none border"
                  draggable
                  onDragStart={() => setDraggingMod(mod.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(mod.id)}
                >
                  {/* Module header */}
                  <div
                    className="card-header d-flex align-items-center justify-content-between py-3 px-4"
                    style={{ background: 'linear-gradient(135deg, #7367F010, #9E95F520)', cursor: 'pointer' }}
                    onClick={() => toggleMod(mod.id)}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <i className="ti tabler-grid-dots text-body-secondary" style={{ cursor: 'grab' }} onClick={(e) => e.stopPropagation()}></i>
                      <div className="badge rounded bg-label-primary p-1_5">
                        <i className="icon-base ti tabler-layout-list icon-md"></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-bold">{mod.title}</h6>
                        <small className="text-body-secondary">{mod.lessons.length} lessons · {mod.lessons.filter((l) => l.isFreePreview).length} free preview</small>
                      </div>
                    </div>
                    <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" onClick={() => toggleMod(mod.id)}>
                        <i className={`ti ${openMods.has(mod.id) ? 'tabler-chevron-up' : 'tabler-chevron-down'}`}></i>
                      </button>
                      <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill" onClick={() => { setTargetMod(mod.id); setFModTitle(mod.title); setModal('editModule') }}>
                        <i className="ti tabler-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-icon btn-text-danger rounded-pill" onClick={() => { if (confirm(`Delete "${mod.title}"?`)) deleteModule.mutate(mod.id) }}>
                        <i className="ti tabler-trash"></i>
                      </button>
                    </div>
                  </div>

                  {openMods.has(mod.id) && (
                    <>
                      <div className="card-body p-0">
                        {mod.lessons.length === 0 ? (
                          <div className="text-center py-5 text-body-secondary">
                            <i className="ti tabler-file-off" style={{ fontSize: 32 }}></i>
                            <p className="mb-0 mt-2 small">No lessons yet. Add one below.</p>
                          </div>
                        ) : (
                          mod.lessons.map((lesson, li) => (
                            <div key={lesson.id} className={`d-flex align-items-center gap-3 py-3 px-4${li < mod.lessons.length - 1 ? ' border-bottom' : ''}`}>
                              <i className="ti tabler-grid-dots text-body-secondary" style={{ cursor: 'grab', fontSize: 14 }}></i>
                              <div className="avatar avatar-sm flex-shrink-0">
                                <span className={`avatar-initial rounded bg-label-${TYPE_COLOR[lesson.type]}`}>
                                  <i className={`icon-base ti ${TYPE_ICON[lesson.type]} icon-md`}></i>
                                </span>
                              </div>
                              <div className="flex-grow-1 overflow-hidden">
                                <div className="fw-semibold small text-heading text-truncate">{lesson.title}</div>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                  <span className={`badge bg-label-${TYPE_COLOR[lesson.type]}`} style={{ fontSize: 10 }}>{TYPE_LABEL[lesson.type]}</span>
                                  {lesson.durationSeconds && <small className="text-body-secondary">{Math.round(lesson.durationSeconds / 60)} min</small>}
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-3 flex-shrink-0">
                                <span className={`badge bg-label-${lesson.isFreePreview ? 'success' : 'secondary'} text-uppercase`} style={{ fontSize: 10 }}>
                                  {lesson.isFreePreview ? 'Free' : 'Locked'}
                                </span>
                                <div className="dropdown">
                                  <button className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow" data-bs-toggle="dropdown">
                                    <i className="ti tabler-dots-vertical"></i>
                                  </button>
                                  <div className="dropdown-menu dropdown-menu-end">
                                    <button className="dropdown-item" onClick={() => openEditLesson(lesson, mod.id)}>
                                      <i className="ti tabler-edit me-2"></i>Edit
                                    </button>
                                    <button className="dropdown-item" onClick={() => { setTargetLessonId(lesson.id); setTargetMod(mod.id); setModal('previewLesson') }}>
                                      <i className="ti tabler-eye me-2"></i>Preview
                                    </button>
                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item text-danger" onClick={() => { if (confirm(`Delete "${lesson.title}"?`)) deleteLesson.mutate(lesson.id) }}>
                                      <i className="ti tabler-trash me-2"></i>Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="card-footer py-2 px-4 border-top d-flex gap-2" style={{ background: 'rgba(115,103,240,0.03)' }}>
                        <button className="btn btn-sm btn-label-primary"   onClick={() => openAddLesson(mod.id, 'addLesson')}>
                          <i className="ti tabler-plus me-1"></i>Add Lesson
                        </button>
                        <button className="btn btn-sm btn-label-secondary" onClick={() => openAddLesson(mod.id, 'uploadVideo')}>
                          <i className="ti tabler-video-plus me-1"></i>Upload Video
                        </button>
                        <button className="btn btn-sm btn-label-secondary" onClick={() => openAddLesson(mod.id, 'addQuiz')}>
                          <i className="ti tabler-list-check me-1"></i>Add Quiz
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────── */}
        <div className="col-lg-4">
          <div className="card mb-6">
            <div className="card-header"><h5 className="card-title mb-0">Content Breakdown</h5></div>
            <div className="card-body py-2">
              {(Object.keys(TYPE_LABEL) as LessonType[]).map((type) => {
                const count = modules.reduce((a, m) => a + m.lessons.filter((l) => l.type === type).length, 0)
                return (
                  <div key={type} className="d-flex align-items-center gap-3 py-2">
                    <div className="avatar avatar-sm flex-shrink-0">
                      <span className={`avatar-initial rounded bg-label-${TYPE_COLOR[type]}`}>
                        <i className={`icon-base ti ${TYPE_ICON[type]} icon-md`}></i>
                      </span>
                    </div>
                    <span className="small fw-medium text-heading flex-grow-1">{TYPE_LABEL[type]}</span>
                    <span className={`badge bg-label-${TYPE_COLOR[type]}`}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Publish Status</h5></div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-1">
                <small className="fw-semibold">Free preview lessons</small>
                <small className="fw-semibold">{freeCount} / {totalLessons}</small>
              </div>
              <div className="progress mb-4" style={{ height: 8 }}>
                <div className="progress-bar bg-success" style={{ width: totalLessons ? `${Math.round((freeCount / totalLessons) * 100)}%` : '0%' }} />
              </div>
              <div className="d-flex gap-2 mb-5">
                <span className="badge bg-label-success flex-grow-1 text-center py-2">
                  <i className="ti tabler-circle-check me-1"></i>{freeCount} Free
                </span>
                <span className="badge bg-label-secondary flex-grow-1 text-center py-2">
                  <i className="ti tabler-lock me-1"></i>{totalLessons - freeCount} Locked
                </span>
              </div>
              <Link href={`/admin/courses/${id}`} className="btn btn-outline-secondary w-100">
                <i className="ti tabler-arrow-left me-1"></i>Back to Course
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════���
          OFFCANVAS — Add / Edit Module
      ══════════════════════════════════════════════════════ */}
      {(modal === 'addModule' || modal === 'editModule') && (
        <>
          <div className="offcanvas offcanvas-end show" style={{ visibility: 'visible', width: 420 }}>
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title">{modal === 'addModule' ? 'Add New Module' : 'Edit Module'}</h5>
              <button className="btn-close" onClick={close} />
            </div>
            <div className="offcanvas-body">
              <div className="mb-4">
                <label className="form-label fw-medium">Module Title <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="e.g. Module 4: Constitutional Amendments"
                  value={fModTitle} onChange={(e) => setFModTitle(e.target.value)} />
              </div>
              <div className="d-flex gap-3 mt-5">
                <button className="btn btn-primary flex-grow-1"
                  onClick={modal === 'addModule' ? submitAddModule : submitEditModule}
                  disabled={addModule.isLoading || editModule.isLoading}>
                  <i className={`ti ${modal === 'addModule' ? 'tabler-plus' : 'tabler-device-floppy'} me-1`}></i>
                  {modal === 'addModule' ? 'Add Module' : 'Save Changes'}
                </button>
                <button className="btn btn-outline-secondary" onClick={close}>Cancel</button>
              </div>
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" onClick={close}></div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          OFFCANVAS — Add / Edit Lesson (all types)
      ══════════════════════════════════════════════════════ */}
      {isLessonModal && (
        <>
          <div className="offcanvas offcanvas-end show" style={{ visibility: 'visible', width: 460 }}>
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title">
                {isEdit ? `Edit ${TYPE_LABEL[fType]} Lesson` : (MODAL_TITLE[modal!] ?? 'Lesson')}
              </h5>
              <button className="btn-close" onClick={close} />
            </div>
            <div className="offcanvas-body">

              {/* Module selector */}
              <div className="mb-4">
                <label className="form-label fw-medium">Module <span className="text-danger">*</span></label>
                <select className="form-select" value={targetMod} onChange={(e) => setTargetMod(e.target.value)}>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>

              {/* Content type — only on generic add/edit */}
              {(modal === 'addLesson' || modal === 'editLesson') && (
                <div className="mb-4">
                  <label className="form-label fw-medium">Content Type</label>
                  <select className="form-select" value={fType} onChange={(e) => setFType(e.target.value as LessonType)}>
                    {(Object.keys(TYPE_LABEL) as LessonType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div className="mb-4">
                <label className="form-label fw-medium">
                  {fType === 'VIDEO' ? 'Video Title' : fType === 'PDF' ? 'Document Title'
                    : fType === 'QUIZ' ? 'Quiz Title' : fType === 'LIVE' ? 'Session Title'
                    : 'Assignment Title'}
                  <span className="text-danger"> *</span>
                </label>
                <input className="form-control" placeholder="Enter title..."
                  value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
              </div>

              {/* ── Video upload ── */}
              {(modal === 'uploadVideo' || (modal === 'addLesson' && fType === 'VIDEO')) && (
                <div className="mb-4">
                  <label className="form-label fw-medium">Video File</label>
                  <div
                    className="border border-dashed rounded p-4 text-center"
                    style={{ borderColor: '#7367F0', cursor: 'pointer' }}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    {videoFile ? (
                      <div className="d-flex align-items-center gap-2 justify-content-center">
                        <i className="ti tabler-video text-primary"></i>
                        <span className="small fw-semibold text-truncate" style={{ maxWidth: 220 }}>{videoFile.name}</span>
                        <button type="button" className="btn btn-sm btn-icon btn-text-danger rounded-pill ms-1"
                          onClick={(e) => { e.stopPropagation(); setVideoFile(null) }}>
                          <i className="ti tabler-x"></i>
                        </button>
                      </div>
                    ) : (
                      <>
                        <i className="ti tabler-video text-primary" style={{ fontSize: 32 }}></i>
                        <p className="mb-1 mt-2 small fw-semibold">
                          {isEdit ? 'Click to replace video (optional)' : 'Click to upload or drag & drop'}
                        </p>
                        <small className="text-body-secondary">MP4, MOV, AVI — up to 2 GB</small>
                      </>
                    )}
                  </div>
                  <input ref={videoInputRef} type="file" accept="video/*" className="d-none"
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
                  {uploading && (
                    <div className="mt-2">
                      <div className="progress" style={{ height: 6 }}>
                        <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <small className="text-body-secondary mt-1 d-block">{uploadProgress}% uploaded — processing after upload completes</small>
                    </div>
                  )}
                </div>
              )}

              {/* ── PDF upload ── */}
              {(modal === 'uploadPdf' || (modal === 'addLesson' && fType === 'PDF')) && (
                <div className="mb-4">
                  <label className="form-label fw-medium">Document File</label>
                  <div
                    className="border border-dashed rounded p-4 text-center"
                    style={{ borderColor: '#00CFE8', cursor: 'pointer' }}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    {pdfFile ? (
                      <div className="d-flex align-items-center gap-2 justify-content-center">
                        <i className="ti tabler-file-text text-info"></i>
                        <span className="small fw-semibold text-truncate" style={{ maxWidth: 220 }}>{pdfFile.name}</span>
                        <button type="button" className="btn btn-sm btn-icon btn-text-danger rounded-pill ms-1"
                          onClick={(e) => { e.stopPropagation(); setPdfFile(null) }}>
                          <i className="ti tabler-x"></i>
                        </button>
                      </div>
                    ) : (
                      <>
                        <i className="ti tabler-file-text text-info" style={{ fontSize: 32 }}></i>
                        <p className="mb-1 mt-2 small fw-semibold">
                          {isEdit ? 'Click to replace file (optional)' : 'Click to upload or drag & drop'}
                        </p>
                        <small className="text-body-secondary">PDF, DOC, DOCX, PPT — up to 100 MB</small>
                      </>
                    )}
                  </div>
                  <input ref={pdfInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="d-none"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
                  {uploading && (
                    <div className="mt-2">
                      <div className="progress" style={{ height: 6 }}>
                        <div className="progress-bar bg-info" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <small className="text-body-secondary mt-1 d-block">{uploadProgress}% uploaded</small>
                    </div>
                  )}
                </div>
              )}

              {/* ── Quiz builder ── */}
              {(modal === 'addQuiz' || (modal === 'addLesson' && fType === 'QUIZ')) && (
                <div className="mb-4">
                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <label className="form-label fw-medium small">Pass Score (%)</label>
                      <input className="form-control form-control-sm" type="number" min={0} max={100}
                        value={quizPassScore} onChange={(e) => setQuizPassScore(+e.target.value)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-medium small">Time Limit (min)</label>
                      <input className="form-control form-control-sm" type="number" min={1}
                        value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(+e.target.value)} />
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <label className="form-label fw-medium mb-0">
                      Questions <span className="badge bg-label-warning ms-1">{quizQuestions.length}</span>
                    </label>
                    <button type="button" className="btn btn-sm btn-label-primary" onClick={addQ}>
                      <i className="ti tabler-plus me-1"></i>Add Question
                    </button>
                  </div>

                  {quizQuestions.length === 0 && (
                    <div className="text-center py-4 border border-dashed rounded text-body-secondary small" style={{ borderColor: '#f0ad4e' }}>
                      <i className="ti tabler-clipboard-list" style={{ fontSize: 30, color: '#f0ad4e' }}></i>
                      <p className="mb-0 mt-2">No questions yet. Click <strong>Add Question</strong> to start.</p>
                    </div>
                  )}

                  <div className="d-flex flex-column gap-3">
                    {quizQuestions.map((q, qi) => (
                      <div key={qi} className="border rounded p-3" style={{ background: 'rgba(240,173,78,0.05)', borderColor: 'rgba(240,173,78,0.35)' }}>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-label-warning" style={{ fontSize: 11 }}>Q{qi + 1}</span>
                            <select className="form-select form-select-sm" style={{ width: 160 }}
                              value={q.type} onChange={(e) => updateQ(qi, 'type', e.target.value as QuizQuestion['type'])}>
                              <option value="mcq">Multiple Choice</option>
                              <option value="tf">True / False</option>
                              <option value="short">Short Answer</option>
                            </select>
                          </div>
                          <button type="button" className="btn btn-sm btn-icon btn-text-danger rounded-pill"
                            onClick={() => removeQ(qi)}>
                            <i className="ti tabler-trash"></i>
                          </button>
                        </div>

                        <input className="form-control form-control-sm mb-3"
                          placeholder={`Question ${qi + 1}…`}
                          value={q.text} onChange={(e) => updateQ(qi, 'text', e.target.value)} />

                        {q.type === 'mcq' && (
                          <div className="d-flex flex-column gap-2">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="d-flex align-items-center gap-2">
                                <input type="radio" className="form-check-input flex-shrink-0 mt-0"
                                  name={`correct-${qi}`} checked={q.correct === oi}
                                  onChange={() => updateQ(qi, 'correct', oi)} />
                                <input className="form-control form-control-sm"
                                  placeholder={`Option ${oi + 1}`}
                                  value={opt} onChange={(e) => updateOpt(qi, oi, e.target.value)} />
                              </div>
                            ))}
                            <small className="text-body-secondary mt-1">
                              <i className="ti tabler-info-circle me-1"></i>Select the radio button next to the correct answer.
                            </small>
                          </div>
                        )}

                        {q.type === 'tf' && (
                          <div className="d-flex gap-4">
                            {['True', 'False'].map((opt, oi) => (
                              <div key={oi} className="form-check">
                                <input className="form-check-input" type="radio"
                                  name={`tf-${qi}`} id={`tf-${qi}-${oi}`}
                                  checked={q.correct === oi}
                                  onChange={() => updateQ(qi, 'correct', oi)} />
                                <label className="form-check-label small fw-semibold" htmlFor={`tf-${qi}-${oi}`}>{opt}</label>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'short' && (
                          <small className="text-body-secondary fst-italic">
                            <i className="ti tabler-pencil me-1"></i>Students will type a free-text answer.
                          </small>
                        )}

                        <div className="mt-2">
                          <input className="form-control form-control-sm"
                            placeholder="Explanation (optional)..."
                            value={q.explanation} onChange={(e) => updateQ(qi, 'explanation', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Live class ── */}
              {(modal === 'scheduleLive' || (modal === 'addLesson' && fType === 'LIVE')) && (
                <div className="mb-4">
                  <label className="form-label fw-medium">Meeting Link <span className="text-body-secondary fw-normal small">(Zoom, Meet, etc.)</span></label>
                  <input className="form-control" placeholder="https://zoom.us/j/..." />
                  <div className="mt-3">
                    <label className="form-label fw-medium small">Platform</label>
                    <select className="form-select form-select-sm" style={{ maxWidth: 180 }}>
                      <option>Zoom</option><option>Google Meet</option>
                      <option>Microsoft Teams</option><option>Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ── Assignment ── */}
              {(modal === 'addAssignment' || (modal === 'addLesson' && fType === 'ASSIGNMENT')) && (
                <div className="mb-4">
                  <label className="form-label fw-medium">Instructions</label>
                  <textarea className="form-control" rows={3} placeholder="Describe what students need to submit..." />
                  <div className="mt-3">
                    <label className="form-label fw-medium small">Due Date</label>
                    <input className="form-control form-control-sm" type="date" style={{ maxWidth: 180 }} />
                  </div>
                </div>
              )}

              {/* Free preview toggle */}
              <div className="mb-5">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="lessonFree"
                    checked={fFree} onChange={(e) => setFFree(e.target.checked)} />
                  <label className="form-check-label" htmlFor="lessonFree">Free preview (visible without enrollment)</label>
                </div>
              </div>

              {uploadError && <div className="alert alert-danger py-2 small mb-3">{uploadError}</div>}

              <div className="d-flex gap-3">
                <button className="btn btn-primary flex-grow-1" onClick={handleLessonSubmit} disabled={isBusy}>
                  {isBusy
                    ? <><span className="spinner-border spinner-border-sm me-2" />{uploadProgress > 0 ? `${uploadProgress}%` : 'Working…'}</>
                    : <><i className={`ti ${isAdding ? 'tabler-plus' : 'tabler-device-floppy'} me-1`}></i>{isAdding ? 'Add to Module' : 'Save Changes'}</>
                  }
                </button>
                <button className="btn btn-outline-secondary" onClick={close} disabled={isBusy}>Cancel</button>
              </div>
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" onClick={() => { if (!isBusy) close() }}></div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Lesson Preview
      ══════════════════════════════════════════════════════ */}
      {modal === 'previewLesson' && targetLesson && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Lesson Preview</h5>
                <button className="btn-close" onClick={close} />
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="avatar">
                    <span className={`avatar-initial rounded bg-label-${TYPE_COLOR[targetLesson.type]}`}>
                      <i className={`icon-base ti ${TYPE_ICON[targetLesson.type]} icon-26px`}></i>
                    </span>
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold">{targetLesson.title}</h6>
                    <small className="text-body-secondary">{TYPE_LABEL[targetLesson.type]}</small>
                  </div>
                </div>
                <ul className="list-unstyled mb-0">
                  {[
                    ['Type',         TYPE_LABEL[targetLesson.type]],
                    ['Free Preview', targetLesson.isFreePreview ? 'Yes' : 'No'],
                    ['Module',       modules.find((m) => m.id === targetMod)?.title ?? '—'],
                    ...(targetLesson.durationSeconds ? [['Duration', `${Math.round(targetLesson.durationSeconds / 60)} min`]] : []),
                  ].map(([k, v]) => (
                    <li key={k} className="d-flex gap-2 mb-2">
                      <span className="fw-semibold text-heading" style={{ minWidth: 110 }}>{k}:</span>
                      <span className="text-body-secondary">{v}</span>
                    </li>
                  ))}
                </ul>
                {targetLesson.type === 'VIDEO' && (
                  <div className="mt-4 rounded" style={{ height: 160, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti tabler-player-play-filled text-white" style={{ fontSize: 40 }}></i>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={close}>Close</button>
                <button className="btn btn-primary" onClick={() => { close(); openEditLesson(targetLesson, targetMod) }}>
                  <i className="ti tabler-edit me-1"></i>Edit Lesson
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
