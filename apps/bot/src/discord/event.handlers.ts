import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
    type Client,
    type Interaction,
} from 'discord.js';
import { ROLE_EMOJIS, type WowRole } from '../roster/roster.view.js';
import { getRosterSnapshot } from '../roster/roster.service.js';
import { createEvent, cancelEvent, getEventById, getEventByMessageId, signupUser, removeSignup } from '../event/event.service.js';
import { buildEventEmbed } from '../event/event.view.js';

export const EVENT_SIGNUP_BTN = 'event_signup';
export const EVENT_REMOVE_BTN = 'event_remove';
export const EVENT_CANCEL_BTN = 'event_cancel';
export const EVENT_ROLE_SELECT = 'event_role_select';
export const EVENT_CREATE_MODAL = 'event_create_modal';

function buildEventButtons() {
    return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(EVENT_SIGNUP_BTN)
                .setLabel('Sign Up')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(EVENT_REMOVE_BTN)
                .setLabel('Remove Me')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(EVENT_CANCEL_BTN)
                .setLabel('Cancel Event')
                .setStyle(ButtonStyle.Danger),
        ),
    ];
}

async function refreshEventEmbed(client: Client, messageId: string) {
    try {
        const event = await getEventByMessageId(messageId);
        if (!event) return;

        const channel = await client.channels.fetch(event.channelId).catch(() => null);
        if (!channel?.isTextBased()) return;

        const msg = await channel.messages.fetch(event.messageId).catch(() => null);
        if (!msg) return;

        const roster = await getRosterSnapshot(event.guildId);
        const embed = buildEventEmbed(event, roster);
        await msg.edit({ embeds: [embed] });
    } catch (error) {
        // Log but don't rethrow — a failed embed refresh should never break the interaction
        console.error('[refreshEventEmbed] Could not refresh embed (check bot channel permissions):', error);
    }
}

