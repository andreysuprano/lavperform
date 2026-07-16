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
        // 1. Reset Password
        const password = await bcrypt.hash('foodcrm123', 10);
        const user = await prisma.user.update({
            where: { email: 'demo@foodcrm.test' },
            data: { password },
        });
        console.log('Password reset for:', user.email);

        // 2. Reset Confirmation Code
        const code = await prisma.confirmationCode.findFirst({
            where: { userId: user.id }
        });

        if (code) {
            await prisma.confirmationCode.update({
                where: { id: code.id },
                data: { used: false, code: '12345' }
            });
            console.log('Confirmation code reset to unused and 12345');
        } else {
            console.log('Confirmation code not found, creating one...');
            await prisma.confirmationCode.create({
                data: {
                    id: 'confirm-code-demo',
                    code: '12345',
                    userId: user.id,
                    used: false
                }
            });
            console.log('Confirmation code created');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
