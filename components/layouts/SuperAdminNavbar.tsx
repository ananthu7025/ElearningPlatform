'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { useMenu } from '@/hooks/useMenu'
import api from '@/lib/api'

const QUICK_LINKS = [
  { icon: 'tabler-building',       label: 'Institutes', href: '/super-admin/institutes' },
  { icon: 'tabler-diamond',        label: 'Plans',      href: '/super-admin/plans'      },
  { icon: 'tabler-credit-card',    label: 'Billing',    href: '/super-admin/billing'    },
  { icon: 'tabler-layout-dashboard',label: 'Dashboard', href: '/super-admin/dashboard'  },
] as const

export default function SuperAdminNavbar() {
  const router = useRouter()
  const { toggleMenu } = useMenu()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'SA'

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    clear()
    router.push('/login')
  }

  return (
    <nav
      className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme"
      id="layout-navbar"
    >
      {/* Mobile toggle */}
      <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
        <a className="nav-item nav-link px-0 me-xl-6" href="#" onClick={(e) => { e.preventDefault(); toggleMenu() }}>
          <i className="icon-base ti tabler-menu-2 icon-md" />
        </a>
      </div>

      <div className="navbar-nav-right d-flex align-items-center justify-content-end" id="navbar-collapse">
        <ul className="navbar-nav flex-row align-items-center ms-md-auto">

          {/* Quick links */}
          <li className="nav-item dropdown-shortcuts navbar-dropdown dropdown me-1">
            <a
              className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
              href="#"
              onClick={(e) => e.preventDefault()}
              data-bs-toggle="dropdown"
              data-bs-auto-close="outside"
            >
              <i className="icon-base ti tabler-layout-grid-add icon-22px text-heading" />
            </a>
            <div className="dropdown-menu dropdown-menu-end p-0" style={{ width: 260 }}>
              <div className="dropdown-menu-header border-bottom">
                <div className="dropdown-header d-flex align-items-center py-3">
                  <h6 className="mb-0 me-auto">Quick Links</h6>
                </div>
              </div>
              <div className="p-2">
                <div className="row row-bordered overflow-visible g-0">
                  {QUICK_LINKS.map((s) => (
                    <div key={s.label} className="dropdown-shortcuts-item col-6">
                      <span className="dropdown-shortcuts-icon rounded-circle mb-3">
                        <i className={`icon-base ti ${s.icon} icon-26px text-heading`} />
                      </span>
                      <Link href={s.href} className="stretched-link small fw-semibold">{s.label}</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </li>

          {/* User dropdown */}
          <li className="nav-item navbar-dropdown dropdown-user dropdown">
            <a
              className="nav-link dropdown-toggle hide-arrow p-0"
              href="#"
              onClick={(e) => e.preventDefault()}
              data-bs-toggle="dropdown"
            >
              <div className="avatar avatar-online">
                <span className="avatar-initial rounded-circle bg-primary">{initials}</span>
              </div>
            </a>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <a className="dropdown-item mt-0" href="#">
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar avatar-online flex-shrink-0">
                      <span className="avatar-initial rounded-circle bg-primary">{initials}</span>
                    </div>
                    <div>
                      <h6 className="mb-0">{user?.name ?? 'Super Admin'}</h6>
                      <small className="text-body-secondary">Platform Admin</small>
                    </div>
                  </div>
                </a>
              </li>
              <li><div className="dropdown-divider my-1 mx-n2" /></li>
              <li>
                <div className="d-grid px-2 pt-2 pb-1">
                  <button
                    className="btn btn-sm btn-danger d-flex align-items-center justify-content-center gap-2"
                    onClick={handleLogout}
                  >
                    <span>Logout</span>
                    <i className="icon-base ti tabler-logout icon-14px" />
                  </button>
                </div>
              </li>
            </ul>
          </li>

        </ul>
      </div>
    </nav>
  )
}
