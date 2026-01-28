const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Controllers directly
const { registerUser, loginUser } = require('./controllers/authController');
const { getUserAppointments } = require('./controllers/appointmentController');
const { protect } = require('./middleware/authMiddleware');

dotenv.config();

// Connect to DB
connectDB();

const app = express();

// DEBUG: Catch process exit reasons
process.on('exit', (code) => {
    console.log(`[DEBUG] Process exiting with code: ${code}`);
});
process.on('uncaughtException', (err) => {
    console.error('[DEBUG] Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[DEBUG] Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

// Middleware
app.use(cors());
app.use(express.json());

// Debug Middleware to log every request
app.use((req, res, next) => {
    console.log(`[DEBUG] INCOMING REQUEST: ${req.method} ${req.url}`);
    next();
});

// --- AUTH ROUTES ---
app.post('/api/auth/register', (req, res) => {
    console.log('[DEBUG] Route Matched: POST /api/auth/register');
    registerUser(req, res);
});

app.post('/api/auth/login', (req, res) => {
    console.log('[DEBUG] Route Matched: POST /api/auth/login');
    loginUser(req, res);
});

// --- APPOINTMENT ROUTES ---
const appointmentRouter = express.Router();
appointmentRouter.get('/my-appointments', protect, getUserAppointments);
app.use('/api/appointments', appointmentRouter);

// Root Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// 404 Handler
app.use((req, res) => {
    console.log(`[DEBUG] 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

server.on('close', () => {
    console.log('[DEBUG] Server Closed');
});

// HACK: Force keep-alive to prevent premature exit
setInterval(() => {
    // This empty interval calls keeps the event loop active
}, 10000);
