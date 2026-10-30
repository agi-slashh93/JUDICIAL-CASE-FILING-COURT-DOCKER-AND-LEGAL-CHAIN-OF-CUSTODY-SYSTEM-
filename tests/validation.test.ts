import { describe, expect, it } from "vitest";
import { caseSchema, evidenceSchema } from "../lib/validation";
describe("request validation",()=>{
  it("accepts a valid case",()=>expect(caseSchema.safeParse({case_number:"JC-1",title:"Test case title",case_type:"Civil",filing_date:"2026-01-01",court_id:1,status:"OPEN"}).success).toBe(true));
  it("rejects a future-free malformed case",()=>expect(caseSchema.safeParse({case_number:"",title:"x",case_type:"",filing_date:"not-a-date",court_id:0,status:"OPEN"}).success).toBe(false));
  it("requires an evidence description",()=>expect(evidenceSchema.safeParse({case_id:1,evidence_code:"EV-1",description:"",type:"DIGITAL"}).success).toBe(false));
});
