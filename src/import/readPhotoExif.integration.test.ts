import { readPhotoExif } from './importPhotos'
import { makeExifJpeg } from './exifFixture'

// No mock here: this runs the real exifr against bytes we built, so the field names
// and options are proven against the real parser.
describe('readPhotoExif with the real parser', () => {
  const fields = {
    make: 'Canon',
    model: 'Canon EOS R50',
    lens: 'SIGMA 18-50mm F2.8 DC DN | C',
    focalMm: 35,
    aperture: 2.8,
    shutterS: 1 / 250,
    iso: 400,
    dateTime: '2026:03:14 10:30:00',
  }

  it('reads the settings from a real JPEG EXIF block', async () => {
    const jpeg = new File([makeExifJpeg(fields).buffer as ArrayBuffer], 'a.jpg', {
      type: 'image/jpeg',
    })
    const record = await readPhotoExif(jpeg)
    expect(record).toMatchObject({
      camera: 'Canon EOS R50',
      lens: 'SIGMA 18-50mm F2.8 DC DN | C',
      focalMm: 35,
      aperture: 2.8,
      iso: 400,
    })
    expect(record?.shutterS).toBeCloseTo(1 / 250, 9)
    expect(Number.isFinite(record?.timestamp)).toBe(true)
  })

  it('returns null for a JPEG with no EXIF at all', async () => {
    const bare = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'bare.jpg')
    expect(await readPhotoExif(bare)).toBeNull()
  })

  it('returns null for a file that is not an image', async () => {
    expect(await readPhotoExif(new File(['hello'], 'notes.txt'))).toBeNull()
  })
})
