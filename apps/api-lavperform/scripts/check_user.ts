import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        const user = await prisma.user.findUnique({ where: { email: 'demo@foodcrm.test' } });
        if (user) {
            console.log('User found:', user.email, user.id);
            console.log('Password hash:', user.password);
            const match = await bcrypt.compare('foodcrm123', user.password);
            console.log('Password "foodcrm123" matches:', match);
        } else {
            console.log('User NOT found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
