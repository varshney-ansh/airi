const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const isDev = process.env.NODE_ENV == "development";

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  })
  
  win.setMenuBarVisibility(false);

  if(isDev){
    win.loadURL("http://localhost:3000/");
  }else{
    win.loadFile(path.join(__dirname,"../out/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})