const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    try {
        const email = 'test@example.com';
        const password = 'password123';

        // Check if exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            console.log('User already exists. Updating password...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword }
            });
        } else {
            console.log('Creating new test user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await prisma.user.create({
                data: {
                    name: 'Test Patient',
                    email: email,
                    password: hashedPassword,
                    role: 'patient',
                },
            });
        }

        console.log('----------------------------------------');
        console.log('TEST CREDENTIALS CREATED:');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('----------------------------------------');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
