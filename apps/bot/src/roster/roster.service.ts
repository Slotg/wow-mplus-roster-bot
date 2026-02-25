import { prisma } from '../db.js';
import type { WowClass, WowRole, PlayerCharacter } from './roster.view.js';

export async function upsertGuildRoster(params: { guildId: string; channelId: string; messageId: string }) {
    return prisma.guildRoster.upsert({
        where: { guildId: params.guildId },
        create: {
            guildId: params.guildId,
            channelId: params.channelId,
            messageId: params.messageId,
        },
        update: {
            channelId: params.channelId,
            messageId: params.messageId,
        },
    });
}

export async function getGuildRoster(guildId: string) {
    return prisma.guildRoster.findUnique({
        where: { guildId },
        select: { guildId: true, channelId: true, messageId: true },
    });
}

/**
 * Add a specific role+class for a user.
 */
export async function addMemberCharacter(params: { guildId: string; userId: string; role: WowRole; wowClass: WowClass }) {
    await prisma.$transaction(async (tx) => {
        const member = await tx.rosterMember.upsert({
            where: { guildId_userId: { guildId: params.guildId, userId: params.userId } },
            create: { guildId: params.guildId, userId: params.userId },
            update: {},
            select: { id: true },
        });

        // Add this specific class + role
        // skipDuplicates will ignore if they already added exactly this role+class
        await tx.rosterMemberClass.createMany({
            data: [{ memberId: member.id, role: params.role, wowClass: params.wowClass }],
            skipDuplicates: true,
        });
    });
}

/**
 * Remove a specific role+class for a user
 */
export async function removeMemberCharacter(params: { guildId: string; userId: string; role: WowRole; wowClass: WowClass }) {
    await prisma.$transaction(async (tx) => {
        const member = await tx.rosterMember.findUnique({
            where: { guildId_userId: { guildId: params.guildId, userId: params.userId } },
            select: { id: true },
        });

        if (!member) return;

        await tx.rosterMemberClass.deleteMany({
            where: {
                memberId: member.id,
                role: params.role,
                wowClass: params.wowClass,
            }
        });

        // Clean up member record if they have no chars left
        const remaining = await tx.rosterMemberClass.count({ where: { memberId: member.id } });
        if (remaining === 0) {
            await tx.rosterMember.delete({ where: { id: member.id } });
        }
    });
}

export async function removeMember(params: { guildId: string; userId: string }) {
    await prisma.rosterMember.deleteMany({
        where: { guildId: params.guildId, userId: params.userId },
    });
}

export async function getRosterSnapshot(guildId: string) {
    const members = await prisma.rosterMember.findMany({
        where: { guildId },
        select: {
            userId: true,
            classes: { select: { wowClass: true, role: true } },
        },
    });

    const perUser: Record<string, PlayerCharacter[]> = {};
    for (const m of members) {
        perUser[m.userId] = m.classes.map((c) => ({
            wowClass: c.wowClass as WowClass,
            role: c.role as WowRole,
        }));
    }
    return perUser;
}
