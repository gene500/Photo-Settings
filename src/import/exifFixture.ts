/**
 * Builds a tiny JPEG that contains only an EXIF block, for tests and for generating sample
 * photos without using anyone's real pictures. Little-endian TIFF, IFD0 plus the EXIF IFD.
 */
export interface ExifFixtureFields {
  make: string
  model: string
  lens: string
  focalMm: number
  aperture: number
  shutterS: number
  iso: number
  /** EXIF format, "YYYY:MM:DD HH:MM:SS". */
  dateTime: string
}

const ASCII = 2
const SHORT = 3
const LONG = 4
const RATIONAL = 5

interface Entry {
  tag: number
  type: number
  value: string | number | [number, number]
}

function rational(x: number): [number, number] {
  return x < 1 ? [1, Math.round(1 / x)] : [Math.round(x * 10), 10]
}

export function makeExifJpeg(f: ExifFixtureFields): Uint8Array {
  const tiff = new Uint8Array(2048)
  const view = new DataView(tiff.buffer)
  const text = new TextEncoder()
  tiff.set([0x49, 0x49, 0x2a, 0x00]) // "II", 42
  view.setUint32(4, 8, true) // IFD0 starts at byte 8

  const ifd0: Entry[] = [
    { tag: 0x010f, type: ASCII, value: f.make },
    { tag: 0x0110, type: ASCII, value: f.model },
    { tag: 0x8769, type: LONG, value: 0 }, // pointer to the EXIF IFD, filled in below
  ]
  const exif: Entry[] = [
    { tag: 0x829a, type: RATIONAL, value: rational(f.shutterS) },
    { tag: 0x829d, type: RATIONAL, value: [Math.round(f.aperture * 10), 10] },
    { tag: 0x8827, type: SHORT, value: f.iso },
    { tag: 0x9003, type: ASCII, value: f.dateTime },
    { tag: 0x920a, type: RATIONAL, value: [f.focalMm, 1] },
    { tag: 0xa434, type: ASCII, value: f.lens },
  ]

  const ifdSize = (n: number) => 2 + n * 12 + 4
  const ifd0At = 8
  const exifAt = ifd0At + ifdSize(ifd0.length)
  let cursor = exifAt + ifdSize(exif.length)
  ifd0[2].value = exifAt

  function writeIfd(at: number, entries: Entry[]): void {
    view.setUint16(at, entries.length, true)
    entries.forEach((e, i) => {
      const pos = at + 2 + i * 12
      view.setUint16(pos, e.tag, true)
      view.setUint16(pos + 2, e.type, true)
      if (e.type === ASCII) {
        const bytes = text.encode(String(e.value))
        const count = bytes.length + 1 // trailing NUL
        view.setUint32(pos + 4, count, true)
        if (count <= 4) {
          tiff.set(bytes, pos + 8)
        } else {
          view.setUint32(pos + 8, cursor, true)
          tiff.set(bytes, cursor)
          cursor += count + (count % 2)
        }
      } else if (e.type === RATIONAL) {
        const [num, den] = e.value as [number, number]
        view.setUint32(pos + 4, 1, true)
        view.setUint32(pos + 8, cursor, true)
        view.setUint32(cursor, num, true)
        view.setUint32(cursor + 4, den, true)
        cursor += 8
      } else if (e.type === SHORT) {
        view.setUint32(pos + 4, 1, true)
        view.setUint16(pos + 8, e.value as number, true)
      } else {
        view.setUint32(pos + 4, 1, true)
        view.setUint32(pos + 8, e.value as number, true)
      }
    })
    // The "next IFD" offset after the entries stays 0: there is none.
  }
  writeIfd(ifd0At, ifd0)
  writeIfd(exifAt, exif)

  const header = text.encode('Exif\0\0')
  const payloadLength = header.length + cursor
  const jpeg = new Uint8Array(2 + 2 + 2 + payloadLength + 2)
  jpeg.set([0xff, 0xd8, 0xff, 0xe1, (payloadLength + 2) >> 8, (payloadLength + 2) & 0xff])
  jpeg.set(header, 6)
  jpeg.set(tiff.subarray(0, cursor), 6 + header.length)
  jpeg.set([0xff, 0xd9], 6 + payloadLength)
  return jpeg
}
