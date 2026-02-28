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

export type PlayerCharacter = { role: WowRole; wowClass: WowClass; isMain: boolean };

/** Same gold as the event embeds */
export const ROSTER_HEADER_COLOR = 0xC69B3A;

/**
 * Builds a single gold embed with one block-quote section per role.
 * Users appear under each role they registered for.
 * The main class is displayed in bold; others are plain.
 */
export function buildRosterEmbed(perUser: Record<string, PlayerCharacter[]>): EmbedBuilder {
    const entries = Object.entries(perUser);

    let description: string;

    if (entries.length === 0) {
        description = '_No one on the roster yet._';
    } else {
        const sections = WOW_ROLES.map((role) => {
            // Group characters per user for this role, keyed by userId
            const userChars = new Map<string, PlayerCharacter[]>();

            for (const [userId, characters] of entries) {
                for (const c of characters) {
                    if (c.role === role) {
                        if (!userChars.has(userId)) userChars.set(userId, []);
                        userChars.get(userId)!.push(c);
                    }
                }
            }

            // Build sorted list: main first, then alphabetical; sort entries by main class name
            const grouped = [...userChars.entries()].map(([userId, chars]) => {
                // Sort: main first, then alphabetical
                const sorted = [...chars].sort((a, b) => {
                    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
                    return a.wowClass.localeCompare(b.wowClass);
                });
                return { userId, chars: sorted };
            });
            grouped.sort((a, b) =>
                a.chars[0].wowClass.localeCompare(b.chars[0].wowClass) || a.userId.localeCompare(b.userId)
            );

            const header = `${ROLE_EMOJIS[role]} **${role}** (${grouped.length})`;
            const lines = grouped.length > 0
                ? grouped.map((e) => {
                    const classDisplay = e.chars.map((c) =>
                        c.isMain ? `**${c.wowClass}**` : c.wowClass
                    ).join(', ');
                    return `> <@${e.userId}> — ${classDisplay}`;
                }).join('\n')
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
