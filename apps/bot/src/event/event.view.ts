import { EmbedBuilder } from 'discord.js';
import { type WowRole, type PlayerCharacter } from '../roster/roster.view.js';
import type { EventWithSignups } from './event.service.js';

/** Smaller coloured dots for the event list */
const ROLE_DOTS: Record<WowRole, string> = {
    Tank: '\u{1F535}',   // 🔵 blue
    Healer: '\u{1F7E2}', // 🟢 green
    DPS: '\u{1F534}',    // 🔴 red
};

type RosterSnapshot = Record<string, PlayerCharacter[]>;

/**
 * Build the Discord embed for an event.
 *
 * Layout:
 * 🔴 Warrior - @user       (tank)
 * 🟢 Priest  - @user       (healer)
 * 🔵 Mage    - @user       (dps 1)
 * 🔵 Rogue   - @user       (dps 2)
 * 🔵 Hunter  - @user       (dps 3)
 *
 * 🪑 🔴 Warrior - @user, 🔵 Mage - @user   (bench)
 */
export function buildEventEmbed(event: EventWithSignups, roster?: RosterSnapshot): EmbedBuilder {
    const main = event.signups.filter((s) => !s.isBench);
    const bench = event.signups.filter((s) => s.isBench);

    // Find main-slot holders by role
    const tank = main.find((s) => s.role === 'Tank');
    const healer = main.find((s) => s.role === 'Healer');
    const dps = main.filter((s) => s.role === 'DPS');

    /** Look up the WoW class a user is playing for their signed-up role. */
    const classFor = (userId: string, role: WowRole): string => {
        if (!roster?.[userId]) return '';
        const match = roster[userId].find((c) => c.role === role);
        return match ? match.wowClass : '';
    };

    const formatSlot = (s: { userId: string; role: string } | undefined, role: WowRole): string => {
        if (!s) return `${ROLE_DOTS[role]} —`;
        const cls = classFor(s.userId, role);
        return cls
            ? `${ROLE_DOTS[role]} ${cls} - <@${s.userId}>`
            : `${ROLE_DOTS[role]} <@${s.userId}>`;
    };

    const lines: string[] = [];

    // Tank slot
    lines.push(formatSlot(tank, 'Tank'));
    // Healer slot
    lines.push(formatSlot(healer, 'Healer'));
    // DPS slots (always show 3)
    for (let i = 0; i < 3; i++) {
        lines.push(formatSlot(dps[i], 'DPS'));
    }

    // Bench
    if (bench.length > 0) {
        const benchStr = bench
            .map((s) => {
                const role = s.role as WowRole;
                const cls = classFor(s.userId, role);
                return cls
                    ? `${ROLE_DOTS[role]} ${cls} - <@${s.userId}>`
                    : `${ROLE_DOTS[role]} <@${s.userId}>`;
            })
            .join(', ');
        lines.push('');
        lines.push(`🪑 ${benchStr}`);
    }

    const dateStr = event.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timeStr = event.scheduledAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
    });

    return new EmbedBuilder()
        .setColor(0xC69B3A)
        .setTitle(`📅 ${dateStr} at ${timeStr} Server Time`)
        .setDescription(`${event.description ? event.description + '\n\n' : ''}${lines.join('\n')}`);
}
