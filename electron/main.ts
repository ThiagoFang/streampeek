import { app, BrowserWindow, Menu, Tray, ipcMain, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let tray: Tray | null = null;
let window: BrowserWindow | null = null;
let server: http.Server | null = null;

// CREATION FUNCTIONS
function createWindow() {
  // Cria a janela (inicialmente escondida)
  window = new BrowserWindow({
    width: 300,
    height: 400,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    title: "StreamPeek",
    icon: path.join(process.env.VITE_PUBLIC, "logo_streampeek.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Carrega o conteúdo React
  if (VITE_DEV_SERVER_URL) window.loadURL(VITE_DEV_SERVER_URL);
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC, "logo_streampeek.png");
  tray = new Tray(iconPath);
  tray.setToolTip("StreamPeek");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Sair", click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on("click", (_event, bounds) => toggleWindow(bounds));
}

function startAuthServer(callback: (token: string) => void) {
  if (server) {
    console.log("Servidor já está rodando.");
    return;
  }

  server = http.createServer((req, res) => {
    console.log("Requisição recebida:", req.url);

    if (req.url === "/" || req.url?.includes("access_token")) {
      console.log(
        "Respondendo à requisição inicial com página de autenticação"
      );
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body>
            <h1>Autenticando...</h1>
            <script>
              console.log('Script rodando no navegador');
              const hash = window.location.hash.substring(1);
              console.log('Hash capturado:', hash);
              const params = new URLSearchParams(hash);
              const accessToken = params.get('access_token');
              console.log('Token extraído:', accessToken);
              if (accessToken) {
                fetch('/token?access_token=' + encodeURIComponent(accessToken))
                  .then(response => response.text())
                  .then((text) => {
                    console.log('Resposta do fetch:', text);
                    document.body.innerHTML = '<h1>Autenticado com sucesso! Pode fechar esta janela.</h1>';
                  })
                  .catch(err => {
                    console.error('Erro no fetch:', err);
                    document.body.innerHTML = '<h1>Erro ao processar o token.</h1>';
                  });
              } else {
                console.error('Token não encontrado no hash');
                document.body.innerHTML = '<h1>Erro: Token não encontrado.</h1>';
              }
            </script>
          </body>
        </html>
      `);
    } else if (req.url && req.url.includes("/token")) {
      // Ajustado para capturar qualquer /token
      console.log("Rota /token detectada");
      const urlParams = new URLSearchParams(req.url.split("?")[1]);
      const accessToken = urlParams.get("access_token");
      console.log("Token extraído da query:", accessToken);

      if (accessToken) {
        console.log("Token válido, chamando callback:", accessToken);
        callback(accessToken);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Token recebido com sucesso");
        server?.close(() => {
          console.log("Servidor fechado.");
          server = null;
        });
      } else {
        console.log("Nenhum token encontrado na query string");
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Token não encontrado");
      }
    } else {
      console.log("Rota não reconhecida:", req.url);
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>Página não encontrada</h1>");
    }
  });

  server.on("error", (err) => {
    console.error("Erro no servidor:", err.message);
  });

  server.listen(80, "localhost", () => {
    console.log("Servidor local iniciado em http://localhost");
  });
}

// AUXILIAR FUNCTIONS
function toggleWindow(bounds: Electron.Rectangle) {
  if (!window) return;

  if (window.isVisible()) {
    window.hide();
  } else {
    const { x, y } = bounds;
    const { width, height } = window.getBounds();

    if (process.platform === "darwin") {
      window.setPosition(x - width / 2, y);
    } else {
      window.setPosition(x - width / 2, y - height - 16);
    }

    window.show();
    window.webContents.openDevTools({
      mode: "undocked",
    });
  }
}

// ELECTRON EVENTS
app.whenReady().then(() => {
  createWindow();
  createTray();

  window?.on("blur", () => {
    window?.hide();
  });
});

app.on("activate", () => {
  if (window === null) createWindow();
});

// IPC EVENTS
ipcMain.on("start-auth", (event, url: string) => {
  console.log("Iniciando autenticação com URL:", url);
  shell.openExternal(url);
  startAuthServer((token) => {
    console.log("Enviando token ao renderer via auth-success:", token);
    if (window) {
      window.webContents.send("auth-success", token);
    } else {
      console.error("mainWindow não está definida ao tentar enviar o token");
    }
  });
});
