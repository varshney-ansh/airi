const { app, BrowserWindow, ipcMain, screen } = require('electron/main')
const path = require('node:path')
const isDev = process.env.NODE_ENV == "development";
const { nativeImage } = require('electron');
const { spawn } = require('child_process')

let mainWindow = null;

let llamaProcess = null;

function snapToOverlay() {
  if (!mainWindow) return;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const agentWidth = 348;
  const agentHeight = Math.round(height * 0.8);
  mainWindow.setResizable(true);
  mainWindow.setSize(agentWidth, agentHeight);
  mainWindow.setPosition(width - agentWidth, height - agentHeight);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.focus();
}

function startLlama() {
  llamaProcess = spawn("llama-server", [
    "-hf", "ibm-granite/granite-4.0-1b-GGUF:Q4_K_M",
    "--ctx-size", "32768",
    "--threads", "6",  
    "--n-gpu-layers", "0",   
    "--port", "11434",
    "--cache-type-k", "q8_0",
    "--cache-type-v", "q8_0",
    "--jinja"
  ])

  llamaProcess.stdout.on("data", (data) => {
    console.log(`[LLAMA] ${data}`)
  })

  llamaProcess.stderr.on("data", (data) => {
    console.error(`[LLAMA ERROR] ${data}`)
  })
}

function startAgentServer() {
  const scriptPath = path.join(__dirname, '../agent-server', 'agent.py');
  agentProcess = spawn("python", [scriptPath]);
  
  agentProcess.on("error", (err) => {
    console.error(`[Agent-Server FAILED TO START] Is python installed?`, err);
  });

  agentProcess.stdout.on("data", (data) => console.log(`[Agent-Server] ${data}`));
  agentProcess.stderr.on("data", (data) => console.error(`[Agent-Server ERROR] ${data}`));
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    },
  })
  
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setIcon(nativeImage.createFromPath(path.join(__dirname,'../public/logo.ico')), 'Airi');

  if(isDev){
    mainWindow.loadURL("http://localhost:3000/");
  }else{
    mainWindow.loadFile(path.join(__dirname,"../out/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.on('trigger-snap-overlay', () => {
    console.log('[IPC] trigger-snap-overlay received');
    snapToOverlay();
  });
  startAgentServer();
  startLlama()
  createWindow()
})

app.on('before-quit', () => {
  [llamaProcess, agentProcess].forEach(proc => {
    if (proc && !proc.killed) proc.kill();
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
