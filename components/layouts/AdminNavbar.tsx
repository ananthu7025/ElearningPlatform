'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMenu } from '@/hooks/useMenu'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

const QUICK_LINKS = [
  { icon: 'tabler-layout-dashboard', label: 'Dashboard', href: '/admin/dashboard'  },
  { icon: 'tabler-book',             label: 'Courses',   href: '/admin/courses'    },
  { icon: 'tabler-users',            label: 'Students',  href: '/admin/students'   },
  { icon: 'tabler-user-check',       label: 'Tutors',    href: '/admin/tutors'     },
  { icon: 'tabler-currency-rupee',   label: 'Payments',  href: '/admin/payments'   },
  { icon: 'tabler-settings',         label: 'Settings',  href: '/admin/settings'   },
]

export default function AdminNavbar() {
  const { toggleMenu } = useMenu()
  const { user, clear } = useAuthStore()
  const router = useRouter()

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    clear()
    router.push('/login')
  }

  return (
    <nav
      className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme"
      id="layout-navbar"
    >
      <div className="layout-menu-toggle navbar-nav align-items-xl-center me-3 me-xl-0 d-xl-none">
        <a className="nav-item nav-link px-0 me-xl-6" href="#" onClick={(e) => { e.preventDefault(); toggleMenu() }}>
          <i className="icon-base ti tabler-menu-2 icon-md" />
        </a>
      </div>

      <div className="navbar-nav-right d-flex align-items-center justify-content-end" id="navbar-collapse">

        {/* Search */}
        <div className="navbar-nav align-items-center">
          <div className="nav-item navbar-search-wrapper px-md-0 px-2 mb-0">
            <a className="nav-item nav-link search-toggler d-flex align-items-center px-0 gap-2" href="#" onClick={(e) => e.preventDefault()}>
              <i className="icon-base ti tabler-search icon-22px text-body-secondary" />
              <span className="d-none d-md-inline-block text-body-secondary small">Search…</span>
            </a>
          </div>
        </div>

        <ul className="navbar-nav flex-row align-items-center ms-md-auto">

          {/* Quick Links */}
          <li className="nav-item dropdown-shortcuts navbar-dropdown dropdown me-1">
            <a className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill" href="#"
              onClick={(e) => e.preventDefault()} data-bs-toggle="dropdown" data-bs-auto-close="outside">
              <i className="icon-base ti tabler-layout-grid-add icon-22px text-heading" />
            </a>
            <div className="dropdown-menu dropdown-menu-end p-0" style={{ width: 290 }}>
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
            <a className="nav-link dropdown-toggle hide-arrow p-0" href="#"
              onClick={(e) => e.preventDefault()} data-bs-toggle="dropdown">
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
                      <h6 className="mb-0">{user?.name ?? 'Admin'}</h6>
                      <small className="text-body-secondary">Institute Admin</small>
                    </div>
                  </div>
                </a>
              </li>
              <li><div className="dropdown-divider my-1 mx-n2" /></li>
              <li>
                <Link className="dropdown-item" href="/admin/settings">
                  <i className="icon-base ti tabler-settings me-2 icon-sm" />Settings
                </Link>
              </li>
              <li><div className="dropdown-divider my-1 mx-n2" /></li>
              <li>
                <div className="d-grid px-2 pt-2 pb-1">
                  <button className="btn btn-sm btn-danger d-flex align-items-center justify-content-center gap-2" onClick={logout}>
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
