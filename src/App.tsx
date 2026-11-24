import { Card } from './components/Card'

export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl">Settings Suggestor</h1>
      <Card title="Coming together">
        <p className="text-muted">Pick a scenario and get camera settings you can use.</p>
      </Card>
    </main>
  )
}
