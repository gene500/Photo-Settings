import { parse } from 'exifr/dist/lite.esm.mjs'
import { toPhotoRecord } from '../engine/photo'
import { addPhotos } from '../storage/photoStore'
import type { PhotoRecord } from '../types'

/**
 * The only EXIF fields read. Nothing else is looked at, and no pixel data is kept.
 * The lite build of exifr rejects a top-level `pick`, so the fields are picked per block
 * (IFD0 holds the camera, the EXIF block holds the settings) and every other block is off.
 */
const PARSE_OPTIONS = {
  ifd0: { pick: ['Make', 'Model'] },
  exif: {
    pick: [
      'LensModel',
      'FocalLength',
      'FNumber',
      'ExposureTime',
      'ISO',
      'DateTimeOriginal',
    ],
  },
  gps: false,
  ifd1: false,
  interop: false,
  makerNote: false,
  userComment: false,
  xmp: false,
  icc: false,
  iptc: false,
  jfif: false,
  ihdr: false,
}

const MAX_IN_FLIGHT = 4
const CHUNK_SIZE = 500

export interface ImportSummary {
  total: number
  added: number
  duplicates: number
  skipped: number
  storageFailed: boolean
}

/** The shooting settings in one file, or null if it has none or cannot be read. Never throws. */
export async function readPhotoExif(file: File): Promise<PhotoRecord | null> {
  try {
    const raw: unknown = await parse(file, PARSE_OPTIONS)
    return toPhotoRecord(raw)
  } catch {
    return null
  }
}

/**
 * Reads the settings from each file and stores them. Reads at most 4 files at a time, writes
 * in chunks of 500, and counts unusable files as skipped instead of stopping. If storage
 * fails it stops reading and reports `storageFailed`.
 */
export async function importPhotos(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: files.length,
    added: 0,
    duplicates: 0,
    skipped: 0,
    storageFailed: false,
  }
  let next = 0
  let done = 0
  let pending: PhotoRecord[] = []

  async function flush(): Promise<void> {
    const batch = pending
    pending = []
    if (batch.length === 0 || summary.storageFailed) return
    const result = await addPhotos(batch)
    if (result === null) {
      summary.storageFailed = true
      return
    }
    summary.added += result.added
    summary.duplicates += result.duplicates
  }

  async function worker(): Promise<void> {
    while (next < files.length && !summary.storageFailed) {
      const file = files[next]
      next += 1
      const record = await readPhotoExif(file)
      if (record) pending.push(record)
      else summary.skipped += 1
      done += 1
      onProgress?.(done, files.length)
      if (pending.length >= CHUNK_SIZE) await flush()
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_IN_FLIGHT, files.length) }, worker))
  await flush()
  return summary
}
