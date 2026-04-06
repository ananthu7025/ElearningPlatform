'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import axios from 'axios'

const schema = z.object({ email: z.string().email('Enter a valid email address') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await axios.post('/api/auth/forgot-password', data)
      setSubmitted(true)
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center bg-body" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: 440 }}>
        <div className="card-body p-5">

          {/* Logo */}
          <div className="d-flex align-items-center gap-2 mb-4">
            <span className="fs-3">⚖️</span>
            <span className="fw-bold fs-4 text-primary">LexEd</span>
          </div>

          {submitted ? (
            /* ── Success state ── */
            <div className="text-center py-3">
              <div className="avatar avatar-lg mb-4 mx-auto">
                <span className="avatar-initial rounded-circle bg-label-success fs-3">✉️</span>
              </div>
              <h4 className="fw-bold mb-2">Check your email</h4>
              <p className="text-body-secondary mb-4">
                We've sent a password reset link to your email address. It expires in 1 hour.
              </p>
              <Link href="/login" className="btn btn-primary w-100">Back to Login</Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h4 className="fw-bold mb-1">Forgot Password? 🔒</h4>
              <p className="text-body-secondary mb-4 small">
                Enter your email and we'll send you a reset link.
              </p>

              {serverError && (
                <div className="alert alert-danger py-2 small">{serverError}</div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mb-4">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="Enter your email"
                    {...register('email')}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                </div>

                <button type="submit" className="btn btn-primary w-100 mb-3" disabled={isSubmitting}>
                  {isSubmitting && <span className="spinner-border spinner-border-sm me-2" role="status" />}
                  Send Reset Link
                </button>

                <div className="text-center small">
                  <Link href="/login" className="d-inline-flex align-items-center gap-1 text-body-secondary">
                    <i className="ti tabler-arrow-left icon-sm" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
