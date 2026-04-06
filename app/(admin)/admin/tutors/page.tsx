'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const AVATAR_COLORS = ['bg-label-primary','bg-label-success','bg-label-info','bg-label-warning','bg-label-danger']

const createSchema = z.object({
  name:  z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
})
type CreateForm = z.infer<typeof createSchema>

export default function TutorsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery(
    ['tutors', search],
    () => api.get(`/admin/tutors?${search ? `search=${encodeURIComponent(search)}&` : ''}limit=50`).then((r) => r.data),
    { keepPreviousData: true }
  )

  const create = useMutation(
    (d: CreateForm) => api.post('/admin/tutors', d),
    {
      onSuccess: () => {
        qc.invalidateQueries('tutors')
        document.getElementById('tutorOffcanvasClose')?.click()
        reset()
      },
    }
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const tutors = data?.tutors ?? []

  return (
    <AdminLayout title="Tutors" breadcrumb="Home / Tutors">

      <div className="card">
        <div className="card-body border-bottom py-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="input-group" style={{ maxWidth: 300 }}>
              <span className="input-group-text"><i className="ti tabler-search" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search tutors…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" data-bs-toggle="offcanvas" data-bs-target="#offcanvasAddTutor">
              <i className="ti tabler-plus me-1" />Add Tutor
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="border-top">
              <tr>
                <th>Tutor</th>
                <th>Courses</th>
                <th>Last Login</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j}><span className="placeholder col-8" /></td>)}</tr>
                ))
              ) : tutors.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-5 text-body-secondary">No tutors found</td></tr>
              ) : (
                tutors.map((t: any, idx: number) => (
                  <tr key={t.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar avatar-sm">
                          <span className={`avatar-initial rounded-circle ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                            {t.name[0]}
                          </span>
                        </div>
                        <div>
                          <span className="fw-medium d-block">{t.name}</span>
                          <small className="text-body-secondary">{t.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{t._count?.courses ?? 0}</td>
                    <td>
                      <small className="text-body-secondary">
                        {t.lastLoginAt
                          ? new Date(t.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Never'}
                      </small>
                    </td>
                    <td>
                      <small className="text-body-secondary">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Offcanvas — Add Tutor ───────────────────────────────────────── */}
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="offcanvasAddTutor" style={{ width: 380 }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title">Add Tutor</h5>
          <button id="tutorOffcanvasClose" type="button" className="btn-close" data-bs-dismiss="offcanvas" />
        </div>
        <div className="offcanvas-body p-4">
          {create.isError && (
            <div className="alert alert-danger py-2 small mb-4">Failed. Email may already be in use.</div>
          )}
          <form onSubmit={handleSubmit((d) => create.mutate(d))} noValidate>
            <div className="mb-4">
              <label className="form-label fw-semibold">Full Name</label>
              <input
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                placeholder="e.g. Priya Verma"
                {...register('name')}
              />
              {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
            </div>
            <div className="mb-5">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="e.g. priya@institute.in"
                {...register('email')}
              />
              {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
            </div>
            <div className="d-flex gap-3">
              <button type="submit" className="btn btn-primary flex-grow-1" disabled={isSubmitting}>
                {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
                <i className="ti tabler-send me-1" />Send Invite
              </button>
              <button type="reset" className="btn btn-label-secondary" data-bs-dismiss="offcanvas">Cancel</button>
            </div>
          </form>
        </div>
      </div>

    </AdminLayout>
  )
}
