'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import MuxPlayer from '@mux/mux-player-react'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

// ─── Constants ──────────────────────────────────────────────────────────────

const LESSON_ICON: Record<string, string> = {
  VIDEO: 'ti tabler-player-play',
  TEXT: 'ti tabler-file-text',
  QUIZ: 'ti tabler-list-check',
  ASSIGNMENT: 'ti tabler-edit',
  LIVE: 'ti tabler-video',
}

// ─── Components ─────────────────────────────────────────────────────────────

export default function LessonPlayerPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  // 1. Fetch Lesson Data (includes quiz/pdfUrl)
  const { data, isLoading: isLessonLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  const lesson = data?.lesson
  const courseId = lesson?.module?.courseId
  const pdfUrl = data?.pdfUrl

  // 2. Fetch Course Curriculum for the Sidebar
  const { data: curriculumData } = useQuery(['curriculum', courseId], () =>
    api.get(`/courses/${courseId}/curriculum`).then((r) => r.data),
    { enabled: !!courseId }
  )

  // 3. Progress Mutation
  const markComplete = useMutation((payload: any) =>
    api.post('/progress', { lessonId, ...payload }),
    { onSuccess: () => qc.invalidateQueries(['lesson', lessonId]) }
  )

  // 4. Quiz State
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [timeLeft, setTimeLeft] = useState(0)
  const [isQuizStarted, setIsQuizStarted] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [quizResults, setQuizResults] = useState<any>(null)

  const quiz = lesson?.quiz
  const questions = quiz?.questions ?? []

  // Initialize timer when quiz starts
  useEffect(() => {
    if (isQuizStarted && quiz?.timeLimitMinutes) {
      setTimeLeft(quiz.timeLimitMinutes * 60)
    }
  }, [isQuizStarted, quiz?.timeLimitMinutes])

  // Timer countdown
  useEffect(() => {
    if (isQuizStarted && timeLeft > 0 && !quizResults) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearInterval(timer)
    } else if (timeLeft === 0 && isQuizStarted && !quizResults) {
      handleQuizSubmit() // Auto-submit on time out
    }
  }, [isQuizStarted, timeLeft, quizResults])

  if (isLessonLoading) return (
    <StudentLayout>
      <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
    </StudentLayout>
  )

  if (!lesson) return <StudentLayout><div className="alert alert-danger">Lesson not found</div></StudentLayout>

  // ─── Quiz Logic ───────────────────────────────────────────────────────────

  const handleQuizSubmit = () => {
    setShowSubmitModal(false)
    let correctCount = 0
    questions.forEach((q: any, i: number) => {
      // options is Json (Array)
      const options = q.options as any[]
      const selectedId = answers[i]
      if (selectedId === q.correctAnswer) correctCount++
    })

    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= (quiz?.passingScore ?? 60)
    
    setQuizResults({ score, correctCount, total: questions.length, passed })
    if (passed) {
      markComplete.mutate({ completed: true })
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ─── Render Helpers ────────────────────────────────────────────────────────

  function renderQuizNavigator() {
    return (
      <div className="card shadow-none border">
        <div className="card-body p-4">
          <p className="small fw-bold text-heading mb-3">Question Navigator</p>
          <div className="d-flex flex-wrap gap-2 mb-4 extra-small">
            <div className="d-flex align-items-center gap-1"><div className="bg-success rounded" style={{ width: 10, height: 10 }} /> Answered</div>
            <div className="d-flex align-items-center gap-1"><div className="bg-warning rounded" style={{ width: 10, height: 10 }} /> Flagged</div>
            <div className="d-flex align-items-center gap-1"><div className="bg-primary rounded" style={{ width: 10, height: 10 }} /> Current</div>
          </div>
          <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {questions.map((_: any, i: number) => {
              let statusClass = 'bg-label-secondary border'
              if (i === currentQIndex) statusClass = 'bg-primary text-white shadow-sm'
              else if (flagged.has(i)) statusClass = 'bg-warning text-white'
              else if (answers[i]) statusClass = 'bg-success text-white'

              return (
                <button
                  key={i}
                  onClick={() => setCurrentQIndex(i)}
                  className={`btn btn-sm p-0 d-flex align-items-center justify-content-center fw-bold rounded-circle ${statusClass}`}
                  style={{ width: 32, height: 32, fontSize: 12 }}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function renderLessonContent() {
    if (lesson.type === 'VIDEO') {
       return (
         <div className="bg-dark rounded overflow-hidden shadow-sm mb-4" style={{ aspectRatio: '16/9' }}>
           {lesson.muxPlaybackId ? (
             <MuxPlayer
               playbackId={lesson.muxPlaybackId}
               metadata={{ video_title: lesson.title }}
               className="w-100 h-100"
               onEnded={() => markComplete.mutate({ completed: true })}
             />
           ) : (
             <div className="d-flex align-items-center justify-content-center h-100 text-white opacity-50">
               <div className="text-center">
                 <i className="ti tabler-video-off fs-1 mb-2"></i>
                 <p>Video processing in progress...</p>
               </div>
             </div>
           )}
         </div>
       )
    }

    if (lesson.type === 'TEXT') {
       return (
         <div className="card shadow-none border mb-4">
           <div className="card-body prose" dangerouslySetInnerHTML={{ __html: lesson.content || '<p>No content provided.</p>' }} />
         </div>
       )
    }

    if (lesson.type === 'QUIZ') {
      if (!isQuizStarted) {
        return (
          <div className="card shadow-none border text-center p-10">
            <div className="avatar avatar-xl bg-label-primary mx-auto mb-4">
               <i className="ti tabler-list-check fs-1"></i>
            </div>
            <h3 className="fw-bold mb-2">{quiz?.title || 'Knowledge Assessment'}</h3>
            <p className="text-body-secondary mb-6">
              This quiz contains {questions.length} questions. You need {quiz?.passingScore}% to pass.<br />
              Time limit: {quiz?.timeLimitMinutes || 'Unlimited'} minutes.
            </p>
            <button className="btn btn-primary btn-lg px-10" onClick={() => setIsQuizStarted(true)}>
              Start Quiz
            </button>
          </div>
        )
      }

      if (quizResults) {
        return (
          <div className="card shadow-none border text-center p-10">
            <div className={`avatar avatar-xl bg-label-${quizResults.passed ? 'success' : 'danger'} mx-auto mb-4`}>
               <i className={`ti tabler-${quizResults.passed ? 'trophy' : 'alert-circle'} fs-1`}></i>
            </div>
            <h3 className="fw-bold mb-2">{quizResults.passed ? 'Congratulations!' : 'Keep Practicing'}</h3>
            <p className="fs-4 mb-4">Your Score: <span className={quizResults.passed ? 'text-success' : 'text-danger'}>{quizResults.score}%</span></p>
            <p className="text-body-secondary mb-6">
               You correctly answered {quizResults.correctCount} out of {quizResults.total} questions.
               {quizResults.passed ? ' You have successfully passed this lesson.' : ` You need at least ${quiz?.passingScore}% to move forward.`}
            </p>
            {!quizResults.passed && (
              <button className="btn btn-primary" onClick={() => { setQuizResults(null); setAnswers({}); setCurrentQIndex(0); setFlagged(new Set()); }}>
                Try Again
              </button>
            )}
            {quizResults.passed && (
               <button className="btn btn-outline-primary" onClick={() => history.back()}>Return to Curriculum</button>
            )}
          </div>
        )
      }

      const q = questions[currentQIndex]
      const options = q?.options as any[] ?? []

      return (
        <div className="row g-6">
          <div className="col-lg-8">
             <div className="card shadow-none border mb-4">
               <div className="card-body p-6">
                 <div className="d-flex align-items-center justify-content-between mb-6">
                    <span className="badge bg-label-primary">Question {currentQIndex + 1} of {questions.length}</span>
                    <button 
                      className={`btn btn-sm ${flagged.has(currentQIndex) ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => {
                        const next = new Set(flagged)
                        if (next.has(currentQIndex)) next.delete(currentQIndex)
                        else next.add(currentQIndex)
                        setFlagged(next)
                      }}
                    >
                      <i className="ti tabler-flag me-1"></i>Flag
                    </button>
                 </div>

                 <h5 className="fw-bold text-heading mb-6 lh-base">{q.questionText}</h5>

                 <div className="d-flex flex-column gap-3">
                    {options.map((opt, i) => {
                      const id = String.fromCharCode(65 + i) // A, B, C...
                      const isSelected = answers[currentQIndex] === id
                      return (
                        <label 
                          key={id} 
                          className={`d-flex align-items-center gap-3 p-4 rounded border border-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-label-primary shadow-sm' : 'border-light'}`}
                        >
                          <div className={`avatar avatar-xs rounded-circle d-flex align-items-center justify-content-center fw-bold ${isSelected ? 'bg-primary text-white' : 'bg-label-secondary'}`}>
                             {id}
                          </div>
                          <span className={`${isSelected ? 'text-primary fw-bold' : 'text-heading'} flex-grow-1`}>{opt}</span>
                          <input 
                            type="radio" 
                            name={`q-${currentQIndex}`} 
                            className="d-none" 
                            checked={isSelected}
                            onChange={() => setAnswers({...answers, [currentQIndex]: id})}
                          />
                        </label>
                      )
                    })}
                 </div>
               </div>
               <div className="card-footer border-top d-flex justify-content-between">
                  <button 
                    className="btn btn-outline-secondary" 
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex(v => v -1)}
                  >
                    Previous
                  </button>
                  {currentQIndex === questions.length - 1 ? (
                    <button className="btn btn-success" onClick={() => setShowSubmitModal(true)}>
                      Finish Quiz
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => setCurrentQIndex(v => v + 1)}>
                      Next Question
                    </button>
                  )}
               </div>
             </div>
          </div>
          <div className="col-lg-4">
             {renderQuizNavigator()}
          </div>
        </div>
      )
    }

    if (lesson.type === 'ASSIGNMENT') {
       return (
         <div className="card shadow-none border">
           <div className="card-body p-6">
              <div className="avatar avatar-md bg-label-info mb-4">
                 <i className="ti tabler-edit fs-4"></i>
              </div>
              <h5 className="fw-bold text-heading mb-2">Assignment Submission</h5>
              <p className="text-body-secondary mb-6">{lesson.assignment?.description || 'Follow the instructions below to complete your assignment.'}</p>
              
              <div className="bg-body-tertiary rounded p-4 mb-6">
                 <label className="form-label fw-bold small mb-2">Upload your work (PDF or Word)</label>
                 <input type="file" className="form-control" />
              </div>

              <button className="btn btn-primary" onClick={() => markComplete.mutate({ completed: true })}>
                Submit and Mark Complete
              </button>
           </div>
         </div>
       )
    }

    if (pdfUrl) {
       return (
         <div className="card shadow-none border overflow-hidden" style={{ height: '70vh' }}>
            <iframe 
              src={`${pdfUrl}#toolbar=0`} 
              className="w-100 h-100 border-0" 
              title={lesson.title}
            />
         </div>
       )
    }

    return <div className="alert alert-secondary">Content type {lesson.type} not supported in the player yet.</div>
  }

  return (
    <StudentLayout>
      {/* Quiz Header */}
      {isQuizStarted && lesson.type === 'QUIZ' && !quizResults && (
        <div className="sticky-top bg-white border-bottom mb-6" style={{ top: 0, zIndex: 10 }}>
           <div className="container-xxl py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                 <button className="btn btn-icon btn-outline-secondary border-0" onClick={() => history.back()}>
                    <i className="ti tabler-arrow-left"></i>
                 </button>
                 <div className="vr"></div>
                 <span className="fw-bold text-heading h5 mb-0">{quiz?.title}</span>
              </div>
              
              <div className="d-flex align-items-center gap-4">
                 {quiz?.timeLimitMinutes && (
                   <div className="bg-label-warning px-4 py-2 rounded border border-warning border-opacity-25 d-flex align-items-center gap-2">
                      <i className="ti tabler-clock"></i>
                      <span className="fw-bold fs-5" style={{ fontFamily: 'monospace' }}>{formatTime(timeLeft)}</span>
                   </div>
                 )}
                 <button className="btn btn-success d-none d-md-block" onClick={() => setShowSubmitModal(true)}>Submit Quiz</button>
              </div>
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="row g-6">
        <div className="col-12">
           {!isQuizStarted && (
             <div className="d-flex align-items-center justify-content-between mb-4 mt-2">
                <div>
                   <h4 className="fw-bold text-heading mb-1">{lesson.title}</h4>
                   <nav aria-label="breadcrumb">
                      <ol className="breadcrumb extra-small mb-0">
                         <li className="breadcrumb-item"><Link href={`/courses/${courseId}`}>Curriculum</Link></li>
                         <li className="breadcrumb-item active">{lesson.type}</li>
                      </ol>
                   </nav>
                </div>
                <div className="d-flex gap-2">
                   <button 
                    className={`btn ${markComplete.isSuccess ? 'btn-success' : 'btn-outline-primary'}`}
                    onClick={() => markComplete.mutate({ completed: true })}
                    disabled={markComplete.isLoading}
                   >
                     {markComplete.isSuccess ? <><i className="ti tabler-check me-1"></i>Completed</> : 'Mark Complete'}
                   </button>
                </div>
             </div>
           )}

           {renderLessonContent()}
        </div>
      </div>

      {/* Curriculum Sidebar (Sticky/Floating footer alternative for mobile) */}
      {!isQuizStarted && curriculumData && (
        <div className="card shadow-none border mt-8">
          <div className="card-header border-bottom py-3">
            <h6 className="mb-0 fw-bold">Course Curriculum</h6>
          </div>
          <div className="list-group list-group-flush">
             {curriculumData.modules.map((mod: any) => (
               <div key={mod.id}>
                  <div className="list-group-item bg-body-tertiary extra-small py-2 px-4 fw-bold text-uppercase tracking-wider">
                     {mod.title}
                  </div>
                  {mod.lessons.map((l: any) => (
                    <Link 
                      key={l.id} 
                      href={`/learn/${l.id}`}
                      className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 px-6 ${l.id === lessonId ? 'bg-label-primary' : ''}`}
                    >
                       <i className={`${LESSON_ICON[l.type]} small text-body-secondary`}></i>
                       <span className={`small flex-grow-1 ${l.id === lessonId ? 'fw-bold text-primary' : ''}`}>{l.title}</span>
                       {l.durationSeconds > 0 && <small className="text-body-secondary extra-small">{Math.round(l.durationSeconds / 60)}m</small>}
                    </Link>
                  ))}
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 }}>
          <div className="card shadow-lg rounded-4" style={{ maxWidth: 440, width: '100%' }}>
            <div className="card-body p-6 text-center">
              <div className="avatar avatar-lg bg-label-warning mx-auto mb-4">
                <i className="ti tabler-alert-triangle fs-3"></i>
              </div>
              <h5 className="fw-bold text-heading mb-2">Submit Quiz?</h5>
              <p className="text-body-secondary small mb-6">
                Are you sure you want to finish the assessment? You won&apos;t be able to change your answers.
              </p>
              
              <div className="bg-body-tertiary rounded p-4 mb-6 text-start">
                  <div className="d-flex justify-content-between small mb-2">
                     <span>Answered questions:</span>
                     <span className="fw-bold text-success">{Object.keys(answers).length} / {questions.length}</span>
                  </div>
                  <div className="d-flex justify-content-between small">
                     <span>Time remaining:</span>
                     <span className="fw-bold text-warning">{formatTime(timeLeft)}</span>
                  </div>
              </div>

              <div className="d-flex gap-3">
                <button className="btn btn-outline-secondary flex-grow-1" onClick={() => setShowSubmitModal(false)}>Close</button>
                <button className="btn btn-primary flex-grow-1 fw-bold" onClick={handleQuizSubmit}>Submit Anyway</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </StudentLayout>
  )
}
