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
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

interface Institute {
  name: string
  logoUrl: string | null
  primaryColor: string | null
}

export default function PublicRegisterPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [institute, setInstitute] = useState<Institute | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
      const res = await axios.post(`/api/public/${slug}/register`, {
        name:     data.name,
        email:    data.email,
        password: data.password,
      }, { withCredentials: true })

      setAuth(res.data.user, res.data.accessToken)

      // If there's a redirect param (e.g. came from a course page), go there
      const next = searchParams.get('next')
      if (next) {
        router.push(next)
      } else {
        router.push(ROLE_HOME[res.data.user.role as Role])
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message
      if (typeof msg === 'object') {
        setServerError(Object.values(msg).flat().join(', '))
      } else {
        setServerError(msg ?? 'Registration failed. Please try again.')
      }
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
              Create your student account and start your learning journey today.
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="d-flex col-12 col-xl-5 align-items-center authentication-bg p-sm-12 p-6">
          <div className="w-px-400 mx-auto mt-6 pt-5">
            <h4 className="mb-1">Create Account 🚀</h4>
            <p className="mb-6 text-muted">Register to start learning at <strong>{institute?.name ?? slug}</strong></p>

            {serverError && (
              <div className="alert alert-danger py-2 small mb-4" role="alert">{serverError}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4">
              {/* Name */}
              <div className="mb-4 form-control-validation">
                <label htmlFor="name" className="form-label">Full Name</label>
                <input
                  id="name"
                  type="text"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  placeholder="John Doe"
                  autoFocus
                  {...register('name')}
                />
                {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
              </div>

              {/* Email */}
              <div className="mb-4 form-control-validation">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="you@example.com"
                  {...register('email')}
                />
                {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
              </div>

              {/* Password */}
              <div className="mb-4 form-password-toggle form-control-validation">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="input-group input-group-merge">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    placeholder="Min. 8 characters"
                    {...register('password')}
                  />
                  <span className="input-group-text cursor-pointer" onClick={() => setShowPass((p) => !p)}>
                    <i className={`icon-base ti ${showPass ? 'tabler-eye-off' : 'tabler-eye'}`} />
                  </span>
                  {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-6 form-password-toggle form-control-validation">
                <label className="form-label" htmlFor="confirm">Confirm Password</label>
                <div className="input-group input-group-merge">
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className={`form-control ${errors.confirm ? 'is-invalid' : ''}`}
                    placeholder="Repeat password"
                    {...register('confirm')}
                  />
                  <span className="input-group-text cursor-pointer" onClick={() => setShowConfirm((p) => !p)}>
                    <i className={`icon-base ti ${showConfirm ? 'tabler-eye-off' : 'tabler-eye'}`} />
                  </span>
                  {errors.confirm && <div className="invalid-feedback">{errors.confirm.message}</div>}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary d-grid w-100 btn-lg"
                disabled={isSubmitting}
              >
                {isSubmitting && <span className="spinner-border spinner-border-sm me-2" role="status" />}
                Create Account
              </button>
            </form>

            <p className="text-center mb-0">
              Already have an account?{' '}
              <Link href={`/${slug}/login`} className="fw-semibold" style={{ color: primary }}>
                Sign In
              </Link>
            </p>

            <p className="text-center mt-3 mb-0">
              <Link href={`/${slug}/courses`} className="text-muted small">
                <i className="tabler-arrow-left me-1" />Browse courses first
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
