'use client'

import StudentNavbar from './StudentNavbar'
import BootstrapClient from '@/components/BootstrapClient'

interface Props {
  children: React.ReactNode
  title?: string
}

export default function StudentLayout({ children, title }: Props) {
  return (
    <>
      <BootstrapClient />
      <div className="layout-wrapper layout-navbar-full layout-horizontal layout-without-menu">
        <div className="layout-container">

          <StudentNavbar />

          <div className="layout-page">
            <div className="content-wrapper">
              <div className="container-xxl flex-grow-1 container-p-y">
                {title && <h4 className="py-3 mb-4">{title}</h4>}
                {children}
              </div>
              <div className="content-backdrop fade" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
