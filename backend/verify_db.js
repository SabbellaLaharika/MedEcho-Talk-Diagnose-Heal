const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Verifying Database Content ---\n');

        // Check Users
        const userCount = await prisma.user.count();
        console.log(`Users found: ${userCount}`);
        const users = await prisma.user.findMany({ take: 3 });
        console.log('Sample Users:', JSON.stringify(users, null, 2));
        console.log('\n-----------------------------------\n');

        // Check Doctors
        const doctorCount = await prisma.doctor.count();
        console.log(`Doctors found: ${doctorCount}`);
        const doctors = await prisma.doctor.findMany({ take: 3, include: { department: true } });
        console.log('Sample Doctors:', JSON.stringify(doctors.map(d => ({ name: d.name, email: d.email, dept: d.department?.name })), null, 2));
        console.log('\n-----------------------------------\n');

        // Check Departments
        const deptCount = await prisma.department.count();
        console.log(`Departments found: ${deptCount}`);
        const depts = await prisma.department.findMany({ take: 3 });
        console.log('Sample Departments:', JSON.stringify(depts.map(d => d.name), null, 2));
        console.log('\n-----------------------------------\n');

    } catch (error) {
        console.error('Error verifying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
