import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const users = [
        // Doctors
        {
            email: 'sarah@medecho.com',
            name: 'Dr. Sarah Johnson',
            role: Role.DOCTOR,
            specialization: 'Cardiology',
            avatar: 'https://img.freepik.com/free-photo/woman-doctor-wearing-lab-coat-with-stethoscope-isolated_1303-29791.jpg',
            passwordHash: hashedPassword,
        },
        {
            email: 'michael@medecho.com',
            name: 'Dr. Michael Chen',
            role: Role.DOCTOR,
            specialization: 'Neurology',
            avatar: 'https://img.freepik.com/free-photo/smiling-doctor-with-strethoscope-isolated-grey_651396-974.jpg',
            passwordHash: hashedPassword,
        },
        {
            email: 'emily@medecho.com',
            name: 'Dr. Emily Rodriguez',
            role: Role.DOCTOR,
            specialization: 'Orthopedics',
            avatar: 'https://img.freepik.com/free-photo/pleased-young-female-doctor-wearing-medical-robe-stethoscope-around-neck-standing-with-closed-posture_409827-254.jpg',
            passwordHash: hashedPassword,
        },
        {
            email: 'james@medecho.com',
            name: 'Dr. James Wilson',
            role: Role.DOCTOR,
            specialization: 'Pediatrics',
            avatar: 'https://img.freepik.com/free-photo/portrait-smiling-male-doctor_171337-1532.jpg',
            passwordHash: hashedPassword,
        },
        {
            email: 'marcus@medecho.com',
            name: 'Dr. Marcus',
            role: Role.DOCTOR,
            specialization: 'General Medicine',
            avatar: 'https://img.freepik.com/free-photo/doctor-offering-medical-advice-hands-held_1262-10825.jpg',
            passwordHash: hashedPassword,
        },
        // Patients
        {
            email: 'patient@medecho.com',
            name: 'John Doe',
            role: Role.PATIENT,
            passwordHash: hashedPassword,
        },
        // Admin
        {
            email: 'admin@medecho.com',
            name: 'Admin User',
            role: Role.ADMIN,
            passwordHash: hashedPassword,
        },
    ];

    for (const user of users) {
        const upsertedUser = await prisma.user.upsert({
            where: { email: user.email },
            update: { ...user }, // Update all fields if exists, to ensure sync
            create: { ...user },
        });
        console.log(`Upserted user: ${upsertedUser.email}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
