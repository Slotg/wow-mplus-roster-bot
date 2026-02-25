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
    Tank: '🔵', // Blue circle
    Healer: '🟢', // Green circle
    DPS: '🔴', // Red circle
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

export function formatRosterByPlayer(perUser: Record<string, PlayerCharacter[]>): string {
    const entries = Object.entries(perUser);
    if (entries.length === 0) return '_No one on the roster yet._';

    // Stable order; later you can sort by display name if you fetch members.
    entries.sort(([a], [b]) => a.localeCompare(b));

    return entries
        .map(([userId, characters]) => {
            if (characters.length === 0) return `<@${userId}> — —`;

            // Sort characters by role then class
            const sorted = [...characters].sort((a, b) => {
                if (a.role !== b.role) return WOW_ROLES.indexOf(a.role) - WOW_ROLES.indexOf(b.role);
                return a.wowClass.localeCompare(b.wowClass);
            });

            const clsStr = sorted
                .map((c) => `${ROLE_EMOJIS[c.role]} ${c.wowClass}`)
                .join(', ');

            return `<@${userId}> — ${clsStr}`;
        })
        .join('\n');
}
