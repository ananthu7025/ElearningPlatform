'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clientInterviewCreateSchema } from '@/lib/practiceLab/clientInterviewScenario'
import api from '@/lib/api'

export interface ClientInterviewFormCore {
  title: string
  description: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  clientName: string
  caseType: string
  caseId: string
  brief: string
  isPublished: boolean
}

function normalizeLines(arr: string[]) {
  return arr.map((s) => s.trim()).filter((s) => s.length > 0)
}

const defaultCore: ClientInterviewFormCore = {
  title: '',
  description: '',
  difficulty: 'MEDIUM',
  clientName: '',
  caseType: '',
  caseId: '',
  brief: '',
  isPublished: false,
}

export interface ClientInterviewScenarioFormProps {
  mode: 'create' | 'edit'
  scenarioId?: string
  backHref: string
  metaTitle: string
}

export default function ClientInterviewScenarioForm({
  mode,
  scenarioId,
  backHref,
  metaTitle,
}: ClientInterviewScenarioFormProps) {
  const router = useRouter()
  const [factsLines, setFactsLines] = useState<string[]>([''])
  const [provisionLines, setProvisionLines] = useState<string[]>([''])

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ClientInterviewFormCore>({
    defaultValues: defaultCore,
  })

  useEffect(() => {
    if (mode !== 'edit' || !scenarioId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/practice-lab/scenarios/${scenarioId}`)
        const s = res.data?.scenario
        if (!s || cancelled) return
        const c = s.content && typeof s.content === 'object' ? s.content : {}
        const facts = Array.isArray(c.facts) && c.facts.length > 0 ? c.facts : ['']
        const provisions =
          Array.isArray(c.provisions) && c.provisions.length > 0 ? c.provisions : ['']
        setFactsLines(facts.map((x: unknown) => String(x)))
        setProvisionLines(provisions.map((x: unknown) => String(x)))
        reset({
          title: s.title ?? '',
          description: s.description ?? '',
          difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(s.difficulty) ? s.difficulty : 'MEDIUM') as ClientInterviewFormCore['difficulty'],
          clientName: s.clientName ?? '',
          caseType: s.caseType ?? '',
          caseId: s.caseId ?? '',
          brief: typeof c.brief === 'string' ? c.brief : '',
          isPublished: Boolean(s.isPublished),
        })
      } catch {
        router.replace(backHref)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, scenarioId, reset, router, backHref])

  async function onSubmit(data: ClientInterviewFormCore) {
    const facts = normalizeLines(factsLines)
    const provisions = normalizeLines(provisionLines)
    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      difficulty: data.difficulty,
      clientName: data.clientName?.trim() || null,
      caseType: data.caseType?.trim() || null,
      caseId: data.caseId?.trim() || null,
      content: {
        facts,
        provisions,
        ...(data.brief?.trim() ? { brief: data.brief.trim() } : {}),
      },
      isPublished: data.isPublished,
    }

    const parsed = clientInterviewCreateSchema.safeParse(payload)
    if (!parsed.success) {
      window.alert('Please check all required fields (instructions, facts, and provisions).')
      return
    }

    try {
      if (mode === 'create') {
        await api.post('/admin/practice-lab/CLIENT_INTERVIEW/scenarios', parsed.data)
      } else if (scenarioId) {
        await api.patch(`/admin/practice-lab/CLIENT_INTERVIEW/scenarios/${scenarioId}`, parsed.data)
      }
      router.push(backHref)
      router.refresh()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: unknown } } } }
      const msg = err?.response?.data?.error?.message
      window.alert(typeof msg === 'string' ? msg : 'Could not save scenario')
    }
  }

  function updateLine(
    setter: Dispatch<SetStateAction<string[]>>,
    index: number,
    value: string
  ) {
    setter((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Scenario details</h5>
          <Link href={backHref} className="btn btn-sm btn-label-secondary">
            Cancel
          </Link>
        </div>
        <div className="card-body row g-4">
          <div className="col-md-8">
            <label className="form-label">Title</label>
            <input className="form-control" {...register('title', { required: true })} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Difficulty</label>
            <select className="form-select" {...register('difficulty')}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">Instructions for students</label>
            <textarea
              rows={4}
              className="form-control"
              placeholder="What the student should do in this client interview exercise…"
              {...register('description', { required: true })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Client name</label>
            <input className="form-control" {...register('clientName')} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Case type</label>
            <input className="form-control" placeholder="e.g. Civil — breach" {...register('caseType')} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Reference / case ID</label>
            <input className="form-control" {...register('caseId')} />
          </div>
          <div className="col-12">
            <label className="form-label">Optional brief (shown with facts)</label>
            <textarea rows={2} className="form-control" {...register('brief')} />
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Facts (for the scenario)</h6>
          <small className="text-body-secondary">At least one non-empty line required.</small>
        </div>
        <div className="card-body">
          {factsLines.map((line, i) => (
            <div key={`fact-${i}`} className="d-flex gap-2 mb-2">
              <input
                className="form-control form-control-sm"
                value={line}
                onChange={(e) => updateLine(setFactsLines, i, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-icon btn-label-danger"
                onClick={() => setFactsLines((prev) => prev.filter((_, j) => j !== i))}
                disabled={factsLines.length <= 1}
              >
                <i className="ti tabler-x" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-label-primary"
            onClick={() => setFactsLines((prev) => [...prev, ''])}
          >
            <i className="ti tabler-plus me-1" /> Add fact
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Legal points / provisions</h6>
          <small className="text-body-secondary">Statutes, issues, or doctrines students should consider.</small>
        </div>
        <div className="card-body">
          {provisionLines.map((line, i) => (
            <div key={`prov-${i}`} className="d-flex gap-2 mb-2">
              <input
                className="form-control form-control-sm"
                value={line}
                onChange={(e) => updateLine(setProvisionLines, i, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-icon btn-label-danger"
                onClick={() => setProvisionLines((prev) => prev.filter((_, j) => j !== i))}
                disabled={provisionLines.length <= 1}
              >
                <i className="ti tabler-x" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-label-primary"
            onClick={() => setProvisionLines((prev) => [...prev, ''])}
          >
            <i className="ti tabler-plus me-1" /> Add provision
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="pub" {...register('isPublished')} />
            <label className="form-check-label" htmlFor="pub">
              Publish — visible to students in Practice Lab
            </label>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && <span className="spinner-border spinner-border-sm me-2" />}
          {mode === 'create' ? 'Create scenario' : 'Save changes'}
        </button>
        <Link href={backHref} className="btn btn-label-secondary">
          Back to {metaTitle}
        </Link>
      </div>
    </form>
  )
}
