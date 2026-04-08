'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

const MENU_ITEMS = [
  { href: '/dashboard',        icon: 'tabler-smart-home', label: 'Dashboard'    },
  { href: '/courses',          icon: 'tabler-book',       label: 'My Learning'  },
  { href: '/courses/browse',   icon: 'tabler-search',     label: 'Catalog'      },
  { href: '/ai-tutor',         icon: 'tabler-robot',      label: 'AI Tutor'     },
  { href: '/practice-lab',     icon: 'tabler-flask',      label: 'Practice Lab' },
]

export default function StudentNavbar() {
  const { user, clear } = useAuthStore()
  const router = useRouter()

  const { data: notifData } = useQuery(
    'notifications',
    () => api.get('/notifications').then((r) => r.data),
    { refetchInterval: 60_000 }
  )

  const unread = notifData?.notifications?.filter((n: any) => !n.isRead).length ?? 0

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'ST'

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    clear()
    router.push('/login')
  }

  return (
    <nav className="layout-navbar navbar navbar-expand-xl align-items-center bg-navbar-theme" id="layout-navbar">
      <div className="container-xxl">

        {/* Brand */}
        <div className="navbar-brand app-brand demo d-none d-xl-flex py-0 me-4 ms-0">
          <Link href="/dashboard" className="app-brand-link">
            <span className="app-brand-logo demo">
              <span className="text-primary">
                <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M0.00172773 0V6.85398C0.00172773 6.85398 -0.133178 9.01207 1.98092 10.8388L13.6912 21.9964L19.7809 21.9181L18.8042 9.88248L16.4951 7.17289L9.23799 0H0.00172773Z"
                    fill="currentColor" />
                  <path opacity="0.06" fillRule="evenodd" clipRule="evenodd"
                    d="M7.69824 16.4364L12.5199 3.23696L16.5541 7.25596L7.69824 16.4364Z" fill="#161616" />
                  <path opacity="0.06" fillRule="evenodd" clipRule="evenodd"
                    d="M8.07751 15.9175L13.9419 4.63989L16.5849 7.28475L8.07751 15.9175Z" fill="#161616" />
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M7.77295 16.3566L23.6563 0H32V6.88383C32 6.88383 31.8262 9.17836 30.6591 10.4057L19.7824 22H13.6938L7.77295 16.3566Z"
                    fill="currentColor" />
                </svg>
              </span>
            </span>
            <span className="app-brand-text demo menu-text fw-bold text-heading ms-2">LexEd</span>
          </Link>
        </div>


        {/* Right icons */}
        <div className="navbar-nav-right d-flex align-items-center justify-content-end ms-auto">
          <ul className="navbar-nav flex-row align-items-center gap-1">

            {/* Notifications */}
            <li className="nav-item dropdown-notifications navbar-dropdown dropdown">
              <a className="nav-link btn btn-icon btn-text-secondary rounded-pill position-relative" href="#"
                onClick={(e) => e.preventDefault()} data-bs-toggle="dropdown" data-bs-auto-close="outside">
                <i className="icon-base ti tabler-bell icon-22px" />
                {unread > 0 && (
                  <span className="badge bg-danger rounded-pill badge-notifications border">{unread}</span>
                )}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-0" style={{ width: 300 }}>
                <li className="dropdown-menu-header border-bottom">
                  <div className="dropdown-header d-flex align-items-center py-3">
                    <h6 className="mb-0 me-auto">Notifications</h6>
                    {unread > 0 && <span className="badge bg-label-primary">{unread} New</span>}
                  </div>
                </li>
                <li className="dropdown-notifications-list" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {(notifData?.notifications ?? []).slice(0, 6).map((n: any) => (
                    <div key={n.id} className={`d-flex gap-3 px-3 py-2 border-bottom ${!n.isRead ? 'bg-body-tertiary' : ''}`}>
                      <div className="avatar avatar-sm bg-label-primary rounded-circle flex-shrink-0">
                        <i className="ti tabler-bell avatar-initial" style={{ fontSize: 14 }} />
                      </div>
                      <div>
                        <p className="mb-0 small fw-medium">{n.title}</p>
                        <small className="text-body-secondary">{n.message}</small>
                      </div>
                    </div>
                  ))}
                  {(notifData?.notifications ?? []).length === 0 && (
                    <div className="text-center py-4 text-body-secondary small">No notifications</div>
                  )}
                </li>
              </ul>
            </li>

            {/* Certificates shortcut */}
            <li className="nav-item">
              <Link href="/certificates" className="nav-link btn btn-icon btn-text-secondary rounded-pill">
                <i className="icon-base ti tabler-certificate icon-22px" />
              </Link>
            </li>

            {/* User dropdown */}
            <li className="nav-item navbar-dropdown dropdown-user dropdown">
              <a className="nav-link dropdown-toggle hide-arrow p-0 ms-1" href="#"
                onClick={(e) => e.preventDefault()} data-bs-toggle="dropdown">
                <div className="avatar avatar-online">
                  <span className="avatar-initial rounded-circle bg-label-primary">{initials}</span>
                </div>
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <a className="dropdown-item mt-0" href="#">
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar avatar-online flex-shrink-0">
                        <span className="avatar-initial rounded-circle bg-label-primary">{initials}</span>
                      </div>
                      <div>
                        <h6 className="mb-0">{user?.name ?? 'Student'}</h6>
                        <small className="text-body-secondary">Student</small>
                      </div>
                    </div>
                  </a>
                </li>
                <li><div className="dropdown-divider my-1 mx-n2" /></li>
                <li><Link className="dropdown-item" href="/profile"><i className="icon-base ti tabler-user me-2 icon-sm" />Profile</Link></li>
                <li><Link className="dropdown-item" href="/certificates"><i className="icon-base ti tabler-certificate me-2 icon-sm" />Certificates</Link></li>
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
      </div>
    </nav>
  )
}
