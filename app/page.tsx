import { redirect } from 'next/navigation'

// Root redirects to login — actual routing is handled by middleware.ts
export default function Home() {
  redirect('/login')
}
