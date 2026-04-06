'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import axios from 'axios'

const schema = z
  .object({
    newPassword: z.string().min(8, 'Minimum 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
type FormData = z.infer<typeof schema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (!token) {
    return (
      <div className="d-flex align-items-center justify-content-center bg-body" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="text-danger fs-1 mb-3">⚠️</div>
          <h5 className="fw-bold mb-2">Invalid reset link</h5>
          <p className="text-body-secondary mb-4">This link is missing a token. Please request a new reset link.</p>
          <Link href="/forgot-password" className="btn btn-primary">Request New Link</Link>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await axios.post('/api/auth/reset-password', { token, newPassword: data.newPassword })
      router.push('/login?reset=success')
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message ?? 'Link expired or invalid. Please request a new one.')
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center bg-body" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: 440 }}>
        <div className="card-body p-5">

          <div className="d-flex align-items-center gap-2 mb-4">
            <span className="fs-3">⚖️</span>
            <span className="fw-bold fs-4 text-primary">LexEd</span>
          </div>

          <h4 className="fw-bold mb-1">Set New Password 🔑</h4>
          <p className="text-body-secondary mb-4 small">Must be at least 8 characters.</p>

          {serverError && (
            <div className="alert alert-danger py-2 small">{serverError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* New password */}
            <div className="mb-3">
              <label className="form-label" htmlFor="newPassword">New Password</label>
              <div className="input-group">
                <input
                  id="newPassword"
                  type={showPass ? 'text' : 'password'}
                  className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                  placeholder="Enter new password"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPass((p) => !p)}
                  tabIndex={-1}
                >
                  <i className={`ti ${showPass ? 'tabler-eye-off' : 'tabler-eye'}`} />
                </button>
                {errors.newPassword && <div className="invalid-feedback">{errors.newPassword.message}</div>}
              </div>
            </div>

            {/* Confirm */}
            <div className="mb-4">
              <label className="form-label" htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                type={showPass ? 'text' : 'password'}
                className={`form-control ${errors.confirm ? 'is-invalid' : ''}`}
                placeholder="Confirm new password"
                {...register('confirm')}
              />
              {errors.confirm && <div className="invalid-feedback">{errors.confirm.message}</div>}
            </div>

            <button type="submit" className="btn btn-primary w-100 mb-3" disabled={isSubmitting}>
              {isSubmitting && <span className="spinner-border spinner-border-sm me-2" role="status" />}
              Update Password
            </button>

            <div className="text-center small">
              <Link href="/login" className="d-inline-flex align-items-center gap-1 text-body-secondary">
                <i className="ti tabler-arrow-left icon-sm" />
                Back to Login
              </Link>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="d-flex align-items-center justify-content-center bg-body" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
