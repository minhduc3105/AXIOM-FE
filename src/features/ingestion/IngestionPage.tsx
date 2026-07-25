import { ChooseSource } from './components/ChooseSource'
import { ConnectorCatalog } from './components/ConnectorCatalog'
import { IngestionWorkspaceFrame } from './components/IngestionWorkspaceFrame'
import { IndexWorkspace } from './components/IndexWorkspace'
import { MeaningWorkspace } from './components/MeaningWorkspace'
import { MySqlForm } from './components/MySqlForm'
import { PipelineWorkspace } from './components/PipelineWorkspace'
import { ProfileWorkspace } from './components/ProfileWorkspace'
import { UploadWorkspace } from './components/UploadWorkspace'
import { progressStageByView } from './model/types'
import { useIngestionWorkflow } from './model/useIngestionWorkflow'

type IngestionPageProps = {
  onBack: () => void
  backLabel?: string
}

const pageTitles = {
  source: 'Choose how to bring data into AXIOM',
  catalog: 'Choose a data source to connect',
  mysql: 'Connect your MySQL data source',
  upload: 'Upload files and preview selected data',
  pipeline: 'Run repository ingestion pipeline',
  profile: 'Review aggregate profile across every source',
  meaning: 'Extract meaning and confirm semantic hints',
  index: 'Index ready with searchable evidence',
} as const

export function IngestionPage({ onBack, backLabel }: IngestionPageProps) {
  const workflow = useIngestionWorkflow()
  const source = workflow.source
  const repoMessage = workflow.stage === 'source'
    ? 'New ingestion source'
    : workflow.stage === 'catalog'
      ? 'No source connected'
      : workflow.stage === 'mysql'
        ? workflow.connectionStatus === 'verified' ? 'Connection verified' : 'Connection not tested'
        : workflow.stage === 'upload'
          ? `${workflow.files.length} file${workflow.files.length === 1 ? '' : 's'} staged`
          : workflow.stage === 'pipeline'
            ? workflow.pipelineStatus === 'loading' ? 'Pipeline running' : workflow.pipelineStatus === 'success' ? 'Profile generated' : 'Pipeline ready'
            : workflow.stage === 'profile'
              ? 'Profile generated'
              : workflow.stage === 'meaning'
                ? workflow.meaningStatus === 'extracting' ? 'Extracting meaning' : 'Meaning ready'
                : workflow.indexStatus === 'ready' ? 'Index ready' : 'Building index'

  return <IngestionWorkspaceFrame
    title={pageTitles[workflow.stage]}
    repoMessage={repoMessage}
    ready={workflow.indexStatus === 'ready'}
    active={progressStageByView[workflow.stage]}
    furthest={workflow.furthestProgress}
    error={workflow.error}
    onBack={onBack}
    backLabel={backLabel}
    onNavigate={workflow.navigateProgress}
  >
      {workflow.stage === 'source' && <ChooseSource onUpload={workflow.addFiles} onConnect={workflow.openCatalog} />}
      {workflow.stage === 'catalog' && <ConnectorCatalog selected={workflow.selectedConnector} onSelect={workflow.selectConnector} onBack={workflow.openSource} />}
      {workflow.stage === 'mysql' && <MySqlForm connection={workflow.connection} status={workflow.connectionStatus} onChange={workflow.updateConnection} onTest={() => void workflow.testConnection()} onSave={() => void workflow.persistConnection()} onBack={workflow.openCatalog} />}
      {workflow.stage === 'upload' && <UploadWorkspace files={workflow.files} selectedFileId={workflow.selectedFileId} onFiles={workflow.addFiles} onSelectFile={workflow.selectFile} onStart={() => void workflow.startPipeline()} onBack={workflow.openSource} />}
      {workflow.stage === 'pipeline' && source && <PipelineWorkspace source={source} tasks={workflow.tasks} status={workflow.pipelineStatus} onRun={() => void workflow.startPipeline()} onReview={workflow.openProfile} onBack={() => workflow.navigateProgress('transfer')} />}
      {workflow.stage === 'profile' && source && <ProfileWorkspace source={source} onContinue={() => void workflow.startMeaning()} onBack={() => workflow.navigateProgress('pipeline')} />}
      {workflow.stage === 'meaning' && <MeaningWorkspace status={workflow.meaningStatus} revisionCount={workflow.revisionCount} onApprove={() => void workflow.approveMeaning()} onRevision={() => void workflow.requestRevision()} onBack={() => workflow.navigateProgress('profile')} />}
      {workflow.stage === 'index' && source && <IndexWorkspace source={source} status={workflow.indexStatus} query={workflow.searchQuery} completedQuery={workflow.completedSearchQuery} searchStatus={workflow.searchStatus} onQueryChange={workflow.setSearchQuery} onSearch={() => void workflow.search()} onBack={() => workflow.navigateProgress('meaning')} />}
  </IngestionWorkspaceFrame>
}
