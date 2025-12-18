export type ReleaseNoteEntry = {
  title?: string | null
  body: string
}

type UpdateMetadata = {
  checkedAt: string
  version?: string | null
  releaseName?: string | null
  releaseDate?: string | null
  notes?: ReleaseNoteEntry[]
}

export type UpdaterCheckResponse =
  | {
      status: 'unsupported'
      reason: string
    }
  | {
      status: 'unavailable'
      reason: string
    }
  | {
      status: 'checking'
    }
  | ({
      status: 'up-to-date'
    } & UpdateMetadata)
  | ({
      status: 'update-available'
      version: string
      notes: ReleaseNoteEntry[]
    } & UpdateMetadata)
  | ({
      status: 'error'
      message: string
    } & UpdateMetadata)
