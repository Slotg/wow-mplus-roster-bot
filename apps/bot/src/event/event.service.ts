import { prisma } from '../db.js';
import type { WowRole } from '../roster/roster.view.js';

/** Max main-roster slots per role. */
const SLOT_LIMITS: Record<string, number> = {
    Tank: 1,
    Healer: 1,
    DPS: 3,
};

export type EventWithSignups = NonNullable<Awaited<ReturnType<typeof getEventByMessageId>>>;

export async function createEvent(params: {
    guildId: string;
    channelId: string;
    messageId: string;
    creatorId: string;
    title: string;
    description?: string;
    scheduledAt: Date;
}) {
    return prisma.event.create({ data: params, include: { signups: true } });
}

export async function getEventByMessageId(messageId: string) {
    return prisma.event.findUnique({
        where: { messageId },
        include: { signups: true },
    });
}

export async function getEventById(id: string) {
    return prisma.event.findUnique({
        where: { id },
        include: { signups: true },
    });
}

export async function cancelEvent(id: string) {
    return prisma.event.delete({ where: { id } });
}

/**
 * Sign a user up for an event.
 * If the role's main slots are full, the user goes to bench.
 * If the user is already signed up, their role is updated.
 */
export async function signupUser(params: { eventId: string; userId: string; role: WowRole }) {
    return prisma.$transaction(async (tx) => {
        // Count how many main-slot signups already exist for this role
        const mainCount = await tx.eventSignup.count({
            where: { eventId: params.eventId, role: params.role, isBench: false },
        });

        const limit = SLOT_LIMITS[params.role] ?? 0;
        const isBench = mainCount >= limit;

        // Upsert — if user changes role, update in place
        return tx.eventSignup.upsert({
            where: { eventId_userId: { eventId: params.eventId, userId: params.userId } },
            create: { eventId: params.eventId, userId: params.userId, role: params.role, isBench },
            update: { role: params.role, isBench },
        });
    });
}

/**
 * Remove a user from an event, then promote the first bench player
 * of the same role (if any) to a main slot.
 */
export async function removeSignup(params: { eventId: string; userId: string }) {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.eventSignup.findUnique({
            where: { eventId_userId: { eventId: params.eventId, userId: params.userId } },
        });

        if (!existing) return;

        await tx.eventSignup.delete({
            where: { id: existing.id },
        });

        // Promote bench → main if the removed player was in a main slot
        if (!existing.isBench) {
            const benchCandidate = await tx.eventSignup.findFirst({
                where: { eventId: params.eventId, role: existing.role, isBench: true },
                orderBy: { id: 'asc' }, // first-come-first-served
            });

            if (benchCandidate) {
                await tx.eventSignup.update({
                    where: { id: benchCandidate.id },
                    data: { isBench: false },
                });
            }
        }
    });
}
