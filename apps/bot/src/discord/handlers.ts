import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    type Client,
    type Interaction,
} from 'discord.js';
import { WOW_CLASSES, WOW_ROLES, ROLE_CLASSES, ROLE_EMOJIS, type WowClass, type WowRole, buildRosterEmbed } from '../roster/roster.view.js';
import {
    getGuildRoster,
    getRosterSnapshot,
    removeMember,
    addMemberCharacter,
    removeMemberCharacter,
    setMainCharacter,
    upsertGuildRoster,
} from '../roster/roster.service.js';

export const ROSTER_ADD_CHAR_ID = 'roster_add_character';
export const ROSTER_REMOVE_ME_ID = 'roster_remove_me';

export const EPHEMERAL_ROLE_SELECT_ID = 'e_roster_role_select';
export const EPHEMERAL_CLASS_SELECT_ID = 'e_roster_class_select';
export const EPHEMERAL_REMOVE_CHAR_SELECT_ID = 'e_roster_remove_char_select';
export const EPHEMERAL_SET_MAIN_SELECT_ID = 'e_roster_set_main_select';

function buildMainComponents() {
    const addCharBtn = new ButtonBuilder()
        .setCustomId(ROSTER_ADD_CHAR_ID)
        .setLabel('Add/Edit Character')
        .setStyle(ButtonStyle.Primary);

    const removeBtn = new ButtonBuilder()
        .setCustomId(ROSTER_REMOVE_ME_ID)
        .setLabel('Remove Me Completely')
        .setStyle(ButtonStyle.Danger);

    return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(addCharBtn, removeBtn),
    ];
}

async function getRosterEmbed(guildId: string) {
    const snapshot = await getRosterSnapshot(guildId);
    return buildRosterEmbed(snapshot);
}

