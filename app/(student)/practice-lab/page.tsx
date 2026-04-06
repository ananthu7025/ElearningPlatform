'use client'

import { useQuery } from 'react-query'
import Link from 'next/link'
import StudentLayout from '@/components/layouts/StudentLayout'
import api from '@/lib/api'

export default function PracticeLabPage() {
  const { data, isLoading } = useQuery('scenarios', () =>
    api.get('/practice-lab/scenarios').then((r) => r.data)
  )

  const scenarios = data?.scenarios ?? []

  return (
    <StudentLayout title="Practice Lab">

      <div className="mb-4">
        <p className="text-body-secondary">Apply your legal knowledge to real-world case scenarios and get AI-powered feedback.</p>
      </div>

      {isLoading ? (
        <div className="row g-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="col-md-6">
              <div className="card"><div className="card-body placeholder-glow"><span className="placeholder col-8 mb-2 d-block" /><span className="placeholder col-5" /></div></div>
            </div>
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-5 text-body-secondary">
          <i className="ti tabler-flask mb-2" style={{ fontSize: 48 }} />
          <p>No practice scenarios available yet</p>
        </div>
      ) : (
        <div className="row g-6">
          {scenarios.map((s: any) => (
            <div key={s.id} className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex align-items-start gap-3 mb-3">
                    <div className="avatar bg-label-primary rounded flex-shrink-0">
                      <i className="ti tabler-flask avatar-initial" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <h6 className="mb-1">{s.title}</h6>
                      <small className="text-body-secondary">{s.course?.title}</small>
                    </div>
                  </div>
                  <p className="text-body-secondary small mb-4">
                    {s.description ? s.description.slice(0, 120) + (s.description.length > 120 ? '…' : '') : 'Legal scenario practice'}
                  </p>
                  <Link href={`/practice-lab/${s.id}`} className="btn btn-outline-primary btn-sm">
                    <i className="ti tabler-arrow-right me-1" />Attempt Scenario
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </StudentLayout>
  )
}
