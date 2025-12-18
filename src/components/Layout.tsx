import { Link, useLocation, Outlet } from 'react-router-dom'
import { Binary, Settings, Activity, Bug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

const navigation = [
  { name: 'Memory Viewer', href: '/memory', icon: Binary },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Runtime Versions', href: '/versions', icon: Activity },
  { name: 'Debug', href: '/', icon: Bug },
]

export default function AppLayout() {
  const location = useLocation()
  const currentNavigation = navigation.find(item => item.href === location.pathname)

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xl font-bold text-white">
            C
          </div>
          <span className="text-xl font-semibold text-foreground">Cheatron</span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map(item => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-xs text-muted-foreground text-center">
            Version {window.version ?? 'Unknown'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-16 shrink-0 bg-background flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">{currentNavigation?.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content - fills remaining height */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
