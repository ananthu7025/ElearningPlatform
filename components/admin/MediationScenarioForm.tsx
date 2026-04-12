'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { mediationCreateSchema } from '@/lib/practiceLab/mediationScenario'
import api from '@/lib/api'

interface PartyFields {
  name:      string
  role:      string
  position:  string
  interests: string
}

interface FormCore {
  title:       string
  description: string
  difficulty:  'EASY' | 'MEDIUM' | 'HARD'
  caseId:      string
  mode:        'mediation' | 'arbitration'
  disputeType: string
  background:  string
  instructions: string
  isPublished: boolean
  partyAName:      string
  partyARole:      string
  partyAPosition:  string
  partyAInterests: string
  partyBName:      string
  partyBRole:      string
  partyBPosition:  string
  partyBInterests: string
}

const DISPUTE_TYPES = [
  'Commercial',
  'Family',
  'Labour / Employment',
  'Property / Real Estate',
  'Consumer',
  'Construction',
  'Intellectual Property',
  'Insurance',
  'Other',
]

const defaults: FormCore = {
  title:       '',
  description: '',
  difficulty:  'MEDIUM',
  caseId:      '',
  mode:        'mediation',
  disputeType: 'Commercial',
  background:  '',
  instructions: '',
  isPublished: false,
  partyAName:      '',
  partyARole:      'Claimant',
  partyAPosition:  '',
  partyAInterests: '',
  partyBName:      '',
  partyBRole:      'Respondent',
  partyBPosition:  '',
  partyBInterests: '',
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
    setLines((prev) => { const next = [...prev]; next[i] = val; return next })
  }
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h6 className="mb-0">{label}</h6>
        {hint && <small className="text-body-secondary">{hint}</small>}
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
          <i className="ti tabler-plus me-1" />{addLabel}
        </button>
      </div>
    </div>
  )
}

export interface MediationScenarioFormProps {
  mode:        'create' | 'edit'
  scenarioId?: string
  backHref:    string
  metaTitle:   string
}

