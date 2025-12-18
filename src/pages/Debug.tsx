import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Code2,
  FileText,
  Search,
  ClipboardCopy,
  Terminal,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const InfoRow = ({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) => (
  <div className="flex items-center justify-between py-2 text-sm border-b last:border-0 border-muted">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn('font-medium', mono && 'font-mono text-xs')}>{value}</span>
  </div>
)

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy to clipboard', err)
    return false
  }
}

// --- Main Page ---

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'internals' | 'raw'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)

  const filteredConstants = useMemo(() => {
    if (!searchTerm) return Object.entries(window.nativeConstants)
    const lower = searchTerm.toLowerCase()
    return Object.entries(window.nativeConstants).filter(([key]) =>
      key.toLowerCase().includes(lower),
    )
  }, [searchTerm])

  const openLogs = async () => {
    try {
      window.logger.open()
    } catch (err) {
      console.error('Failed to open log file:', err)
    }
  }

  const handleCopyDebugInfo = async () => {
    const debugInfo = {
      appVersion: window.version,
      nativeVersion: window.nativeVersion,
      versions: window.versions,
      platform: window.platform,
      arch: window.arch,
      mainPID: window.mainPID,
      mainPPID: window.mainPPID,
      timestamp: new Date().toISOString(),
    }
    const success = await copyToClipboard(JSON.stringify(debugInfo, null, 2))
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const testLog = (level: 'info' | 'warn' | 'error') => {
    window.logger[level]('DebugPage', `Test ${level.toUpperCase()} log entry`, {
      timestamp: Date.now(),
    })
  }

  // --- Tab Content Renderers ---

  const renderOverview = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* App Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" /> Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Cheatron Version" value={`v${window.version}`} />
          <InfoRow label="Native Version" value={`v${window.nativeVersion}`} />
          <InfoRow label="Environment" value={import.meta.env.MODE} />
          <InfoRow
            label="Resolution"
            value={`${window.screen.width}x${window.screen.height}`}
            mono
          />
          <InfoRow label="Locale" value={navigator.language} />
        </CardContent>
      </Card>

      {/* Process Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Process Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-muted/20 rounded-md">
              <div className="text-xl font-bold font-mono">{window.mainPID ?? '-'}</div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">PID</div>
            </div>
            <div className="text-center p-2 bg-muted/20 rounded-md">
              <div className="text-xl font-bold font-mono">{window.mainPPID ?? '-'}</div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                Parent PID
              </div>
            </div>
          </div>
          <div className="space-y-0 pt-2">
            <InfoRow label="Platform" value={window.platform} />
            <InfoRow label="Arch" value={window.arch} />
          </div>
        </CardContent>
      </Card>

      {/* Versions Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Code2 className="h-4 w-4" /> Runtime Versions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Electron" value={window.versions.electron} mono />
          <InfoRow label="Node" value={window.versions.node} mono />
          <InfoRow label="V8" value={window.versions.v8} mono />
          <InfoRow label="Chrome" value={window.versions.chrome} mono />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Developer Tools</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openLogs}>
              <FileText className="mr-2 h-4 w-4" />
              Open Log File
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <Activity className="mr-2 h-4 w-4" />
              Reload Window
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyDebugInfo}>
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <ClipboardCopy className="mr-2 h-4 w-4" />
              )}
              {copied ? 'Copied!' : 'Copy Info'}
            </Button>
          </div>

          <div className="w-px bg-border h-8 self-center mx-2 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Test Logger:</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-100/50"
              onClick={() => testLog('info')}
              title="Log Info"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100/50"
              onClick={() => testLog('warn')}
              title="Log Warning"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100/50"
              onClick={() => testLog('error')}
              title="Log Error"
            >
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderInternals = () => (
    <div className="space-y-6">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" /> Native Constants
              </CardTitle>
              <CardDescription>Shared definitions between Rust/C++ and TypeScript</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search constants..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-[500px]">
          <div className="rounded-md border h-full max-h-[600px] overflow-hidden flex flex-col">
            <div className="grid grid-cols-[1fr_120px] bg-muted/50 p-2 text-sm font-medium border-b sticky top-0 z-10">
              <div className="pl-2">Key</div>
              <div className="text-right pr-2">Value (Hex)</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y">
                {filteredConstants.length > 0 ? (
                  filteredConstants.map(([key, val]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_120px] p-2 text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="font-mono text-foreground truncate pl-2" title={key}>
                        {key}
                      </div>
                      <div className="text-right font-mono text-muted-foreground pr-2">
                        0x{(val as number).toString(16).toUpperCase()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No results found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderRaw = () => (
    <div className="space-y-4 h-full">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" /> Raw Window Object
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleCopyDebugInfo}>
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <ClipboardCopy className="mr-2 h-4 w-4" />
              )}
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
          <CardDescription>
            Full JSON dump of the exposed <code>window</code> object extensions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-[500px] relative">
          <div className="h-[600px] border rounded-md bg-muted/40 p-4 overflow-y-auto">
            <pre className="font-mono text-xs text-foreground/80 whitespace-pre-wrap break-all">
              {JSON.stringify(
                {
                  version: window.version,
                  nativeVersion: window.nativeVersion,
                  versions: window.versions,
                  platform: window.platform,
                  arch: window.arch,
                  mainPID: window.mainPID,
                  mainPPID: window.mainPPID,
                  nativeConstants: window.nativeConstants,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System Diagnostics</h1>
          <p className="text-xs text-muted-foreground">
            Cheatron v{window.version || '...'} / Native v{window.nativeVersion || '...'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/20 p-1">
          <Button
            variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="text-xs"
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'internals' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('internals')}
            className="text-xs"
          >
            Internals
          </Button>
          <Button
            variant={activeTab === 'raw' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('raw')}
            className="text-xs"
          >
            Raw Data
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'internals' && renderInternals()}
          {activeTab === 'raw' && renderRaw()}
        </div>
      </div>
    </div>
  )
}
