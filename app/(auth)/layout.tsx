export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/vendor/css/pages/page-auth.css" />
      {children}
    </>
  )
}
