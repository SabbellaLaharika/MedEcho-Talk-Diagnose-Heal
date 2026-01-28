const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUserAppointments = async (req, res) => {
  try {
    // Assuming req.user.id is set by auth middleware
    const appointments = await prisma.appointment.findMany({
      where: { patientId: req.user.id },
      include: {
        doctor: {
          select: { name: true, specialization: true }
        },
        department: {
          select: { name: true }
        }
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' }
      ]
    });

    // Automation: Update status of past confirmed appointments to "completed" on-the-fly
    const now = new Date();
    const processedAppointments = appointments.map(app => {
      // Prisma returns fields as they are in DB. Date/Time are strings based on schema.
      const appDateTime = new Date(`${app.date}T${app.time}`);
      if (app.status === 'confirmed' && appDateTime < now) {
        return { ...app, status: 'completed' };
      }
      return app;
    });

    res.json(processedAppointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getUserAppointments };

