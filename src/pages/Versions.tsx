import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import React, { CSSProperties, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  Rocket,
  Dna,
  Zap,
  Server,
  Atom,
  Globe,
  Cpu,
  ShieldCheck,
  Package,
  Waves,
  Layers,
  Globe2,
  Languages,
  Type,
  Antenna,
  Cookie,
  CircleDot,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Download,
  Power,
} from 'lucide-react'
import type { ReleaseNoteEntry } from 'types/updater'

const FEATURED: ReadonlyArray<{ key: string; label: string; icon: LucideIcon }> = [
  { key: 'app', label: 'Cheatron', icon: Rocket },
  { key: 'native', label: 'Native', icon: Dna },
  { key: 'electron', label: 'Electron', icon: Zap },
  { key: 'node', label: 'NodeJS', icon: Server },
  { key: 'react', label: 'React', icon: Atom },
  { key: 'chrome', label: 'Chromium', icon: Globe },
]

const VERSION_ICONS: Record<string, LucideIcon> = {
  app: Rocket,
  native: Dna,
  electron: Zap,
  node: Server,
  react: Atom,
  chrome: Globe,
  v8: Cpu,
  openssl: ShieldCheck,
  zlib: Package,
  uv: Waves,
  modules: Layers,
  cldr: Globe2,
  icu: Languages,
  unicode: Type,
  nghttp2: Antenna,
  brotli: Cookie,
  winston: BookOpen,
}

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'ready'
  | 'error'

interface UpdateState {
  status: UpdateStatus
  version?: string
  releaseName?: string
  releaseNotes?: ReleaseNoteEntry[] | string
  releaseDate?: string
  checkedAt?: string
  progress?: number
  bytesPerSecond?: number
  error?: string
}

