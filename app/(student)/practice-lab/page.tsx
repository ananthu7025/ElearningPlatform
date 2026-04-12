'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

// ── Module metadata ────────────────────────────────────────────────────────────

const MODULE_META: Record<string, { color: string; icon: string; xp: number; time: string; label: string }> = {
  CLIENT_INTERVIEW:      { color: 'primary', icon: 'tabler-briefcase',      xp: 50,  time: '30 min', label: 'Client Interview'       },
  CASE_DRAFTING:         { color: 'success', icon: 'tabler-edit',            xp: 75,  time: '45 min', label: 'Case Drafting'           },
  CONTRACT_DRAFTING:     { color: 'info',    icon: 'tabler-clipboard-text',  xp: 75,  time: '45 min', label: 'Contract Drafting'       },
  MOOT_COURT:            { color: 'warning', icon: 'tabler-microphone',      xp: 100, time: '60 min', label: 'Moot Court'              },
  LEGAL_RESEARCH:        { color: 'danger',  icon: 'tabler-search',          xp: 60,  time: '40 min', label: 'Legal Research'          },
  COURTROOM_ARGUMENT:    { color: 'dark',    icon: 'tabler-scale',           xp: 100, time: '60 min', label: 'Courtroom Argument'      },
  ARBITRATION_MEDIATION: { color: 'warning', icon: 'tabler-handshake',       xp: 80,  time: '50 min', label: 'Arbitration & Mediation' },
}