export function registerEventHandlers(client: Client) {
    client.on('interactionCreate', async (interaction: Interaction) => {
        try {
        // ---- /event create ----
        if (interaction.isChatInputCommand() && interaction.commandName === 'event') {
            const sub = interaction.options.getSubcommand();
            const guildId = interaction.guildId;

            if (!guildId) {
                await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
                return;
            }

            if (sub === 'create') {
                const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

                const modal = new ModalBuilder()
                    .setCustomId(EVENT_CREATE_MODAL)
                    .setTitle('Create Event');

                const dateInput = new TextInputBuilder()
                    .setCustomId('event_date')
                    .setLabel('Date (YYYY-MM-DD)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(today)
                    .setRequired(true);

                const timeInput = new TextInputBuilder()
                    .setCustomId('event_time')
                    .setLabel('Server Time (HH:MM)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('20:00')
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('event_description')
                    .setLabel('Description (optional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
                );

                await interaction.showModal(modal);
                return;
            }

            return;
        }

        // ---- Button: Sign Up ----
        if (interaction.isButton() && interaction.customId === EVENT_SIGNUP_BTN) {
            const guildId = interaction.guildId;
            if (!guildId) return;

            const event = await getEventByMessageId(interaction.message.id);
            if (!event) {
                await interaction.reply({ content: 'Could not find this event.', ephemeral: true });
                return;
            }

            // Check if user is already signed up
            const existingSignup = event.signups.find((s) => s.userId === interaction.user.id);
            if (existingSignup) {
                await interaction.reply({
                    content: 'You are already signed up for this event. Remove yourself first to change your role.',
                    ephemeral: true,
                });
                return;
            }

            // Look up user's roster roles
            const snapshot = await getRosterSnapshot(guildId);
            const userChars = snapshot[interaction.user.id] || [];
            const uniqueRoles = [...new Set(userChars.map((c) => c.role))];

            if (uniqueRoles.length === 1) {
                // Single role → auto-signup
                const role = uniqueRoles[0];
                await signupUser({ eventId: event.id, userId: interaction.user.id, role });
                await refreshEventEmbed(client, event.messageId);
                await interaction.reply({
                    content: `Signed up as ${ROLE_EMOJIS[role]} **${role}**!`,
                    ephemeral: true,
                });
                return;
            }

            // Multiple roles or no roster → show role picker
            const rolesToShow = uniqueRoles.length > 1 ? uniqueRoles : (['Tank', 'Healer', 'DPS'] as WowRole[]);

            const roleMenu = new StringSelectMenuBuilder()
                .setCustomId(`${EVENT_ROLE_SELECT}_${event.id}`)
                .setPlaceholder('Select your role for this event...')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    rolesToShow.map((role) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(role)
                            .setValue(role)
                            .setEmoji(ROLE_EMOJIS[role])
                    )
                );

            await interaction.reply({
                content: 'Select your role for this event:',
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleMenu)],
                ephemeral: true,
            });
            return;
        }

        // ---- Select: Role chosen for event ----
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith(EVENT_ROLE_SELECT)) {
            const eventId = interaction.customId.slice(EVENT_ROLE_SELECT.length + 1);
            const role = interaction.values[0] as WowRole;

            await signupUser({ eventId, userId: interaction.user.id, role });

            // Find the event to refresh the embed (ephemeral message doesn't have event messageId)
            const dbEvent = await getEventById(eventId);

            if (dbEvent) {
                await refreshEventEmbed(client, dbEvent.messageId);
            }

            await interaction.update({
                content: `Signed up as ${ROLE_EMOJIS[role]} **${role}**!`,
                components: [],
            });
            return;
        }

        // ---- Button: Remove Me ----
        if (interaction.isButton() && interaction.customId === EVENT_REMOVE_BTN) {
            const event = await getEventByMessageId(interaction.message.id);
            if (!event) {
                await interaction.reply({ content: 'Could not find this event.', ephemeral: true });
                return;
            }

            const existingSignup = event.signups.find((s) => s.userId === interaction.user.id);
            if (!existingSignup) {
                await interaction.reply({ content: 'You are not signed up for this event.', ephemeral: true });
                return;
            }

            await removeSignup({ eventId: event.id, userId: interaction.user.id });
            await refreshEventEmbed(client, event.messageId);
            await interaction.reply({
                content: 'You have been removed from this event.',
                ephemeral: true,
            });
            return;
        }
        // ---- Modal: Event Create submitted ----
        if (interaction.isModalSubmit() && interaction.customId === EVENT_CREATE_MODAL) {
            const guildId = interaction.guildId;
            if (!guildId) {
                await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
                return;
            }

            const dateStr = interaction.fields.getTextInputValue('event_date');
            const timeStr = interaction.fields.getTextInputValue('event_time');
            const description = interaction.fields.getTextInputValue('event_description').trim() || undefined;

            const scheduledAt = new Date(`${dateStr}T${timeStr}:00Z`);
            if (isNaN(scheduledAt.getTime())) {
                await interaction.reply({
                    content: 'Invalid date/time. Use `YYYY-MM-DD` for date and `HH:MM` for time.',
                    ephemeral: true,
                });
                return;
            }

            const channelId = interaction.channelId;
            if (!channelId) {
                await interaction.reply({ content: 'Could not determine channel.', ephemeral: true });
                return;
            }

            await interaction.deferReply();
            const reply = await interaction.fetchReply();

            const event = await createEvent({
                guildId,
                channelId,
                messageId: reply.id,
                creatorId: interaction.user.id,
                title: dateStr,
                description,
                scheduledAt,
            });

            const roster = await getRosterSnapshot(guildId);
            const embed = buildEventEmbed(event, roster);

            // Ping all roster members so they get notified, then erase the
            // text so the message shows only the embed (notifications already sent).
            const rosterPings = Object.keys(roster)
                .map((id) => `<@${id}>`)
                .join(' ');

            await interaction.editReply({
                embeds: [embed],
                components: buildEventButtons(),
            });

            // Send pings as a brand-new follow-up message — only new messages
            // trigger real mention notifications in Discord (edits don't).
            // Then delete it so only the embed remains.
            if (rosterPings) {
                const pingMsg = await interaction.followUp({
                    content: rosterPings,
                    fetchReply: true,
                });
                await pingMsg.delete().catch(() => null);
            }
            return;
        }

        // ---- Button: Cancel Event ----
        if (interaction.isButton() && interaction.customId === EVENT_CANCEL_BTN) {
            const event = await getEventByMessageId(interaction.message.id);
            if (!event) {
                await interaction.reply({ content: 'Could not find this event.', ephemeral: true });
                return;
            }

            if (event.creatorId !== interaction.user.id) {
                await interaction.reply({
                    content: '❌ Only the event creator can cancel this event.',
                    ephemeral: true,
                });
                return;
            }

            await cancelEvent(event.id);
            await interaction.update({
                embeds: [
                    {
                        title: interaction.message.embeds[0]?.title ?? 'Event',
                        description: '❌ **This event has been cancelled.**',
                        color: 0xff0000,
                    },
                ],
                components: [],
            });
            return;
        }
        } catch (error) {
            console.error('[interactionCreate] Unhandled error:', error);
            // Try to tell the user something went wrong
            try {
                const reply = { content: '❌ Something went wrong handling that interaction.', ephemeral: true };
                if ('replied' in interaction && 'deferred' in interaction) {
                    const i = interaction as { replied: boolean; deferred: boolean; followUp: (r: typeof reply) => Promise<unknown>; reply: (r: typeof reply) => Promise<unknown> };
                    if (i.replied || i.deferred) {
                        await i.followUp(reply);
                    } else {
                        await i.reply(reply);
                    }
                }
            } catch {
                // If we can't even reply, just swallow — console.error above is what matters
            }
        }
    });
}
