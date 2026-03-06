const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const isDev = process.env.NODE_ENV == "development";
const { nativeImage } = require('electron');
const { spawn } = require('child_process')

let llamaProcess

function startLlama() {
  llamaProcess = spawn("llama-server", [
    "-hf", "Qwen/Qwen3-VL-2B-Thinking-GGUF:Q4_K_M",
    "--ctx-size", "2048",
    "--threads", "6",
    "--batch-size", "128",
    "--ubatch-size", "64",
    "--n-gpu-layers", "0",
    "--port", "11434"
  ])

  llamaProcess.stdout.on("data", (data) => {
    console.log(`[LLAMA] ${data}`)
  })

  llamaProcess.stderr.on("data", (data) => {
    console.error(`[LLAMA ERROR] ${data}`)
  })
}

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    // remove the default titlebar
    titleBarStyle: 'hidden',
    // expose window controls in Windows/Linux
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {})
  })
  
  win.setMenuBarVisibility(false);
  win.setIcon(nativeImage.createFromPath(path.join(__dirname,'../public/logo.ico')), 'Airi');

  if(isDev){
    win.loadURL("http://localhost:3000/");
  }else{
    win.loadFile(path.join(__dirname,"../out/index.html"));
  }
}

app.whenReady().then(() => {
  startLlama()   // start inference server
  createWindow()
})

app.on('before-quit', () => {
  if (llamaProcess) {
    llamaProcess.kill()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
