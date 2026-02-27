import { EmbedBuilder } from 'discord.js';

export const WOW_CLASSES = [
    'Death Knight',
    'Demon Hunter',
    'Druid',
    'Evoker',
    'Hunter',
    'Mage',
    'Monk',
    'Paladin',
    'Priest',
    'Rogue',
    'Shaman',
    'Warlock',
    'Warrior',
] as const;

export type WowClass = (typeof WOW_CLASSES)[number];

export const WOW_ROLES = ['Tank', 'Healer', 'DPS'] as const;
export type WowRole = (typeof WOW_ROLES)[number];

export const ROLE_EMOJIS: Record<WowRole, string> = {
    Tank: '🔵',
    Healer: '🟢',
    DPS: '🔴',
};

export const ROLE_CLASSES: Record<WowRole, WowClass[]> = {
    Tank: ['Death Knight', 'Demon Hunter', 'Druid', 'Monk', 'Paladin', 'Warrior'],
    Healer: ['Druid', 'Evoker', 'Monk', 'Paladin', 'Priest', 'Shaman'],
    DPS: [
        'Death Knight',
        'Demon Hunter',
        'Druid',
        'Evoker',
        'Hunter',
        'Mage',
        'Monk',
        'Paladin',
        'Priest',
        'Rogue',
        'Shaman',
        'Warlock',
        'Warrior',
    ],
};

export type PlayerCharacter = { role: WowRole; wowClass: WowClass };

/** Same gold as the event embeds */
export const ROSTER_HEADER_COLOR = 0xC69B3A;

/**
 * Builds a single gold embed with one block-quote section per role.
 * Users appear under each role they registered for.
 */
export function buildRosterEmbed(perUser: Record<string, PlayerCharacter[]>): EmbedBuilder {
    const entries = Object.entries(perUser);

    let description: string;

    if (entries.length === 0) {
        description = '_No one on the roster yet._';
    } else {
        const sections = WOW_ROLES.map((role) => {
            const roleEntries: { userId: string; wowClass: WowClass }[] = [];

            for (const [userId, characters] of entries) {
                for (const c of characters) {
                    if (c.role === role) {
                        roleEntries.push({ userId, wowClass: c.wowClass });
                    }
                }
            }

            roleEntries.sort((a, b) =>
                a.wowClass.localeCompare(b.wowClass) || a.userId.localeCompare(b.userId)
            );

            const header = `${ROLE_EMOJIS[role]} **${role}** (${roleEntries.length})`;
            const lines = roleEntries.length > 0
                ? roleEntries.map((e) => `> <@${e.userId}> — ${e.wowClass}`).join('\n')
                : '> _—_';

            return `${header}\n${lines}`;
        });

        description = sections.join('\n\n');
    }

    return new EmbedBuilder()
        .setColor(ROSTER_HEADER_COLOR)
        .setTitle('⚔️ M+ Roster')
        .setDescription(description);
}
