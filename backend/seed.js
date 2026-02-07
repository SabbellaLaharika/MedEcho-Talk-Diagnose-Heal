const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const seed = async () => {
    try {
        // Departments
        const dept1 = await prisma.department.create({
            data: {
                name: 'Cardiology',
                description: 'Heart and vascular health specialists',
                imageUrl: 'https://images.pexels.com/photos/7659564/pexels-photo-7659564.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        const dept2 = await prisma.department.create({
            data: {
                name: 'Neurology',
                description: 'Brain, spine, and nervous system specialists',
                imageUrl: 'https://images.pexels.com/photos/8460332/pexels-photo-8460332.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        const dept3 = await prisma.department.create({
            data: {
                name: 'Orthopedics',
                description: 'Bone, joint, and muscle specialists',
                imageUrl: 'https://images.pexels.com/photos/7108344/pexels-photo-7108344.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        const dept4 = await prisma.department.create({
            data: {
                name: 'Pediatrics',
                description: 'Child and adolescent healthcare',
                imageUrl: 'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        // Doctors entries (Public Directory)
        const doc1 = await prisma.doctor.create({
            data: {
                name: 'Dr. Sarah Johnson',
                email: 'sarah@medecho.com',
                specialization: 'Cardiologist',
                departmentId: dept1.id,
                imageUrl: 'https://images.pexels.com/photos/5214958/pexels-photo-5214958.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        const doc2 = await prisma.doctor.create({
            data: {
                name: 'Dr. Michael Chen',
                email: 'michael@medecho.com',
                specialization: 'Neurologist',
                departmentId: dept2.id,
                imageUrl: 'https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        const doc3 = await prisma.doctor.create({
            data: {
                name: 'Dr. Emily Rodriguez',
                email: 'emily@medecho.com',
                specialization: 'Orthopedic Surgeon',
                departmentId: dept3.id,
                imageUrl: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        const doc4 = await prisma.doctor.create({
            data: {
                name: 'Dr. James Wilson',
                email: 'james@medecho.com',
                specialization: 'Pediatrician',
                departmentId: dept4.id,
                imageUrl: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=600',
            }
        });

        // 3. Create Login Users (Auth)
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt); // Default password

        // Admin
        await prisma.user.create({
            data: { name: 'Admin User', email: 'admin@medecho.com', password: hashedPassword, role: 'admin' }
        });

        // Patient
        await prisma.user.create({
            data: { name: 'John Doe', email: 'patient@medecho.com', password: hashedPassword, role: 'patient', age: 30, gender: 'Male' }
        });

        // Doctors (Login accounts) - We temporarily map them by name/email convention
        await prisma.user.create({
            data: { name: 'Dr. Sarah Johnson', email: 'sarah@medecho.com', password: hashedPassword, role: 'doctor' }
        });
        await prisma.user.create({
            data: { name: 'Dr. Michael Chen', email: 'michael@medecho.com', password: hashedPassword, role: 'doctor' }
        });
        await prisma.user.create({
            data: { name: 'Dr. Emily Rodriguez', email: 'emily@medecho.com', password: hashedPassword, role: 'doctor' }
        });
        await prisma.user.create({
            data: { name: 'Dr. James Wilson', email: 'james@medecho.com', password: hashedPassword, role: 'doctor' }
        });

        console.log('Seed data created successfully');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
};

seed();