// exifr ships types for its main entry only. The app uses the lite build (JPEG and HEIC,
// about 12 KB gzipped), which has the same API.
declare module 'exifr/dist/lite.esm.mjs' {
  export { parse } from 'exifr'
}
