# 🎮 QuizLive — Quiz em Tempo Real

Sistema de quiz interativo em tempo real com Firebase. Sem build, sem npm, sem instalação — apenas HTML puro com Firebase via CDN.

---

## 🚀 Deploy em 3 passos

### Opção 1: GitHub Pages (mais fácil)

1. Crie um repositório no GitHub (público ou privado)
2. Faça upload dos 4 arquivos deste projeto
3. Vá em **Settings → Pages → Deploy from branch → main → / (root)**
4. Pronto! Seu quiz estará online em `https://SEU_USUARIO.github.io/NOME_DO_REPO`

### Opção 2: Vercel (automático com GitHub)

1. Acesse [vercel.com](https://vercel.com) e conecte seu GitHub
2. Importe o repositório — Vercel detecta HTML estático automaticamente
3. Clique em **Deploy**
4. ✅ URL gerada automaticamente!

---

## 🔥 Configurar Firebase

### 1. Ativar Authentication Anônimo

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto `quiz-realtime-290ec`
3. Vá em **Authentication → Sign-in method**
4. Ative **Anonymous** e salve

### 2. Criar o Firestore

1. Vá em **Firestore Database → Create database**
2. Escolha **Production mode**
3. Selecione uma região (ex: `southamerica-east1`)

### 3. Aplicar as regras de segurança

1. No Firestore, vá em **Rules**
2. Copie e cole o conteúdo de `firestore.rules`
3. Clique em **Publish**

---

## 📁 Estrutura dos arquivos

```
quizlive/
├── index.html        ← App completo (tudo em 1 arquivo)
├── firestore.rules   ← Regras de segurança do Firestore
├── firebase.json     ← Config para Firebase Hosting (opcional)
└── README.md         ← Este arquivo
```

---

## 🎯 Como usar

### Para o Admin
1. Acesse a URL do site
2. Clique em **"Criar sala (Admin)"**
3. Dê um nome à sala e cadastre as perguntas
4. Clique em **"Criar sala e gerar QR Code"**
5. Compartilhe o QR Code ou link com os participantes
6. Aguarde os jogadores entrarem e clique em **"Iniciar jogo"**
7. Avance as perguntas manualmente com **"Próxima pergunta"**
8. Ao final, veja o pódio e ranking!

### Para o Participante
1. Escaneie o QR Code ou acesse o link da sala
2. Digite seu nome e escolha um avatar
3. Aguarde o admin iniciar
4. Responda as perguntas (1 resposta por pergunta)
5. Veja seu feedback em tempo real
6. Confira o ranking ao final!

---

## 🗄️ Estrutura do Firestore

| Coleção | Campos |
|---------|--------|
| `rooms` | id, nome, status, currentQuestion, adminUid, totalQuestions |
| `questions` | roomId, pergunta, opcoes[], correta, pontuacao, ordem |
| `players` | nome, avatar, score, roomId, entradoEm |
| `answers` | playerId, questionId, roomId, resposta, correta, pontosGanhos |

---

## ✨ Funcionalidades

- ✅ Criação de salas com ID único
- ✅ QR Code automático para participantes
- ✅ Cadastro de perguntas com múltiplas opções
- ✅ Indicação da resposta correta + pontuação
- ✅ Controle manual do avanço das perguntas
- ✅ Respostas em tempo real via Firestore
- ✅ 1 resposta por jogador por pergunta
- ✅ Feedback visual ao responder (acerto/erro)
- ✅ Ranking ao vivo durante o jogo
- ✅ Pódio animado ao final
- ✅ Avatares visuais (25 opções)
- ✅ Interface responsiva (mobile-first)
- ✅ Autenticação anônima (sem login)
- ✅ Funciona 100% no browser, sem instalação

---

## 🔧 Tecnologias

- **HTML + CSS + JavaScript** — zero frameworks, zero build
- **Firebase Firestore** — banco de dados em tempo real
- **Firebase Auth** — autenticação anônima
- **QRCode.js** — geração de QR Code via CDN
- **Google Fonts** (Syne + DM Sans)
