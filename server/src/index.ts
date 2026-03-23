import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Health Check
app.get('/', (req, res) => {
    res.send('MedEcho Backend is running');
});

// Import Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import reportRoutes from './routes/reportRoutes';
import mlRoutes from './routes/mlRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import translationRoutes from './routes/translationRoutes';
import notificationRoutes from './routes/notificationRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join', (payload: { userId: string, role: 'PATIENT'|'DOCTOR' }) => {
        if (payload?.role && payload?.userId) {
            const room = `${payload.role}:${payload.userId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined ${room}`);
        }
    });

    socket.on('start_call', (payload: { callId: string, from: string, to: string, fromName: string, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `DOCTOR:${payload.to}`;
        io.to(room).emit('incoming_call', payload);
    });

    socket.on('offer', (payload: { callId: string, from: string, to: string, sdp: any }) => {
        const room = `DOCTOR:${payload.to}`;
        io.to(room).emit('offer', payload);
    });

    socket.on('answer', (payload: { callId: string, from: string, to: string, sdp: any }) => {
        const room = `PATIENT:${payload.to}`;
        io.to(room).emit('answer', payload);
    });

    socket.on('ice_candidate', (payload: { callId: string, from: string, to: string, candidate: any, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `${payload.toRole}:${payload.to}`;
        io.to(room).emit('ice_candidate', payload);
    });

    socket.on('end_call', (payload: { callId: string, from: string, to: string, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `${payload.toRole}:${payload.to}`;
        io.to(room).emit('end_call', payload);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
