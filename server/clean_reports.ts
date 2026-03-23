import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanNonEnglishReports() {
  console.log('--- CLEANING DATABASE REPORTS ---');
  
  // Find all reports
  const allReports = await prisma.report.findMany();
  
  // Identify reports with non-English characters in the diagnosis
  const nonEnglish = allReports.filter(r => /[^\x00-\x7F]/.test(r.diagnosis));
  
  console.log(`Found ${nonEnglish.length} reports with non-English diagnoses.`);
  
  if (nonEnglish.length > 0) {
    const ids = nonEnglish.map(r => r.id);
    const deleted = await prisma.report.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    console.log(`Successfully deleted ${deleted.count} poisoned reports.`);
  } else {
    console.log('No poisoned reports found.');
  }

  await prisma.$disconnect();
}

cleanNonEnglishReports().catch(console.error);
