import dotenv from 'dotenv';
dotenv.config();

import prisma from './lib/prisma';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const PORT = process.env.PORT || 5000;

// Health Check
app.get('/', (req, res) => {
    res.send('MedEcho Backend is running');
});

// Used by frontend for keep-alive pings to prevent Render free-tier cold starts
app.get('/api/health', (req, res) => {
    res.status(200).send('OK');
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
import didRoutes from './routes/didRoutes';
import reminderRoutes from './routes/reminderRoutes';
import pushRoutes from './routes/pushRoutes';
import { startReminderService } from './services/reminderService';
import { startMLKeepAliveService } from './services/mlKeepAliveService';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/did', didRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/push', pushRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join', (payload: { userId: string, role: 'PATIENT' | 'DOCTOR', sessionId?: string }) => {
        if (payload?.role && payload?.userId) {
            const room = `${payload.role}:${payload.userId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined ${room} with session ${payload.sessionId}`);

            // If a sessionId was provided, broadcast it to the room
            // Existing clients in the room will check if their sessionId matches this new one
            if (payload.sessionId) {
                socket.to(room).emit('session_update', { 
                    newSessionId: payload.sessionId,
                    timestamp: Date.now()
                });
            }
        }
    });



    socket.on('offer', (payload: { callId: string, from: string, to: string, sdp: any, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `${payload.toRole || 'DOCTOR'}:${payload.to}`;
        io.to(room).emit('offer', payload);
    });

    socket.on('answer', (payload: { callId: string, from: string, to: string, sdp: any, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `${payload.toRole || 'PATIENT'}:${payload.to}`;
        io.to(room).emit('answer', payload);
    });

    socket.on('ice_candidate', (payload: { callId: string, from: string, to: string, candidate: any, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `${payload.toRole}:${payload.to}`;
        io.to(room).emit('ice_candidate', payload);
    });

    socket.on('join_consultation', (payload: { appointmentId: string, userId: string }) => {
        const room = `consultation:${payload.appointmentId}`;
        socket.join(room);
        
        // Get number of participants in room
        const participants = io.sockets.adapter.rooms.get(room);
        const count = participants ? participants.size : 0;
        
        console.log(`[Socket] User ${payload.userId} joined consultation ${payload.appointmentId}. Presence: ${count}`);
        
        // Broadcast presence update (list of user IDs would be better, but count is sufficient for our logic)
        io.to(room).emit('consultation_presence', { 
            appointmentId: payload.appointmentId,
            count
        });
    });

    socket.on('end_call', (payload: { callId: string, from: string, to: string, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `${payload.toRole}:${payload.to}`;
        io.to(room).emit('end_call', payload);
        
        // Also cleanup consultation room
        const consultationRoom = `consultation:${payload.callId}`;
        io.to(consultationRoom).emit('consultation_presence', { count: 0 });
    });

    socket.on('decline_call', (payload: { callId: string, from: string, to: string, toRole: 'DOCTOR'|'PATIENT' }) => {
        const room = `${payload.toRole}:${payload.to}`;
        // Sending end_call is fine as it cleans up the UI for the other person
        io.to(room).emit('end_call', payload);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startReminderService();
    startMLKeepAliveService();
});
