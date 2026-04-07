import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enroll Now',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="authentication-wrapper" style={{ minHeight: '100vh', background: '#f8f7fa' }}>
      {children}
    </div>
  )
}