export default function PracticeLabPage() {
  const [activeFilter, setActiveFilter] = useState<string>('ALL')

  const { data, isLoading } = useQuery('scenarios', () =>
    api.get('/practice-lab/scenarios').then((r) => r.data)
  )

  const scenarios: any[] = data?.scenarios ?? []

  // Build unique module types present in the list
  const moduleTypes = Array.from(new Set(scenarios.map((s) => s.moduleType)))

  const filtered = activeFilter === 'ALL'
    ? scenarios
    : scenarios.filter((s) => s.moduleType === activeFilter)

  return (
    <StudentLayout title="Practice Lab">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="card p-0 mb-6">
        <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-center p-0 pt-6">
          <div className="d-none d-md-flex align-items-end ps-6 pb-0" style={{ minWidth: 90 }}>
            <img src="/img/illustrations/bulb-light.png" alt="" height={90} style={{ objectFit: 'contain' }} />
          </div>
          <div className="flex-grow-1 d-flex flex-column align-items-center text-center px-6 py-6">
            <h4 className="mb-2 text-heading lh-lg">
              Sharpen Your Legal Skills in<br />
              <span className="text-primary text-nowrap">Real-World Practice Scenarios.</span>
            </h4>
            <p className="mb-0 text-body">
              Tackle AI-powered simulations — interviews, drafting, moot court and more — and get instant feedback.
            </p>
          </div>
          <div className="d-none d-md-flex align-items-end justify-content-end pe-0" style={{ minWidth: 120 }}>
            <img src="/img/illustrations/pencil-rocket.png" alt="" height={188} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      {/* ── Quick Stats ───────────────────────────────────────────────────────── */}
      <div className="row g-6 mb-6">
        {[
          { icon: 'tabler-flask',       color: 'bg-label-primary', iconColor: '#7367F0', label: 'Total Scenarios',   value: isLoading ? '—' : scenarios.length },
          { icon: 'tabler-layout-grid', color: 'bg-label-info',    iconColor: '#00CFE8', label: 'Module Types',      value: isLoading ? '—' : moduleTypes.length },
          { icon: 'tabler-star',        color: 'bg-label-warning', iconColor: '#FF9F43', label: 'Max XP Available',  value: isLoading ? '—' : `${scenarios.reduce((s: number, sc: any) => s + (MODULE_META[sc.moduleType]?.xp ?? 0), 0)}` },
          { icon: 'tabler-clock',       color: 'bg-label-success', iconColor: '#28C76F', label: 'Practice Hours',    value: isLoading ? '—' : `${Math.round(scenarios.reduce((s: number, sc: any) => s + (parseInt(MODULE_META[sc.moduleType]?.time ?? '0') || 0), 0) / 60)}h+` },
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
                  </div>
                  <div className="avatar">
                    <span className={`avatar-initial rounded ${s.color}`}>
                      <i className={`icon-base ti ${s.icon} icon-26px`} style={{ color: s.iconColor }} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ───────────────────────────────────────────────────────── */}
      {!isLoading && moduleTypes.length > 1 && (
        <div className="mb-5">
          <div className="d-flex flex-wrap gap-2">
            <button
              className={`btn btn-sm ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setActiveFilter('ALL')}
            >
              All Scenarios
              <span className={`badge ms-2 ${activeFilter === 'ALL' ? 'bg-white text-primary' : 'bg-label-secondary'}`}>
                {scenarios.length}
              </span>
            </button>
            {moduleTypes.map((type) => {
              const meta = MODULE_META[type] ?? { color: 'secondary', icon: 'tabler-flask', label: type }
              const count = scenarios.filter((s) => s.moduleType === type).length
              return (
                <button
                  key={type}
                  className={`btn btn-sm ${activeFilter === type ? `btn-${meta.color}` : 'btn-outline-secondary'}`}
                  onClick={() => setActiveFilter(type)}
                >
                  <i className={`ti ${meta.icon} me-1`} />
                  {meta.label}
                  <span className={`badge ms-2 ${activeFilter === type ? 'bg-white text-' + meta.color : 'bg-label-secondary'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Scenarios Grid ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="row g-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="col-md-6 col-xl-4">
              <div className="card h-100 placeholder-glow">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span className="avatar placeholder rounded" />
                    <div className="flex-grow-1">
                      <span className="placeholder col-7 d-block mb-1" />
                      <span className="placeholder col-5 d-block" style={{ height: 12 }} />
                    </div>
                  </div>
                  <span className="placeholder col-12 d-block mb-1" />
                  <span className="placeholder col-10 d-block mb-4" />
                  <span className="placeholder col-12 d-block rounded" style={{ height: 34 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-8">
            <img
              src="/img/illustrations/girl-sitting-with-laptop.png"
              alt="No scenarios"
              height={200}
              className="img-fluid mb-4"
            />
            <h5 className="mb-2">No Scenarios Available</h5>
            <p className="text-body-secondary mb-4">
              {activeFilter === 'ALL'
                ? 'Your institute has not published any practice scenarios yet. Check back soon!'
                : `No scenarios available for ${MODULE_META[activeFilter]?.label ?? activeFilter} yet.`}
            </p>
            {activeFilter !== 'ALL' && (
              <button className="btn btn-outline-primary btn-sm" onClick={() => setActiveFilter('ALL')}>
                <i className="ti tabler-arrow-left me-1" />View All Scenarios
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-6">
          {filtered.map((s: any) => {
            const meta = MODULE_META[s.moduleType] ?? { color: 'secondary', icon: 'tabler-flask', xp: 0, time: '—', label: s.moduleType }
            return (
              <div key={s.id} className="col-md-6 col-xl-4">
                <div className="card h-100 shadow-none border">
                  {/* Colored accent strip */}
                  <div className={`bg-${meta.color} rounded-top`} style={{ height: 4 }} />

                  <div className="card-body p-4">
                    {/* Header row */}
                    <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar flex-shrink-0">
                          <span className={`avatar-initial rounded bg-label-${meta.color}`}>
                            <i className={`icon-base ti ${meta.icon} icon-20px`} style={{ color: `var(--bs-${meta.color})` }} />
                          </span>
                        </div>
                        <div>
                          <h6 className="mb-0 fw-semibold text-heading">{s.title}</h6>
                          {s.course?.title && (
                            <small className="text-body-secondary">{s.course.title}</small>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      <span className={`badge bg-label-${meta.color}`}>{meta.label}</span>
                      {s.caseType && (
                        <span className="badge bg-label-secondary">{s.caseType}</span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-body-secondary small mb-4" style={{ minHeight: 48 }}>
                      {s.description
                        ? s.description.slice(0, 110) + (s.description.length > 110 ? '…' : '')
                        : 'Practice your legal skills with this scenario.'}
                    </p>

                    {/* XP + Time row */}
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <div className="d-flex align-items-center gap-1">
                        <i className="ti tabler-star-filled text-warning icon-16px" />
                        <span className="fw-semibold text-warning small">+{meta.xp} XP</span>
                      </div>
                      <div className="d-flex align-items-center gap-1 text-body-secondary small">
                        <i className="ti tabler-clock icon-16px" />
                        <span>{meta.time}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/practice-lab/${s.id}`}
                      className={`btn btn-${meta.color} w-100 d-flex align-items-center justify-content-center gap-2`}
                    >
                      <i className={`ti ${meta.icon}`} />
                      Start Scenario
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </StudentLayout>
  )
}
