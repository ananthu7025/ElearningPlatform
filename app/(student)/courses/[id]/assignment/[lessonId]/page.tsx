'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useState } from 'react'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function AssignmentLessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string, lessonId: string }>()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('Before Submission')

  // 1. Fetch Lesson Data (includes assignment info)
  const { data: lessonData, isLoading: isLessonLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  const lesson = lessonData?.lesson
  const assignment = lesson?.assignment

  // 2. Progress Mutation
  const markComplete = useMutation((payload: any) =>
    api.post('/progress', { lessonId, ...payload }),
    { onSuccess: () => qc.invalidateQueries(['courseProgress', courseId]) }
  )

  const [isSubmitted, setIsSubmitted] = useState(false)
  const [response, setResponse] = useState('')

  const submitAssignment = useMutation((payload: any) =>
    api.post(`/assignments/${assignment?.id}/submissions`, payload),
    { onSuccess: () => setIsSubmitted(true) }
  )

  if (isLessonLoading) return (
    <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
  )

  if (!lesson) return <div className="alert alert-danger">Assignment not found</div>

  const isReviewed = false // Logic for reviewed state

  // ─── Render: Submission Success View ──────────────────────────────────────
  if (isSubmitted) {
    return (
      <StudentLayout>
        <div className="mx-auto text-center" style={{ maxWidth: 600, marginTop: '6vh' }}>
           <img
             src="/img/illustrations/boy-with-rocket-light.png"
             alt="Assignment submitted"
             height={180}
             className="img-fluid mb-5"
           />
           <h2 className="fw-black text-heading mb-2">Assignment Received!</h2>
           <p className="fs-5 text-body-secondary mb-8 lh-base">
             Your files and response have been uploaded successfully. This task will now be queued for manual review by our instructional team.
           </p>
           
           <div className="card shadow-sm border-0 bg-body-tertiary mb-8">
              <div className="card-body p-6">
                 <div className="d-flex align-items-center gap-4 text-start mb-4">
                    <div className="avatar avatar-sm bg-primary rounded"><i className="ti tabler-certificate fw-bold"></i></div>
                    <div>
                       <p className="small fw-black text-heading mb-0">Grading Pending</p>
                       <p className="extra-small text-body-secondary mb-0">Tutors typically provide feedback within 3-5 business days.</p>
                    </div>
                 </div>
                 <hr className="my-4 opacity-10" />
                 <div className="d-flex justify-content-between extra-small text-body-secondary">
                    <span>Submission ID: {lessonId.slice(0,8).toUpperCase()}</span>
                    <span>Status: Awaiting Review</span>
                 </div>
              </div>
           </div>

           <div className="d-flex gap-3 justify-content-center">
              <Link href={`/courses/${courseId}`} className="btn btn-primary px-12 py-3 fw-bold shadow-sm">
                Back to Curriculum
              </Link>
           </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="mx-auto" style={{ maxWidth: 900 }}>
        {/* Header Section */}
        <div className="mb-6">
          <nav aria-label="breadcrumb" className="mb-3">
             <ol className="breadcrumb extra-small">
                <li className="breadcrumb-item"><Link href={`/courses/${courseId}`}>Curriculum</Link></li>
                <li className="breadcrumb-item active">Assignment</li>
             </ol>
          </nav>
          <div className="d-flex align-items-start gap-4">
             <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-3 mb-2">
                   <h4 className="fw-black text-heading mb-0">{lesson.title}</h4>
                   {markComplete.isSuccess && <span className="badge bg-label-success rounded-pill fw-bold">Submitted ✓</span>}
                </div>
                <p className="small text-body-secondary mb-0">Practical Assessment · {lesson.module?.title || 'Course Material'}</p>
             </div>
             <div className="text-end flex-shrink-0">
                <p className="fs-3 fw-black text-heading mb-0">{isReviewed ? '18' : '?'} <span className="small text-body-secondary fw-normal">/ 25 marks</span></p>
                <span className="extra-small text-body-secondary">Max Marks for this task</span>
             </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="d-inline-flex gap-1 bg-white rounded-pill border shadow-sm p-1 mb-6">
           {['Before Submission', 'Review & Results'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`btn btn-sm px-6 py-2 rounded-pill small fw-bold transition-all ${
                 activeTab === tab ? 'btn-primary shadow-sm' : 'btn-text-secondary border-0'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        {activeTab === 'Before Submission' ? (
          /* BEFORE SUBMISSION UI */
          <div className="d-flex flex-column gap-6 animate-in">
            {/* Metadata Badges */}
            <div className="row g-4">
               {[
                 { label: 'Due Date', val: 'Apr 25, 2025', icon: 'ti tabler-calendar', color: 'primary' },
                 { label: 'Time Remaining', val: '12 Days 4 Hrs', icon: 'ti tabler-clock', color: 'warning' },
                 { label: 'Max Score', val: '25 Marks', icon: 'ti tabler-trophy', color: 'success' },
                 { label: 'Status', val: markComplete.isSuccess ? 'Submitted' : 'Pending', icon: 'ti tabler-pin', color: markComplete.isSuccess ? 'success' : 'danger' },
               ].map(stat => (
                 <div key={stat.label} className="col-6 col-md-3">
                    <div className="card shadow-sm border-0 h-100">
                       <div className="card-body p-4">
                          <div className={`avatar avatar-xs rounded bg-label-${stat.color} mb-3 d-flex align-items-center justify-content-center`}>
                             <i className={`${stat.icon} extra-small`}></i>
                          </div>
                          <p className="extra-small text-body-secondary text-uppercase fw-bold mb-1" style={{ fontSize: 9 }}>{stat.label}</p>
                          <p className="small fw-black text-heading mb-0">{stat.val}</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* Content & Instructions */}
            <div className="card shadow-sm border-0">
               <div className="card-body p-6">
                  <h6 className="fw-black text-heading mb-4 text-uppercase extra-small tracking-widest opacity-50">Task Description & Rubric</h6>
                  <div className="prose small text-heading lh-base mb-6" dangerouslySetInnerHTML={{ __html: assignment?.description || 'Review the attached documents and submit your analysis accordingly.' }} />
                  
                  <div className="bg-label-primary rounded p-5 border border-primary border-opacity-10">
                     <p className="extra-small fw-black text-primary text-uppercase mb-4 mt-1 tracking-tighter">Grading Criteria (25 Marks Total)</p>
                     <div className="d-flex flex-column gap-3">
                        {[
                          ['Clarity & Structure (IRAC)', '5 Marks'],
                          ['Legal Reasoning & Case Laws', '10 Marks'],
                          ['Application to Hypothetical Facts', '10 Marks'],
                        ].map(([c, m]) => (
                          <div key={c} className="d-flex align-items-center justify-content-between extra-small fw-bold border-bottom pb-2 border-primary border-opacity-10">
                             <div className="d-flex align-items-center gap-2"><span className="rounded-circle bg-primary" style={{ width: 6, height: 6 }}></span>{c}</div>
                             <span className="text-primary">{m}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Submission Form */}
            <div className="card shadow-sm border-0">
               <div className="card-body p-6">
                  <h6 className="fw-black text-heading mb-4 text-uppercase extra-small tracking-widest opacity-50">Your Submission</h6>
                  
                  {/* Rich Text Placeholder Editor */}
                  <div className="mb-6">
                     <label className="form-label extra-small fw-bold text-body-secondary mb-2">WRITTEN RESPONSE</label>
                     <div className="border rounded shadow-inner overflow-hidden">
                        <div className="bg-label-secondary px-4 py-2 border-bottom d-flex align-items-center gap-1 extra-small">
                           {['B', 'I', 'U', '|', 'Left', 'Center', 'Right', '|', 'Bullet', 'Quote'].map(t => (
                             <button key={t} className={`btn btn-sm btn-text-secondary border-0 p-1 px-2 fw-bold ${t === '|' ? 'disabled' : ''}`}>{t}</button>
                           ))}
                        </div>
                        <textarea 
                           className="form-control border-0 shadow-none p-5 small lh-base" 
                           style={{ minHeight: 240, fontFamily: 'serif' }} 
                           placeholder="Type your structured case brief here..." 
                           value={response}
                           onChange={(e) => setResponse(e.target.value)}
                        />
                        <div className="bg-label-secondary px-4 py-2 border-top extra-small text-body-secondary d-flex justify-content-between">
                           <span>Recommended word count: 500 - 800 words</span>
                           <span>0 Words</span>
                        </div>
                     </div>
                  </div>

                  {/* File Upload UI */}
                  <div>
                    <label className="form-label extra-small fw-bold text-body-secondary mb-2">ATTACHED DOCUMENTS (PDF, DOCX)</label>
                    <div className="border-2 border-dashed rounded p-8 text-center bg-body-tertiary cursor-pointer hover-bg-light transition-all">
                       <i className="ti tabler-cloud-upload fs-1 text-primary mb-3"></i>
                       <p className="fw-bold mb-1">Click to browse or drag and drop your file</p>
                       <p className="extra-small text-body-secondary">Max size 10MB per file (PDF Recommended)</p>
                    </div>
                  </div>
               </div>
               <div className="card-footer bg-label-secondary border-top p-5 d-flex gap-3 justify-content-center">
                  <button 
                     className="btn btn-primary px-10 py-3 fw-black shadow-sm"
                     onClick={() => submitAssignment.mutate({ content: response })}
                     disabled={submitAssignment.isLoading || !response.trim()}
                  >
                     {submitAssignment.isLoading ? (
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                     ) : 'Submit Assignment'}
                  </button>
                  <button className="btn btn-outline-secondary px-6">Save Draft</button>
               </div>
            </div>
          </div>
        ) : (
          /* REVIEW & RESULTS UI (Placeholder for student view) */
          <div className="d-flex flex-column gap-6 animate-in">
             <div className="card shadow-sm border-0 text-center py-8">
                <img
                  src="/img/illustrations/girl-sitting-with-laptop.png"
                  alt="Under review"
                  height={160}
                  className="img-fluid mb-4"
                />
                <h5 className="fw-black text-heading mb-2">Review in Progress</h5>
                <p className="text-body-secondary small mx-auto mb-6" style={{ maxWidth: 400 }}>Your assignment is currently being graded by the course faculty. You will receive a notification once the review is complete.</p>
                <span className="badge bg-label-primary px-4 py-2 rounded-pill">Expected Review: Apr 28</span>
             </div>
          </div>
        )}
        <style jsx>{`
          .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.05); }
          .animate-in { animation: fadeIn 0.4s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </StudentLayout>
  )
}
