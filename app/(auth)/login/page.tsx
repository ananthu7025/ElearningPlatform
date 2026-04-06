'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/stores/auth.store'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Minimum 6 characters'),
})
type FormData = z.infer<typeof schema>

// ── Role → home page ─────────────────────────────────────────────────────────

const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin/dashboard',
  ADMIN: '/admin/dashboard',
  TUTOR: '/tutor/dashboard',
  STUDENT: '/dashboard',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await axios.post('/api/auth/login', data, { withCredentials: true })
      setAuth(res.data.user, res.data.accessToken)
      router.push(ROLE_HOME[res.data.user.role as Role])
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message ?? 'Login failed. Please try again.')
    }
  }

  return (
    <div className="authentication-wrapper authentication-cover">
      {/* Logo */}
      <Link href="/" className="app-brand auth-cover-brand gap-2">
        <span className="app-brand-text demo text-heading fw-bold">LexEd</span>
      </Link>

      <div className="authentication-inner row m-0">
        {/* Left — illustration */}
        <div className="d-none d-xl-flex col-xl-8 p-0">
          <div className="auth-cover-bg d-flex justify-content-center align-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/illustrations/authi.png"
              alt="auth-login-cover"
              className="my-5 auth-illustration"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/illustrations/bg-shape-image-light.png"
              alt="background shape"
              className="platform-bg"
            />
          </div>
        </div>
        {/* /Left */}

        {/* Right — login form */}
        <div className="d-flex col-12 col-xl-4 align-items-center authentication-bg p-sm-12 p-6">
          <div className="w-px-400 mx-auto mt-12 pt-5">
            <h4 className="mb-1">Welcome to LexEd! 👋</h4>
            <p className="mb-6">Please sign-in to your account and start the adventure</p>

            {serverError && (
              <div className="alert alert-danger py-2 small mb-4" role="alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-6">
              {/* Email */}
              <div className="mb-6 form-control-validation">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="Enter your email"
                  autoFocus
                  {...register('email')}
                />
                {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
              </div>

              {/* Password */}
              <div className="mb-6 form-password-toggle form-control-validation">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="input-group input-group-merge">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="············"
                    {...register('password')}
                  />
                  <span
                    className="input-group-text cursor-pointer"
                    onClick={() => setShowPass((p) => !p)}
                  >
                    <i className={`icon-base ti ${showPass ? 'tabler-eye-off' : 'tabler-eye'}`} />
                  </span>
                  {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
                </div>
              </div>

              <div className="my-8">
                <div className="d-flex justify-content-between">
                  <div className="form-check mb-0 ms-2">
                    <input className="form-check-input" type="checkbox" id="remember-me" />
                    <label className="form-check-label" htmlFor="remember-me">Remember Me</label>
                  </div>
                  <Link href="/forgot-password">
                    <p className="mb-0">Forgot Password?</p>
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary d-grid w-100"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                )}
                Sign in
              </button>
            </form>

            {/* Dev hint */}
            {process.env.NODE_ENV === 'development' && (
              <div className="alert alert-primary py-2 small mb-4">
                <strong>Demo:</strong> superadmin@lexed.in / Admin@123
              </div>
            )}
          </div>
        </div>
        {/* /Login */}
      </div>
    </div>
  )
}
