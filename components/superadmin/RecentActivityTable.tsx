import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import EmptyState from './EmptyState'

interface RecentInstitute {
  id: string
  name: string
  planName: string
  status: string
  createdAt: string
}

interface Props {
  items: RecentInstitute[]
}

const STATUS_MAP: Record<string, { action: string; label: string; color: string }> = {
  TRIAL:     { action: 'New signup',  label: 'Pending',   color: 'warning' },
  ACTIVE:    { action: 'Activated',   label: 'Active',    color: 'success' },
  SUSPENDED: { action: 'Suspended',   label: 'Suspended', color: 'danger'  },
}

export default function RecentActivityTable({ items }: Props) {
  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between">
        <div className="card-title mb-0">
          <h5 className="mb-1">Recent Activity</h5>
          <p className="card-subtitle">Institute events &amp; actions</p>
        </div>
        <div className="dropdown">
          <button
            className="btn btn-text-secondary rounded-pill text-body-secondary border-0 p-2 me-n1"
            type="button"
            data-bs-toggle="dropdown"
          >
            <i className="icon-base ti tabler-dots-vertical icon-md text-body-secondary"></i>
          </button>
          <div className="dropdown-menu dropdown-menu-end">
            <Link className="dropdown-item" href="/super-admin/institutes">View All Institutes</Link>
            <Link className="dropdown-item" href="/super-admin/billing">View Billing</Link>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-body">
          <EmptyState
            variant="activity"
            title="No Recent Activity"
            description="Institute signups, activations, and billing events will appear here."
            cta={{ label: 'View Institutes', href: '/super-admin/institutes' }}
          />
        </div>
      ) : null}

      {items.length > 0 && <div className="table-responsive mb-4">
        <table className="table table-hover table-sm">
          <thead className="border-top">
            <tr>
              <th>Institute</th>
              <th>Action</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const meta = STATUS_MAP[item.status] ?? STATUS_MAP.TRIAL
              return (
                <tr key={item.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar avatar-sm">
                        <span className="avatar-initial rounded-circle bg-label-primary">
                          {item.name[0]}
                        </span>
                      </div>
                      <span className="fw-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="text-body">{meta.action}</td>
                  <td>
                    <span className="badge bg-label-primary rounded-pill">{item.planName}</span>
                  </td>
                  <td>
                    <span className={`badge bg-label-${meta.color} rounded-pill`}>{meta.label}</span>
                  </td>
                  <td>
                    <small className="text-body-secondary">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </small>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>}
    </div>
  )
}
