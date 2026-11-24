/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8')

const sources = import.meta.glob('./**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe("the owner's Photo-App theme", () => {
  it('is loaded without any third-party font request (privacy promise)', () => {
    expect(css).not.toMatch(/googleapis|gstatic|@import url/i)
    expect(css).toContain('@import "tailwindcss"')
  })

  it('defines the Photo-App tokens for light and dark', () => {
    for (const token of [
      '--surface',
      '--foreground',
      '--border',
      '--hover',
      '--accent-strong',
    ]) {
      expect(css).toContain(`${token}:`)
    }
    expect(css).toContain('prefers-color-scheme: dark')
    expect(css).toContain('[data-theme="dark"]')
  })

  it('uses the self-hosted font names', () => {
    expect(css).toContain('"Geist Variable"')
    expect(css).toContain('"Bricolage Grotesque Variable"')
  })

  it('has no components still using the old token class names', () => {
    const old =
      /\b(bg-card|bg-page|bg-field|ring-line|border-line|shadow-card|text-ink|bg-button)\b/
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.endsWith('.test.tsx'))
      .filter(([, code]) => old.test(code))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
