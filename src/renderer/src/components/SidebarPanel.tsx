import { Button } from './ui/button'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Slider } from './ui/slider'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Folder, HelpCircle, Rocket, Layers, FolderOpen } from 'lucide-react'
import { UploadButton } from './button/UploadButton'

type SidebarPanelProps = {
  activeTab: string
  onActiveTabChange: (tab: string) => void
  batchMode: boolean
  onBatchModeChange: (batch: boolean) => void
  doubleUpscale: boolean
  onDoubleUpscaleChange: (double: boolean) => void
  model: string
  onModelChange: (model: string) => void
  models: string[]
  scale: number[]
  onScaleChange: (scale: number[]) => void
  ttaMode: boolean
  onTtaModeChange: (tta: boolean) => void
  tileSize: string
  onTileSizeChange: (tileSize: string) => void
  videoPath: string | null
  folderPath: string | null
  outputPath: string | null
  videoName: string | null
  onVideoSelected: (path: string) => void
  onSelectFolder: () => void
  onSelectOutputFolder: () => void
  onUpscale: () => void
  isProcessing: boolean
}

export const SidebarPanel = ({
  activeTab,
  onActiveTabChange,
  batchMode,
  onBatchModeChange,
  doubleUpscale,
  onDoubleUpscaleChange,
  model,
  onModelChange,
  models,
  scale,
  onScaleChange,
  ttaMode,
  onTtaModeChange,
  tileSize,
  onTileSizeChange,
  videoPath,
  folderPath,
  outputPath,
  videoName,
  onVideoSelected,
  onSelectFolder,
  onSelectOutputFolder,
  onUpscale,
  isProcessing
}: SidebarPanelProps): React.ReactElement => {
  return (
    <>
      <Tabs value={activeTab} onValueChange={onActiveTabChange} className="w-full">
        <TabsList className="mx-auto grid w-fit grid-cols-2 rounded-full p-1">
          <TabsTrigger value="upscale" className="rounded-full">
            Upscale
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full">
            Settings
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <Switch id="batch-mode" checked={batchMode} onCheckedChange={onBatchModeChange} />
        <Label htmlFor="batch-mode" className="cursor-pointer">
          Batch Upscale
        </Label>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Step 1</h3>
        {batchMode ? (
          <Button
            variant="secondary"
            className="w-full rounded-full"
            onClick={onSelectFolder}
            disabled={isProcessing}
          >
            <FolderOpen />
            Select Folder
          </Button>
        ) : (
          <UploadButton onVideoSelected={onVideoSelected} disabled={isProcessing} />
        )}

        {!batchMode && videoName && (
          <p className="truncate text-xs text-muted-foreground">{videoName}</p>
        )}
        {batchMode && folderPath && (
          <p className="truncate text-xs text-muted-foreground">{folderPath}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Step 2</h3>
          <p className="text-xs text-muted-foreground">Select AI Model</p>
        </div>

        <Select value={model} onValueChange={onModelChange} disabled={isProcessing}>
          <SelectTrigger className="w-full rounded-full">
            <Layers className="size-4" />
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((modelName) => (
              <SelectItem key={modelName} value={modelName}>
                {modelName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="double-upscale"
            checked={doubleUpscale}
            onCheckedChange={onDoubleUpscaleChange}
            disabled={isProcessing}
          />
          <Label htmlFor="double-upscale" className="cursor-pointer">
            Double Upscale
          </Label>
          <HelpCircle className="size-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="tta-mode"
            checked={ttaMode}
            onCheckedChange={onTtaModeChange}
            disabled={isProcessing}
          />
          <Label htmlFor="tta-mode" className="cursor-pointer">
            TTA Mode
          </Label>
          <HelpCircle className="size-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="tile-size" className="text-xs whitespace-nowrap">
            Tile Size
          </Label>
          <input
            id="tile-size"
            type="number"
            min={0}
            step={32}
            value={tileSize}
            onChange={(e) => onTileSizeChange(e.target.value)}
            disabled={isProcessing}
            className="w-20 h-8 rounded-md border border-input bg-background px-2 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <HelpCircle className="size-4 text-muted-foreground shrink-0" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Video Scale ({scale[0]}x)</Label>
          <Slider
            value={scale}
            onValueChange={onScaleChange}
            min={1}
            max={4}
            step={1}
            disabled={isProcessing}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Step 3</h3>
          <p className="text-xs text-muted-foreground">Defaults to Video&apos;s path</p>
        </div>
        <Button
          variant="secondary"
          className="w-full rounded-full"
          onClick={onSelectOutputFolder}
          disabled={isProcessing}
        >
          <Folder />
          Set Output Folder
        </Button>
        {outputPath && <p className="truncate text-xs text-muted-foreground">{outputPath}</p>}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Step 4</h3>
        <Button
          className="w-full rounded-full bg-violet-600 hover:bg-violet-700"
          onClick={onUpscale}
          disabled={
            isProcessing || (!batchMode && !videoPath) || (batchMode && !folderPath) || !model
          }
        >
          <Rocket />
          Upscale
        </Button>
      </div>
    </>
  )
}
