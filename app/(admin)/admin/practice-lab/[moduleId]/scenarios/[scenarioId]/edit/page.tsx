'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import ClientInterviewScenarioForm from '@/components/admin/ClientInterviewScenarioForm'
import CaseDraftScenarioForm from '@/components/admin/CaseDraftScenarioForm'
import ContractDraftScenarioForm from '@/components/admin/ContractDraftScenarioForm'

const MODULE_META: Record<string, { title: string; moduleType: string }> = {
  'client-interview':  { title: 'Client Interview Room', moduleType: 'CLIENT_INTERVIEW' },
  'case-drafting':     { title: 'Case Drafting Studio',  moduleType: 'CASE_DRAFTING' },
  'contract-drafting': { title: 'Contract Drafting Desk',moduleType: 'CONTRACT_DRAFTING' },
}

export default function EditScenarioPage() {
  const { moduleId, scenarioId } = useParams<{ moduleId: string; scenarioId: string }>()
  const searchParams = useSearchParams()
  const moduleType = searchParams.get('type') ?? MODULE_META[moduleId]?.moduleType ?? ''
  const meta = MODULE_META[moduleId] ?? { title: moduleId, moduleType }

  const backHref =
    moduleType ? `/admin/practice-lab/${moduleId}/scenarios?type=${moduleType}` : '/admin/practice-lab'

  const formProps = { mode: 'edit' as const, scenarioId, backHref, metaTitle: meta.title }

  return (
    <AdminLayout title="Edit scenario" breadcrumb={`Home / Practice Lab / ${meta.title} / Edit`}>
      <div className="mb-4">
        <Link href={backHref} className="text-body-secondary text-decoration-none small d-inline-flex align-items-center gap-1">
          <i className="ti tabler-arrow-left" style={{ fontSize: 14 }} />
          Scenarios
        </Link>
      </div>

      {moduleType === 'CLIENT_INTERVIEW' && <ClientInterviewScenarioForm {...formProps} />}
      {moduleType === 'CASE_DRAFTING' && <CaseDraftScenarioForm {...formProps} />}
      {moduleType === 'CONTRACT_DRAFTING' && <ContractDraftScenarioForm {...formProps} />}

      {moduleType && !['CLIENT_INTERVIEW', 'CASE_DRAFTING', 'CONTRACT_DRAFTING'].includes(moduleType) && (
        <div className="card">
          <div className="card-body text-center py-6">
            <p className="text-body-secondary mb-4">
              Editing is not yet available for <strong>{meta.title}</strong> scenarios.
            </p>
            <Link href="/admin/practice-lab" className="btn btn-primary">
              Back to Practice Lab
            </Link>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
