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
 * If this is the first class the user has ever added, it is automatically
 * marked as main. Otherwise isMain stays false (user can set it manually).
 */
export async function addMemberCharacter(params: { guildId: string; userId: string; role: WowRole; wowClass: WowClass }) {
    await prisma.$transaction(async (tx) => {
        const member = await tx.rosterMember.upsert({
            where: { guildId_userId: { guildId: params.guildId, userId: params.userId } },
            create: { guildId: params.guildId, userId: params.userId },
            update: {},
            select: { id: true },
        });

        // Count existing classes to decide if this one should auto-become main
        const existingCount = await tx.rosterMemberClass.count({ where: { memberId: member.id } });
        const isMain = existingCount === 0;

        // skipDuplicates will ignore if they already added exactly this role+class
        await tx.rosterMemberClass.createMany({
            data: [{ memberId: member.id, role: params.role, wowClass: params.wowClass, isMain }],
            skipDuplicates: true,
        });
    });
}

/**
 * Set a specific role+class as the user's main character.
 * Clears isMain on all other classes for this member.
 */
export async function setMainCharacter(params: { guildId: string; userId: string; role: WowRole; wowClass: WowClass }) {
    await prisma.$transaction(async (tx) => {
        const member = await tx.rosterMember.findUnique({
            where: { guildId_userId: { guildId: params.guildId, userId: params.userId } },
            select: { id: true },
        });
        if (!member) return;

        // Clear isMain on all classes for this member
        await tx.rosterMemberClass.updateMany({
            where: { memberId: member.id },
            data: { isMain: false },
        });

        // Set isMain on the selected class
        await tx.rosterMemberClass.updateMany({
            where: { memberId: member.id, role: params.role, wowClass: params.wowClass },
            data: { isMain: true },
        });
    });
}

/**
 * Remove a specific role+class for a user.
 * If the removed class was main, promote the first remaining class (alphabetically) to main.
 */
export async function removeMemberCharacter(params: { guildId: string; userId: string; role: WowRole; wowClass: WowClass }) {
    await prisma.$transaction(async (tx) => {
        const member = await tx.rosterMember.findUnique({
            where: { guildId_userId: { guildId: params.guildId, userId: params.userId } },
            select: { id: true },
        });

        if (!member) return;

        // Check if this class was main before deleting
        const toRemove = await tx.rosterMemberClass.findFirst({
            where: { memberId: member.id, role: params.role, wowClass: params.wowClass },
            select: { id: true, isMain: true },
        });

        await tx.rosterMemberClass.deleteMany({
            where: {
                memberId: member.id,
                role: params.role,
                wowClass: params.wowClass,
            }
        });

        // Clean up member record if they have no chars left
        const remaining = await tx.rosterMemberClass.findMany({
            where: { memberId: member.id },
            orderBy: { wowClass: 'asc' },
            select: { id: true },
        });

        if (remaining.length === 0) {
            await tx.rosterMember.delete({ where: { id: member.id } });
        } else if (toRemove?.isMain) {
            // Promote the first remaining class to main
            await tx.rosterMemberClass.update({
                where: { id: remaining[0].id },
                data: { isMain: true },
            });
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
            classes: { select: { wowClass: true, role: true, isMain: true } },
        },
    });

    const perUser: Record<string, PlayerCharacter[]> = {};
    for (const m of members) {
        perUser[m.userId] = m.classes.map((c) => ({
            wowClass: c.wowClass as WowClass,
            role: c.role as WowRole,
            isMain: c.isMain,
        }));
    }
    return perUser;
}
