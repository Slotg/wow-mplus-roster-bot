# WoW M+ Roster Bot

A Discord bot for managing M+ roster signups for a WoW guild.

---

## 🚀 Deploying on Railway

### 1. Push to GitHub
Make sure your code is pushed to a GitHub repository.

### 2. Create a Railway project
1. Go to [railway.app](https://railway.app) and log in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select this repository

### 3. Add a PostgreSQL database
Inside your Railway project, click **+ New** → **Database** → **Add PostgreSQL**.  
Railway will automatically inject `DATABASE_URL` into your bot's environment.

### 4. Set environment variables
In the Railway dashboard, go to your bot service → **Variables** and add:

| Variable | Value |
|---|---|
| `DISCORD_TOKEN` | Your bot token from the [Discord Developer Portal](https://discord.com/developers/applications) |
| `DISCORD_APP_ID` | Your application/client ID |

> `DATABASE_URL` is automatically set by the Railway Postgres plugin — **don't add it manually**.

### 5. Deploy
Railway will build the Docker image from `apps/bot/Dockerfile` and deploy automatically.  
Database migrations run automatically on every startup (`prisma migrate deploy`).

---

## 💻 Local Development

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 20+

### Setup
```bash
# 1. Copy the env template and fill in your Discord credentials
cp apps/bot/.env.example apps/bot/.env

# 2. Start a local Postgres + the bot
docker compose up -d

# 3. Or run the bot with hot-reload (needs the DB running)
cd apps/bot
npm install
npm run dev
```

### Register slash commands
```bash
cd apps/bot
npm run commands:register
```