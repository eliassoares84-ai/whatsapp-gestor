const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app-release.apk');
const PORT = 8080;

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${urlPath}`);
  
  if (urlPath === '/' || urlPath === '/download') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Instalar SeuGestor</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080B0F; color: #F5F7FA; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
          .card { background: #111720; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; max-width: 420px; width: 100%; padding: 32px 24px; text-align: center; box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background: rgba(41,151,255,0.15); color: #2997FF; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; }
          h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #FFFFFF; }
          p { color: #98A2B3; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
          .btn { display: block; background: #2997FF; color: #FFFFFF; text-decoration: none; padding: 16px 24px; border-radius: 14px; font-weight: 600; font-size: 17px; box-shadow: 0 4px 16px rgba(41,151,255,0.35); transition: background 0.2s; }
          .btn:active { background: #147BD1; }
          .instructions { margin-top: 24px; text-align: left; background: #0D1117; border-radius: 14px; padding: 16px; border: 1px solid rgba(255,255,255,0.05); }
          .instructions h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #667085; margin-bottom: 10px; }
          .instructions li { color: #98A2B3; font-size: 13px; margin-left: 18px; margin-bottom: 6px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Versão ARM64 Atualizada</div>
          <h1>SeuGestor</h1>
          <p>Reconhecimento de voz aprimorado, gírias brasileiras e IA de finanças.</p>
          <a class="btn" href="/app-release.apk">Baixar APK (78.8 MB)</a>
          
          <div class="instructions">
            <h3>Importante antes de instalar:</h3>
            <ol>
              <li>Se tiver o app antigo no celular, <b>desinstale-o primeiro</b> para evitar erro de assinatura.</li>
              <li>Toque no botão azul acima para baixar diretamente.</li>
              <li>Ao concluir o download, abra a notificação e toque em <b>Instalar</b>.</li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }

  if (urlPath === '/app-release.apk') {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Arquivo APK nao encontrado no servidor.');
      return;
    }
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="app-release.apk"',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Nao encontrado');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[APK Server] Ativo em http://0.0.0.0:${PORT}`);
  console.log(`[APK Server] Servindo: ${filePath}`);
});
