import { app } from 'electron'
import { execFile, spawn, type ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

export type ProgressData = {
  current: number
  total: number
  stage: 'extracting' | 'upscaling' | 'reassembling' | 'done'
  message?: string
  overall?: number
}

export type UpscaleVideoOptions = {
  videoPath: string
  outputPath?: string
  model: string
  scale: string
  ttaMode?: boolean
  tileSize?: number
  onProgress: (data: ProgressData) => void
  sendLog: (message: string) => void
}

let currentProcesses: ChildProcess[] = []
let tempDirCleanup: string[] = []

export function stopAllProcesses(): void {
  for (const proc of currentProcesses) {
    if (!proc.killed) {
      proc.kill('SIGTERM')
    }
  }
  currentProcesses = []

  for (const dir of tempDirCleanup) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
  tempDirCleanup = []
}

function trackProcess(proc: ChildProcess): void {
  currentProcesses.push(proc)
  proc.on('close', () => {
    currentProcesses = currentProcesses.filter((p) => p !== proc)
  })
}

function getBinaryPath(): string {
  const platform = process.platform
  const binaryName = platform === 'win32' ? 'upscayl-bin.exe' : 'upscayl-bin'
  const binaryDir = app.isPackaged
    ? path.join(process.resourcesPath, platform, 'bin')
    : path.join(process.cwd(), 'resources', platform, 'bin')
  return path.join(binaryDir, binaryName)
}

function getModelPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'models')
    : path.join(process.cwd(), 'resources', 'models')
}

function getTempDir(): string {
  const tempBase = app.getPath('temp')
  const dir = path.join(tempBase, 'videoup-temp', Date.now().toString())
  fs.mkdirSync(dir, { recursive: true })
  tempDirCleanup.push(dir)
  return dir
}

function getVideoFps(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=r_frame_rate',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath
      ],
      (error, stdout) => {
        if (error) return reject(error)
        const fpsStr = stdout.trim()
        if (fpsStr.includes('/')) {
          const [num, den] = fpsStr.split('/').map(Number)
          resolve(num / den)
        } else {
          resolve(Number(fpsStr))
        }
      }
    )
  })
}

function getFrameCount(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-count_frames',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=nb_read_frames',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath
      ],
      (error, stdout) => {
        if (error) {
          getFrameCountFallback(videoPath).then(resolve).catch(reject)
          return
        }
        const count = parseInt(stdout.trim())
        if (!isNaN(count) && count > 0) {
          resolve(count)
        } else {
          getFrameCountFallback(videoPath).then(resolve).catch(reject)
        }
      }
    )
  })
}

async function getFrameCountFallback(videoPath: string): Promise<number> {
  const [fps, duration] = await Promise.all([getVideoFps(videoPath), getVideoDuration(videoPath)])
  return Math.round(fps * duration)
}

function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath
      ],
      (error, stdout) => {
        if (error) return reject(error)
        resolve(parseFloat(stdout.trim()))
      }
    )
  })
}

function extractFrames(
  videoPath: string,
  frameDir: string,
  totalFrames: number,
  onProgress: (current: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-i', videoPath, '-q:v', '2', frameDir + '/frame_%06d.jpg'])

    trackProcess(proc)

    let lastFrame = 0
    proc.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      const match = output.match(/frame=\s*(\d+)/)
      if (match) {
        lastFrame = parseInt(match[1])
        onProgress(lastFrame)
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress(totalFrames)
        resolve()
      } else if (code === null) {
        reject(new Error('Process was terminated'))
      } else {
        reject(new Error(`ffmpeg frame extraction exited with code ${code}`))
      }
    })

    proc.on('error', reject)
  })
}

