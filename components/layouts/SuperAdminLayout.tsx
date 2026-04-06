'use client'

import { useMenu } from '@/hooks/useMenu'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminNavbar from './SuperAdminNavbar'
import BootstrapClient from '@/components/BootstrapClient'

interface Props {
  children: React.ReactNode
  title?: string
  breadcrumb?: string  // e.g. "Home / Institutes"
}

export default function SuperAdminLayout({ children, title, breadcrumb }: Props) {
  const { closeMenu } = useMenu()

  const crumbs = breadcrumb ? breadcrumb.split(' / ') : []

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <SuperAdminSidebar />

        <div className="layout-page">
          <SuperAdminNavbar />

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
      <BootstrapClient />
    </div>
  )
}
