import { z } from 'zod';

export const severityEnum = z.enum(['critical', 'major', 'minor', 'info']);
export const confidenceEnum = z.enum(['deterministic', 'native', 'tree_sitter', 'heuristic']);
export const checkStatusEnum = z.enum(['passed', 'failed', 'skipped', 'info']);

export const dimensionCheckSchema = z.object({
  name: z.string().max(256),
  status: checkStatusEnum,
  description: z.string().max(1000).optional(),
  details: z.string().max(4000).optional(),
  count: z.number().int().nullable().optional(),
  tool: z.string().max(64).optional(),
});

const fixPromptLinePattern = /^-\s*Line:\s*(.+)$/im;

export const findingSchema = z.object({
  dimension: z.string(),
  severity: severityEnum,
  rule: z.string().optional(),
  title: z.string().max(512),
  description: z.string().optional(),
  file: z.string().nullable().optional(),
  line: z.number().int().min(1).nullable().optional(),
  column: z.number().int().nullable().optional(),
  snippet: z.string().max(2000).nullable().optional(),
  fix_prompt: z.string().min(1),
  confidence: confidenceEnum.optional(),
}).superRefine((finding, ctx) => {
  const match = finding.fix_prompt.match(fixPromptLinePattern);
  if (!match) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fix_prompt'],
      message: 'fix_prompt Location must include a "- Line: ..." entry',
    });
    return;
  }

  const promptLine = match[1].trim();
  if (finding.line == null) {
    if (promptLine !== 'N/A') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fix_prompt'],
        message: 'fix_prompt Location line must be "N/A" when finding.line is null',
      });
    }
    return;
  }

  if (promptLine !== String(finding.line)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fix_prompt'],
      message: `fix_prompt Location line must match finding.line (${finding.line})`,
    });
  }
});

export const dimensionSchema = z.object({
  key: z.string(),
  score: z.number().int().min(0).max(100).nullable(),
  weight: z.number().min(0).max(10),
  applicable: z.boolean().default(true),
  skill_version: z.string().optional(),
  notes: z.string().optional(),
  metrics: z.record(z.unknown()).optional(),
  checks: z.array(dimensionCheckSchema).optional(),
});

export const reportSchema = z.object({
  project: z.object({
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
    name: z.string().max(256),
    repo_url: z.string().nullable().optional(),
    commit: z.string().max(64),
    branch: z.string().max(256),
  }),
  run: z.object({
    started_at: z.string().datetime(),
    completed_at: z.string().datetime(),
    orchestrator_version: z.string(),
    dimensions_run: z.array(z.string()),
    toolchain_summary: z.record(z.unknown()).optional(),
    lines_of_code: z.number().int().optional(),
    files_analyzed: z.number().int().optional(),
  }),
  dimensions: z.array(dimensionSchema),
  findings: z.array(findingSchema),
});

export type ReportPayload = z.infer<typeof reportSchema>;
export type DimensionPayload = z.infer<typeof dimensionSchema>;
export type FindingPayload = z.infer<typeof findingSchema>;
export type DimensionCheckPayload = z.infer<typeof dimensionCheckSchema>;
