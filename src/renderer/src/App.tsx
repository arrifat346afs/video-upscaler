import { SidebarProvider, Sidebar, SidebarContent } from './components/ui/sidebar'
import { ThemeProvider } from './components/theme-provider'
import { SidebarPanel } from './components/SidebarPanel'
import { ProgressDisplay } from './components/ProgressDisplay'
import { useUpscale } from './hooks/useUpscale'

function App(): React.JSX.Element {
  const {
    activeTab,
    setActiveTab,
    batchMode,
    setBatchMode,
    doubleUpscale,
    setDoubleUpscale,
    model,
    setModel,
    models,
    scale,
    setScale,
    ttaMode,
    setTtaMode,
    tileSize,
    setTileSize,
    videoPath,
    folderPath,
    outputPath,
    isProcessing,
    progress,
    logs,
    videoName,
    handleVideoSelected,
    handleSelectFolder,
    handleSelectOutputFolder,
    handleUpscale,
    handleCancel
  } = useUpscale()

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarContent className="flex flex-col gap-5 p-4">
            <SidebarPanel
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              batchMode={batchMode}
              onBatchModeChange={setBatchMode}
              doubleUpscale={doubleUpscale}
              onDoubleUpscaleChange={setDoubleUpscale}
              model={model}
              onModelChange={setModel}
              models={models}
              scale={scale}
              onScaleChange={setScale}
              ttaMode={ttaMode}
              onTtaModeChange={setTtaMode}
              tileSize={tileSize}
              onTileSizeChange={setTileSize}
              videoPath={videoPath}
              folderPath={folderPath}
              outputPath={outputPath}
              videoName={videoName}
              onVideoSelected={handleVideoSelected}
              onSelectFolder={handleSelectFolder}
              onSelectOutputFolder={handleSelectOutputFolder}
              onUpscale={handleUpscale}
              isProcessing={isProcessing}
            />
          </SidebarContent>
        </Sidebar>
        <main className="flex flex-1 flex-col p-6">
          <ProgressDisplay
            progress={progress}
            logs={logs}
            onCancel={handleCancel}
            isProcessing={isProcessing}
            videoName={videoName}
          />
        </main>
      </SidebarProvider>
    </ThemeProvider>
  )
}

export default App
