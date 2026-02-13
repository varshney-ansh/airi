const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const isDev = process.env.NODE_ENV == "development";
const { nativeImage } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
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
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})