/**
 * Saisca Electron 主进程
 *
 * 职责：
 *   1. 启动 Python 后端子进程
 *   2. 等待后端就绪
 *   3. 创建浏览器窗口加载前端
 *   4. 窗口关闭时清理子进程
 */

const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

// ── 配置 ────────────────────────────────────────────────────

const HOST = "127.0.0.1";
const PORT = 8000;
const BACKEND_URL = `http://${HOST}:${PORT}`;

// ── 后端管理 ─────────────────────────────────────────────────

let backendProcess = null;

function getBackendPath() {
  const isPackaged = app.isPackaged;

  if (isPackaged) {
    // 生产模式：PyInstaller 打包的后端在 extraResources/backend/
    const basePath = path.join(process.resourcesPath, "backend");
    if (process.platform === "win32") {
      return path.join(basePath, "saisika_backend.exe");
    }
    return path.join(basePath, "saisika_backend");
  }

  // 开发模式：直接用 python3 运行
  return "python3";
}

function getBackendArgs() {
  if (app.isPackaged) {
    return [];
  }
  // 开发模式参数
  const backendDir = path.join(__dirname, "..", "app", "backend");
  return [path.join(backendDir, "packaged_app.py")];
}

function startBackend() {
  const backendPath = getBackendPath();
  const args = getBackendArgs();

  backendProcess = spawn(backendPath, args, {
    env: {
      ...process.env,
      SAISCA_HOST: HOST,
      SAISCA_PORT: String(PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess.stdout.on("data", (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.on("error", (err) => {
    console.error("Failed to start backend:", err.message);
  });

  backendProcess.on("exit", (code) => {
    console.log(`Backend exited with code ${code}`);
    backendProcess = null;
  });
}

// ── 等待后端就绪 ────────────────────────────────────────────

function waitForBackend(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error("后端启动超时"));
        return;
      }

      http
        .get(`${BACKEND_URL}/api/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            setTimeout(check, 300);
          }
        })
        .on("error", () => {
          setTimeout(check, 300);
        });
    }

    check();
  });
}

// ── 窗口管理 ─────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Saisca — 供应链风险分析系统",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(BACKEND_URL);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

// ── 应用生命周期 ─────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    startBackend();
    await waitForBackend();
    createWindow();
  } catch (err) {
    dialog.showErrorBox("启动失败", `后端服务启动失败：${err.message}\n\n请检查是否已安装 Python 3。`);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
