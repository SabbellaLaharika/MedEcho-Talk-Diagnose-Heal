import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://medecho-ml-service.onrender.com';
const KEEP_ALIVE_INTERVAL = 12 * 60 * 1000; // 12 minutes (Render free tier sleeps after 15m)

/**
 * Periodically pings the ML service to prevent Render's free tier from spinning down.
 * This ensures "Zero Downtime" for user interactions.
 */
export const startMLKeepAliveService = () => {
    console.log('🚀 ML Keep-Alive Service started. Heartbeat every 12 minutes.');
    
    // Initial ping after 30 seconds
    setTimeout(() => pingMLService(), 30000);

    // Set interval for periodic pings
    setInterval(() => {
        pingMLService();
    }, KEEP_ALIVE_INTERVAL);
};

async function pingMLService() {
    try {
        console.log(`💓 ML Heartbeat: Pinging ${ML_SERVICE_URL}...`);
        // We use a short timeout here; if it's sleeping, this ping will start the wake-up process
        // but we don't necessarily need to wait for it for the heartbeat to count.
        await axios.get(`${ML_SERVICE_URL}/ping`, { timeout: 10000 });
        console.log('✅ ML Heartbeat: Service is awake.');
    } catch (error: any) {
        if (error.code === 'ECONNABORTED' || error.response?.status === 503 || error.response?.status === 429) {
            console.log('💤 ML Heartbeat: Service is waking up/sleeping (Normal for cold start).');
        } else {
            console.warn('❌ ML Heartbeat: Error pinging service:', error.message);
        }
    }
}
