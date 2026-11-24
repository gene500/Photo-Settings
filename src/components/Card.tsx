import { useId, type ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
}

export function Card({ title, children }: CardProps) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className="rounded-2xl border border-line bg-card p-5 shadow-card"
    >
      {title ? (
        <h2 id={titleId} className="mb-3 text-xl">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  )
}
