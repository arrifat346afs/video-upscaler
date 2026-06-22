import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
// import icon from '../../resources/icon.png?asset'
import { ELECTRON_COMMANDS } from '../../common/electron-commands'
import { getModel } from './getmodel'
import { upscaleSingleVideo, stopAllProcesses, type UpscaleVideoOptions } from './upscale'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const window = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(ELECTRON_COMMANDS.SELECT_FILE, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],

      filters: [
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv', 'flv'] }
      ]
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle(ELECTRON_COMMANDS.SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle(ELECTRON_COMMANDS.UPSCAYL_VIDEO, async (event, payload) => {
    const { videoPath, outputPath, model, scale, ttaMode, tileSize } = payload
    const win = BrowserWindow.fromWebContents(event.sender)

    const options: UpscaleVideoOptions = {
      videoPath,
      outputPath,
      model,
      scale: String(scale),
      ttaMode,
      tileSize,
      onProgress: (data) => {
        win?.webContents.send(ELECTRON_COMMANDS.UPSCAYL_VIDEO_PROGRESS, data)
      },
      sendLog: (message) => {
        win?.webContents.send(ELECTRON_COMMANDS.LOG, message)
      }
    }

    try {
      const resultPath = await upscaleSingleVideo(options)
      win?.webContents.send(ELECTRON_COMMANDS.UPSCAYL_VIDEO_DONE, { outputPath: resultPath })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during upscaling'
      win?.webContents.send(ELECTRON_COMMANDS.UPSCAYL_ERROR, { message })
    }
  })

  ipcMain.on(ELECTRON_COMMANDS.STOP, () => {
    stopAllProcesses()
  })

  ipcMain.handle(ELECTRON_COMMANDS.GET_MODELS_LIST, () => getModel())
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
