'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface Props {
  totalInstitutes: number
  activeInstitutes: number
  pendingApproval: number
  suspendedInstitutes: number
}

export default function InstituteTrackerCard({
  totalInstitutes,
  activeInstitutes,
  pendingApproval,
  suspendedInstitutes,
}: Props) {
  const inactive = Math.max(0, totalInstitutes - activeInstitutes - pendingApproval)
  const safeDenom = totalInstitutes || 1

  const activePct = Math.round((activeInstitutes / safeDenom) * 100)
  const pendingPct = Math.round((pendingApproval / safeDenom) * 100)
  const inactivePct = Math.round((inactive / safeDenom) * 100)

  const radialOptions = {
    series: [activePct, pendingPct, inactivePct],
    options: {
      chart: { type: 'radialBar' as const },
      plotOptions: {
        radialBar: {
          hollow: { size: '48%' },
          track: { background: 'transparent', strokeWidth: '100%', margin: 5 },
          dataLabels: {
            name: { fontSize: '11px', offsetY: -8 },
            value: { fontSize: '14px', fontWeight: '500', offsetY: 4 },
            total: {
              show: true,
              label: 'Institutes',
              fontSize: '11px',
              color: '#8592a3',
              formatter: () => String(totalInstitutes),
            },
          },
        },
      },
      colors: ['#28C76F', '#FF9F43', '#EA5455'],
      labels: ['Active', 'Pending', 'Inactive'],
      legend: { show: false },
      stroke: { lineCap: 'round' as const },
    },
  }

  const statusItems = [
    { icon: 'tabler-building',        color: 'primary',  label: 'Active',    count: activeInstitutes },
    { icon: 'tabler-building-plus',  color: 'info',     label: 'New (30d)', count: pendingApproval  },
    { icon: 'tabler-clock',          color: 'warning',  label: 'Pending',   count: pendingApproval  },
    { icon: 'tabler-building-off',   color: 'danger',   label: 'Suspended', count: suspendedInstitutes },
  ]

  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between">
        <div className="card-title mb-0">
          <h5 className="mb-1">Institute Tracker</h5>
          <p className="card-subtitle">Last 30 Days</p>
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
            <Link className="dropdown-item" href="/super-admin/institutes">View All</Link>
            <a className="dropdown-item" href="#">Export</a>
          </div>
        </div>
      </div>

      <div className="card-body row">
        <div className="col-12 col-sm-4">
          <div className="mt-lg-4 mb-lg-6 mb-2">
            <h2 className="mb-0">{totalInstitutes}</h2>
            <p className="mb-0">Total Institutes</p>
          </div>
          <ul className="p-0 m-0 list-unstyled">
            {statusItems.map((s) => (
              <li key={s.label} className="d-flex gap-4 align-items-center mb-lg-3 pb-1">
                <div className={`badge rounded bg-label-${s.color} p-1_5`}>
                  <i className={`icon-base ti ${s.icon} icon-md`}></i>
                </div>
                <div>
                  <h6 className="mb-0 text-nowrap">{s.label}</h6>
                  <small className="text-body-secondary">{s.count}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-12 col-md-8">
          <Chart
            type="radialBar"
            height={250}
            series={radialOptions.series}
            options={radialOptions.options}
          />
        </div>
      </div>
    </div>
  )
}
