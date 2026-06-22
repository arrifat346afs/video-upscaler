import { useEffect, useState, useCallback } from 'react'
import type { ProgressData } from '../types'

type UseUpscaleReturn = {
  activeTab: string
  setActiveTab: (tab: string) => void
  batchMode: boolean
  setBatchMode: (batch: boolean) => void
  doubleUpscale: boolean
  setDoubleUpscale: (double: boolean) => void
  model: string
  setModel: (model: string) => void
  models: string[]
  scale: number[]
  setScale: (scale: number[]) => void
  ttaMode: boolean
  setTtaMode: (tta: boolean) => void
  tileSize: string
  setTileSize: (tileSize: string) => void
  videoPath: string | null
  folderPath: string | null
  outputPath: string | null
  isProcessing: boolean
  progress: ProgressData | null
  logs: string[]
  videoName: string | null
  handleVideoSelected: (path: string) => void
  handleSelectFolder: () => Promise<void>
  handleSelectOutputFolder: () => Promise<void>
  handleUpscale: () => Promise<void>
  handleCancel: () => void
}

export function useUpscale(): UseUpscaleReturn {
  const [activeTab, setActiveTab] = useState('upscale')
  const [batchMode, setBatchMode] = useState(false)
  const [doubleUpscale, setDoubleUpscale] = useState(false)
  const [model, setModel] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [scale, setScale] = useState([4])
  const [ttaMode, setTtaMode] = useState(false)
  const [tileSize, setTileSize] = useState('0')

  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [outputPath, setOutputPath] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    window.api.getModelsList().then((list) => {
      setModels(list)
      if (list.length > 0) setModel(list[0])
    })
  }, [])

  useEffect(() => {
    const cleanupFns: (() => void)[] = []

    cleanupFns.push(
      window.api.onProgress((data) => {
        setProgress(data as ProgressData)
      })
    )

    cleanupFns.push(
      window.api.onUpscaleDone(() => {
        setIsProcessing(false)
      })
    )

    cleanupFns.push(
      window.api.onError((data) => {
        setLogs((prev) => [...prev, `Error: ${data.message}`])
        setIsProcessing(false)
      })
    )

    cleanupFns.push(
      window.api.onLog((message) => {
        setLogs((prev) => [...prev, message])
      })
    )

    return () => {
      cleanupFns.forEach((fn) => fn())
    }
  }, [])

  const handleVideoSelected = useCallback((path: string) => {
    setVideoPath(path)
    setLogs([])
    setProgress(null)
  }, [])

  const handleSelectFolder = useCallback(async () => {
    const path = await window.api.selectFolder()
    if (path) {
      setFolderPath(path)
      setLogs([])
      setProgress(null)
    }
  }, [])

  const handleSelectOutputFolder = useCallback(async () => {
    const path = await window.api.selectFolder()
    if (path) {
      setOutputPath(path)
    }
  }, [])

  const handleUpscale = useCallback(async () => {
    if (batchMode) {
      if (!folderPath) return
    } else {
      if (!videoPath) return
    }
    if (!model) return

    setIsProcessing(true)
    setLogs([])
    setProgress(null)

    if (batchMode && folderPath) {
      setLogs((prev) => [...prev, 'Batch processing not yet implemented in this version.'])
      setIsProcessing(false)
      return
    }

    await window.api.upscaleVideo({
      videoPath: videoPath!,
      outputPath: outputPath || undefined,
      model,
      scale: String(scale[0]),
      ttaMode,
      tileSize: parseInt(tileSize) || 0
    })
  }, [batchMode, folderPath, videoPath, model, scale, outputPath, ttaMode, tileSize])

  const handleCancel = useCallback(() => {
    window.api.stopUpscaling()
    setIsProcessing(false)
  }, [])

  const videoName = videoPath ? videoPath.split(/[/\\]/).pop() : null

  return {
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
  }
}
