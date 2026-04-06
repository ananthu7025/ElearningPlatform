interface Stat {
  icon: string
  label: string
  value: string
  badge: string
  iconBg: string
  iconColor: string
}

interface Props {
  totalInstitutes: number
  totalStudents: number
  totalRevenue: number
  pendingApproval: number
}

function formatRevenue(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

export default function PlatformOverviewCard({
  totalInstitutes,
  totalStudents,
  totalRevenue,
  pendingApproval,
}: Props) {
  const stats: Stat[] = [
    {
      icon: 'tabler-building',
      label: 'Total Institutes',
      value: totalInstitutes.toLocaleString('en-IN'),
      badge: '+12 / mo',
      iconBg: 'rgba(0,207,232,0.25)',
      iconColor: '#00CFE8',
    },
    {
      icon: 'tabler-users',
      label: 'Active Students',
      value: totalStudents.toLocaleString('en-IN'),
      badge: '+843 / wk',
      iconBg: 'rgba(40,199,111,0.25)',
      iconColor: '#28C76F',
    },
    {
      icon: 'tabler-currency-rupee',
      label: 'Platform Revenue',
      value: formatRevenue(totalRevenue),
      badge: '+7.2%',
      iconBg: 'rgba(255,159,67,0.25)',
      iconColor: '#FF9F43',
    },
    {
      icon: 'tabler-clock',
      label: 'Pending Approvals',
      value: String(pendingApproval),
      badge: 'Review now',
      iconBg: 'rgba(234,84,85,0.25)',
      iconColor: '#EA5455',
    },
  ]

  return (
    <div
      className="card h-100"
      style={{
        background: 'linear-gradient(135deg, #7367F0 0%, #9E95F5 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className="card-body text-white">
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h5 className="text-white mb-0">Platform Overview</h5>
            <small style={{ opacity: 0.75 }}>Real-time SaaS Metrics</small>
          </div>
          <span
            className="badge rounded-pill px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            <i className="ti tabler-live-view me-1"></i>Live
          </span>
        </div>

        <div className="row g-4 mt-1">
          {stats.map((s) => (
            <div key={s.label} className="col-6">
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: s.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className={`ti ${s.icon}`} style={{ fontSize: 22, color: s.iconColor }}></i>
                </div>
                <div>
                  <h4 className="text-white mb-0 fw-bold">{s.value}</h4>
                  <small style={{ opacity: 0.72, color: '#fff' }}>{s.label}</small>
                </div>
              </div>
              <div className="mt-2">
                <span
                  className="badge rounded-pill small"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                >
                  {s.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          right: 60,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.09)',
        }}
      />
    </div>
  )
}
