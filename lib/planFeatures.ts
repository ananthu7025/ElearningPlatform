// Canonical feature keys used in Plan.features (stored as JSON string array in DB).
// ALWAYS use these keys — never raw strings — so the gate checks work correctly.

export const PLAN_FEATURES = {
  // ── Core ──────────────────────────────────────────────────────────────────
  course_builder:     { label: 'Course Builder',      category: 'Core'      },
  quizzes:            { label: 'Quizzes',             category: 'Core'      },
  assignments:        { label: 'Assignments',         category: 'Core'      },
  certificates:       { label: 'Certificates',        category: 'Core'      },
  student_invite:     { label: 'Student Management',  category: 'Core'      },
  tutor_management:   { label: 'Tutor Management',    category: 'Core'      },

  // ── Teaching ──────────────────────────────────────────────────────────────
  live_classes:       { label: 'Live Classes',        category: 'Teaching'  },
  practice_lab:       { label: 'Practice Lab',        category: 'Teaching'  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  basic_analytics:    { label: 'Basic Analytics',     category: 'Analytics' },
  advanced_analytics: { label: 'Advanced Analytics',  category: 'Analytics' },

  // ── Billing ───────────────────────────────────────────────────────────────
  coupons:            { label: 'Coupons & Discounts', category: 'Billing'   },

  // ── AI ────────────────────────────────────────────────────────────────────
  lexai_tutor:        { label: 'LexAI Tutor',         category: 'AI'        },

  // ── Branding & Support ────────────────────────────────────────────────────
  custom_branding:    { label: 'Custom Branding',     category: 'Branding'  },
  priority_support:   { label: 'Priority Support',    category: 'Support'   },
} as const

export type FeatureKey = keyof typeof PLAN_FEATURES

// Grouped for the UI checkbox grid
export const FEATURE_CATEGORIES: Record<string, FeatureKey[]> = {
  Core:      ['course_builder', 'quizzes', 'assignments', 'certificates', 'student_invite', 'tutor_management'],
  Teaching:  ['live_classes', 'practice_lab'],
  Analytics: ['basic_analytics', 'advanced_analytics'],
  Billing:   ['coupons'],
  AI:        ['lexai_tutor'],
  Branding:  ['custom_branding'],
  Support:   ['priority_support'],
}
