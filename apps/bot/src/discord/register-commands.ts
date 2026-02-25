import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';

const env = z
    .object({
        DISCORD_TOKEN: z.string().min(1),
        DISCORD_APP_ID: z.string().min(1),
        // Optional: register instantly to one guild while developing:
        DEV_GUILD_ID: z.string().optional(),
    })
    .parse(process.env);

const commands = [
    new SlashCommandBuilder()
        .setName('roster')
        .setDescription('Guild M+ roster')
        .addSubcommand((s) =>
            s.setName('setup').setDescription('Create or move the single roster message to this channel'),
        )
        .addSubcommand((s) => s.setName('show').setDescription('Show where the roster message is'))
        .addSubcommand((s) => s.setName('refresh').setDescription('Re-render the live roster message with the latest layout')),
    new SlashCommandBuilder()
        .setName('event')
        .setDescription('M+ event signups')
        .addSubcommand((s) =>
            s
                .setName('create')
                .setDescription('Create a new event signup'),
        ),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

if (env.DEV_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_APP_ID, env.DEV_GUILD_ID), {
        body: commands,
    });
    console.log('✅ Guild commands registered (DEV_GUILD_ID)');
} else {
    await rest.put(Routes.applicationCommands(env.DISCORD_APP_ID), { body: commands });
    console.log('✅ Global commands registered');
}
