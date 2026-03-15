const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL Connected via Prisma...');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
};

module.exports = connectDB;

