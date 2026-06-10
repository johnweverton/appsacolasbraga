'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, CalendarDays, Banknote, BarChart2, Settings } from 'lucide-react'

const LINKS = [
  { href: '/admin',               label: 'Dashboard',   icon: LayoutDashboard, exact: true },
  { href: '/admin/lancamentos',   label: 'Lançamentos', icon: ClipboardList,   exact: false },
  { href: '/admin/quinzena',      label: 'Quinzena',    icon: CalendarDays,    exact: false },
  { href: '/admin/pagamentos',    label: 'Pagamentos',  icon: Banknote,        exact: false },
  { href: '/admin/relatorios',    label: 'Relatórios',  icon: BarChart2,       exact: false },
  { href: '/admin/configuracoes', label: 'Config',      icon: Settings,        exact: false },
]

export function NavAdminBottom() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-black/[0.06] px-1 pt-2 pb-6 z-40">
      <div className="flex justify-around max-w-lg mx-auto">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const ativo = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${
                ativo ? 'text-brand-blue' : 'text-brand-dark/35 hover:text-brand-dark/60'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${ativo ? 'bg-brand-blue/10' : ''}`}>
                <Icon size={17} strokeWidth={ativo ? 2.5 : 1.75} />
              </div>
              <span className={`text-[8px] font-sans font-semibold tracking-wide ${
                ativo ? 'text-brand-blue' : 'text-brand-dark/35'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
