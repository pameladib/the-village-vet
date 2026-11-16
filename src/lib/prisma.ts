import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

const adapter = new PrismaPg({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
    query_timeout: 20_000,
});
const prisma = new PrismaClient({ adapter });

export { prisma };