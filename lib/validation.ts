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

export const accusedSchema = z.object({
  accused_full_name: z.string().trim().min(2).max(150),
  accused_identity_number: z.string().trim().max(100).optional().nullable(),
  accused_nationality: z.string().trim().max(80).optional().nullable(),
  accused_address: z.string().trim().max(500).optional().nullable(),
  accused_age: z.coerce.number().int().min(0).max(130).optional().nullable(),
  accused_gender: z.string().trim().max(30).optional().nullable(),
  accused_phone: z.string().trim().max(20).optional().nullable()
});
