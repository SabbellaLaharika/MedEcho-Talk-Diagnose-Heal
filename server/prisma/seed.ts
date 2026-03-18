import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const users = [
        // --- DOCTORS FROM YOUR TABLE ---
        {
            email: 'chalapathi.rao@medecho.com',
            name: 'Dr. L. Chalapathi Rao, MD (Gen. Med)',
            role: Role.DOCTOR,
            specialization: 'General Medicine',
            avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=200&h=200',
            passwordHash: hashedPassword,
        },
        {
            email: 'kishor.cardio@medecho.com',
            name: 'Dr. Kishor, MD, DM (Cardio)',
            role: Role.DOCTOR,
            specialization: 'Cardiology',
            avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&h=200',
            passwordHash: hashedPassword,
        },
        {
            email: 'vijaya.lakshmi@medecho.com',
            name: 'Dr. S. Vijaya Lakshmi, MS, DGO',
            role: Role.DOCTOR,
            specialization: 'Gynecology',
            avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=200&h=200',
            passwordHash: hashedPassword,
        },
        {
            email: 'srinivas.endo@medecho.com',
            name: 'Dr. K. Srinivas, MD (Endo)',
            role: Role.DOCTOR,
            specialization: 'Endocrinology',
            avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&h=200',
            passwordHash: hashedPassword,
        },
        {
            email: 'murali.krishna@medecho.com',
            name: 'Dr. M. Murali Krishna, MBBS',
            role: Role.DOCTOR,
            specialization: 'General Practice',
            avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&h=200',
            passwordHash: hashedPassword,
        },
        {
            email: 'raghava.reddy@medecho.com',
            name: 'Dr. B. Raghava Reddy, MS (Ortho)',
            role: Role.DOCTOR,
            specialization: 'Orthopedics',
            avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&h=200',
            passwordHash: hashedPassword,
        },
        // --- PATIENTS & ADMIN ---
        {
            email: 'patient@medecho.com',
            name: 'John Doe',
            role: Role.PATIENT,
            passwordHash: hashedPassword,
        },
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
            update: { ...user }, 
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