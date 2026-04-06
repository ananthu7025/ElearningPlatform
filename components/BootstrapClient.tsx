'use client'

import { useEffect } from 'react'

/**
 * Initialises Bootstrap 5 JS on the client after Next.js hydration.
 * Replaces static vendor/js/bootstrap.js — imported dynamically so it's
 * tree-shakeable and never runs on the server.
 */
export default function BootstrapClient() {
  useEffect(() => {
    import('bootstrap').then((bs) => {
      if (typeof window !== 'undefined') (window as any).bootstrap = bs

      document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach((el) =>
        bs.Dropdown.getOrCreateInstance(el)
      )
      document.querySelectorAll('[data-bs-toggle="collapse"]').forEach((el) =>
        bs.Collapse.getOrCreateInstance(el, { toggle: false })
      )
      document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) =>
        new bs.Tooltip(el)
      )
    })
  }, [])

  return null
}
