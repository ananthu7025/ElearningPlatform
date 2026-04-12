'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { contractDraftCreateSchema } from '@/lib/practiceLab/contractDraftScenario'
import api from '@/lib/api'

interface FormCore {
  title: string
  description: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  caseId: string
  contractType: string
  partyA: string
  partyB: string
  background: string
  instructions: string
  isPublished: boolean
}

const CONTRACT_TYPES = [
  'Sale Agreement',
  'Service Agreement',
  'Employment Contract',
  'Lease Agreement',
  'Non-Disclosure Agreement',
  'Partnership Agreement',
  'Loan Agreement',
  'Settlement Agreement',
  'Other',
]

const defaults: FormCore = {
  title: '',
  description: '',
  difficulty: 'MEDIUM',
  caseId: '',
  contractType: 'Service Agreement',
  partyA: '',
  partyB: '',
  background: '',
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

export interface ContractDraftScenarioFormProps {
  mode: 'create' | 'edit'
  scenarioId?: string
  backHref: string
  metaTitle: string
}

export default function ContractDraftScenarioForm({
  mode,
  scenarioId,
  backHref,
  metaTitle,
}: ContractDraftScenarioFormProps) {
  const router = useRouter()
  const [clauseLines, setClauseLines] = useState<string[]>([''])

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
        setClauseLines(
          Array.isArray(c.requiredClauses) && c.requiredClauses.length > 0
            ? c.requiredClauses.map(String)
            : ['']
        )
        reset({
          title: s.title ?? '',
          description: s.description ?? '',
          difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(s.difficulty) ? s.difficulty : 'MEDIUM') as FormCore['difficulty'],
          caseId: s.caseId ?? '',
          contractType: typeof c.contractType === 'string' ? c.contractType : 'Service Agreement',
          partyA: typeof c.partyA === 'string' ? c.partyA : '',
          partyB: typeof c.partyB === 'string' ? c.partyB : '',
          background: typeof c.background === 'string' ? c.background : '',
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
    const requiredClauses = normalizeLines(clauseLines)

    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      difficulty: data.difficulty,
      caseId: data.caseId?.trim() || null,
      caseType: data.contractType.trim() || null,
      content: {
        contractType: data.contractType.trim(),
        partyA: data.partyA.trim(),
        partyB: data.partyB.trim(),
        background: data.background.trim(),
        requiredClauses,
        instructions: data.instructions.trim(),
      },
      isPublished: data.isPublished,
    }

    const parsed = contractDraftCreateSchema.safeParse(payload)
    if (!parsed.success) {
      window.alert('Please fill all required fields (parties, background, required clauses, and instructions).')
      return
    }

    try {
      if (mode === 'create') {
        await api.post('/admin/practice-lab/CONTRACT_DRAFTING/scenarios', parsed.data)
      } else if (scenarioId) {
        await api.patch(`/admin/practice-lab/CONTRACT_DRAFTING/scenarios/${scenarioId}`, parsed.data)
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
            <label className="form-label">Contract type</label>
            <select className="form-select" {...register('contractType', { required: true })}>
              {CONTRACT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Reference / scenario ID <span className="text-body-secondary">(optional)</span></label>
            <input className="form-control" placeholder="e.g. CT-2024-001" {...register('caseId')} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Party A</label>
            <input className="form-control" placeholder="e.g. XYZ Tech Pvt. Ltd. (client)" {...register('partyA', { required: true })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Party B</label>
            <input className="form-control" placeholder="e.g. ABC Consulting Services (vendor)" {...register('partyB', { required: true })} />
          </div>
          <div className="col-12">
            <label className="form-label">Background / context</label>
            <textarea
              rows={3}
              className="form-control"
              placeholder="Describe the commercial situation and what the parties want to achieve…"
              {...register('background', { required: true })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Instructions for students</label>
            <textarea
              rows={3}
              className="form-control"
              placeholder="What the student must draft, what format to use, what to include…"
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
        label="Required clauses"
        hint="Clauses the student's contract must include. AI evaluates against these."
        lines={clauseLines}
        setLines={setClauseLines}
        addLabel="Add clause"
        placeholder="e.g. Termination clause with 30-day notice period"
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
