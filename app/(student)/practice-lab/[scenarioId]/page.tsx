'use client'

import { useParams } from 'next/navigation'
import { useQuery } from 'react-query'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'
import ClientInterviewChat from '@/components/student/ClientInterviewChat'
import DraftingStudio from '@/components/student/DraftingStudio'

const DRAFTING_TYPES = ['CASE_DRAFTING', 'CONTRACT_DRAFTING']

export default function ScenarioPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()

  const { data, isLoading } = useQuery(['scenario', scenarioId], () =>
    api.get(`/practice-lab/scenarios/${scenarioId}`).then((r) => r.data)
  )

  const scenario = data?.scenario

  // Drafting modules render their own full-screen layout — no StudentLayout wrapper
  if (!isLoading && scenario && DRAFTING_TYPES.includes(scenario.moduleType)) {
    return <DraftingStudio scenario={scenario} />
  }

  // Client Interview renders its own full-screen layout too
  if (!isLoading && scenario && scenario.moduleType === 'CLIENT_INTERVIEW') {
    return <ClientInterviewChat scenario={scenario} />
  }

  // Loading / not found / other modules
  return (
    <StudentLayout>
      {isLoading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : !scenario ? (
        <div className="alert alert-danger">Scenario not found.</div>
      ) : (
        <div className="alert alert-warning">
          This module type (<strong>{scenario.moduleType}</strong>) is not yet supported.
        </div>
      )}
    </StudentLayout>
  )
}
