import { ElectronAPI } from '@electron-toolkit/preload'

interface Api {
  getModelsList: () => Promise<string[]>
  selectVideo: () => Promise<string | null>
  selectFolder: () => Promise<string | null>
  upscaleVideo: (payload: {
    videoPath: string
    outputPath?: string
    model: string
    scale: string
    ttaMode?: boolean
    tileSize?: number
  }) => Promise<void>
  stopUpscaling: () => void
  onProgress: (
    callback: (data: { current: number; total: number; stage: string; message?: string }) => void
  ) => () => void
  onUpscaleDone: (callback: (data: { outputPath: string }) => void) => () => void
  onError: (callback: (data: { message: string }) => void) => () => void
  onLog: (callback: (message: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
