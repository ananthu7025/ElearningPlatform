'use client'

import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const createSchema = z.object({
  code:          z.string().min(3, 'Min 3 characters').toUpperCase(),
  discountType:  z.enum(['PERCENT', 'FLAT']),
  discountValue: z.coerce.number().positive('Must be positive'),
  maxUses:       z.coerce.number().int().positive().optional().or(z.literal('')),
  expiresAt:     z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

export default function CouponsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery('coupons', () =>
    api.get('/coupons').then((r) => r.data)
  )

  const create = useMutation(
    (d: CreateForm) => api.post('/coupons', { ...d, maxUses: d.maxUses || undefined }),
    { onSuccess: () => { qc.invalidateQueries('coupons'); reset() } }
  )

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { discountType: 'PERCENT' },
  })

  const discountType = watch('discountType')
  const coupons = data?.coupons ?? []

  return (
    <AdminLayout title="Coupons" breadcrumb="Home / Coupons">
      <div className="row g-6">

        {/* ── Create form ──────────────────────────────────────────── */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Create Coupon</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit((d) => create.mutate(d))} noValidate>
                <div className="mb-4">
                  <label className="form-label">Code</label>
                  <input
                    className={`form-control text-uppercase ${errors.code ? 'is-invalid' : ''}`}
                    placeholder="e.g. CLAT50"
                    {...register('code')}
                  />
                  {errors.code && <div className="invalid-feedback">{errors.code.message}</div>}
                </div>
                <div className="mb-4">
                  <label className="form-label">Discount Type</label>
                  <select className="form-select" {...register('discountType')}>
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label">
                    Discount Value {discountType === 'PERCENT' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    className={`form-control ${errors.discountValue ? 'is-invalid' : ''}`}
                    {...register('discountValue')}
                  />
                  {errors.discountValue && <div className="invalid-feedback">{errors.discountValue.message}</div>}
                </div>
                <div className="mb-4">
                  <label className="form-label">Max Uses <small className="text-body-secondary">(optional)</small></label>
                  <input type="number" className="form-control" {...register('maxUses')} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Expires At <small className="text-body-secondary">(optional)</small></label>
                  <input type="datetime-local" className="form-control" {...register('expiresAt')} />
                </div>
                {create.isError && (
                  <div className="alert alert-danger py-2 small mb-3">Code already exists or invalid.</div>
                )}
                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                  {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
                  Create Coupon
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Coupons list ─────────────────────────────────────────── */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">All Coupons</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="border-top">
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Uses</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><span className="placeholder col-8" /></td>)}</tr>
                    ))
                  ) : coupons.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-5 text-body-secondary">No coupons yet</td></tr>
                  ) : (
                    coupons.map((c: any) => (
                      <tr key={c.id}>
                        <td><span className="badge bg-label-primary rounded-pill fw-bold">{c.code}</span></td>
                        <td>
                          {c.discountType === 'PERCENT'
                            ? `${c.discountValue}%`
                            : `₹${Number(c.discountValue).toLocaleString('en-IN')}`}
                        </td>
                        <td>
                          <small className="text-body-secondary">
                            {c.usedCount ?? 0}{c.maxUses ? ` / ${c.maxUses}` : ''}
                          </small>
                        </td>
                        <td>
                          <small className="text-body-secondary">
                            {c.expiresAt
                              ? new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'No expiry'}
                          </small>
                        </td>
                        <td>
                          <span className={`badge ${c.isActive ? 'bg-label-success' : 'bg-label-secondary'} rounded-pill`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
