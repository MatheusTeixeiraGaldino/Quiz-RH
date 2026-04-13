# ⚡ QuizLive v2 — Quiz em Tempo Real

Plataforma de quiz interativo em tempo real com React + Firebase. QR Code, ranking ao vivo, pódio animado, upload de imagens e muito mais.

---

## 🚀 Deploy no GitHub Pages (recomendado — 100% gratuito)

### Passo 1 — Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e crie um novo repositório (ex: `quizlive`)
2. Deixe **público** (obrigatório para GitHub Pages grátis)

### Passo 2 — Fazer upload dos arquivos

Faça upload de **todos os arquivos e pastas** deste projeto para o repositório. A estrutura deve ser:

```
quizlive/
├── .github/
│   └── workflows/
│       └── deploy.yml       ← CI/CD automático
├── src/
│   ├── components/
│   │   └── UI.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── AdminCreate.jsx
│   │   ├── AdminControl.jsx
│   │   ├── PlayerJoin.jsx
│   │   ├── PlayerWait.jsx
│   │   ├── PlayerGame.jsx
│   │   ├── Podium.jsx
│   │   ├── Ranking.jsx
│   │   └── QuizHistory.jsx
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   ├── firebase.js
│   ├── main.jsx
│   └── store.js
├── .gitignore
├── firebase.json
├── firestore.rules
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vercel.json
└── vite.config.js
```

> ⚠️ **NÃO faça upload do arquivo `.env`** — as chaves vão como Secrets (próximo passo)

### Passo 3 — Configurar Secrets do GitHub

1. No repositório, clique em **Settings → Secrets and variables → Actions**
2. Clique em **New repository secret** e crie cada um dos seguintes:

| Nome do Secret | Valor |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyCJVh32y23TQYaVyeuARiCOjsJu9QJFqOU` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `quiz-realtime-290ec.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `quiz-realtime-290ec` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `quiz-realtime-290ec.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `423790720358` |
| `VITE_FIREBASE_APP_ID` | `1:423790720358:web:fca076cd69d434f8cd84a7` |

### Passo 4 — Ativar GitHub Pages

1. Em **Settings → Pages**
2. Em **Source**, selecione **GitHub Actions**
3. Salve

### Passo 5 — Disparar o deploy

1. Vá em **Actions → Deploy QuizLive → Run workflow**
2. Aguarde ~2 minutos
3. Acesse `https://SEU_USUARIO.github.io/quizlive`

✅ **Pronto! A cada push na branch `main` o deploy é feito automaticamente.**

---

## 🔥 Configurar Firebase (obrigatório)

### 1. Ativar Authentication Anônimo

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto `quiz-realtime-290ec`
3. Vá em **Authentication → Sign-in method**
4. Ative **Anonymous** e salve

### 2. Criar o Firestore

1. Vá em **Firestore Database → Create database**
2. Escolha **Production mode**
3. Selecione a região `southamerica-east1`

### 3. Aplicar as regras de segurança

1. No Firestore, vá em **Rules**
2. Cole o conteúdo do arquivo `firestore.rules`
3. Clique em **Publish**

### 4. Ativar Firebase Storage (para upload de imagens)

1. Vá em **Storage → Get started**
2. Aceite as regras padrão
3. Escolha a região

---

## 🌐 Deploy na Vercel (alternativa)

1. Acesse [vercel.com](https://vercel.com) e conecte seu GitHub
2. Importe o repositório
3. Em **Environment Variables**, adicione as mesmas 6 variáveis acima
4. Clique em **Deploy**

---

## 🎯 Como usar

### Para o Admin (Host)
1. Acesse o site e clique em **"Criar sala (Admin)"**
2. Dê um nome à sala
3. Ative o **modo automático** se quiser que as perguntas avancem sozinhas
4. Adicione perguntas (com imagens, múltipla escolha ou V/F, pontuação e tempo)
5. **Exporte o quiz como JSON** para reutilizar depois
6. Clique em **"Criar sala e gerar QR Code"**
7. Compartilhe o QR Code ou link
8. Aguarde jogadores e clique em **"Iniciar jogo"**
9. Avance as perguntas manualmente ou use o modo automático
10. Veja pódio e ranking ao final!

### Para o Participante
1. Escaneie o QR Code ou acesse o link da sala
2. Digite seu nome e escolha um avatar
3. Aguarde o admin iniciar
4. Responda as perguntas (mais rápido = mais pontos!)
5. Veja feedback em tempo real
6. Confira o ranking e pódio ao final

---

## ✨ Funcionalidades

- ✅ Sala com código único e QR Code automático
- ✅ Múltipla escolha (2–6 opções) e Verdadeiro/Falso
- ✅ Upload de imagens nas perguntas
- ✅ Pontuação baseada em velocidade de resposta
- ✅ Timer por pergunta com alerta visual
- ✅ Modo automático (passa perguntas sozinho)
- ✅ Ranking ao vivo durante o jogo
- ✅ Pódio animado com confete 🎉
- ✅ Exportar/Importar quizzes como JSON
- ✅ Histórico de salas criadas
- ✅ 30 avatares para escolher
- ✅ Sons de feedback (acerto/erro)
- ✅ Responsivo — funciona em celular e desktop
- ✅ Autenticação anônima (sem cadastro)
- ✅ Deploy automático via GitHub Actions

---

## 🗄️ Estrutura do Firestore

| Coleção | Campos principais |
|---------|-------------------|
| `rooms` | nome, status, currentQuestion, adminUid, autoMode, autoInterval, totalQuestions |
| `questions` | roomId, type, pergunta, opcoes[], correta, pontuacao, tempo, imagem, ordem |
| `players` | nome, avatar, score, roomId |
| `answers` | playerId, questionId, roomId, resposta, correta, pontosGanhos |

---

## 🔧 Rodar localmente

```bash
npm install
# Crie um .env com as variáveis Firebase (veja .env.example)
npm run dev
```