function upscaleFramesBatch(
  frameDir: string,
  upscaledDir: string,
  model: string,
  scale: string,
  totalFrames: number,
  ttaMode: boolean,
  tileSize: number,
  onProgress: (current: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const binaryPath = getBinaryPath()
    const modelPath = getModelPath()

    const args = [
      '-i',
      frameDir,
      '-o',
      upscaledDir,
      '-m',
      modelPath,
      '-n',
      model,
      '-s',
      scale,
      '-j',
      '2:4:2',
      '-f',
      'jpg',
      '-c',
      '5'
    ]

    if (ttaMode) {
      args.push('-x')
    }

    if (tileSize > 0) {
      args.push('-t', String(tileSize))
    }

    const proc = spawn(binaryPath, args)

    trackProcess(proc)

    let completedFrames = 0
    proc.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      const matches = output.match(/100\.00%/g)
      if (matches) {
        completedFrames += matches.length
        onProgress(Math.min(completedFrames, totalFrames))
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress(totalFrames)
        resolve()
      } else if (code === null) {
        reject(new Error('Process was terminated'))
      } else {
        reject(new Error(`upscayl-bin exited with code ${code}`))
      }
    })

    proc.on('error', reject)
  })
}

function reassembleVideo(frameDir: string, outputPath: string, fps: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-i',
      path.join(frameDir, 'frame_%06d.jpg'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(fps),
      '-y',
      outputPath
    ])

    trackProcess(proc)

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else if (code === null) reject(new Error('Process was terminated'))
      else reject(new Error(`ffmpeg reassembly exited with code ${code}`))
    })

    proc.on('error', reject)
  })
}

export async function upscaleSingleVideo(options: UpscaleVideoOptions): Promise<string> {
  const { videoPath, model, scale, ttaMode, tileSize, onProgress, sendLog } = options
  const videoName = path.basename(videoPath, path.extname(videoPath))
  let outputPath = options.outputPath

  if (!outputPath) {
    const dir = path.dirname(videoPath)
    outputPath = path.join(dir, `${videoName}_upscaled.mp4`)
  }

  if (!outputPath.endsWith('.mp4')) {
    outputPath = `${outputPath}.mp4`
  }

  sendLog(`Starting upscale for ${videoName}`)
  sendLog(`Model: ${model}, Scale: ${scale}x`)
  if (ttaMode) sendLog('TTA mode: enabled')
  if (tileSize && tileSize > 0) sendLog(`Tile size: ${tileSize}`)

  const tempDir = getTempDir()
  const frameDir = path.join(tempDir, 'frames')
  const upscaledDir = path.join(tempDir, 'upscaled')
  fs.mkdirSync(frameDir, { recursive: true })
  fs.mkdirSync(upscaledDir, { recursive: true })

  try {
    const totalFrames = await getFrameCount(videoPath)
    sendLog(`Total frames to process: ${totalFrames}`)

    const fps = await getVideoFps(videoPath)
    sendLog(`Video FPS: ${fps}`)

    onProgress({
      current: 0,
      total: totalFrames,
      stage: 'extracting',
      message: 'Extracting frames from video...'
    })
    sendLog('Extracting frames with ffmpeg...')
    await extractFrames(videoPath, frameDir, totalFrames, (current) => {
      onProgress({
        current,
        total: totalFrames,
        stage: 'extracting',
        message: `Extracting frame ${current}/${totalFrames}`,
        overall: 0
      })
    })

    const frameFiles = fs
      .readdirSync(frameDir)
      .filter((f) => f.endsWith('.jpg'))
      .sort()
    const actualFrameCount = frameFiles.length
    sendLog(`Extracted ${actualFrameCount} frames. Starting upscale...`)

    onProgress({
      current: 0,
      total: actualFrameCount,
      stage: 'upscaling',
      message: 'Upscaling frames...'
    })
    await upscaleFramesBatch(
      frameDir,
      upscaledDir,
      model,
      scale,
      actualFrameCount,
      ttaMode ?? false,
      tileSize ?? 0,
      (current) => {
        onProgress({
          current,
          total: actualFrameCount,
          stage: 'upscaling',
          message: `Upscaling frame ${current}/${actualFrameCount}`,
          overall: 0.15 + 0.75 * (current / actualFrameCount)
        })
      }
    )

    sendLog('Reassembling video with ffmpeg...')
    onProgress({
      current: 0,
      total: 1,
      stage: 'reassembling',
      message: 'Reassembling video...',
      overall: 0.93
    })
    await reassembleVideo(upscaledDir, outputPath, fps)

    onProgress({
      current: 1,
      total: 1,
      stage: 'done',
      message: 'Upscaling complete!',
      overall: 1.0
    })
    sendLog(`Upscaling complete! Output: ${outputPath}`)

    return outputPath
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
}
