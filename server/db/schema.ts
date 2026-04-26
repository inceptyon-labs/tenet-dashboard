import { pgTable, uuid, varchar, text, integer, real, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  name: varchar('name', { length: 256 }).notNull(),
  repoUrl: text('repo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  commit: varchar('commit', { length: 64 }).notNull(),
  branch: varchar('branch', { length: 256 }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  orchestratorVersion: varchar('orchestrator_version', { length: 32 }).notNull(),
  compositeScore: integer('composite_score').notNull(),
  linesOfCode: integer('lines_of_code'),
  filesAnalyzed: integer('files_analyzed'),
  toolchainSummary: jsonb('toolchain_summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  rolledUp: boolean('rolled_up').default(false).notNull(),
}, (t) => ({
  byProject: index('reports_project_idx').on(t.projectId, t.createdAt),
  byCreated: index('reports_created_idx').on(t.createdAt),
}));

export const dimensions = pgTable('dimensions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
  key: varchar('key', { length: 64 }).notNull(),
  score: integer('score'),
  weight: real('weight').notNull(),
  weighted: real('weighted').notNull(),
  applicable: boolean('applicable').default(true).notNull(),
  skillVersion: varchar('skill_version', { length: 32 }),
  notes: text('notes'),
  metrics: jsonb('metrics'),
  counts: jsonb('counts'),
  checks: jsonb('checks'),
}, (t) => ({
  byReport: index('dimensions_report_idx').on(t.reportId),
}));

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),
  dimensionKey: varchar('dimension_key', { length: 64 }).notNull(),
  severity: varchar('severity', { length: 16 }).notNull(),
  rule: varchar('rule', { length: 128 }),
  title: varchar('title', { length: 512 }).notNull(),
  description: text('description'),
  file: text('file'),
  line: integer('line'),
  column: integer('column'),
  snippet: text('snippet'),
  fixPrompt: text('fix_prompt').notNull(),
  confidence: varchar('confidence', { length: 16 }),
}, (t) => ({
  byReport: index('findings_report_idx').on(t.reportId, t.severity),
  byDimension: index('findings_dimension_idx').on(t.reportId, t.dimensionKey),
}));

export const dailySnapshots = pgTable('daily_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  day: varchar('day', { length: 10 }).notNull(),
  compositeScore: integer('composite_score').notNull(),
  dimensionScores: jsonb('dimension_scores').notNull(),
  findingCounts: jsonb('finding_counts').notNull(),
  reportCount: integer('report_count').notNull(),
}, (t) => ({
  byProjectDay: index('snapshots_project_day_idx').on(t.projectId, t.day),
}));

export const settings = pgTable('settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
