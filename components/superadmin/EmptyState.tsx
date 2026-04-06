import Link from 'next/link'

interface Props {
  variant: 'revenue' | 'institutes' | 'reports' | 'health' | 'plans' | 'activity'
  title: string
  description: string
  cta?: { label: string; href: string }
}

const SVGS: Record<Props['variant'], React.ReactNode> = {

  // Monthly Revenue — calendar with flat bars
  revenue: (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="44" fill="#7367F0" fillOpacity="0.08" />
      {/* Calendar body */}
      <rect x="28" y="30" width="64" height="48" rx="6" stroke="#7367F0" strokeWidth="1.5" strokeDasharray="4 2" fill="#7367F0" fillOpacity="0.06"/>
      {/* Calendar top bar */}
      <rect x="28" y="30" width="64" height="14" rx="6" fill="#7367F0" fillOpacity="0.18"/>
      <rect x="28" y="37" width="64" height="7" fill="#7367F0" fillOpacity="0.18"/>
      {/* Calendar header pins */}
      <rect x="43" y="25" width="4" height="10" rx="2" fill="#7367F0" fillOpacity="0.6"/>
      <rect x="73" y="25" width="4" height="10" rx="2" fill="#7367F0" fillOpacity="0.6"/>
      {/* Flat bars (no revenue) */}
      <rect x="36" y="68" width="8" height="2" rx="1" fill="#7367F0" fillOpacity="0.35"/>
      <rect x="50" y="68" width="8" height="2" rx="1" fill="#7367F0" fillOpacity="0.35"/>
      <rect x="64" y="68" width="8" height="2" rx="1" fill="#7367F0" fillOpacity="0.35"/>
      <rect x="78" y="68" width="8" height="2" rx="1" fill="#7367F0" fillOpacity="0.35"/>
      {/* Baseline */}
      <line x1="32" y1="71" x2="92" y2="71" stroke="#7367F0" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round"/>
      {/* Rupee coin top-right */}
      <circle cx="94" cy="22" r="10" fill="#7367F0" fillOpacity="0.12" stroke="#7367F0" strokeWidth="1.5"/>
      <text x="94" y="27" textAnchor="middle" fontSize="10" fontWeight="600" fill="#7367F0" fontFamily="sans-serif">₹</text>
    </svg>
  ),

  // Institute Status — dashed building outlines, empty progress
  institutes: (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="44" fill="#7367F0" fillOpacity="0.08" />
      {/* Main building */}
      <rect x="36" y="38" width="48" height="36" rx="3" stroke="#7367F0" strokeWidth="1.5" strokeDasharray="4 2" fill="#7367F0" fillOpacity="0.06"/>
      {/* Roof triangle */}
      <path d="M33 40 L60 20 L87 40" stroke="#7367F0" strokeWidth="1.5" strokeDasharray="4 2" strokeLinejoin="round"/>
      {/* Windows */}
      <rect x="44" y="46" width="8" height="8" rx="1" stroke="#7367F0" strokeWidth="1" strokeDasharray="3 1.5" fill="none"/>
      <rect x="58" y="46" width="8" height="8" rx="1" stroke="#7367F0" strokeWidth="1" strokeDasharray="3 1.5" fill="none"/>
      <rect x="72" y="46" width="8" height="8" rx="1" stroke="#7367F0" strokeWidth="1" strokeDasharray="3 1.5" fill="none"/>
      {/* Door */}
      <rect x="54" y="60" width="12" height="14" rx="2" stroke="#7367F0" strokeWidth="1" strokeDasharray="3 1.5" fill="none"/>
      {/* Empty progress bar */}
      <rect x="36" y="80" width="48" height="5" rx="2.5" fill="#7367F0" fillOpacity="0.12"/>
    </svg>
  ),

  // Revenue Reports — receipt with empty line-items
  reports: (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="44" fill="#7367F0" fillOpacity="0.08" />
      {/* Receipt body */}
      <rect x="34" y="22" width="52" height="62" rx="4" stroke="#7367F0" strokeWidth="1.5" strokeDasharray="4 2" fill="#7367F0" fillOpacity="0.06"/>
      {/* Receipt zigzag bottom */}
      <path d="M34 78 L40 84 L46 78 L52 84 L58 78 L64 84 L70 78 L76 84 L82 78 L86 78" stroke="#7367F0" strokeWidth="1.5" strokeLinejoin="round" fill="none" strokeOpacity="0.5"/>
      {/* Empty line items */}
      <line x1="42" y1="36" x2="78" y2="36" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.4"/>
      <line x1="42" y1="46" x2="70" y2="46" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.4"/>
      <line x1="42" y1="56" x2="74" y2="56" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.4"/>
      <line x1="42" y1="66" x2="66" y2="66" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.4"/>
      {/* Coin */}
      <circle cx="93" cy="24" r="10" fill="#7367F0" fillOpacity="0.12" stroke="#7367F0" strokeWidth="1.5"/>
      <text x="93" y="29" textAnchor="middle" fontSize="10" fontWeight="600" fill="#7367F0" fontFamily="sans-serif">₹</text>
    </svg>
  ),

  // Platform Health — flat EKG line turning into potential
  health: (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="44" fill="#7367F0" fillOpacity="0.08" />
      {/* Server/shield */}
      <rect x="38" y="34" width="44" height="30" rx="5" stroke="#7367F0" strokeWidth="1.5" strokeDasharray="4 2" fill="#7367F0" fillOpacity="0.06"/>
      <rect x="43" y="40" width="34" height="5" rx="2" fill="#7367F0" fillOpacity="0.2"/>
      <rect x="43" y="50" width="24" height="5" rx="2" fill="#7367F0" fillOpacity="0.12"/>
      {/* Flat-then-spike EKG line */}
      <path d="M22 72 L42 72 L48 60 L54 80 L58 72 L98 72"
        stroke="#7367F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Dot at end suggesting potential */}
      <circle cx="98" cy="72" r="3" fill="#7367F0" fillOpacity="0.6"/>
      <circle cx="98" cy="72" r="6" fill="#7367F0" fillOpacity="0.15"/>
    </svg>
  ),

  // Plan Distribution — stacked plan cards, dashed
  plans: (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="44" fill="#7367F0" fillOpacity="0.08" />
      {/* Back card */}
      <rect x="30" y="38" width="60" height="36" rx="5" stroke="#7367F0" strokeWidth="1" strokeDasharray="4 2" fill="#7367F0" fillOpacity="0.04" transform="rotate(-5 60 56)"/>
      {/* Mid card */}
      <rect x="30" y="38" width="60" height="36" rx="5" stroke="#7367F0" strokeWidth="1" strokeDasharray="4 2" fill="#7367F0" fillOpacity="0.07" transform="rotate(2 60 56)"/>
      {/* Front card */}
      <rect x="30" y="38" width="60" height="36" rx="5" stroke="#7367F0" strokeWidth="1.5" strokeDasharray="4 2" fill="#7367F0" fillOpacity="0.1"/>
      {/* Diamond icon on front card */}
      <path d="M60 47 L66 54 L60 61 L54 54 Z" stroke="#7367F0" strokeWidth="1.5" strokeLinejoin="round" fill="#7367F0" fillOpacity="0.25"/>
      {/* Empty label lines */}
      <line x1="40" y1="64" x2="56" y2="64" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35"/>
      <line x1="64" y1="64" x2="76" y2="64" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35"/>
    </svg>
  ),

  // Recent Activity — empty timeline with dots
  activity: (
    <svg width="120" height="96" viewBox="0 0 120 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="50" r="44" fill="#7367F0" fillOpacity="0.08" />
      {/* Timeline vertical line */}
      <line x1="42" y1="24" x2="42" y2="76" stroke="#7367F0" strokeWidth="1.5" strokeDasharray="4 2" strokeOpacity="0.4" strokeLinecap="round"/>
      {/* Dot 1 */}
      <circle cx="42" cy="32" r="5" stroke="#7367F0" strokeWidth="1.5" fill="#7367F0" fillOpacity="0.15"/>
      <line x1="52" y1="32" x2="82" y2="32" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.3"/>
      {/* Dot 2 */}
      <circle cx="42" cy="50" r="5" stroke="#7367F0" strokeWidth="1.5" fill="#7367F0" fillOpacity="0.15"/>
      <line x1="52" y1="50" x2="76" y2="50" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.3"/>
      {/* Dot 3 */}
      <circle cx="42" cy="68" r="5" stroke="#7367F0" strokeWidth="1.5" fill="#7367F0" fillOpacity="0.15"/>
      <line x1="52" y1="68" x2="80" y2="68" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" strokeOpacity="0.3"/>
      {/* Clock icon */}
      <circle cx="91" cy="26" r="11" fill="#7367F0" fillOpacity="0.12" stroke="#7367F0" strokeWidth="1.5"/>
      <line x1="91" y1="21" x2="91" y2="26" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="91" y1="26" x2="95" y2="29" stroke="#7367F0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}

export default function EmptyState({ variant, title, description, cta }: Props) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-4 text-center">
      <div className="mb-4">{SVGS[variant]}</div>
      <h6 className="mb-1">{title}</h6>
      <p className="text-body-secondary small mb-0" style={{ maxWidth: 220 }}>{description}</p>
      {cta && (
        <Link href={cta.href} className="btn btn-sm btn-primary rounded-pill px-4 mt-4">
          {cta.label}
        </Link>
      )}
    </div>
  )
}
