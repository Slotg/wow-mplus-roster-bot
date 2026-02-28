/**
 * One-time backfill: for every RosterMember that has no isMain class,
 * mark the alphabetically-first class as main.
 *
 * Run once:
 *   npx tsx prisma/seed-main.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const members = await prisma.rosterMember.findMany({
        select: {
            id: true,
            classes: { select: { id: true, wowClass: true, isMain: true }, orderBy: { wowClass: 'asc' } },
        },
    });

    let updated = 0;
    for (const member of members) {
        const hasMain = member.classes.some((c) => c.isMain);
        if (!hasMain && member.classes.length > 0) {
            await prisma.rosterMemberClass.update({
                where: { id: member.classes[0].id },
                data: { isMain: true },
            });
            updated++;
        }
    }

    console.log(`Backfill complete — set main for ${updated} member(s).`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