/** Pushes the updated embed back to the persistent roster message, if one exists. */
async function refreshRosterMessage(client: Client, guildId: string) {
    const roster = await getGuildRoster(guildId);
    if (!roster) return;
    const channel = await client.channels.fetch(roster.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const msg = await channel.messages.fetch(roster.messageId).catch(() => null);
    if (!msg) return;
    const embed = await getRosterEmbed(guildId);
    await msg.edit({ embeds: [embed], components: buildMainComponents() });
}

export function registerHandlers(client: Client) {
    client.on('interactionCreate', async (interaction: Interaction) => {
        // ---- Slash commands ----
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName !== 'roster') return;

            const sub = interaction.options.getSubcommand();
            const guildId = interaction.guildId;

            if (!guildId) {
                await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
                return;
            }

            if (sub === 'setup') {
                // Create the roster message in this channel and store it as the single guild roster.
                const embed = await getRosterEmbed(guildId);

                const msg = await interaction.reply({
                    embeds: [embed],
                    components: buildMainComponents(),
                    fetchReply: true,
                });

                await upsertGuildRoster({
                    guildId,
                    channelId: interaction.channelId,
                    messageId: msg.id,
                });

                return;
            }

            if (sub === 'show') {
                const embed = await getRosterEmbed(guildId);
                await interaction.reply({
                    embeds: [embed],
                    components: buildMainComponents(),
                    ephemeral: true,
                });
                return;
            }

            if (sub === 'refresh') {
                const roster = await getGuildRoster(guildId);
                if (!roster) {
                    await interaction.reply({ content: 'No roster set up yet. Run `/roster setup` first.', ephemeral: true });
                    return;
                }

                const channel = await client.channels.fetch(roster.channelId);
                if (!channel?.isTextBased()) {
                    await interaction.reply({ content: 'Could not find the roster channel.', ephemeral: true });
                    return;
                }

                const msg = await channel.messages.fetch(roster.messageId).catch(() => null);
                if (!msg) {
                    await interaction.reply({ content: 'Could not find the roster message — it may have been deleted. Run `/roster setup` again.', ephemeral: true });
                    return;
                }

                const embed = await getRosterEmbed(guildId);
                await msg.edit({ embeds: [embed], components: buildMainComponents() });

                await interaction.reply({ content: '✅ Roster message refreshed!', ephemeral: true });
                return;
            }

            return;
        }

        // ---- Button: "Add/Edit Character" ----
        if (interaction.isButton() && interaction.customId === ROSTER_ADD_CHAR_ID) {
            const guildId = interaction.guildId;
            if (!guildId) return;

            const roster = await getGuildRoster(guildId);
            if (!roster) {
                await interaction.reply({ content: 'No roster set up yet. Run `/roster setup` first.', ephemeral: true });
                return;
            }

            const snapshot = await getRosterSnapshot(guildId);
            const userCharacters = snapshot[interaction.user.id] || [];

            const roleMenu = new StringSelectMenuBuilder()
                .setCustomId(EPHEMERAL_ROLE_SELECT_ID)
                .setPlaceholder('Select a Role to add...')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    WOW_ROLES.map((role) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(role)
                            .setValue(role)
                            .setEmoji(ROLE_EMOJIS[role])
                    )
                );

            const components: ActionRowBuilder<any>[] = [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleMenu)
            ];

            // If user has characters, show the removal menu and set-main menu
            if (userCharacters.length > 0) {
                const removeMenu = new StringSelectMenuBuilder()
                    .setCustomId(EPHEMERAL_REMOVE_CHAR_SELECT_ID)
                    .setPlaceholder('Remove an existing character...')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(
                        userCharacters.map((c) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${c.role} ${c.wowClass}${c.isMain ? ' ★' : ''}`)
                                .setValue(`${c.role}:${c.wowClass}`)
                                .setEmoji(ROLE_EMOJIS[c.role])
                        )
                    );
                components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(removeMenu));

                // Only show "Set Main" if the user has more than one character
                if (userCharacters.length > 1) {
                    const setMainMenu = new StringSelectMenuBuilder()
                        .setCustomId(EPHEMERAL_SET_MAIN_SELECT_ID)
                        .setPlaceholder('Set a character as your Main ★...')
                        .setMinValues(1)
                        .setMaxValues(1)
                        .addOptions(
                            userCharacters.map((c) =>
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${c.role} ${c.wowClass}${c.isMain ? ' ★ (current main)' : ''}`)
                                    .setValue(`${c.role}:${c.wowClass}`)
                                    .setEmoji(ROLE_EMOJIS[c.role])
                            )
                        );
                    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(setMainMenu));
                }
            }

            await interaction.reply({
                content: 'Add a new character or manage your existing ones:',
                components,
                ephemeral: true,
            });
            return;
        }

        // ---- Ephemeral Select: Role chosen => Show Class menu ----
        if (interaction.isStringSelectMenu() && interaction.customId === EPHEMERAL_ROLE_SELECT_ID) {
            const role = interaction.values[0] as WowRole;
            const validClasses = ROLE_CLASSES[role];

            const classMenu = new StringSelectMenuBuilder()
                .setCustomId(`${EPHEMERAL_CLASS_SELECT_ID}_${role}`) // store role in customId since select values don't stack easily
                .setPlaceholder(`Select a Class for ${role}...`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    validClasses.map((cls) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(cls)
                            .setValue(cls)
                    )
                );

            await interaction.update({
                content: `You selected ${ROLE_EMOJIS[role]} **${role}**. Now select the **Class**:`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(classMenu)],
            });
            return;
        }

        // ---- Ephemeral Select: Class chosen => Save Character ----
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith(EPHEMERAL_CLASS_SELECT_ID)) {
            const guildId = interaction.guildId;
            if (!guildId) return;

            // Extract role from customId
            const role = interaction.customId.split('_').pop() as WowRole;
            const wowClass = interaction.values[0] as WowClass;

            await addMemberCharacter({
                guildId,
                userId: interaction.user.id,
                role,
                wowClass,
            });

            await refreshRosterMessage(client, guildId);

            // Check how many classes this user now has — if more than 1, prompt to set main
            const snapshot = await getRosterSnapshot(guildId);
            const userChars = snapshot[interaction.user.id] ?? [];
            const currentMain = userChars.find((c) => c.isMain);

            if (userChars.length > 1) {
                // Offer a "set as main" prompt
                const setMainMenu = new StringSelectMenuBuilder()
                    .setCustomId(EPHEMERAL_SET_MAIN_SELECT_ID)
                    .setPlaceholder('Set a character as your Main ★...')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(
                        userChars.map((c) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${c.role} ${c.wowClass}${c.isMain ? ' ★ (current main)' : ''}`)
                                .setValue(`${c.role}:${c.wowClass}`)
                                .setEmoji(ROLE_EMOJIS[c.role])
                        )
                    );

                await interaction.update({
                    content: `✅ Added ${ROLE_EMOJIS[role]} **${role} — ${wowClass}**! Your current main is **${currentMain ? `${currentMain.role} ${currentMain.wowClass}` : 'not set'}**. Want to change it?`,
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(setMainMenu)],
                });
            } else {
                await interaction.update({
                    content: `✅ Added ${ROLE_EMOJIS[role]} **${role} — ${wowClass}** to the roster! (Auto-set as your ★ Main)`,
                    components: [],
                });
            }
            return;
        }

        // ---- Ephemeral Select: Set Main character ----
        if (interaction.isStringSelectMenu() && interaction.customId === EPHEMERAL_SET_MAIN_SELECT_ID) {
            const guildId = interaction.guildId;
            if (!guildId) return;

            const [roleStr, wowClassStr] = interaction.values[0].split(':');
            const role = roleStr as WowRole;
            const wowClass = wowClassStr as WowClass;

            await setMainCharacter({
                guildId,
                userId: interaction.user.id,
                role,
                wowClass,
            });

            await refreshRosterMessage(client, guildId);

            await interaction.update({
                content: `★ **${role} — ${wowClass}** is now your Main character!`,
                components: [],
            });
            return;
        }

        // ---- Ephemeral Select: Remove specific character ----
        if (interaction.isStringSelectMenu() && interaction.customId === EPHEMERAL_REMOVE_CHAR_SELECT_ID) {
            const guildId = interaction.guildId;
            if (!guildId) return;

            const [roleStr, wowClassStr] = interaction.values[0].split(':');
            const role = roleStr as WowRole;
            const wowClass = wowClassStr as WowClass;

            await removeMemberCharacter({
                guildId,
                userId: interaction.user.id,
                role,
                wowClass,
            });

            await refreshRosterMessage(client, guildId);

            await interaction.update({
                content: `Removed ${ROLE_EMOJIS[role]} **${role} — ${wowClass}** from your roster.`,
                components: [],
            });
            return;
        }

        // ---- Button: Remove me completely ----
        if (interaction.isButton() && interaction.customId === ROSTER_REMOVE_ME_ID) {
            const guildId = interaction.guildId;
            if (!guildId) return;

            const roster = await getGuildRoster(guildId);
            if (!roster) {
                await interaction.reply({ content: 'No roster set up yet.', ephemeral: true });
                return;
            }

            await removeMember({ guildId, userId: interaction.user.id });

            const embed = await getRosterEmbed(guildId);
            await interaction.update({ embeds: [embed], components: buildMainComponents() });
            return;
        }
    });
}
