const { app, BrowserWindow, ipcMain, screen } = require('electron/main')
const path = require('node:path')
// Load .env.local so APP_MONGO_URI and other vars are available in the main process
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const isDev = process.env.NODE_ENV == "development";
const { nativeImage } = require('electron');
const { spawn } = require('child_process');
const { MongoClient } = require('mongodb');

let mainWindow = null;
let llamaProcess = null;
let agentProcess = null;
let appiumProcess = null;
let atlasCollection = null;
let store = null;

let dbReady;
const dbReadyPromise = new Promise((resolve) => { dbReady = resolve; });

async function setupDb() {
    // electron-store must be dynamically imported (ESM-only in v9+)
    const { default: Store } = await import('electron-store');
    store = new Store({ name: 'airi-chats' });

    // Connect to Atlas for sync (non-blocking — local store works even if offline)
    try {
        const client = new MongoClient(process.env.APP_MONGO_URI);
        await client.connect();
        atlasCollection = client.db("airi_db").collection("chats");
        console.log('[DB] Connected to MongoDB Atlas');
    } catch (err) {
        console.error('[DB] Atlas connection failed (offline mode):', err.message);
    }

    dbReady();
}

// --- helpers ---

function getStorageKey(userId) {
    return `chats_${userId}`;
}

function getLocalChats(userId) {
    return store.get(getStorageKey(userId), []);
}

function setLocalChats(userId, chats) {
    store.set(getStorageKey(userId), chats);
}

// --- IPC handlers (registered immediately, await dbReadyPromise before use) ---

ipcMain.handle('pull-chats', async (_event, userId) => {
    await dbReadyPromise;
    if (!userId) return { success: false, error: 'userId required' };
    if (!atlasCollection) return { success: false, error: 'Atlas not connected' };
    try {
        const remoteDocs = await atlasCollection
            .find({ userId }, { projection: { _id: 0 } })
            .sort({ updatedAt: -1 })
            .toArray();

        // Merge remote into local — remote wins on conflict
        const local = getLocalChats(userId);
        const merged = [...remoteDocs];
        for (const localDoc of local) {
            if (!merged.find((r) => r.chatId === localDoc.chatId)) {
                merged.push(localDoc);
            }
        }
        merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setLocalChats(userId, merged);

        return { success: true, count: merged.length };
    } catch (err) {
        console.error('[DB] pull-chats failed:', err.message);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-chats', async (_event, userId) => {
    await dbReadyPromise;
    if (!userId) return [];
    return getLocalChats(userId);
});

ipcMain.handle('save-chat', async (_event, chatData) => {
    await dbReadyPromise;
    if (!chatData?.userId || !chatData?.chatId) {
        return { success: false, error: 'userId and chatId required' };
    }

    const userId = chatData.userId;
    const doc = { ...chatData, updatedAt: Date.now() };

    // Save to local store
    const chats = getLocalChats(userId);
    const idx = chats.findIndex((c) => c.chatId === doc.chatId);
    if (idx === -1) {
        chats.unshift(doc);
    } else {
        chats[idx] = doc;
    }
    setLocalChats(userId, chats);

    // Sync to Atlas in background (don't await — don't block the response)
    if (atlasCollection) {
        atlasCollection.updateOne(
            { chatId: doc.chatId },
            { $set: doc },
            { upsert: true }
        ).catch((err) => console.error('[DB] Atlas sync failed:', err.message));
    }

    return { success: true };
});

ipcMain.handle('delete-chat', async (_event, { chatId, userId }) => {
    await dbReadyPromise;
    if (!chatId || !userId) return { success: false, error: 'chatId and userId required' };

    const chats = getLocalChats(userId);
    setLocalChats(userId, chats.filter((c) => c.chatId !== chatId));

    if (atlasCollection) {
        atlasCollection.deleteOne({ chatId, userId })
            .catch((err) => console.error('[DB] Atlas delete failed:', err.message));
    }

    return { success: true };
});

// --- window & process management ---

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
    ]);
    llamaProcess.stdout.on("data", (data) => console.log(`[LLAMA] ${data}`));
    llamaProcess.stderr.on("data", (data) => console.error(`[LLAMA ERROR] ${data}`));
}

function startAgentServer() {
    const scriptPath = path.join(__dirname, '../agent-server', 'agent.py');
    agentProcess = spawn("python", [scriptPath]);
    agentProcess.on("error", (err) => console.error(`[Agent-Server FAILED TO START]`, err));
    agentProcess.stdout.on("data", (data) => console.log(`[Agent-Server] ${data}`));
    agentProcess.stderr.on("data", (data) => console.error(`[Agent-Server ERROR] ${data}`));
}

function startAppium() {
    appiumProcess = spawn("appium", ["--use-plugins", "ocr"], { shell: true });
    appiumProcess.on("error", (err) => console.error(`[Appium FAILED TO START]`, err));
    appiumProcess.stdout.on("data", (data) => console.log(`[Appium] ${data}`));
    appiumProcess.stderr.on("data", (data) => console.error(`[Appium ERROR] ${data}`));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        },
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setIcon(nativeImage.createFromPath(path.join(__dirname, '../public/logo.ico')), 'Airi');
    if (isDev) {
        mainWindow.loadURL("http://localhost:3000/");
    } else {
        mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
    }
}

app.whenReady().then(() => {
    ipcMain.on('trigger-snap-overlay', () => {
        console.log('[IPC] trigger-snap-overlay received');
        snapToOverlay();
    });
    setupDb();
    startAgentServer();
    startAppium();
    startLlama();
    createWindow();
});

app.on('before-quit', () => {
    [llamaProcess, agentProcess, appiumProcess].forEach(proc => {
        if (proc && !proc.killed) proc.kill();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
