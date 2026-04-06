'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AdminLayout from '@/components/layouts/AdminLayout'
import api from '@/lib/api'

const createSchema = z.object({
  title:          z.string().min(3, 'Enter at least 3 characters'),
  description:    z.string().optional(),
  longDescription: z.string().optional(),
  category:       z.string().min(1, 'Select a category'),
  level:          z.string().optional(),
  price:          z.coerce.number().nonnegative('Must be 0 or more'),
  discountedPrice: z.coerce.number().nonnegative().optional(),
  tutorId:        z.string().optional(),
  isFree:         z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>

interface Tutor { id: string; name: string }

export default function CreateCoursePage() {
  const router = useRouter()
  const [thumbnail, setThumbnail]     = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: tutorData } = useQuery<{ tutors: Tutor[] }>(
    'tutors-list',
    () => api.get('/admin/tutors?limit=50').then((r) => r.data),
  )
  const tutors = tutorData?.tutors ?? []

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { price: 0, isFree: false },
  })

  const isFree    = watch('isFree')
  const title     = watch('title') || 'Course Title'
  const category  = watch('category') || 'Category'
  const price     = watch('price') ?? 0
  const discounted = watch('discountedPrice')
  const tutorId   = watch('tutorId')
  const selectedTutor = tutors.find((t) => t.id === tutorId)

  async function handleImageUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/upload/image', fd)
      setThumbnail(data.url)
    } catch (e: any) {
      setUploadError(e.response?.data?.error ?? e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const createCourse = useMutation(
    (d: CreateForm) =>
      api.post('/courses', {
        title:        d.title,
        description:  d.description,
        category:     d.category,
        price:        d.isFree ? 0 : d.price,
        tutorId:      d.tutorId || undefined,
        thumbnailUrl: thumbnail ?? undefined,
      }),
    {
      onSuccess: ({ data }) => {
        router.push(`/admin/courses/${data.course.id}`)
      },
    },
  )

  return (
    <AdminLayout title="Create New Course" breadcrumb="Home / Courses / Create">
      <form onSubmit={handleSubmit((d) => createCourse.mutate(d))} noValidate>
        <div className="row g-4">

          {/* ── Main form ── */}
          <div className="col-xl-8">

            {/* Basic Details */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-4">
                  <i className="ti tabler-clipboard me-2 text-primary"></i>Basic Details
                </h5>
                <div className="mb-3">
                  <label className="form-label">Course Title *</label>
                  <input
                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                    placeholder="e.g. Criminal Law Fundamentals"
                    {...register('title')}
                  />
                  {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Short Description <span className="text-body-secondary fw-normal">(shown on course card)</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder="e.g. Master the fundamentals of Criminal Law including IPC, CrPC, and landmark cases."
                    {...register('description')}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Long Description <span className="text-body-secondary fw-normal">(shown on course landing page)</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="This comprehensive course covers all aspects of Criminal Law..."
                    {...register('longDescription')}
                  />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Subject Category *</label>
                    <select
                      className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                      {...register('category')}
                    >
                      <option value="">Select category…</option>
                      <option value="Criminal Law">Criminal Law</option>
                      <option value="Civil Law">Civil Law</option>
                      <option value="Constitutional Law">Constitutional Law</option>
                      <option value="Evidence Law">Evidence Law</option>
                      <option value="Corporate Law">Corporate Law</option>
                      <option value="Family Law">Family Law</option>
                      <option value="Contract Law">Contract Law</option>
                      <option value="Exam Prep">Exam Prep</option>
                    </select>
                    {errors.category && <div className="invalid-feedback">{errors.category.message}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Course Level</label>
                    <select className="form-select" {...register('level')}>
                      <option value="">Select level…</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-4">
                  <i className="ti tabler-photo me-2 text-primary"></i>Course Thumbnail
                </h5>
                <div
                  className="border border-dashed rounded p-5 text-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => document.getElementById('thumbnail-input')?.click()}
                >
                  {thumbnail ? (
                    <img src={thumbnail} alt="Thumbnail" className="rounded" style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      {uploading
                        ? <><span className="spinner-border spinner-border-sm me-2" />Uploading…</>
                        : <>
                            <i className="ti tabler-photo text-body-secondary mb-2" style={{ fontSize: 40 }}></i>
                            <div className="fw-medium mb-1">Drop image here or <span className="text-primary">browse</span></div>
                            <small className="text-body-secondary">PNG or JPG · Recommended: 1280×720 · Max 5MB</small>
                          </>
                      }
                    </>
                  )}
                </div>
                <input
                  id="thumbnail-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="d-none"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
                />
                {thumbnail && (
                  <button type="button" className="btn btn-sm btn-label-danger mt-2" onClick={() => setThumbnail(null)}>
                    <i className="ti tabler-trash me-1"></i>Remove
                  </button>
                )}
                {uploadError && <div className="text-danger small mt-1">{uploadError}</div>}
              </div>
            </div>

            {/* Pricing */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="fw-bold mb-4">
                  <i className="ti tabler-currency-rupee me-2 text-primary"></i>Pricing
                </h5>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isFreeToggle"
                      {...register('isFree')}
                      onChange={(e) => {
                        setValue('isFree', e.target.checked)
                        if (e.target.checked) setValue('price', 0)
                      }}
                    />
                  </div>
                  <label className="text-body-secondary mb-0" htmlFor="isFreeToggle">Free Course</label>
                </div>
                {!isFree && (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Price (₹)</label>
                      <input
                        className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                        type="number"
                        placeholder="e.g. 4999"
                        {...register('price')}
                      />
                      {errors.price && <div className="invalid-feedback">{errors.price.message}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Discounted Price (₹) <span className="text-body-secondary fw-normal">(optional)</span>
                      </label>
                      <input
                        className="form-control"
                        type="number"
                        placeholder="e.g. 3499"
                        {...register('discountedPrice')}
                      />
                      {discounted && price > 0 && discounted < price && (
                        <small className="text-success">Students see ₹{Number(price).toLocaleString('en-IN')} struck through</small>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tutor Assignment */}
            <div className="card">
              <div className="card-body">
                <h5 className="fw-bold mb-4">
                  <i className="ti tabler-user-check me-2 text-primary"></i>Tutor Assignment
                </h5>
                <div className="row g-3">
                  <div className="col-md-8">
                    <div className="border border-primary rounded p-3 bg-label-primary">
                      <div className="fw-semibold text-primary mb-2">Assign Tutor</div>
                      <select className="form-select bg-white" {...register('tutorId')}>
                        <option value="">Select a tutor…</option>
                        {tutors.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div
                      className="border rounded p-3 text-center h-100 d-flex flex-column align-items-center justify-content-center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setValue('tutorId', '')}
                    >
                      <i className="ti tabler-school text-body-secondary mb-2" style={{ fontSize: 28 }}></i>
                      <small className="text-body-secondary">No Tutor (Admin manages directly)</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="col-xl-4">
            {/* Preview Card */}
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="fw-bold mb-3">
                  <i className="ti tabler-eye me-2 text-primary"></i>Preview Card
                </h6>
                <div className="border rounded overflow-hidden">
                  <div
                    className="d-flex align-items-center justify-content-center bg-label-primary overflow-hidden"
                    style={{ height: 90, position: 'relative' }}
                  >
                    {thumbnail
                      ? <img src={thumbnail} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="ti tabler-book text-primary" style={{ fontSize: 36 }}></i>
                    }
                  </div>
                  <div className="p-3">
                    <span className="badge bg-label-primary mb-2">{category}</span>
                    <div className="fw-bold small mb-1">{title}</div>
                    <small className="text-body-secondary d-block mb-2">
                      <i className="ti tabler-user me-1"></i>{selectedTutor?.name ?? 'Admin Direct'}
                    </small>
                    <div className="d-flex justify-content-between align-items-center">
                      {isFree ? (
                        <span className="fw-bold text-success">Free</span>
                      ) : (
                        <>
                          {discounted && discounted < price
                            ? <small className="text-decoration-line-through text-body-secondary">₹{Number(price).toLocaleString('en-IN')}</small>
                            : <span></span>
                          }
                          <span className="fw-bold text-primary">
                            ₹{Number(discounted && discounted < price ? discounted : price).toLocaleString('en-IN')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Publish Options */}
            <div className="card">
              <div className="card-body">
                <h6 className="fw-bold mb-4">
                  <i className="ti tabler-rocket me-2 text-primary"></i>Publish Options
                </h6>
                {createCourse.isError && (
                  <div className="alert alert-danger py-2 small mb-3">
                    {(createCourse.error as any)?.response?.data?.error?.message ?? 'Something went wrong'}
                  </div>
                )}
                <div className="d-flex flex-column gap-2">
                  <button
                    type="submit"
                    className="btn btn-outline-secondary d-flex align-items-center gap-2"
                    disabled={isSubmitting || createCourse.isLoading}
                  >
                    <i className="ti tabler-device-floppy"></i>Save as Draft
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={isSubmitting || createCourse.isLoading}
                  >
                    {(isSubmitting || createCourse.isLoading) && <span className="spinner-border spinner-border-sm" />}
                    <i className="ti tabler-rocket"></i>Create &amp; Continue
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </form>
    </AdminLayout>
  )
}
