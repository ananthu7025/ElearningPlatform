'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

interface Institute {
  id: string
  name: string
  subdomain: string
  logoUrl: string | null
  primaryColor: string | null
  phone: string | null
  region: string | null
  isPublic: boolean
  publicSlug: string | null
  status: string
  plan: { name: string; maxStudents: number; maxCourses: number; maxTutors: number }
  _count: { courses: number; users: number }
}

interface Course {
  id: string
  title: string
  status: string
  isPublicEnrollable: boolean
  _count: { enrollments: number }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function useApi() {
  const token = useAuthStore((s) => s.accessToken)
  return axios.create({ headers: token ? { Authorization: `Bearer ${token}` } : {} })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const api = useApi()
  const qc  = useQueryClient()

  // ── Institute settings ────────────────────────────────────────────────────
  const { data: instData, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get('/api/admin/settings').then((r) => r.data.institute as Institute),
  })

  const [isPublic,   setIsPublic]   = useState(false)
  const [publicSlug, setPublicSlug] = useState('')
  const [slugError,  setSlugError]  = useState('')
  const [savedMsg,   setSavedMsg]   = useState('')

  useEffect(() => {
    if (instData) {
      setIsPublic(instData.isPublic)
      setPublicSlug(instData.publicSlug ?? '')
    }
  }, [instData])

  const saveSettings = useMutation({
    mutationFn: (data: { isPublic?: boolean; publicSlug?: string | null }) =>
      api.patch('/api/admin/settings', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      setSavedMsg('Settings saved!')
      setTimeout(() => setSavedMsg(''), 3000)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message
      if (typeof msg === 'object' && msg.publicSlug) {
        setSlugError(msg.publicSlug[0])
      } else {
        setSlugError(msg ?? 'Failed to save')
      }
    },
  })

  const handleSavePublicSettings = () => {
    setSlugError('')
    saveSettings.mutate({
      isPublic,
      publicSlug: publicSlug.trim() || null,
    })
  }

  // ── Courses ────────────────────────────────────────────────────────────────
  const { data: courseData } = useQuery({
    queryKey: ['admin', 'courses', 'public'],
    queryFn: () => api.get('/api/courses?status=PUBLISHED&limit=100').then((r) => r.data.courses as Course[]),
  })

  const toggleCourse = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.put(`/api/courses/${id}`, { isPublicEnrollable: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'courses', 'public'] }),
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const publicUrl = publicSlug ? `${appUrl}/${publicSlug}` : null

  if (isLoading) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y">
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="spinner-border text-primary mb-3" />
            <p className="text-body-secondary mb-0">Loading settings…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold py-3 mb-0">
            <span className="text-muted fw-light">Admin /</span> Settings
          </h4>
        </div>
      </div>

      <div className="row g-4">
        {/* Plan info */}
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-0 pb-0">
              <h5 className="card-title mb-0">Plan &amp; Usage</h5>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="avatar" style={{ background: '#696cff20', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="tabler-crown icon-base text-primary" style={{ fontSize: '1.4rem' }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">{instData?.plan.name}</h6>
                  <small className="text-muted">Current plan</small>
                </div>
              </div>

              <ul className="list-unstyled mb-0">
                {[
                  { label: 'Students', used: instData?._count.users ?? 0, max: instData?.plan.maxStudents ?? 0, icon: 'tabler-users' },
                  { label: 'Courses',  used: instData?._count.courses ?? 0, max: instData?.plan.maxCourses ?? 0, icon: 'tabler-book' },
                ].map(({ label, used, max, icon }) => (
                  <li key={label} className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="d-flex align-items-center gap-2 small">
                        <i className={`${icon} icon-base text-muted`} /> {label}
                      </span>
                      <span className="small text-muted">{used} / {max}</span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div
                        className="progress-bar bg-primary"
                        style={{ width: `${Math.min(100, max ? (used / max) * 100 : 0)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Institute info */}
        <div className="col-12 col-md-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-0 pb-0">
              <h5 className="card-title mb-0">Institute Info</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  { label: 'Name',      value: instData?.name },
                  { label: 'Subdomain', value: instData?.subdomain },
                  { label: 'Status',    value: instData?.status },
                  { label: 'Phone',     value: instData?.phone ?? '—' },
                  { label: 'Region',    value: instData?.region ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="col-12 col-sm-6">
                    <label className="form-label text-muted small mb-1">{label}</label>
                    <p className="fw-semibold mb-0">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Public Enrollment card */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header border-0 pb-0 d-flex align-items-center justify-content-between">
              <div>
                <h5 className="card-title mb-0">Public Enrollment</h5>
                <p className="text-muted small mb-0 mt-1">
                  Allow students to discover and self-enroll via a public landing page — no invite needed.
                </p>
              </div>
              <div className="form-check form-switch ms-3 mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="isPublicSwitch"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{ width: 48, height: 26 }}
                />
              </div>
            </div>

            <div className="card-body">
              {savedMsg && (
                <div className="alert alert-success py-2 small mb-4">{savedMsg}</div>
              )}

              {/* Slug field */}
              <div className="row g-3 align-items-start mb-4">
                <div className="col-12 col-md-6">
                  <label className="form-label">
                    Public URL Slug <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text text-muted">{appUrl}/</span>
                    <input
                      type="text"
                      className={`form-control ${slugError ? 'is-invalid' : ''}`}
                      placeholder="my-institute"
                      value={publicSlug}
                      onChange={(e) => {
                        setSlugError('')
                        setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                      }}
                      disabled={!isPublic}
                    />
                    {slugError && <div className="invalid-feedback">{slugError}</div>}
                  </div>
                  <small className="text-muted">Only lowercase letters, numbers, and hyphens.</small>
                </div>

                {publicUrl && isPublic && (
                  <div className="col-12 col-md-6">
                    <label className="form-label">Your Public Page</label>
                    <div className="d-flex align-items-center gap-2">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary small"
                      >
                        {publicUrl}
                      </a>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => navigator.clipboard.writeText(publicUrl)}
                        title="Copy link"
                      >
                        <i className="tabler-copy icon-base" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSavePublicSettings}
                disabled={saveSettings.isLoading}
              >
                {saveSettings.isLoading && (
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Per-course toggles */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header border-0 pb-0">
              <h5 className="card-title mb-0">Course Visibility</h5>
              <p className="text-muted small mb-0 mt-1">
                Toggle which published courses appear on the public enrollment page.
              </p>
            </div>
            <div className="card-body p-0">
              {!courseData || courseData.length === 0 ? (
                <div className="text-center py-8">
                  <img src="/img/illustrations/boy-with-laptop-light.png" alt="No courses" height={130} className="img-fluid mb-3" />
                  <p className="fw-semibold text-heading mb-1">No Published Courses</p>
                  <p className="text-body-secondary small mb-0">Publish a course first to manage its visibility here.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Course</th>
                        <th className="text-center">Enrollments</th>
                        <th className="text-center">Publicly Enrollable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseData.map((c) => (
                        <tr key={c.id}>
                          <td className="align-middle fw-semibold">{c.title}</td>
                          <td className="align-middle text-center">
                            <span className="badge bg-label-primary">{c._count.enrollments}</span>
                          </td>
                          <td className="align-middle text-center">
                            <div className="form-check form-switch d-inline-block mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={c.isPublicEnrollable}
                                onChange={(e) => toggleCourse.mutate({ id: c.id, value: e.target.checked })}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
