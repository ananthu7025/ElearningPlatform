'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/stores/auth.store'

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

interface Institute {
  name: string
  logoUrl: string | null
  primaryColor: string | null
}

export default function PublicLoginPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [institute, setInstitute] = useState<Institute | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    axios.get(`/api/public/${slug}`).then((r) => setInstitute(r.data.institute)).catch(() => {})
  }, [slug])

  const ROLE_HOME: Record<Role, string> = {
    SUPER_ADMIN: '/super-admin/dashboard',
    ADMIN:       '/admin/dashboard',
    TUTOR:       '/tutor/dashboard',
    STUDENT:     '/dashboard',
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      // Reuse the shared /api/auth/login endpoint — it's institute-agnostic
      const res = await axios.post('/api/auth/login', data, { withCredentials: true })
      setAuth(res.data.user, res.data.accessToken)
      const next = searchParams.get('next')
      router.push(next ?? ROLE_HOME[res.data.user.role as Role])
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message ?? 'Login failed. Please try again.')
    }
  }

  const primary = institute?.primaryColor ?? '#7367F0'

  return (
    <div className="authentication-wrapper authentication-cover" style={{ minHeight: '100vh' }}>
      <div className="authentication-inner row m-0">
        {/* Left panel */}
        <div className="d-none d-xl-flex col-xl-7 p-0">
          <div
            className="d-flex flex-column justify-content-center align-items-center w-100 p-5"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, color: '#fff' }}
          >
            {institute?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={institute.logoUrl} alt={institute.name} style={{ height: 80, objectFit: 'contain', marginBottom: 32, borderRadius: 8 }} />
            )}
            <h2 className="fw-bold mb-3 text-center">{institute?.name ?? slug}</h2>
            <p className="text-center mb-0" style={{ opacity: 0.85, maxWidth: 400 }}>
              Welcome back! Sign in to continue your learning journey.
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="d-flex col-12 col-xl-5 align-items-center authentication-bg p-sm-12 p-6">
          <div className="w-px-400 mx-auto mt-6 pt-5">
            <h4 className="mb-1">Welcome back! 👋</h4>
            <p className="mb-6 text-muted">Sign in to your <strong>{institute?.name ?? slug}</strong> account</p>

            {serverError && (
              <div className="alert alert-danger py-2 small mb-4" role="alert">{serverError}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4">
              {/* Email */}
              <div className="mb-4 form-control-validation">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="you@example.com"
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
                  <span className="input-group-text cursor-pointer" onClick={() => setShowPass((p) => !p)}>
                    <i className={`icon-base ti ${showPass ? 'tabler-eye-off' : 'tabler-eye'}`} />
                  </span>
                  {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary d-grid w-100 btn-lg"
                disabled={isSubmitting}
              >
                {isSubmitting && <span className="spinner-border spinner-border-sm me-2" role="status" />}
                Sign In
              </button>
            </form>

            <p className="text-center mb-0">
              New here?{' '}
              <Link href={`/${slug}/register`} className="fw-semibold" style={{ color: primary }}>
                Create an account
              </Link>
            </p>
            <p className="text-center mt-3 mb-0">
              <Link href="/forgot-password" className="text-muted small">
                Forgot your password?
              </Link>
            </p>
            <p className="text-center mt-2 mb-0">
              <Link href={`/${slug}/courses`} className="text-muted small">
                <i className="tabler-arrow-left me-1" />Browse courses
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
