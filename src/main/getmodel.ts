/* eslint-disable @typescript-eslint/explicit-function-return-type */

import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const modelDir = app.isPackaged
  ? path.join(process.resourcesPath, 'models')
  : path.join(process.cwd(), 'resources', 'models')

export const getModel = () => {
  try {
    const files = fs.readdirSync(modelDir)
    const modelNames = files
      .filter((file) => file.endsWith('.param'))
      .map((file) => path.basename(file, '.param'))
    return [...new Set(modelNames)].sort()
  } catch (error) {
    console.error('Failed to read models directory:', modelDir, error)
    return []
  }
}
