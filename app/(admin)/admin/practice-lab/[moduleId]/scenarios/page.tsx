'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Scenario {
  id: string
  title: string
  clientName: string | null
  caseType: string | null
  caseId: string | null
  difficulty: string
  isPublished: boolean
  createdAt: string
  tutor: { id: string; name: string; avatarUrl?: string | null } | null
  attempts: number
  avgScore: number
  factsCount: number
  provisionsCount: number
}

interface Stats {
  total: number
  published: number
  totalAttempts: number
  avgScore: number
}

// ── Module metadata by slug (matches ids from the main page) ──────────────────

const MODULE_META: Record<string, { title: string; icon: string; color: string; moduleType: string }> = {
  'client-interview':    { title: 'Client Interview Room',       icon: 'tabler-briefcase',    color: 'success',   moduleType: 'CLIENT_INTERVIEW'    },
  'case-drafting':       { title: 'Case Drafting Studio',        icon: 'tabler-edit',         color: 'primary',   moduleType: 'CASE_DRAFTING'       },
  'contract-drafting':   { title: 'Contract Drafting Desk',      icon: 'tabler-clipboard-text', color: 'warning', moduleType: 'CONTRACT_DRAFTING'   },
  'moot-court':          { title: 'Moot Court Simulator',        icon: 'tabler-microphone',   color: 'danger',    moduleType: 'MOOT_COURT'          },
  'legal-research':      { title: 'Legal Research Arena',        icon: 'tabler-search',       color: 'info',      moduleType: 'LEGAL_RESEARCH'      },
  'courtroom-argument':  { title: 'Courtroom Argument Builder',  icon: 'tabler-scale',        color: 'secondary', moduleType: 'COURTROOM_ARGUMENT'  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminScenariosPage() {
  const qc = useQueryClient()
  const { moduleId } = useParams<{ moduleId: string }>()
  const searchParams = useSearchParams()

  // moduleType can come from query param or be derived from the slug map
  const moduleType = searchParams.get('type') ?? MODULE_META[moduleId]?.moduleType ?? ''
  const meta = MODULE_META[moduleId] ?? {
    title: moduleId, icon: 'tabler-flask', color: 'primary', moduleType,
  }

  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null)

  const { data, isLoading } = useQuery(
    ['admin-scenarios', moduleType, filter],
    () => {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      return api.get(`/admin/practice-lab/${moduleType}/scenarios?${params}`).then((r) => r.data)
    },
    { enabled: !!moduleType },
  )

  const togglePublish = useMutation(
    ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.patch(`/admin/practice-lab/${moduleType}/scenarios/${id}`, { isPublished }),
    { onSuccess: () => qc.invalidateQueries(['admin-scenarios', moduleType]) },
  )

  const deleteScenario = useMutation(
    (id: string) => api.delete(`/admin/practice-lab/${moduleType}/scenarios/${id}`),
    {
      onSuccess: () => {
        qc.invalidateQueries(['admin-scenarios', moduleType])
        setDeleteTarget(null)
      },
    },
  )

  const scenarios: Scenario[] = data?.scenarios ?? []
  const stats: Stats          = data?.stats ?? { total: 0, published: 0, totalAttempts: 0, avgScore: 0 }

  return (
    <AdminLayout
      title="Scenarios"
      breadcrumb={`Home / Practice Lab / ${meta.title}`}
    >

      {/* ── Back breadcrumb ───────────────────────────────────────────────── */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link
          href="/admin/practice-lab"
          className="text-body-secondary text-decoration-none d-flex align-items-center gap-1"
        >
          <i className="ti tabler-arrow-left" style={{ fontSize: 14 }}></i>
          <span className="small">Practice Lab</span>
        </Link>
        <i className="ti tabler-chevron-right text-body-secondary" style={{ fontSize: 12 }}></i>
        <div className="d-flex align-items-center gap-2">
          <div className="avatar avatar-xs">
            <span className={`avatar-initial rounded bg-label-${meta.color}`}>
              <i className={`icon-base ti ${meta.icon} icon-12px`} style={{ color: `var(--bs-${meta.color})` }}></i>
            </span>
          </div>
          <span className="small fw-semibold text-heading">{meta.title}</span>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { icon: 'tabler-file-text', label: 'Total Scenarios', value: isLoading ? '—' : stats.total,        sub: `${stats.published} published`,                    color: 'bg-label-primary', iconColor: '#7367F0' },
          { icon: 'tabler-check',     label: 'Published',       value: isLoading ? '—' : stats.published,    sub: `${stats.total - stats.published} in draft`,       color: 'bg-label-success', iconColor: '#28C76F' },
          { icon: 'tabler-users',     label: 'Total Attempts',  value: isLoading ? '—' : stats.totalAttempts,sub: 'Across all scenarios',                            color: 'bg-label-warning', iconColor: '#FF9F43' },
          { icon: 'tabler-chart-bar', label: 'Avg Score',       value: isLoading ? '—' : `${stats.avgScore}%`, sub: 'On published scenarios',                       color: 'bg-label-info',    iconColor: '#00CFE8' },
        ].map((s) => (
          <div key={s.label} className="col-sm-6 col-xl-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <span className="text-heading">{s.label}</span>
                    <div className="d-flex align-items-center my-1">
                      <h4 className="mb-0 me-2">{s.value}</h4>
                    </div>
                    <small className="text-body-secondary">{s.sub}</small>
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded ${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} style={{ color: s.iconColor }}></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table card ────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-4">
          <div className="card-title mb-0">
            <h5 className="mb-0">Scenarios — {meta.title}</h5>
            <p className="mb-0 text-body">{scenarios.length} scenarios in this module</p>
          </div>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {moduleId === 'client-interview' && moduleType === 'CLIENT_INTERVIEW' && (
              <Link
                href={`/admin/practice-lab/${moduleId}/scenarios/new?type=${moduleType}`}
                className="btn btn-primary btn-sm"
              >
                <i className="ti tabler-plus me-1" />
                Add scenario
              </Link>
            )}
            <select
              className="form-select"
              style={{ maxWidth: 160 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="border-top">
              <tr>
                <th>Client / Scenario</th>
                <th>Case Type</th>
                <th>Facts</th>
                <th>Provisions</th>
                <th>Authored By</th>
                <th>Attempts</th>
                <th>Avg Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><span className="placeholder col-8"></span></td>
                    ))}
                  </tr>
                ))
              ) : scenarios.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-body-secondary">
                    <i className="ti tabler-file-off fs-2 d-block mb-2 opacity-50"></i>
                    No scenarios found
                    {filter !== 'all' && (
                      <div className="mt-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilter('all')}>
                          Clear filter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                scenarios.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar">
                          <span className={`avatar-initial rounded-circle bg-label-${meta.color}`} style={{ fontSize: 12, fontWeight: 700 }}>
                            {s.clientName ? initials(s.clientName) : initials(s.title)}
                          </span>
                        </div>
                        <div>
                          <span className="fw-semibold text-heading d-block">{s.clientName ?? s.title}</span>
                          <small className="text-body-secondary">{s.caseId ?? '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.caseType ? (
                        <span className={`badge bg-label-${meta.color}`}>{s.caseType}</span>
                      ) : (
                        <span className="text-body-secondary small">—</span>
                      )}
                    </td>
                    <td>
                      {s.factsCount > 0 ? (
                        <span className="fw-semibold">{s.factsCount} <small className="text-body-secondary fw-normal">facts</small></span>
                      ) : (
                        <span className="text-body-secondary small">—</span>
                      )}
                    </td>
                    <td>
                      {s.provisionsCount > 0 ? (
                        <span className="fw-semibold">{s.provisionsCount} <small className="text-body-secondary fw-normal">provisions</small></span>
                      ) : (
                        <span className="text-body-secondary small">—</span>
                      )}
                    </td>
                    <td>
                      {s.tutor ? (
                        <div className="d-flex align-items-center gap-2">
                          <div className="avatar avatar-xs">
                            {s.tutor.avatarUrl ? (
                              <img src={s.tutor.avatarUrl} alt={s.tutor.name} className="rounded-circle" />
                            ) : (
                              <span className="avatar-initial rounded-circle bg-label-primary" style={{ fontSize: 10 }}>
                                {initials(s.tutor.name)}
                              </span>
                            )}
                          </div>
                          <small>{s.tutor.name}</small>
                        </div>
                      ) : (
                        <span className="text-body-secondary small">—</span>
                      )}
                    </td>
                    <td>
                      {s.attempts > 0 ? (
                        <><span className="fw-semibold">{s.attempts}</span><small className="text-body-secondary ms-1">students</small></>
                      ) : (
                        <span className="text-body-secondary small">—</span>
                      )}
                    </td>
                    <td>
                      {s.avgScore > 0 ? (
                        <span className={`fw-semibold ${s.avgScore >= 75 ? 'text-success' : 'text-warning'}`}>{s.avgScore}%</span>
                      ) : (
                        <span className="text-body-secondary small">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge bg-label-${s.isPublished ? 'success' : 'secondary'}`}>
                        {s.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-icon btn-text-secondary rounded-pill dropdown-toggle hide-arrow"
                          data-bs-toggle="dropdown"
                        >
                          <i className="ti tabler-dots-vertical"></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-end">
                          {moduleId === 'client-interview' && moduleType === 'CLIENT_INTERVIEW' && (
                            <>
                              <Link
                                className="dropdown-item"
                                href={`/admin/practice-lab/${moduleId}/scenarios/${s.id}/edit?type=${moduleType}`}
                              >
                                <i className="ti tabler-edit me-2"></i>Edit
                              </Link>
                              <div className="dropdown-divider"></div>
                            </>
                          )}
                          <button
                            className="dropdown-item"
                            onClick={() => togglePublish.mutate({ id: s.id, isPublished: !s.isPublished })}
                            disabled={togglePublish.isLoading}
                          >
                            <i className={`ti ${s.isPublished ? 'tabler-eye-off' : 'tabler-eye'} me-2`}></i>
                            {s.isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                          <div className="dropdown-divider"></div>
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <i className="ti tabler-trash me-2"></i>Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body px-5 pb-2 text-center">
                <div className="mb-4">
                  <span className="avatar avatar-lg bg-label-danger rounded-circle">
                    <i className="ti tabler-trash icon-28px text-danger" />
                  </span>
                </div>
                <h4 className="mb-2">Delete Scenario?</h4>
                <p className="text-body-secondary mb-0">
                  <strong>{deleteTarget.clientName ?? deleteTarget.title}</strong> will be permanently removed.
                  {deleteTarget.attempts > 0 && (
                    <span className="d-block text-warning small mt-1">
                      This scenario has {deleteTarget.attempts} student submission(s).
                    </span>
                  )}
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center gap-3">
                <button
                  type="button"
                  className="btn btn-label-secondary px-5"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger px-5"
                  disabled={deleteScenario.isLoading}
                  onClick={() => deleteScenario.mutate(deleteTarget.id)}
                >
                  {deleteScenario.isLoading
                    ? <span className="spinner-border spinner-border-sm me-2" />
                    : <i className="ti tabler-trash me-1" />
                  }
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}
