if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD === '1') {
  process.exit(0)
}

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const installJs = path.join(__dirname, '..', 'node_modules', 'electron', 'install.js')
const result = spawnSync(process.execPath, [installJs], { stdio: 'inherit' })
process.exit(result.status ?? 1)
