# ZonCharge OS

Estrutura do projeto pronta para deploy.

## Pastas

- **`backend/`** → sobe no **Render** (Web Service)
  - Root Directory no Render: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Variáveis de ambiente: copie de `backend/.env.example`

- **`frontend/`** → sobe no **Vercel** (estático)
  - Root Directory no Vercel: `frontend`
  - Sem build — Vercel detecta como projeto estático

## Antes de subir o frontend

Edite `frontend/api.js` linha 8 e troque pela URL real do seu serviço no Render:

```js
const API_URL = 'https://seu-servico.onrender.com';
```

## Ordem de deploy

1. **Supabase** primeiro → rode `backend/sql/schema.sql` no SQL Editor
2. **Render** → suba o backend, pegue a URL
3. Atualize `frontend/api.js` com a URL do Render
4. **Vercel** → suba o frontend
5. Volte no Render e adicione a URL do Vercel em `ALLOWED_ORIGINS`

Detalhes completos em `backend/README.md`.