export default function VersionsPage() {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' })

  const updaterBridge = window.updater
  const isDev = import.meta.env.DEV
  const hasUpdaterBridge = Boolean(updaterBridge?.checkForUpdates) && !isDev

  // -- Version Info (Synchronous) --
  const { featuredVersions, otherVersions } = React.useMemo(() => {
    const data = window.versions
    const reactVersion = React.version ?? 'Unknown'

    const featured = FEATURED.map(({ key, label, icon }) => {
      let value = 'Unknown'
      if (key === 'react') {
        value = reactVersion
      } else if (data && key in data) {
        value = String(data[key])
      }

      return { key, label, value, icon: icon ?? VERSION_ICONS[key] ?? CircleDot }
    })

    const excludedKeys = new Set<string>(FEATURED.map(entry => entry.key))
    const remaining = data
      ? Object.entries(data)
          .filter(([key]) => !excludedKeys.has(key))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => ({
            key,
            label: key,
            value: String(value),
            icon: VERSION_ICONS[key] ?? CircleDot,
          }))
      : []

    return { featuredVersions: featured, otherVersions: remaining }
  }, [])

  // -- Update Events --
  useEffect(() => {
    if (!hasUpdaterBridge || !updaterBridge) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onAvailable = (_: any, info: any) => {
      console.log('Update available:', info)
      setUpdateState({
        status: 'available',
        version: info.version,
        releaseName: info.releaseName,
        releaseNotes: info.releaseNotes, // Ensure backend sends this mapping correctly
        releaseDate: info.releaseDate,
        checkedAt: new Date().toISOString(),
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onNotAvailable = (_: any, info: any) => {
      console.log('Update not available:', info)
      setUpdateState({
        status: 'not-available',
        checkedAt: new Date().toISOString(),
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onProgress = (_: any, progressObj: any) => {
      // progressObj: percent, total, transferred, bytesPerSecond
      setUpdateState(prev => ({
        ...prev,
        status: 'downloading',
        progress: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
      }))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onDownloaded = (_: any, info: any) => {
      console.log('Update downloaded:', info)
      setUpdateState(prev => ({
        ...prev,
        status: 'ready',
        version: info.version, // Ensure we keep version info
      }))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onError = (_: any, err: string) => {
      console.error('Update error:', err)
      setUpdateState({
        status: 'error',
        error: err,
        checkedAt: new Date().toISOString(),
      })
    }

    updaterBridge.on('updater:available', onAvailable)
    updaterBridge.on('updater:not-available', onNotAvailable)
    updaterBridge.on('updater:progress', onProgress)
    updaterBridge.on('updater:downloaded', onDownloaded)
    updaterBridge.on('updater:error', onError)

    // Cleanup
    return () => {
      updaterBridge.off('updater:available', onAvailable)
      updaterBridge.off('updater:not-available', onNotAvailable)
      updaterBridge.off('updater:progress', onProgress)
      updaterBridge.off('updater:downloaded', onDownloaded)
      updaterBridge.off('updater:error', onError)
    }
  }, [hasUpdaterBridge, updaterBridge])

  const handleCheck = async () => {
    if (!hasUpdaterBridge) return
    setUpdateState({ status: 'checking' })
    try {
      await updaterBridge?.checkForUpdates()
      // Results come via events
    } catch (e) {
      setUpdateState({ status: 'error', error: String(e) })
    }
  }

  const handleDownload = async () => {
    if (!hasUpdaterBridge) return
    setUpdateState(prev => ({ ...prev, status: 'downloading', progress: 0 }))
    try {
      await updaterBridge?.downloadUpdate()
    } catch (e) {
      setUpdateState({ status: 'error', error: String(e) })
    }
  }

  const handleInstall = async () => {
    if (!hasUpdaterBridge) return
    try {
      await updaterBridge?.quitAndInstall()
    } catch (e) {
      setUpdateState({ status: 'error', error: String(e) })
    }
  }

  // Helper to render date
  const formatDateTime = (iso?: string | null) => {
    if (!iso) return null
    const parsed = new Date(iso)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleString()
  }

  const renderReleaseNotes = (notes: ReleaseNoteEntry[] | string | undefined) => {
    if (!notes) return <p className="text-sm text-muted-foreground">No release notes available.</p>

    if (typeof notes === 'string') {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {notes}
        </div>
      )
    }

    if (Array.isArray(notes) && notes.length === 0) {
      return <p className="text-sm text-muted-foreground">No details provided.</p>
    }

    return (
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        {notes.map((note, index) => (
          <div key={index} className="rounded-lg border border-border bg-muted/30 p-4">
            {note.title && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {note.title}
              </p>
            )}
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: note.body || '' }}
            />
          </div>
        ))}
      </div>
    )
  }

  // --- Render Status Content ---
  const renderStatus = () => {
    const {
      status,
      version,
      releaseName,
      releaseNotes,
      checkedAt,
      progress,
      error: errBox,
    } = updateState

    if (status === 'idle') {
      return (
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">Check for the latest updates manually.</p>
          <Button onClick={handleCheck} disabled={!hasUpdaterBridge}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Check for Updates
          </Button>
        </div>
      )
    }

    if (status === 'checking') {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
          <p>Checking for updates...</p>
        </div>
      )
    }

    if (status === 'not-available') {
      return (
        <div className="text-center py-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <CheckCircle2 className="h-6 w-6" />
            <span className="text-lg font-medium">You are up to date!</span>
          </div>
          <p className="text-sm text-muted-foreground">Checked at {formatDateTime(checkedAt)}</p>
          <Button variant="outline" onClick={handleCheck}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Check Again
          </Button>
        </div>
      )
    }

    if (status === 'available') {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  New Version Available: v{version}
                </h3>
                {releaseName && <p className="text-sm text-foreground/80 mt-1">{releaseName}</p>}
              </div>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" /> Download Update
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Release Notes
            </h4>
            {renderReleaseNotes(releaseNotes)}
          </div>
        </div>
      )
    }

    if (status === 'downloading') {
      const percent = progress ? Math.round(progress) : 0
      return (
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Downloading update...</span>
              <span className="font-mono">{percent}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right font-mono">
              {updateState.bytesPerSecond
                ? `${(updateState.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
                : ''}
            </p>
          </div>
          <div className="flex justify-center">
            <Button disabled variant="secondary">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading...
            </Button>
          </div>
        </div>
      )
    }

    if (status === 'ready') {
      return (
        <div className="text-center py-6 space-y-4">
          <div className="flex flex-col items-center gap-3 text-primary">
            <Package className="h-10 w-10" />
            <h3 className="text-xl font-bold">Update Ready to Install</h3>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Version <span className="font-mono font-semibold text-foreground">v{version}</span> has
            been downloaded and verified. Restart the application to apply the update.
          </p>
          <Button onClick={handleInstall} size="lg" className="mt-2">
            <Power className="mr-2 h-5 w-5" /> Restart & Install
          </Button>
        </div>
      )
    }

    if (status === 'error') {
      return (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertCircle className="h-5 w-5" />
            Update Failed
          </div>
          <p className="text-sm text-destructive/80 font-mono whitespace-pre-wrap">{errBox}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheck}
            className="border-destructive/30 hover:bg-destructive/10"
          >
            Try Again
          </Button>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Update Center Card */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RefreshCcw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Update Center</CardTitle>
              <CardDescription>Manage application updates and view changelogs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {(isDev || !hasUpdaterBridge) && (
            <div className="mb-4 rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 text-yellow-600 dark:text-yellow-400 text-sm flex gap-2 items-center">
              <AlertCircle className="h-4 w-4" />
              Updates are disabled in development mode. Package the app to test.
            </div>
          )}

          {renderStatus()}
        </CardContent>
      </Card>

      {/* Existing Versions Grid */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredVersions.map(({ key, label, value, icon }) => {
              const accentVars = {
                '--accent-color': 'hsl(var(--primary))',
                '--accent-color-strong': 'hsl(var(--primary) / 0.95)',
                '--accent-color-soft': 'hsl(var(--primary) / 0.6)',
                '--accent-color-muted': 'hsl(var(--primary) / 0.35)',
                '--accent-color-glow': 'hsl(var(--primary) / 0.3)',
              } as CSSProperties

              const Icon = icon ?? CircleDot

              return (
                <div
                  key={key}
                  style={accentVars}
                  className="group relative overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.015]"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-(--accent-color-soft) opacity-85 transition-[border-color,opacity] duration-200 group-hover:border-(--accent-color-strong) group-hover:opacity-100" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl border border-(--accent-color-muted) transition-[border-color] duration-200 group-hover:border-(--accent-color)" />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-(--accent-color-muted) via-transparent to-transparent opacity-85 transition-[opacity,background] duration-200 group-hover:from-(--accent-color-soft) group-hover:opacity-100" />
                  <div className="pointer-events-none absolute -inset-1 rounded-[26px] blur-2xl [background:var(--accent-color-glow)] opacity-35 transition-opacity duration-200 group-hover:opacity-65" />
                  <div
                    className={cn(
                      'relative flex flex-col gap-3 rounded-2xl border bg-card/95 dark:bg-card p-6 backdrop-blur-sm filter transition-all duration-200',
                      'border-(--accent-color-muted) group-hover:border-(--accent-color)',
                      'shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(15,23,42,0.35)] group-hover:[box-shadow:0_24px_82px_var(--accent-color-glow)] group-hover:filter-[brightness(1.08)]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span className="h-2 w-16 rounded-full [background:var(--accent-color)] shadow-[0_0_26px_var(--accent-color-glow)]" />
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        {label}
                      </span>
                    </div>
                    <span
                      className="text-3xl font-semibold text-foreground font-mono leading-tight truncate w-full"
                      title={value}
                    >
                      {value}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Dependencies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {otherVersions.map(({ key, label, value, icon }) => {
              const Icon = icon ?? CircleDot
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded border border-border bg-muted/40 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {label}
                  </span>
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs max-w-[150px] truncate"
                    title={value}
                  >
                    {value}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
