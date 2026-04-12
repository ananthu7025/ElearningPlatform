'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function QuizLessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string, lessonId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  // 1. Fetch Lesson Data (includes quiz info)
  const { data: lessonData, isLoading: isLessonLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  const lesson = lessonData?.lesson
  const quiz = lesson?.quiz
  const questions = quiz?.questions ?? []

  // 2. Quiz State
  const [isStarted, setIsStarted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [results, setResults] = useState<any>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // 3. Progress Mutation
  const markComplete = useMutation((payload: any) =>
    api.post('/progress', { lessonId, ...payload }),
    { onSuccess: () => qc.invalidateQueries(['courseProgress', courseId]) }
  )

  // Timer logic
  useEffect(() => {
    if (isStarted && quiz?.timeLimitMinutes && timeLeft === null) {
      setTimeLeft(quiz.timeLimitMinutes * 60)
    }
  }, [isStarted, quiz?.timeLimitMinutes, timeLeft])

  useEffect(() => {
    if (isStarted && timeLeft !== null && timeLeft > 0 && !results) {
      const t = setInterval(() => setTimeLeft(v => (v !== null ? v - 1 : null)), 1000)
      return () => clearInterval(t)
    } else if (isStarted && timeLeft === 0 && !results) {
      handleSubmit()
    }
  }, [isStarted, timeLeft, results])

  const submitAttempt = useMutation((payload: any) =>
    api.post(`/lessons/${lessonId}/quiz/attempts`, payload),
    { onSuccess: () => setResults({ submitted: true }) }
  )

  const handleSubmit = () => {
    setShowConfirm(false)
    const timeTaken = quiz?.timeLimitMinutes ? (quiz.timeLimitMinutes * 60 - (timeLeft ?? 0)) : 0
    
    submitAttempt.mutate({
      answers: answers,
      timeTakenSeconds: timeTaken
    })
  }

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  if (isLessonLoading) return (
    <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
  )

  if (!lesson) return <div className="alert alert-danger">Lesson not found</div>

  // ─── Render: Results View (Now "Submission Received" View) ─────────────────
  if (results) {
    return (
      <StudentLayout>
        <div className="mx-auto text-center" style={{ maxWidth: 600, marginTop: '6vh' }}>
           <img
             src="/img/illustrations/boy-with-rocket-light.png"
             alt="Submitted"
             height={180}
             className="img-fluid mb-5"
           />
           <h2 className="fw-black text-heading mb-2">Assessment Submitted!</h2>
           <p className="fs-5 text-body-secondary mb-8 lh-base">
             Your answers have been successfully recorded. This assessment requires manual evaluation by the course faculty.
           </p>
           
           <div className="card shadow-none border bg-body-tertiary mb-8">
              <div className="card-body p-6">
                 <div className="d-flex align-items-center gap-4 text-start mb-4">
                    <div className="avatar avatar-sm bg-primary rounded"><i className="ti tabler-history fw-bold"></i></div>
                    <div>
                       <p className="small fw-black text-heading mb-0">Review in Progress</p>
                       <p className="extra-small text-body-secondary mb-0">Typically reviewed within 24-48 hours</p>
                    </div>
                 </div>
                 <hr className="my-4 opacity-10" />
                 <p className="extra-small text-body-secondary mb-0 text-start">
                    You will receive a notification on your dashboard and via email once your tutor has graded your submission.
                 </p>
              </div>
           </div>

           <div className="d-flex gap-3 justify-content-center">
              <Link href={`/courses/${courseId}`} className="btn btn-primary px-12 py-3 fw-bold shadow-sm">
                Return to Course Curriculum
              </Link>
           </div>
        </div>
      </StudentLayout>
    )
  }

  // ─── Render: Splash Screen ────────────────────────────────────────────────
  if (!isStarted) {
    return (
      <StudentLayout>
        <div className="mx-auto" style={{ maxWidth: 800 }}>
          <nav aria-label="breadcrumb" className="mb-4">
             <ol className="breadcrumb extra-small">
                <li className="breadcrumb-item"><Link href={`/courses/${courseId}`}>Criminal Law & Procedure</Link></li>
                <li className="breadcrumb-item active">Knowledge Assessment</li>
             </ol>
          </nav>

          <div className="card shadow-sm border-0 mb-6 py-10 px-6 text-center">
             <div className="avatar avatar-xl bg-label-primary mx-auto mb-6">
                <i className="ti tabler-list-check fs-1"></i>
             </div>
             <h3 className="fw-black text-heading mb-2">{quiz?.title || 'Course Quiz'}</h3>
             <p className="text-body-secondary mb-8 lh-base mx-auto" style={{ maxWidth: 500 }}>
                This assessment focuses on core module concepts. Ensure you have reviewed the previous video lessons and PDF materials before proceeding.
             </p>

             <div className="row g-4 justify-content-center mb-10">
                {[
                  { label: 'Total Questions', val: questions.length, icon: 'ti tabler-help' },
                  { label: 'Passing Score', val: `${quiz?.passingScore || 60}%`, icon: 'ti tabler-target' },
                  { label: 'Time Limit', val: quiz?.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : 'Unlimited', icon: 'ti tabler-clock' },
                ].map(stat => (
                  <div key={stat.label} className="col-auto">
                     <div className="bg-label-secondary rounded p-4 border d-flex align-items-center gap-3" style={{ minWidth: 160 }}>
                        <i className={`${stat.icon} text-primary fs-4`}></i>
                        <div className="text-start">
                           <p className="extra-small text-body-secondary mb-0">{stat.label}</p>
                           <p className="small fw-bold text-heading mb-0">{stat.val}</p>
                        </div>
                     </div>
                  </div>
                ))}
             </div>

             <button className="btn btn-primary btn-lg px-12 py-3 fw-bold shadow-sm" onClick={() => setIsStarted(true)}>
                Start Assessment
             </button>
          </div>
        </div>
      </StudentLayout>
    )
  }

  // ─── Render: Active Quiz View (Matching LMS) ──────────────────────────────
  const q = questions[currentIdx]
  const options = q?.options as any[] ?? []

  return (
    <div className="min-vh-100 bg-body-tertiary">
       {/* Sticky Header */}
       <div className="sticky-top bg-white border-bottom shadow-sm d-flex align-items-center gap-4 px-4" style={{ height: 64, zIndex: 100 }}>
          <div className="d-flex align-items-center gap-2">
             <div className="avatar avatar-xs rounded bg-primary d-flex align-items-center justify-content-center"><span className="text-white fw-bold extra-small">L</span></div>
             <span className="fw-bold text-heading">LexEd</span>
          </div>
          <div className="vr h-50 mx-2"></div>
          <div className="flex-grow-1 overflow-hidden">
             <p className="small fw-bold text-heading mb-0 text-truncate">{quiz?.title}</p>
             <p className="extra-small text-body-secondary mb-0">No pause allowed · Timer continues</p>
          </div>

          {quiz?.timeLimitMinutes && (
            <div className="d-flex align-items-center gap-2 bg-label-warning border border-warning border-opacity-25 rounded px-4 py-2">
               <i className="ti tabler-clock text-warning"></i>
               <span className="fw-bold text-warning fs-5" style={{ fontFamily: 'monospace' }}>{formatTime(timeLeft ?? 0)}</span>
            </div>
          )}

          <div className="d-none d-md-flex align-items-center gap-2 extra-small text-danger bg-label-danger px-3 py-2 rounded">
             <i className="ti tabler-alert-triangle"></i> No pause enabled
          </div>
          <button className="btn btn-success btn-sm fw-bold px-4" onClick={() => setShowConfirm(true)}>Submit Quiz</button>
       </div>

       <div className="mx-auto px-4 py-8" style={{ maxWidth: 1100 }}>
          {/* Progress Bar */}
          <div className="d-flex align-items-center justify-content-between mb-6">
             <span className="small fw-bold text-heading">Question {currentIdx + 1} of {questions.length}</span>
             <div className="flex-grow-1 mx-4">
                <div className="progress rounded-pill shadow-none bg-label-secondary" style={{ height: 6 }}>
                   <div className="progress-bar bg-primary" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}></div>
                </div>
             </div>
             <span className="small text-body-secondary">{Math.round(((currentIdx + 1) / questions.length) * 100)}% complete</span>
          </div>

          <div className="row g-6">
             {/* Left: Question Card */}
             <div className="col-lg-8">
                <div className="card shadow-sm border-0 mb-6">
                   <div className="card-body p-6">
                      <div className="d-flex align-items-start gap-4 mb-6">
                        <div className="avatar avatar-sm rounded-circle bg-primary d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm mt-1">
                           <span className="text-white fw-bold small">{currentIdx + 1}</span>
                        </div>
                        <h5 className="text-heading fw-bold lh-base mb-0">{q.questionText}</h5>
                      </div>

                      <div className="d-flex flex-column gap-3">
                         {q.questionType === 'mcq' ? (
                           options.map((opt, i) => {
                             const id = String.fromCharCode(65 + i)
                             const isSelected = answers[currentIdx] === id
                             return (
                               <label 
                                 key={id}
                                 className={`d-flex align-items-start gap-4 p-4 rounded border border-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-label-primary' : 'border-light hover-bg-light'}`}
                                 onClick={() => setAnswers({...answers, [currentIdx]: id})}
                               >
                                 <div className={`avatar avatar-xs rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 transition-all ${isSelected ? 'bg-primary text-white scale-11' : 'bg-label-secondary text-body-secondary border'}`}>
                                    {id}
                                 </div>
                                 <p className={`small lh-base mb-0 ${isSelected ? 'text-primary fw-bold' : 'text-heading'}`}>{opt}</p>
                                 <input type="radio" className="d-none" checked={isSelected} readOnly />
                               </label>
                             )
                           })
                         ) : (
                           <div className="p-1">
                              <label className="form-label extra-small fw-black text-body-secondary text-uppercase mb-3 tracking-widest">Your Written Answer</label>
                              <textarea 
                                className="form-control border-2 bg-body-tertiary p-5 small lh-base shadow-none focus-ring-primary"
                                rows={6}
                                placeholder="Type your answer here..."
                                value={answers[currentIdx] || ''}
                                onChange={(e) => setAnswers({...answers, [currentIdx]: e.target.value})}
                                style={{ borderRadius: 12 }}
                              />
                              <div className="mt-3 d-flex align-items-center gap-2 text-body-secondary extra-small">
                                 <i className="ti tabler-info-circle small"></i>
                                 <span>Answers are case-insensitive by default.</span>
                              </div>
                           </div>
                         )}
                      </div>
                   </div>
                </div>

                {/* Navigation */}
                <div className="d-flex align-items-center gap-3">
                   <button className="btn btn-outline-secondary d-flex align-items-center gap-2" disabled={currentIdx === 0} onClick={() => setCurrentIdx(v => v-1)}>
                      <i className="ti tabler-chevron-left small"></i> Previous
                   </button>
                   <button 
                    className={`btn ${flagged.has(currentIdx) ? 'btn-warning' : 'btn-outline-warning'} d-flex align-items-center gap-2`}
                    onClick={() => {
                        const next = new Set(flagged)
                        if (next.has(currentIdx)) next.delete(currentIdx)
                        else next.add(currentIdx)
                        setFlagged(next)
                    }}
                   >
                      <i className={`ti tabler-flag${flagged.has(currentIdx) ? '-filled' : ''} small`}></i> {flagged.has(currentIdx) ? 'Flagged' : 'Flag Question'}
                   </button>
                   {currentIdx < questions.length - 1 ? (
                     <button className="btn btn-primary d-flex align-items-center gap-2 ms-auto px-6" onClick={() => setCurrentIdx(v => v+1)}>
                        Next <i className="ti tabler-chevron-right small"></i>
                     </button>
                   ) : (
                     <button className="btn btn-success ms-auto px-6 fw-bold" onClick={() => setShowConfirm(true)}>Submit Quiz</button>
                   )}
                </div>
             </div>

             {/* Right: Navigator Sidebar */}
             <div className="col-lg-4">
                <div className="card shadow-sm border-0 sticky-top" style={{ top: 80 }}>
                   <div className="card-body p-5">
                      <p className="small fw-bold text-heading mb-4 text-uppercase tracking-widest opacity-50">Question Navigator</p>
                      
                      <div className="d-grid gap-2 mb-6" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                         {questions.map((_: any, i: number) => {
                           let cls = 'bg-label-secondary border opacity-50'
                           if (i === currentIdx) cls = 'bg-primary text-white shadow-sm ring-2'
                           else if (flagged.has(i)) cls = 'bg-warning text-white'
                           else if (answers[i]) cls = 'bg-success text-white'

                           return (
                             <button
                               key={i}
                               onClick={() => setCurrentIdx(i)}
                               className={`btn btn-sm d-flex align-items-center justify-content-center fw-black rounded-circle transition-all ${cls}`}
                               style={{ aspectRatio: '1', fontSize: 11 }}
                             >
                                {i + 1}
                             </button>
                           )
                         })}
                      </div>

                      <div className="pt-4 border-top extra-small d-flex flex-column gap-2 text-heading">
                         <div className="d-flex justify-content-between"><span>Answered</span><span className="fw-bold text-success">{Object.keys(answers).length}</span></div>
                         <div className="d-flex justify-content-between"><span>Flagged</span><span className="fw-bold text-warning">{flagged.size}</span></div>
                         <div className="d-flex justify-content-between"><span>Not answered</span><span className="fw-bold text-body-secondary">{questions.length - Object.keys(answers).length}</span></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* Confirm Modal */}
       {showConfirm && (
         <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-4 bg-dark bg-opacity-50" style={{ zIndex: 1000 }}>
            <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: 440, width: '100%' }}>
               <div className="card-body p-6 text-center">
                  <div className="avatar avatar-lg bg-label-warning mx-auto mb-4"><i className="ti tabler-alert-triangle fs-3"></i></div>
                  <h5 className="fw-black text-heading mb-2">Ready to submit?</h5>
                  <p className="text-body-secondary small mb-6">You have {questions.length - Object.keys(answers).length} questions left unanswered. Are you sure you want to finish?</p>

                  <div className="bg-label-secondary rounded p-4 text-start mb-6">
                     <div className="d-flex justify-content-between small mb-1"><span>Answered</span><span className="fw-bold text-success">{Object.keys(answers).length}</span></div>
                     <div className="d-flex justify-content-between small"><span>Time Remaining</span><span className="fw-bold text-warning">{formatTime(timeLeft ?? 0)}</span></div>
                  </div>

                  <div className="d-flex gap-3 mt-4">
                     <button className="btn btn-outline-secondary flex-grow-1" onClick={() => setShowConfirm(false)}>Review</button>
                     <button className="btn btn-primary flex-grow-1 fw-bold" onClick={handleSubmit}>Submit Anyway</button>
                  </div>
               </div>
            </div>
         </div>
       )}
    </div>
  )
}
