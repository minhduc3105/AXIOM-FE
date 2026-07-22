import { ChooseSource } from './components/ChooseSource'
import { ConnectorCatalog } from './components/ConnectorCatalog'
import { MySqlForm } from './components/MySqlForm'
import { UploadWorkspace } from './components/UploadWorkspace'
import type { IngestionStage } from './model/types'
import { useIngestionWorkflow } from './model/useIngestionWorkflow'
import { AppHeader } from '../../components/AppHeader'
import { IngestionProgress } from '../../components/IngestionProgress'

type IngestionPageProps = {
  stage: IngestionStage
  onBack: () => void
  onStageChange: (stage: IngestionStage) => void
}

export function IngestionPage({ stage, onBack, onStageChange }: IngestionPageProps) {
  const workflow = useIngestionWorkflow({ onStageChange })

  const activeProgress = stage === 'choose' ? 0 : stage === 'upload' ? workflow.status === 'complete' ? 5 : 2 : 1
  const title = stage === 'choose'
    ? 'Choose how to bring data into AXIOM'
    : stage === 'catalog'
      ? 'Choose a data source to connect'
      : stage === 'mysql'
        ? 'Connect your MySQL data source'
        : 'Upload files to your connected source'

  return <div className="ingestion-app"><AppHeader onBack={onBack} /><div className="ingestion-body"><div className="page-intro"><div><span className="eyebrow blue">DATA INGESTION</span><h1>{title}</h1></div><div className="repo-state"><small>Repo · axiom-ingest/workspace-q3</small><strong>{workflow.saved ? 'Connection saved' : stage === 'mysql' && workflow.tested ? 'Connection verified' : stage === 'choose' ? 'New ingestion source' : stage === 'upload' ? 'MySQL connection saved' : 'No source connected'}</strong><span className="status-pill">{workflow.saved ? 'Ready' : 'Draft'}</span></div></div><IngestionProgress active={activeProgress} />
    {stage === 'choose' && <ChooseSource onUpload={workflow.handleFiles} onConnect={() => onStageChange('catalog')} />}
    {stage === 'catalog' && <ConnectorCatalog selected={workflow.selected} onSelect={(name) => { workflow.setSelected(name); if (name === 'MySQL') onStageChange('mysql') }} />}
    {stage === 'mysql' && <MySqlForm host={workflow.host} setHost={workflow.setHost} tested={workflow.tested} testing={workflow.testing} saving={workflow.saving} onTest={workflow.testConnection} saved={workflow.saved} onSave={workflow.save} onBack={() => onStageChange('catalog')} />}
    {stage === 'upload' && <UploadWorkspace files={workflow.files} status={workflow.status} onFiles={workflow.handleFiles} onStart={workflow.startIngestion} onBack={() => onStageChange(workflow.saved ? 'mysql' : 'choose')} />}
    {workflow.error && <p className="error-note" role="alert">{workflow.error}</p>}
  </div></div>
}
