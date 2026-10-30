import { z } from "zod";

export const caseSchema = z.object({
  case_number: z.string().trim().min(3).max(50),
  title: z.string().trim().min(5).max(200),
  case_type: z.string().trim().min(2).max(100),
  filing_date: z.string().date(),
  court_id: z.coerce.number().int().positive(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "ARCHIVED"])
});

export const evidenceSchema = z.object({
  case_id: z.coerce.number().int().positive(),
  evidence_code: z.string().trim().min(2).max(50),
  description: z.string().trim().min(5).max(2000),
  type: z.string().trim().min(2).max(50),
  seized_from: z.string().trim().max(150).optional().nullable(),
  seized_date: z.string().date().optional().nullable(),
  current_location: z.string().trim().max(150).optional().nullable()
});
