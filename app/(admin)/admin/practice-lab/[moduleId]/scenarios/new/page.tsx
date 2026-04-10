'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import ClientInterviewScenarioForm from '@/components/admin/ClientInterviewScenarioForm'

const MODULE_META: Record<string, { title: string; moduleType: string }> = {
  'client-interview': { title: 'Client Interview Room', moduleType: 'CLIENT_INTERVIEW' },
}

export default function NewScenarioPage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const searchParams = useSearchParams()
  const moduleType = searchParams.get('type') ?? MODULE_META[moduleId]?.moduleType ?? ''
  const meta = MODULE_META[moduleId] ?? { title: moduleId, moduleType }

  const backHref =
    moduleType ? `/admin/practice-lab/${moduleId}/scenarios?type=${moduleType}` : '/admin/practice-lab'

  if (moduleId !== 'client-interview' || moduleType !== 'CLIENT_INTERVIEW') {
    return (
      <AdminLayout title="New scenario" breadcrumb={`Home / Practice Lab / ${meta.title}`}>
        <div className="card">
          <div className="card-body text-center py-6">
            <p className="text-body-secondary mb-4">
              Scenario authoring is only set up for <strong>Client Interview</strong> right now.
            </p>
            <Link href="/admin/practice-lab" className="btn btn-primary">
              Back to Practice Lab
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="New scenario"
      breadcrumb={`Home / Practice Lab / ${meta.title} / New`}
    >
      <div className="mb-4">
        <Link href={backHref} className="text-body-secondary text-decoration-none small d-inline-flex align-items-center gap-1">
          <i className="ti tabler-arrow-left" style={{ fontSize: 14 }} />
          Scenarios
        </Link>
      </div>
      <ClientInterviewScenarioForm mode="create" backHref={backHref} metaTitle={meta.title} />
    </AdminLayout>
  )
}
