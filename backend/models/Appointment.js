const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, required: true }, // HH:MM
  reason: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', AppointmentSchema);

module.exports = Appointment;

