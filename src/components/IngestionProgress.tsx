const steps = ['1. Source', '2. Upload / Connect', '3. Pipeline', '4. Profile', '5. Index']
export function IngestionProgress({ active }: { active: number }) {
  return <div className="ingestion-progress">{steps.map((step, index) => <div key={step} className={`ingestion-step ${index <= active ? 'active' : ''}`}><strong>{step}</strong><span>{index < active ? 'Complete' : index === active ? 'Active' : index === active + 1 ? 'Next' : 'Queued'}</span></div>)}</div>
}