export default function MediationScenarioForm({
  mode,
  scenarioId,
  backHref,
  metaTitle,
}: MediationScenarioFormProps) {
  const router = useRouter()

  const [partyAFacts, setPartyAFacts] = useState<string[]>([''])
  const [partyBFacts, setPartyBFacts] = useState<string[]>([''])
  const [lawLines,    setLawLines]    = useState<string[]>([''])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormCore>({ defaultValues: defaults })

  const sessionMode = watch('mode')

  // Load existing scenario on edit
  useEffect(() => {
    if (mode !== 'edit' || !scenarioId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/practice-lab/scenarios/${scenarioId}`)
        const s = res.data?.scenario
        if (!s || cancelled) return
        const c = s.content && typeof s.content === 'object' ? s.content : {}
        const pA = c.partyA && typeof c.partyA === 'object' ? c.partyA : {}
        const pB = c.partyB && typeof c.partyB === 'object' ? c.partyB : {}

        setPartyAFacts(Array.isArray(pA.facts) && pA.facts.length > 0 ? pA.facts.map(String) : [''])
        setPartyBFacts(Array.isArray(pB.facts) && pB.facts.length > 0 ? pB.facts.map(String) : [''])
        setLawLines(Array.isArray(c.applicableLaw) && c.applicableLaw.length > 0 ? c.applicableLaw.map(String) : [''])

        reset({
          title:           s.title ?? '',
          description:     s.description ?? '',
          difficulty:      (['EASY', 'MEDIUM', 'HARD'].includes(s.difficulty) ? s.difficulty : 'MEDIUM') as FormCore['difficulty'],
          caseId:          s.caseId ?? '',
          mode:            c.mode === 'arbitration' ? 'arbitration' : 'mediation',
          disputeType:     typeof c.disputeType === 'string' ? c.disputeType : 'Commercial',
          background:      typeof c.background === 'string' ? c.background : '',
          instructions:    typeof c.instructions === 'string' ? c.instructions : '',
          isPublished:     Boolean(s.isPublished),
          partyAName:      typeof pA.name === 'string' ? pA.name : '',
          partyARole:      typeof pA.role === 'string' ? pA.role : 'Claimant',
          partyAPosition:  typeof pA.position === 'string' ? pA.position : '',
          partyAInterests: typeof pA.interests === 'string' ? pA.interests : '',
          partyBName:      typeof pB.name === 'string' ? pB.name : '',
          partyBRole:      typeof pB.role === 'string' ? pB.role : 'Respondent',
          partyBPosition:  typeof pB.position === 'string' ? pB.position : '',
          partyBInterests: typeof pB.interests === 'string' ? pB.interests : '',
        })
      } catch {
        router.replace(backHref)
      }
    })()
    return () => { cancelled = true }
  }, [mode, scenarioId, reset, router, backHref])

  async function onSubmit(data: FormCore) {
    const partyAFactsClean = normalizeLines(partyAFacts)
    const partyBFactsClean = normalizeLines(partyBFacts)
    const lawsClean        = normalizeLines(lawLines)

    const payload = {
      title:       data.title.trim(),
      description: data.description.trim(),
      difficulty:  data.difficulty,
      caseId:      data.caseId?.trim() || null,
      content: {
        mode:          data.mode,
        disputeType:   data.disputeType,
        background:    data.background.trim(),
        instructions:  data.instructions.trim(),
        applicableLaw: lawsClean,
        partyA: {
          name:      data.partyAName.trim(),
          role:      data.partyARole.trim(),
          position:  data.partyAPosition.trim(),
          interests: data.partyAInterests.trim(),
          facts:     partyAFactsClean,
        },
        partyB: {
          name:      data.partyBName.trim(),
          role:      data.partyBRole.trim(),
          position:  data.partyBPosition.trim(),
          interests: data.partyBInterests.trim(),
          facts:     partyBFactsClean,
        },
      },
      isPublished: data.isPublished,
    }

    const parsed = mediationCreateSchema.safeParse(payload)
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const msgs = Object.values(flat.fieldErrors).flat().join('\n') || 'Please fill all required fields.'
      window.alert(msgs)
      return
    }

    try {
      if (mode === 'create') {
        await api.post('/admin/practice-lab/ARBITRATION_MEDIATION/scenarios', parsed.data)
      } else if (scenarioId) {
        await api.patch(`/admin/practice-lab/ARBITRATION_MEDIATION/scenarios/${scenarioId}`, parsed.data)
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

      {/* scenario details */}
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
          <div className="col-md-4">
            <label className="form-label">Session mode</label>
            <select className="form-select" {...register('mode')}>
              <option value="mediation">Mediation</option>
              <option value="arbitration">Arbitration</option>
            </select>
            <small className="text-body-secondary">
              {sessionMode === 'arbitration'
                ? 'Student acts as arbitrator and issues a binding award.'
                : 'Student acts as mediator and facilitates a settlement.'}
            </small>
          </div>
          <div className="col-md-4">
            <label className="form-label">Dispute type</label>
            <select className="form-select" {...register('disputeType', { required: true })}>
              {DISPUTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Reference / scenario ID <span className="text-body-secondary">(optional)</span></label>
            <input className="form-control" placeholder="e.g. ARB-2024-001" {...register('caseId')} />
          </div>
          <div className="col-12">
            <label className="form-label">Background / context</label>
            <textarea
              rows={4}
              className="form-control"
              placeholder="Describe the dispute: what happened, what each party wants, relevant timeline…"
              {...register('background', { required: true })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Instructions for students</label>
            <textarea
              rows={3}
              className="form-control"
              placeholder={sessionMode === 'arbitration'
                ? 'e.g. Conduct a 3-round hearing. Give each party 5 minutes to present. Issue a reasoned award at the end.'
                : 'e.g. Conduct opening statements, explore interests, run a caucus with each party, and aim for a settlement agreement.'}
              {...register('instructions', { required: true })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Short description <span className="text-body-secondary">(shown on scenario card)</span></label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="One-line summary shown to students…"
              {...register('description', { required: true })}
            />
          </div>
        </div>
      </div>

      {/* party A */}
      <div className="card mb-4">
        <div className="card-header bg-label-primary">
          <h6 className="mb-0">Party A</h6>
          <small className="text-body-secondary">Typically the claimant / applicant</small>
        </div>
        <div className="card-body row g-3">
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input className="form-control" placeholder="e.g. Ramesh Kumar" {...register('partyAName', { required: true })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Role</label>
            <input className="form-control" placeholder="e.g. Claimant" {...register('partyARole', { required: true })} />
          </div>
          <div className="col-12">
            <label className="form-label">Stated position</label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="What Party A is demanding or claiming…"
              {...register('partyAPosition', { required: true })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Underlying interests</label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="What Party A actually needs or values (beyond their stated position)…"
              {...register('partyAInterests', { required: true })}
            />
          </div>
        </div>
      </div>

      <DynamicList
        label="Party A — known facts"
        hint="Facts available to the mediator/arbitrator about Party A's case"
        lines={partyAFacts}
        setLines={setPartyAFacts}
        addLabel="Add fact"
        placeholder="e.g. Signed contract dated 01-Jan-2024"
      />

      {/* party B */}
      <div className="card mb-4">
        <div className="card-header bg-label-danger">
          <h6 className="mb-0">Party B</h6>
          <small className="text-body-secondary">Typically the respondent</small>
        </div>
        <div className="card-body row g-3">
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input className="form-control" placeholder="e.g. Priya Exports Ltd." {...register('partyBName', { required: true })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Role</label>
            <input className="form-control" placeholder="e.g. Respondent" {...register('partyBRole', { required: true })} />
          </div>
          <div className="col-12">
            <label className="form-label">Stated position</label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="What Party B is contesting or offering…"
              {...register('partyBPosition', { required: true })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Underlying interests</label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="What Party B actually needs or values (beyond their stated position)…"
              {...register('partyBInterests', { required: true })}
            />
          </div>
        </div>
      </div>

      <DynamicList
        label="Party B — known facts"
        hint="Facts available to the mediator/arbitrator about Party B's case"
        lines={partyBFacts}
        setLines={setPartyBFacts}
        addLabel="Add fact"
        placeholder="e.g. Port strike from 15-Dec to 20-Jan"
      />

      <DynamicList
        label="Applicable law"
        hint="Statutes, rules, or regulations the student should apply"
        lines={lawLines}
        setLines={setLawLines}
        addLabel="Add statute"
        placeholder="e.g. Arbitration and Conciliation Act, 1996"
      />

      {/* publish toggle */}
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
