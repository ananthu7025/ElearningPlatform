'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import SuperAdminLayout from '@/components/layouts/SuperAdminLayout'
import api from '@/lib/api'
import { PLAN_FEATURES, FEATURE_CATEGORIES, type FeatureKey } from '@/lib/planFeatures'

// ── Schema ────────────────────────────────────────────────────────────────────

const planSchema = z.object({
  name:         z.string().min(2, 'Required'),
  maxStudents:  z.coerce.number().int().positive('Must be > 0'),
  maxCourses:   z.coerce.number().int().positive('Must be > 0'),
  maxTutors:    z.coerce.number().int().positive('Must be > 0'),
  priceMonthly: z.coerce.number().positive('Must be > 0'),
  features:     z.array(z.string()).min(1, 'Select at least one feature'),
})
type PlanForm = z.infer<typeof planSchema>

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_COLOR: Record<string, string> = {
  Starter: 'info',
  Growth:  'primary',
  Pro:     'success',
}

// ── Feature Checkbox Grid ─────────────────────────────────────────────────────

function FeatureGrid({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (key: FeatureKey) => {
    onChange(
      value.includes(key) ? value.filter((k) => k !== key) : [...value, key]
    )
  }

  const toggleCategory = (keys: FeatureKey[]) => {
    const allChecked = keys.every((k) => value.includes(k))
    if (allChecked) {
      onChange(value.filter((k) => !keys.includes(k as FeatureKey)))
    } else {
      const toAdd = keys.filter((k) => !value.includes(k))
      onChange([...value, ...toAdd])
    }
  }

  return (
    <div className="border rounded p-3" style={{ maxHeight: 360, overflowY: 'auto' }}>
      {Object.entries(FEATURE_CATEGORIES).map(([category, keys]) => {
        const allChecked = keys.every((k) => value.includes(k))
        const someChecked = keys.some((k) => value.includes(k))
        return (
          <div key={category} className="mb-3">
            {/* Category header */}
            <div
              className="d-flex align-items-center gap-2 mb-2 pb-1 border-bottom cursor-pointer"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleCategory(keys)}
            >
              <input
                type="checkbox"
                className="form-check-input mt-0"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                onChange={() => toggleCategory(keys)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="fw-semibold small text-uppercase text-body-secondary">{category}</span>
            </div>
            {/* Feature checkboxes */}
            <div className="row g-2 ps-3">
              {keys.map((key) => (
                <div key={key} className="col-6">
                  <div
                    className="form-check mb-0"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggle(key)}
                  >
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`feat-${key}`}
                      checked={value.includes(key)}
                      onChange={() => toggle(key)}
                    />
                    <label className="form-check-label small" htmlFor={`feat-${key}`} style={{ cursor: 'pointer' }}>
                      {PLAN_FEATURES[key].label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)

  const { data, isLoading } = useQuery('plans', () =>
    api.get('/super/plans').then((r) => r.data)
  )

  const createPlan = useMutation(
    (d: PlanForm) => api.post('/super/plans', d),
    {
      onSuccess: () => {
        qc.invalidateQueries('plans')
        setShowCreate(false)
        resetCreate()
      },
    }
  )

  const updatePlan = useMutation(
    ({ id, ...d }: PlanForm & { id: string }) => api.put(`/super/plans/${id}`, d),
    {
      onSuccess: () => {
        qc.invalidateQueries('plans')
        setEditTarget(null)
        resetEdit()
      },
    }
  )

  const {
    register: regCreate,
    handleSubmit: hsCreate,
    reset: resetCreate,
    control: ctrlCreate,
    formState: { errors: errCreate, isSubmitting: subCreate },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { features: [] },
  })

  const {
    register: regEdit,
    handleSubmit: hsEdit,
    reset: resetEdit,
    control: ctrlEdit,
    formState: { errors: errEdit, isSubmitting: subEdit },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { features: [] },
  })

  function openEdit(plan: any) {
    setEditTarget(plan)
    resetEdit({
      name:         plan.name,
      maxStudents:  plan.maxStudents,
      maxCourses:   plan.maxCourses,
      maxTutors:    plan.maxTutors,
      priceMonthly: Number(plan.priceMonthly),
      features:     plan.features as string[],
    })
  }

  const plans = data?.plans ?? []

  return (
    <SuperAdminLayout title="Plans & Pricing" breadcrumb="Home / Plans">

      <div className="d-flex justify-content-between align-items-center mb-6">
        <div>
          <h5 className="mb-1">Subscription Plans</h5>
          <p className="text-body-secondary small mb-0">Manage pricing tiers available to institutes</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <i className="ti tabler-plus me-1" />New Plan
        </button>
      </div>

      {/* ── Plan Cards ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <div className="row g-6">
          {plans.map((plan: any) => {
            const color = PLAN_COLOR[plan.name] ?? 'secondary'
            const featureKeys: string[] = plan.features ?? []
            return (
              <div key={plan.id} className="col-md-4">
                <div className={`card border border-${color} h-100`}>
                  <div className="card-header">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className={`badge bg-label-${color} fs-6`}>{plan.name}</span>
                      <span className="fw-bold fs-5">
                        ₹{Number(plan.priceMonthly).toLocaleString('en-IN')}
                        <span className="text-body-secondary fs-6 fw-normal">/mo</span>
                      </span>
                    </div>
                    <div className="d-flex gap-4 small text-body-secondary">
                      <span><strong className="text-heading">{plan.maxStudents.toLocaleString()}</strong> students</span>
                      <span><strong className="text-heading">{plan.maxCourses}</strong> courses</span>
                      <span><strong className="text-heading">{plan.maxTutors}</strong> tutors</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="small text-body-secondary mb-2 fw-semibold">Features</p>
                    {/* Group by category */}
                    {Object.entries(FEATURE_CATEGORIES).map(([cat, keys]) => {
                      const active = keys.filter((k) => featureKeys.includes(k))
                      if (active.length === 0) return null
                      return (
                        <div key={cat} className="mb-2">
                          <p className="text-body-secondary small mb-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</p>
                          <ul className="list-unstyled small mb-0">
                            {active.map((k) => (
                              <li key={k} className="d-flex align-items-center gap-2 mb-1">
                                <i className={`ti tabler-check text-${color}`} style={{ fontSize: 12 }} />
                                {PLAN_FEATURES[k].label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                  <div className="card-footer d-flex justify-content-between align-items-center">
                    <small className="text-body-secondary">
                      <strong>{plan._count?.institutes ?? 0}</strong> institutes
                    </small>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${plan.isActive ? 'bg-label-success' : 'bg-label-secondary'}`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        className="btn btn-sm btn-icon btn-text-secondary rounded-pill"
                        onClick={() => openEdit(plan)}
                        title="Edit plan"
                      >
                        <i className="ti tabler-pencil icon-md" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Plan Modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Plan</h5>
                <button type="button" className="btn-close" onClick={() => { setShowCreate(false); resetCreate() }} />
              </div>
              <form onSubmit={hsCreate((d) => createPlan.mutate(d))} noValidate>
                <div className="modal-body">
                  <div className="row g-4">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Plan Name</label>
                      <input
                        className={`form-control ${errCreate.name ? 'is-invalid' : ''}`}
                        placeholder="e.g. Enterprise"
                        {...regCreate('name')}
                      />
                      {errCreate.name && <div className="invalid-feedback">{errCreate.name.message}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Max Students</label>
                      <input type="number" className={`form-control ${errCreate.maxStudents ? 'is-invalid' : ''}`} {...regCreate('maxStudents')} />
                      {errCreate.maxStudents && <div className="invalid-feedback">{errCreate.maxStudents.message}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Max Courses</label>
                      <input type="number" className={`form-control ${errCreate.maxCourses ? 'is-invalid' : ''}`} {...regCreate('maxCourses')} />
                      {errCreate.maxCourses && <div className="invalid-feedback">{errCreate.maxCourses.message}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Max Tutors</label>
                      <input type="number" className={`form-control ${errCreate.maxTutors ? 'is-invalid' : ''}`} {...regCreate('maxTutors')} />
                      {errCreate.maxTutors && <div className="invalid-feedback">{errCreate.maxTutors.message}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Monthly Price (₹)</label>
                      <input type="number" className={`form-control ${errCreate.priceMonthly ? 'is-invalid' : ''}`} {...regCreate('priceMonthly')} />
                      {errCreate.priceMonthly && <div className="invalid-feedback">{errCreate.priceMonthly.message}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Features</label>
                      <Controller
                        name="features"
                        control={ctrlCreate}
                        render={({ field }) => (
                          <FeatureGrid value={field.value} onChange={field.onChange} />
                        )}
                      />
                      {errCreate.features && (
                        <div className="text-danger small mt-1">{errCreate.features.message}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-label-secondary" onClick={() => { setShowCreate(false); resetCreate() }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={subCreate || createPlan.isLoading}>
                    {(subCreate || createPlan.isLoading) && <span className="spinner-border spinner-border-sm me-2" />}
                    Create Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Plan Modal ───────────────────────────────────────────────── */}
      {editTarget && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Plan — {editTarget.name}</h5>
                <button type="button" className="btn-close" onClick={() => { setEditTarget(null); resetEdit() }} />
              </div>
              <form onSubmit={hsEdit((d) => updatePlan.mutate({ ...d, id: editTarget.id }))} noValidate>
                <div className="modal-body">
                  <div className="row g-4">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Plan Name</label>
                      <input
                        className={`form-control ${errEdit.name ? 'is-invalid' : ''}`}
                        {...regEdit('name')}
                      />
                      {errEdit.name && <div className="invalid-feedback">{errEdit.name.message}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Max Students</label>
                      <input type="number" className={`form-control ${errEdit.maxStudents ? 'is-invalid' : ''}`} {...regEdit('maxStudents')} />
                      {errEdit.maxStudents && <div className="invalid-feedback">{errEdit.maxStudents.message}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Max Courses</label>
                      <input type="number" className={`form-control ${errEdit.maxCourses ? 'is-invalid' : ''}`} {...regEdit('maxCourses')} />
                      {errEdit.maxCourses && <div className="invalid-feedback">{errEdit.maxCourses.message}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Max Tutors</label>
                      <input type="number" className={`form-control ${errEdit.maxTutors ? 'is-invalid' : ''}`} {...regEdit('maxTutors')} />
                      {errEdit.maxTutors && <div className="invalid-feedback">{errEdit.maxTutors.message}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Monthly Price (₹)</label>
                      <input type="number" className={`form-control ${errEdit.priceMonthly ? 'is-invalid' : ''}`} {...regEdit('priceMonthly')} />
                      {errEdit.priceMonthly && <div className="invalid-feedback">{errEdit.priceMonthly.message}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Features</label>
                      <Controller
                        name="features"
                        control={ctrlEdit}
                        render={({ field }) => (
                          <FeatureGrid value={field.value} onChange={field.onChange} />
                        )}
                      />
                      {errEdit.features && (
                        <div className="text-danger small mt-1">{errEdit.features.message}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-label-secondary" onClick={() => { setEditTarget(null); resetEdit() }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={subEdit || updatePlan.isLoading}>
                    {(subEdit || updatePlan.isLoading) && <span className="spinner-border spinner-border-sm me-2" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </SuperAdminLayout>
  )
}
