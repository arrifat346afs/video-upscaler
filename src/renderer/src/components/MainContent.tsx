/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { FileVideo, Film, FolderOpen } from 'lucide-react'
import { Button } from './ui/button'
import { ProgressDisplay } from './ProgressDisplay'
import { IdleDisplay } from './IdleDisplay'
import type { ProgressData } from '../types'

const VALID_VIDEO_EXTENSIONS = [
  'mp4',
  'webm',
  'mkv',
  'avi',
  'mov',
  'flv',
  'wmv',
  'ts',
  'm4v',
  'mpeg',
  'mpg'
]

type MainContentProps = {
  batchMode: boolean
  videoPath: string | null
  folderPath: string | null
  folderVideoCount: number
  outputPath: string | null
  upscaledVideoPath: string | null
  isProcessing: boolean
  progress: ProgressData | null
  logs: string[]
  videoName: string | null
  onSelectVideo: () => Promise<void>
  onSelectFolder: () => Promise<void>
  onVideoDropped: (path: string) => void
  onCancel: () => void
}

export function MainContent({
  batchMode,
  videoPath,
  folderPath,
  folderVideoCount,
  outputPath,
  upscaledVideoPath,
  isProcessing,
  progress,
  logs,
  videoName,
  onSelectVideo,
  onSelectFolder,
  onVideoDropped,
  onCancel
}: MainContentProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [upscaledVideoUrl, setUpscaledVideoUrl] = useState<string | null>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isSliderDragging, setIsSliderDragging] = useState(false)

  const showIdle = useMemo(() => {
    if (batchMode) return folderPath === null
    return videoPath === null
  }, [batchMode, videoPath, folderPath])

  useEffect(() => {
    if (!videoPath) {
      setVideoUrl(null)
      return
    }
    if (
      videoPath.startsWith('http://') ||
      videoPath.startsWith('https://') ||
      videoPath.startsWith('local-file://')
    ) {
      setVideoUrl(videoPath)
      return
    }
    window.api
      .getVideoUrl(videoPath)
      .then(setVideoUrl)
      .catch(() => setVideoUrl(null))
  }, [videoPath])

  useEffect(() => {
    if (!upscaledVideoPath) {
      setUpscaledVideoUrl(null)
      return
    }
    window.api
      .getVideoUrl(upscaledVideoPath)
      .then(setUpscaledVideoUrl)
      .catch(() => setUpscaledVideoUrl(null))
  }, [upscaledVideoPath])

  useEffect(() => {
    const handleGlobalMouseUp = (): void => {
      setIsSliderDragging(false)
    }

    if (!isSliderDragging) return

    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [isSliderDragging])

  const handleDragEnter = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files.length === 0) return
    const file = e.dataTransfer.files[0]
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

    if (!VALID_VIDEO_EXTENSIONS.includes(extension)) return

    if (batchMode) {
      void onSelectFolder()
    } else if ('path' in file && typeof file.path === 'string') {
      onVideoDropped(file.path)
    }
  }

  const handleDoubleClick = (): void => {
    if (batchMode) {
      void onSelectFolder()
    } else {
      void onSelectVideo()
    }
  }

  const handleSliderMouseDown = (): void => {
    setIsSliderDragging(true)
  }

  const handleSliderMouseUp = (): void => {
    setIsSliderDragging(false)
  }

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | TouchEvent): void => {
    if (!isSliderDragging) return

    const container = (e as React.MouseEvent<HTMLDivElement>).currentTarget
    if (!container) return

    const rect = container.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX
    const position = ((clientX - rect.left) / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, position)))
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (!isSliderDragging) return

    const container = e.currentTarget
    const rect = container.getBoundingClientRect()
    const clientX = e.touches[0]?.clientX
    if (clientX === undefined) return

    const position = ((clientX - rect.left) / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, position)))
  }

  const showComparison = !batchMode && Boolean(videoUrl && upscaledVideoUrl)

  return (
    <div
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDoubleClick={handleDoubleClick}
    >
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-primary bg-card p-8 text-center shadow-lg">
            <FileVideo className="mx-auto mb-3 size-10 text-primary" />
            <p className="text-lg font-medium">Drop video here</p>
          </div>
        </div>
      )}

      {showIdle && (
        <IdleDisplay
          videoName={videoName}
          folderPath={folderPath}
          folderVideoCount={folderVideoCount}
          batchMode={batchMode}
        />
      )}

      {!batchMode && videoUrl && (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-8">
          {showComparison ? (
            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-sm font-medium">Drag slider to compare</p>
              <div
                className="relative flex h-full w-full max-h-[70vh] items-center justify-center overflow-hidden rounded-xl border shadow-sm"
                onMouseMove={handleSliderMove}
                onMouseUp={handleSliderMouseUp}
                onMouseLeave={handleSliderMouseUp}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleSliderMouseUp}
              >
                {/* Base video (normal) */}
                <video
                  key={`original-${videoUrl}`}
                  src={videoUrl || undefined}
                  controls
                  className="absolute inset-0 h-full w-full object-contain"
                />

                {/* Overlay video (upscaled) - clipped based on slider */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    width: `${sliderPosition}%`,
                    transition: isSliderDragging ? 'none' : 'width 0.1s ease-out'
                  }}
                >
                  <video
                    key={`upscaled-${upscaledVideoUrl}`}
                    src={upscaledVideoUrl || undefined}
                    controls
                    className="h-full w-screen object-contain"
                  />
                </div>

                {/* Slider handle */}
                <div
                  className={`absolute inset-y-0 z-10 flex w-1 items-center justify-center bg-primary transition-colors ${
                    isSliderDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{
                    left: `${sliderPosition}%`,
                    transform: 'translateX(-50%)'
                  }}
                  onMouseDown={handleSliderMouseDown}
                  onTouchStart={handleSliderMouseDown}
                >
                  <div className="relative flex h-12 w-10 items-center justify-center rounded-full bg-primary shadow-lg">
                    <div className="flex gap-1">
                      <div className="h-4 w-0.5 bg-background" />
                      <div className="h-4 w-0.5 bg-background" />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="pointer-events-none absolute bottom-4 left-4 z-10">
                  <p className="text-sm font-medium text-white drop-shadow-lg">Original</p>
                </div>
                <div className="pointer-events-none absolute bottom-4 right-4 z-10">
                  <p className="text-sm font-medium text-white drop-shadow-lg">Upscaled</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-2">
              <video
                key={`original-${videoUrl}`}
                src={videoUrl || undefined}
                controls
                className="max-h-[70vh] max-w-full rounded-xl border shadow-sm"
              />
            </div>
          )}
        </div>
      )}

      {batchMode && folderPath && (
        <div className="z-10 flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <FolderOpen className="mx-auto mb-3 size-12 text-muted-foreground" />
            <p className="max-w-md truncate text-lg font-medium">{folderPath}</p>
            {folderVideoCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {folderVideoCount} video{folderVideoCount === 1 ? '' : 's'} found
              </p>
            )}
          </div>
          {outputPath && <p className="text-sm text-muted-foreground">Output: {outputPath}</p>}
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <ProgressDisplay
            progress={progress}
            logs={logs}
            onCancel={onCancel}
            isProcessing={isProcessing}
            batchMode={batchMode}
            videoName={videoName}
            folderPath={folderPath}
            folderVideoCount={folderVideoCount}
          />
        </div>
      )}

      {!isProcessing && !showIdle && (
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-6 right-6 z-20 rounded-full"
          onClick={batchMode ? onSelectFolder : onSelectVideo}
        >
          {batchMode ? <FolderOpen className="mr-2 size-4" /> : <Film className="mr-2 size-4" />}
          Change {batchMode ? 'Folder' : 'Video'}
        </Button>
      )}
    </div>
  )
}
