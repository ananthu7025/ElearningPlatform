'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function PDFLessonPage() {
  const { id: courseId, lessonId } = useParams<{ id: string, lessonId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  // 1. Fetch Lesson Data
  const { data: lessonData, isLoading: isLessonLoading } = useQuery(['lesson', lessonId], () =>
    api.get(`/lessons/${lessonId}`).then((r) => r.data)
  )

  const lesson = lessonData?.lesson
  const pdfUrl = lessonData?.pdfUrl

  // 2. Progress Mutation
  const markComplete = useMutation((payload: any) =>
    api.post('/progress', { lessonId, ...payload }),
    { onSuccess: () => qc.invalidateQueries(['courseProgress', courseId]) }
  )

  if (isLessonLoading) return (
    <div className="d-flex justify-content-center py-10"><div className="spinner-border text-primary" /></div>
  )

  if (!lesson) return <div className="alert alert-danger">Lesson not found</div>

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#1a1a2e' }}>
      {/* Top toolbar */}
      <div className="d-flex align-items-center gap-4 px-4 shadow-lg sticky-top" style={{ height: 56, backgroundColor: '#0f0f1a', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 100 }}>
        <Link href={`/courses/${courseId}`} className="d-flex align-items-center gap-2 small text-decoration-none transition-all hover-opacity-75" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <i className="ti tabler-chevron-left"></i>
          <span className="fw-medium">Back to Course</span>
        </Link>
        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
        <span className="small fw-bold text-white flex-grow-1 text-truncate" title={lesson.title}>{lesson.title}</span>

        {/* Page status */}
        <div className="d-none d-lg-flex align-items-center gap-2 rounded px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
           <span className="extra-small text-white opacity-50">Document Type:</span>
           <span className="extra-small fw-bold text-danger"><i className="ti tabler-file-type-pdf me-1"></i>PDF MATERIAL</span>
        </div>

        <div className="d-flex align-items-center gap-2 ms-auto">
          <a 
            href={pdfUrl} 
            download
            target="_blank"
            className="btn btn-sm d-flex align-items-center gap-2 extra-small text-white border-0" 
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <i className="ti tabler-download small"></i>
            <span className="d-none d-sm-inline">Download</span>
          </a>
          <button 
            className={`btn btn-sm d-flex align-items-center gap-2 extra-small fw-bold transition-all ${markComplete.isSuccess ? 'bg-success text-white' : ''}`}
            style={{ 
              backgroundColor: markComplete.isSuccess ? '#28C76F' : 'rgba(40,199,111,0.15)', 
              color: markComplete.isSuccess ? '#fff' : '#28C76F', 
              border: '1px solid rgba(40,199,111,0.3)' 
            }}
            onClick={() => markComplete.mutate({ completed: true })}
            disabled={markComplete.isLoading}
          >
            {markComplete.isSuccess ? <i className="ti tabler-check"></i> : <div className="rounded-circle border border-2 border-success me-1" style={{ width: 12, height: 12 }}></div>}
            {markComplete.isSuccess ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
      </div>

      <div className="d-flex flex-grow-1 overflow-hidden h-100">
        {/* Left Sidebar: Navigation Thumbnails (Placeholder for UI) */}
        <div className="d-none d-md-flex flex-column align-items-center py-5 gap-4 overflow-auto bg-dark border-end" style={{ width: 100, backgroundColor: '#0f0f1a', borderRightColor: 'rgba(255,255,255,0.1)' }}>
           {[1, 2, 3, 4, 5].map(i => (
             <div key={i} className={`rounded overflow-hidden cursor-pointer transition-all ${i === 1 ? 'ring-primary border-primary' : 'opacity-50'}`} style={{ width: 64, outline: i === 1 ? '2px solid #7367f0' : '1px solid rgba(255,255,255,0.1)' }}>
                <div className="bg-white p-2 d-flex flex-column gap-1" style={{ aspectRatio: '3/4' }}>
                   {[1,2,3,4,5,6].map(l => <div key={l} className="bg-light rounded" style={{ height: 2, width: l % 3 === 0 ? '60%' : '100%' }}></div>)}
                </div>
                <div className="text-center py-2 text-white extra-small opacity-75">{i}</div>
             </div>
           ))}
           <div className="extra-small text-white opacity-25 mt-auto pb-4">...</div>
        </div>

        {/* Main PDF Content */}
        <div className="flex-grow-1 overflow-auto d-flex flex-column align-items-center p-4 bg-dark bg-opacity-25 shadow-inner">
           {pdfUrl ? (
             <div className="w-100 h-100 d-flex justify-content-center shadow-lg rounded">
                <iframe 
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                  className="w-100 h-100 border-0 rounded"
                  style={{ maxWidth: 1000, minHeight: '85vh' }}
                  title={lesson.title}
                />
             </div>
           ) : (
             <div className="d-flex flex-column align-items-center justify-content-center h-100 text-white opacity-50">
                <i className="ti tabler-file-off fs-1 mb-4"></i>
                <p>No document attached to this lesson.</p>
             </div>
           )}
        </div>

        {/* Right Sidebar: Annotations (Placeholder for UI) */}
        <div className="d-none d-lg-flex flex-column border-start" style={{ width: 300, backgroundColor: '#0f0f1a', borderLeftColor: 'rgba(255,255,255,0.1)' }}>
           <div className="p-4 border-bottom border-secondary border-opacity-25">
              <p className="extra-small fw-bold text-white text-uppercase tracking-widest opacity-50 mb-4">Personal Notes</p>
              <textarea 
                 className="form-control border-0 bg-white bg-opacity-10 text-white extra-small p-3 shadow-none h-auto" 
                 rows={4} 
                 placeholder="Type notes for this page..."
                 style={{ borderRadius: 8 }}
              />
              <button className="btn btn-primary btn-sm w-100 mt-3 extra-small fw-bold">Save Annotation</button>
           </div>
           <div className="flex-grow-1 p-4 overflow-auto">
              <p className="extra-small fw-bold text-white text-uppercase opacity-25 mb-4">Saved Annotations</p>
              <div className="text-center py-10 opacity-25">
                 <i className="ti tabler-notes fs-2 mb-2"></i>
                 <p className="extra-small mb-0">No notes yet</p>
              </div>
           </div>
           {/* Ask AI Footer */}
           <div className="p-4 mt-auto border-top border-secondary border-opacity-25 bg-primary bg-opacity-10">
              <button className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 extra-small fw-black">
                 <i className="ti tabler-bolt"></i>
                 Ask AI about this PDF
              </button>
           </div>
        </div>
      </div>
      <style jsx>{`
        .hover-opacity-75:hover { opacity: 0.75; }
        .shadow-inner { shadow: inset 0 2px 4px 0 rgba(0,0,0,0.5); }
        .ring-primary { outline: 2px solid #7367f0; }
      `}</style>
    </div>
  )
}
