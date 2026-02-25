import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import { z } from 'zod';
import { registerHandlers } from './discord/handlers.js';
import { registerEventHandlers } from './discord/event.handlers.js';

const env = z
    .object({
        DISCORD_TOKEN: z.string().min(1),
        PORT: z.string().optional(),
    })
    .parse(process.env);

// HTTP server for Koyeb health checks
const app = express();
app.get('/health', (_req, res) => res.status(200).send('ok'));

const port = Number(env.PORT ?? '8000');
app.listen(port, '0.0.0.0', () => {
    console.log(`HTTP server listening on :${port}`);
});

// Discord bot
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

registerHandlers(client);
registerEventHandlers(client);

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
});

await client.login(env.DISCORD_TOKEN);
