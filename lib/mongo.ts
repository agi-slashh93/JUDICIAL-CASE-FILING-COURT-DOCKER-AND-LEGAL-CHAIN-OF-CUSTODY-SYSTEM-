import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not configured");

const globalForMongo = globalThis as unknown as { client?: MongoClient; db?: Db };
const client = globalForMongo.client ?? new MongoClient(uri);
export const mongoDb = globalForMongo.db ?? client.db(process.env.MONGODB_DATABASE ?? "judicial_case_system");
if (process.env.NODE_ENV !== "production") globalForMongo.client = client;

export async function auditEvent(event: Record<string, unknown>) {
  await mongoDb.collection("audit_events").insertOne({ ...event, createdAt: new Date() });
}
