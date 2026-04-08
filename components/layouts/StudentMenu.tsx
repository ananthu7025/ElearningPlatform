'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { label: 'Home', href: '/dashboard', icon: 'ti tabler-smart-home' },
  { label: 'My Learning', href: '/courses', icon: 'ti tabler-book' },
  { label: 'Course Catalog', href: '/courses/browse', icon: 'ti tabler-search' },
  { label: 'AI Tutor', href: '/ai-tutor', icon: 'ti tabler-robot' },
  { label: 'Practice Lab', href: '/practice-lab', icon: 'ti tabler-flask' },
];

export default function StudentMenu() {
  const pathname = usePathname();

  return (
    <aside id="layout-menu" className="layout-menu-horizontal menu-horizontal menu flex-grow-0 bg-white border-bottom">
      <div className="container-xxl d-flex h-100">
        <ul className="menu-inner py-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href} className={`menu-item ${isActive ? 'active' : ''}`}>
                <Link href={item.href} className="menu-link">
                  <i className={`menu-icon ${item.icon}`}></i>
                  <div className="text-truncate">{item.label}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
