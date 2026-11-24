import { useId, type ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
}

export function Card({ title, children }: CardProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={title ? titleId : undefined} className="card p-5">
      {title ? (
        <h2 id={titleId} className="mb-3 text-xl font-semibold">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  )
}
