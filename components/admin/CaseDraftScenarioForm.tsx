'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { caseDraftCreateSchema } from '@/lib/practiceLab/caseDraftScenario'
import api from '@/lib/api'

interface FormCore {
  title: string
  description: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  caseType: string
  caseId: string
  brief: string
  instructions: string
  isPublished: boolean
}

const defaults: FormCore = {
  title: '',
  description: '',
  difficulty: 'MEDIUM',
  caseType: '',
  caseId: '',
  brief: '',
  instructions: '',
  isPublished: false,
}

function normalizeLines(arr: string[]) {
  return arr.map((s) => s.trim()).filter((s) => s.length > 0)
}

function DynamicList({
  label,
  hint,
  lines,
  setLines,
  addLabel,
  placeholder,
}: {
  label: string
  hint: string
  lines: string[]
  setLines: Dispatch<SetStateAction<string[]>>
  addLabel: string
  placeholder?: string
}) {
  function updateLine(i: number, val: string) {
    setLines((prev) => {
      const next = [...prev]
      next[i] = val
      return next
    })
  }
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h6 className="mb-0">{label}</h6>
        <small className="text-body-secondary">{hint}</small>
      </div>
      <div className="card-body">
        {lines.map((line, i) => (
          <div key={i} className="d-flex gap-2 mb-2">
            <input
              className="form-control form-control-sm"
              value={line}
              placeholder={placeholder}
              onChange={(e) => updateLine(i, e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-icon btn-label-danger"
              onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
              disabled={lines.length <= 1}
            >
              <i className="ti tabler-x" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-label-primary"
          onClick={() => setLines((prev) => [...prev, ''])}
        >
          <i className="ti tabler-plus me-1" /> {addLabel}
        </button>
      </div>
    </div>
  )
}

export interface CaseDraftScenarioFormProps {
  mode: 'create' | 'edit'
  scenarioId?: string
  backHref: string
  metaTitle: string
}

export default function CaseDraftScenarioForm({
  mode,
  scenarioId,
  backHref,
  metaTitle,
}: CaseDraftScenarioFormProps) {
  const router = useRouter()
  const [factsLines, setFactsLines] = useState<string[]>([''])
  const [issuesLines, setIssuesLines] = useState<string[]>([''])
  const [lawLines, setLawLines] = useState<string[]>([''])

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormCore>({ defaultValues: defaults })

  useEffect(() => {
    if (mode !== 'edit' || !scenarioId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/practice-lab/scenarios/${scenarioId}`)
        const s = res.data?.scenario
        if (!s || cancelled) return
        const c = s.content && typeof s.content === 'object' ? s.content : {}
        setFactsLines(Array.isArray(c.facts) && c.facts.length > 0 ? c.facts.map(String) : [''])
        setIssuesLines(Array.isArray(c.issues) && c.issues.length > 0 ? c.issues.map(String) : [''])
        setLawLines(Array.isArray(c.applicableLaw) && c.applicableLaw.length > 0 ? c.applicableLaw.map(String) : [''])
        reset({
          title: s.title ?? '',
          description: s.description ?? '',
          difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(s.difficulty) ? s.difficulty : 'MEDIUM') as FormCore['difficulty'],
          caseType: s.caseType ?? '',
          caseId: s.caseId ?? '',
          brief: typeof c.brief === 'string' ? c.brief : '',
          instructions: typeof c.instructions === 'string' ? c.instructions : '',
          isPublished: Boolean(s.isPublished),
        })
      } catch {
        router.replace(backHref)
      }
    })()
    return () => { cancelled = true }
  }, [mode, scenarioId, reset, router, backHref])

  async function onSubmit(data: FormCore) {
    const facts = normalizeLines(factsLines)
    const issues = normalizeLines(issuesLines)
    const applicableLaw = normalizeLines(lawLines)

    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      difficulty: data.difficulty,
      caseType: data.caseType?.trim() || null,
      caseId: data.caseId?.trim() || null,
      content: {
        facts,
        issues,
        applicableLaw,
        instructions: data.instructions.trim(),
        ...(data.brief?.trim() ? { brief: data.brief.trim() } : {}),
      },
      isPublished: data.isPublished,
    }

    const parsed = caseDraftCreateSchema.safeParse(payload)
    if (!parsed.success) {
      window.alert('Please fill all required fields (facts, issues, applicable law, and instructions).')
      return
    }

    try {
      if (mode === 'create') {
        await api.post('/admin/practice-lab/CASE_DRAFTING/scenarios', parsed.data)
      } else if (scenarioId) {
        await api.patch(`/admin/practice-lab/CASE_DRAFTING/scenarios/${scenarioId}`, parsed.data)
      }
      router.push(backHref)
      router.refresh()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: unknown } } } }
      const msg = err?.response?.data?.error?.message
      window.alert(typeof msg === 'string' ? msg : 'Could not save scenario')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Scenario details</h5>
          <Link href={backHref} className="btn btn-sm btn-label-secondary">Cancel</Link>
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
          <div className="col-md-6">
            <label className="form-label">Case type</label>
            <input className="form-control" placeholder="e.g. Civil — Negligence" {...register('caseType')} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Reference / case ID</label>
            <input className="form-control" placeholder="e.g. CS-2024-001" {...register('caseId')} />
          </div>
          <div className="col-12">
            <label className="form-label">Brief / background <span className="text-body-secondary">(optional)</span></label>
            <textarea rows={2} className="form-control" placeholder="Narrative background shown to student…" {...register('brief')} />
          </div>
          <div className="col-12">
            <label className="form-label">Instructions for students</label>
            <textarea
              rows={3}
              className="form-control"
              placeholder="What the student must draft and how to structure it…"
              {...register('instructions', { required: true })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Short description <span className="text-body-secondary">(shown on scenario card)</span></label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="One-line summary of the scenario…"
              {...register('description', { required: true })}
            />
          </div>
        </div>
      </div>

      <DynamicList
        label="Case facts"
        hint="Facts of the case given to the student."
        lines={factsLines}
        setLines={setFactsLines}
        addLabel="Add fact"
        placeholder="e.g. The defendant failed to maintain the property..."
      />

      <DynamicList
        label="Legal issues to address"
        hint="Issues the student's draft must cover."
        lines={issuesLines}
        setLines={setIssuesLines}
        addLabel="Add issue"
        placeholder="e.g. Whether the defendant owed a duty of care..."
      />

      <DynamicList
        label="Applicable law / provisions"
        hint="Statutes, case law, or doctrines the AI uses for evaluation."
        lines={lawLines}
        setLines={setLawLines}
        addLabel="Add provision"
        placeholder="e.g. Section 2 of the Limitation Act, 1963"
      />

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
        <Link href={backHref} className="btn btn-label-secondary">Back to {metaTitle}</Link>
      </div>
    </form>
  )
}
