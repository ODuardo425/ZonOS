# ZonCharge OS — Backend Setup

Stack: **Vercel** (frontend) · **Render** (Node API) · **Supabase** (PostgreSQL)

---

## 1. Supabase — Banco de Dados

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o arquivo `sql/schema.sql` completo
3. Anote duas credenciais em **Settings → API**:
   - `Project URL` → será o `SUPABASE_URL`
   - `service_role` secret key → será o `SUPABASE_SERVICE_KEY`

---

## 2. Render — Backend Node.js

1. Crie um novo **Web Service** no [render.com](https://render.com)
2. Conecte este repositório (pasta `/backend`)
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18+

4. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | URL do seu projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Chave `service_role` do Supabase |
| `JWT_SECRET` | String aleatória longa (veja abaixo) |
| `ALLOWED_ORIGINS` | URL do seu app no Vercel, ex: `https://seu-app.vercel.app` |
| `PORT` | `3000` |

**Gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

5. Após o deploy, a URL será algo como `https://zoncharge-os.onrender.com`
6. Teste: `GET https://zoncharge-os.onrender.com/health` deve retornar `{ "ok": true }`

---

## 3. Criar usuários iniciais

Com o backend rodando, crie os usuários via API (uma vez só):

```bash
# Substitua pela URL do Render e escolha uma senha forte para o gestor
curl -X POST https://zoncharge-os.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"gestor","senha":"SuaSenhaForte"}'
```

Como ainda não há usuários no banco, use o **Supabase SQL Editor** para inserir o primeiro:

```sql
-- Execute no SQL Editor do Supabase
-- Substitua o hash pelo resultado de: node -e "const b=require('bcryptjs');b.hash('SuaSenha',12).then(console.log)"
INSERT INTO usuarios (usuario, senha_hash, nome, perfil)
VALUES
  ('gestor',     '$2a$12$HASH_AQUI', 'Ricardo Dias',  'gestor'),
  ('financeiro', '$2a$12$HASH_AQUI', 'Camila Souza',  'financeiro'),
  ('operador',   '$2a$12$HASH_AQUI', 'Lucas Mendes',  'operador');
```

**Gerar hash localmente:**
```bash
node -e "const b=require('bcryptjs'); b.hash('SuaSenha',12).then(console.log)"
```

---

## 4. Vercel — Frontend

1. Acesse [vercel.com](https://vercel.com) e crie um novo projeto
2. Faça upload ou conecte o repositório com o `index.html`
3. **Antes do deploy**, edite `api.js` linha 8:
   ```js
   const API_URL = 'https://zoncharge-os.onrender.com'; // ← URL do Render
   ```
4. O `index.html` precisa carregar o `api.js` **antes** do script principal:
   ```html
   <!-- Adicione no <head> ou antes do </body> -->
   <script src="api.js"></script>
   ```
5. No `index.html`, remova (ou deixe vazio) `const SHEETS_URL`:
   ```js
   const SHEETS_URL = ''; // mantido para compatibilidade, não é mais usado
   ```

---

## 5. Cloudinary (sem alterações)

O upload de fotos continua direto do frontend para o Cloudinary (já configurado no `index.html`). Nenhuma alteração necessária.

---

## Estrutura de arquivos

```
backend/
├── src/
│   ├── server.js              # Express app principal
│   ├── supabase.js            # Cliente Supabase singleton
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   └── routes/
│       ├── auth.js            # POST /auth/login, /auth/login-prestador
│       ├── os.js              # CRUD /os
│       ├── preenchimentos.js  # /preenchimentos
│       ├── usuarios.js        # /usuarios
│       └── prestadores.js     # /prestadores
├── sql/
│   └── schema.sql             # Criar tabelas no Supabase
├── api.js                     # ← Coloque junto ao index.html no Vercel
├── package.json
├── .env.example
└── README.md
```

---

## Endpoints resumidos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login gestor/operador → JWT |
| POST | `/auth/login-prestador` | Login prestador → JWT |
| GET | `/os` | Lista OS (com filtros) |
| GET | `/os/:num` | OS individual |
| POST | `/os` | Criar OS |
| PUT | `/os/:num` | Upsert OS completa |
| PATCH | `/os/:num` | Atualizar campos específicos |
| DELETE | `/os/:num` | Cancelar OS (soft-delete) |
| GET | `/preenchimentos/:osNum` | Preenchimento de uma OS |
| POST | `/preenchimentos` | Salvar preenchimento |
| GET | `/usuarios` | Listar usuários |
| POST | `/usuarios` | Criar/atualizar usuário |
| GET | `/prestadores` | Listar prestadores |
| POST | `/prestadores` | Criar/atualizar prestador |
| PATCH | `/prestadores/:login` | Bloquear/desbloquear |
| GET | `/health` | Healthcheck |
