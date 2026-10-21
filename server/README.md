# Servidor Proxy Seguro para Gemini AI

Este servidor atua como um proxy intermediário para proteger a **API Key do Google Gemini**, evitando que ela fique exposta no bundle compilado do aplicativo React Native / Expo (`.apk`, `.aab`, `.ipa`).

---

## 🔒 Por que usar este proxy?

Variáveis que começam com `EXPO_PUBLIC_` no Expo são embutidas em texto puro no código JavaScript do app. Qualquer usuário pode descompilar o APK e roubar sua chave.

Com o proxy:
1. Sua `GEMINI_API_KEY` fica **apenas** nas variáveis de ambiente do servidor backend.
2. O app mobile apenas chama o proxy (`POST /api/ai/parse-command`, `/api/ai/insights`, etc.).
3. Você pode aplicar rate-limiting, regras de CORS e monitorar o tráfego.

---

## 🚀 Como Rodar Localmente

1. Entre na pasta:
   ```bash
   cd server
   npm install
   ```

2. Crie um arquivo `.env` na pasta `server`:
   ```env
   GEMINI_API_KEY=sua_chave_do_google_aqui
   PORT=3001
   ```

3. Inicie o servidor:
   ```bash
   npm start
   ```

4. No `.env` raiz do aplicativo mobile, configure:
   ```env
   EXPO_PUBLIC_AI_PROXY_URL=http://SEU_IP_LOCAL:3001
   ```

---

## ☁️ Como Fazer Deploy Gratuito (1 Clique)

Você pode publicar este serviço em plataformas gratuitas como **Render**, **Railway** ou **Vercel**:

### No Render / Railway:
- Conecte seu repositório Git.
- Diretório raiz: `server`.
- Build Command: `npm install`.
- Start Command: `node index.js`.
- Variável de ambiente: `GEMINI_API_KEY=...`.
- Copie a URL gerada (ex: `https://meu-gestor-ai.onrender.com`) e coloque no `.env` do app mobile:
  ```env
  EXPO_PUBLIC_AI_PROXY_URL=https://meu-gestor-ai.onrender.com
  ```
