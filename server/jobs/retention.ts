import cron from 'node-cron';
import { eq, and, sql, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { reports, dimensions, dailySnapshots, settings } from '../db/schema.js';
import type { RetentionSummary, RetentionSettings } from '../types.js';

/**
 * Run the retention / rollup job.
 *
 * 1. Read retention settings
 * 2. Find reports older than full_retention_days that aren't rolled up
 * 3. Group by (project_id, day), compute daily_snapshot per group
 * 4. Insert/update snapshot rows
 * 5. Mark source reports rolled_up = true
 * 6. DELETE rolled_up reports (cascade removes dimensions + findings)
 * 7. DELETE expired snapshots
 * 8. Log summary
 */
export async function runRetention(): Promise<RetentionSummary> {
  console.log('[retention] Starting retention job...');

  // 1. Read retention settings
  const settingRow = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'retention'))
    .limit(1);

  const retentionConfig: RetentionSettings = settingRow.length > 0
    ? (settingRow[0].value as RetentionSettings)
    : { full_retention_days: 90, snapshot_retention_days: 730 };

  const fullCutoff = new Date();
  fullCutoff.setDate(fullCutoff.getDate() - retentionConfig.full_retention_days);

  const snapshotCutoff = new Date();
  snapshotCutoff.setDate(snapshotCutoff.getDate() - retentionConfig.snapshot_retention_days);

  // 2. Find reports older than full_retention_days that aren't rolled up
  const eligibleReports = await db
    .select({
      id: reports.id,
      projectId: reports.projectId,
      compositeScore: reports.compositeScore,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(
      and(
        lt(reports.createdAt, fullCutoff),
        eq(reports.rolledUp, false),
      ),
    );

  if (eligibleReports.length === 0) {
    console.log('[retention] No reports eligible for rollup');
  }

  // 3. Group by (project_id, day)
  const groups = new Map<string, typeof eligibleReports>();

  for (const report of eligibleReports) {
    const day = report.createdAt.toISOString().slice(0, 10);
    const key = `${report.projectId}::${day}`;
    const group = groups.get(key);
    if (group) {
      group.push(report);
    } else {
      groups.set(key, [report]);
    }
  }

  let snapshotsCreated = 0;
  let reportsRolledUp = 0;

  for (const [key, groupReports] of groups) {
    const [projectId, day] = key.split('::');

    // Compute aggregate for this day
    const avgComposite = Math.round(
      groupReports.reduce((sum, r) => sum + r.compositeScore, 0) / groupReports.length,
    );

    // Get dimension scores for all reports in this group
    const reportIds = groupReports.map((r) => r.id);
    const dimRows = await db
      .select({
        key: dimensions.key,
        score: dimensions.score,
        counts: dimensions.counts,
      })
      .from(dimensions)
      .where(sql`${dimensions.reportId} = ANY(${reportIds})`);

    // Average dimension scores
    const dimAccum: Record<string, { total: number; count: number }> = {};
    const findingAccum: Record<string, number> = {};

    for (const d of dimRows) {
      if (d.score !== null) {
        if (!dimAccum[d.key]) {
          dimAccum[d.key] = { total: 0, count: 0 };
        }
        dimAccum[d.key].total += d.score;
        dimAccum[d.key].count += 1;
      }
      if (d.counts && typeof d.counts === 'object') {
        const c = d.counts as Record<string, number>;
        for (const [severity, count] of Object.entries(c)) {
          findingAccum[severity] = (findingAccum[severity] ?? 0) + count;
        }
      }
    }

    const dimensionScores: Record<string, number> = {};
    for (const [dimKey, accum] of Object.entries(dimAccum)) {
      dimensionScores[dimKey] = Math.round(accum.total / accum.count);
    }

    // 4. Insert/update snapshot rows
    const existingSnapshot = await db
      .select({ id: dailySnapshots.id })
      .from(dailySnapshots)
      .where(
        and(
          eq(dailySnapshots.projectId, projectId),
          eq(dailySnapshots.day, day),
        ),
      )
      .limit(1);

    if (existingSnapshot.length > 0) {
      await db
        .update(dailySnapshots)
        .set({
          compositeScore: avgComposite,
          dimensionScores,
          findingCounts: findingAccum,
          reportCount: groupReports.length,
        })
        .where(eq(dailySnapshots.id, existingSnapshot[0].id));
    } else {
      await db.insert(dailySnapshots).values({
        projectId,
        day,
        compositeScore: avgComposite,
        dimensionScores,
        findingCounts: findingAccum,
        reportCount: groupReports.length,
      });
    }

    snapshotsCreated++;

    // 5. Mark source reports rolled_up = true
    for (const report of groupReports) {
      await db
        .update(reports)
        .set({ rolledUp: true })
        .where(eq(reports.id, report.id));
      reportsRolledUp++;
    }
  }

  // 6. DELETE rolled_up reports (cascade removes dimensions + findings)
  const deletedReports = await db
    .delete(reports)
    .where(eq(reports.rolledUp, true))
    .returning({ id: reports.id });

  const reportsDeleted = deletedReports.length;

  // 7. DELETE expired snapshots
  const deletedSnapshots = await db
    .delete(dailySnapshots)
    .where(lt(sql`${dailySnapshots.day}::date`, snapshotCutoff))
    .returning({ id: dailySnapshots.id });

  const snapshotsExpired = deletedSnapshots.length;

  // 8. Log summary
  const summary: RetentionSummary = {
    snapshotsCreated,
    reportsRolledUp,
    reportsDeleted,
    snapshotsExpired,
  };

  console.log('[retention] Completed:', JSON.stringify(summary));
  return summary;
}

/**
 * Schedule the retention job to run daily at 3:00 AM.
 */
export function scheduleRetention(): cron.ScheduledTask {
  console.log('[retention] Scheduling daily retention job at 03:00');
  return cron.schedule('0 3 * * *', () => {
    runRetention().catch((err) => {
      console.error('[retention] Job failed:', err);
    });
  });
}
