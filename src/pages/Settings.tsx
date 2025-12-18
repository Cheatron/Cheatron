import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const colorThemes = [
  { name: 'Blue', value: 'blue' as const, color: 'bg-blue-500' },
  { name: 'Violet', value: 'violet' as const, color: 'bg-violet-500' },
  { name: 'Green', value: 'green' as const, color: 'bg-green-500' },
  { name: 'Rose', value: 'rose' as const, color: 'bg-rose-500' },
  { name: 'Orange', value: 'orange' as const, color: 'bg-orange-500' },
  { name: 'Slate', value: 'slate' as const, color: 'bg-slate-500' },
  {
    name: 'System',
    value: 'system' as const,
    color: 'system-accent-swatch',
  },
]

export default function SettingsPage() {
  const { mode, setMode, color, setColor } = useTheme()
  const currentAccent = colorThemes.find(theme => theme.value === color)

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your application preferences and configuration.
        </p>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of your application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Theme Mode</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMode('light')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer',
                  mode === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent',
                )}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span className="text-sm font-medium">Light</span>
              </button>

              <button
                onClick={() => setMode('dark')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer',
                  mode === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent',
                )}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
                <span className="text-sm font-medium">Dark</span>
              </button>

              <button
                onClick={() => setMode('system')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer',
                  mode === 'system'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent',
                )}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-medium">System</span>
              </button>
            </div>
          </div>

          {/* Color Theme */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Accent Color</label>
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 shadow-sm">
              <div
                className={cn(
                  'h-10 w-10 rounded-full border border-border/60 shadow-inner',
                  currentAccent?.color,
                )}
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Current Accent
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {currentAccent?.name ?? color}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {colorThemes.map(theme => (
                <button
                  key={theme.value}
                  onClick={() => setColor(theme.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer',
                    color === theme.value
                      ? 'border-primary bg-primary/5 shadow-sm scale-105'
                      : 'border-border hover:border-primary/50 hover:bg-accent hover:scale-105',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full shadow-md transition-transform',
                      theme.color,
                    )}
                  />
                  <span className="text-xs font-medium">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Preview</CardTitle>
          <CardDescription>Test your theme settings with live examples</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Theme Info */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Current Theme</p>
              <p className="font-mono text-lg font-bold text-primary capitalize">
                {mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '💻'} {mode} + {color}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary shadow-lg transition-all" />
              <div className="w-12 h-12 rounded-full bg-primary/50 transition-all" />
              <div className="w-12 h-12 rounded-full bg-primary/20" />
            </div>
          </div>

          {/* Preview Elements */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Primary Button */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Primary Button</p>
              <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">
                Primary Action
              </button>
            </div>

            {/* Secondary Button */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Secondary Button</p>
              <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors shadow-sm">
                Secondary Action
              </button>
            </div>

            {/* Badge with Primary */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Badges</p>
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant="default"
                  className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                >
                  Primary
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-secondary/20 text-primary border border-primary/30 hover:bg-secondary/30"
                >
                  Secondary
                </Badge>
              </div>
            </div>

            {/* Ring Focus */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Focus Ring</p>
              <input
                type="text"
                placeholder="Focus me"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all"
              />
            </div>
          </div>

          {/* Color Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-primary text-primary-foreground text-center shadow-sm">
              <p className="text-xs font-medium">Primary</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary text-secondary-foreground text-center shadow-sm">
              <p className="text-xs font-medium">Secondary</p>
            </div>
            <div className="p-3 rounded-lg bg-accent text-accent-foreground text-center shadow-sm">
              <p className="text-xs font-medium">Accent</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-muted-foreground text-center shadow-sm">
              <p className="text-xs font-medium">Muted</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-ring text-center shadow-sm">
              <p className="text-xs font-medium text-primary">Ring</p>
            </div>
          </div>

          {/* Active States */}
          <div className="p-4 rounded-lg border border-border space-y-3">
            <p className="text-sm font-medium text-foreground">Interactive States</p>
            <div className="flex gap-2 flex-wrap">
              <button className="px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-sm font-medium">
                Hover Me
              </button>
              <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm">
                Active
              </button>
              <button className="px-3 py-1.5 border-2 border-primary text-primary rounded hover:bg-primary hover:text-primary-foreground transition-all text-sm font-medium">
                Outline
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your profile information and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <Input type="email" placeholder="john@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <Input placeholder="Tell us about yourself..." />
          </div>
          <div className="flex gap-3 pt-4">
            <Button>Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Configure how the application behaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Auto-start on login</p>
              <p className="text-sm text-muted-foreground">
                Launch Cheatron when you log in to your computer
              </p>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Enable notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive desktop notifications for important events
              </p>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Hardware acceleration</p>
              <p className="text-sm text-muted-foreground">
                Use GPU acceleration for better performance
              </p>
            </div>
            <Badge className="bg-green-500/10 text-green-600 border-0">Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About Cheatron</CardTitle>
          <CardDescription>Application information and version details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Version</span>
            <Badge variant="secondary">{window.version}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Electron</span>
            <Badge variant="secondary">{window.versions.electron}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">React</span>
            <Badge variant="secondary">19.2.0</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Node.js</span>
            <Badge variant="secondary">{window.versions.node}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Native</span>
            <Badge variant="secondary">{window.versions.native}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
