'use client'

import AdminSidebar from './AdminSidebar'
import AdminNavbar from './AdminNavbar'
import { useMenu } from '@/hooks/useMenu'
import BootstrapClient from '@/components/BootstrapClient'
import TrialBanner from '@/components/admin/TrialBanner'

interface Props {
  children: React.ReactNode
  title?: string
  breadcrumb?: string
}

export default function AdminLayout({ children, title, breadcrumb }: Props) {
  const { closeMenu } = useMenu()
  const crumbs = breadcrumb ? breadcrumb.split(' / ') : []

  return (
    <>
      <BootstrapClient />
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">

          <AdminSidebar />

          <div className="layout-page">
            <AdminNavbar />
            <TrialBanner />

            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">

                {(title || crumbs.length > 0) && (
                  <h4 className="py-3 mb-4">
                    {crumbs.slice(0, -1).map((c) => (
                      <span key={c} className="text-muted fw-light">{c} / </span>
                    ))}
                    {title || crumbs[crumbs.length - 1]}
                  </h4>
                )}

                {children}
              </div>
              <div className="content-backdrop fade" />
            </div>
          </div>

        </div>
        <div className="layout-overlay layout-menu-toggle" onClick={closeMenu} />
      </div>
    </>
  )
}
