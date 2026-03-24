import nodemailer from 'nodemailer';

// Create a transporter using standard SMTP
// Create a transporter using SSL (Port 465)
// CRITICAL: Render's DNS/IPv6 is failing for Gmail. 
// We are hard-coding the known Gmail SMTP IPv4 address (74.125.200.108) 
// to bypass DNS and IPv6 resolution entirely.
const transporter = nodemailer.createTransport({
    host: '74.125.200.108', // Hardcoded smtp.gmail.com IPv4
    port: 465,
    secure: true, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        // Since we are using an IP address, we must tell it to expect smtp.gmail.com for the certificate
        servername: 'smtp.gmail.com',
        rejectUnauthorized: false
    },
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000,
} as any);

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
    try {
        // Log SMTP details (except password) to verify config in Render
        console.log(`📧 Attempting email to ${to}...`);
        console.log(`📡 SMTP Config: Host=${process.env.SMTP_HOST || 'smtp.gmail.com'}, User=${process.env.SMTP_USER || 'NOT SET'}`);

        // If SMTP credentials aren't set, just log it instead of crashing
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ SMTP credentials are NOT SET in environment! Email will not be sent.');
            console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
            return;
        }

        const info = await transporter.sendMail({
            from: `"MedEcho Notifications" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
    } catch (error: any) {
        console.error('❌ FATAL Email Delivery Error:', error.message);
        if (error.code === 'EAUTH') {
            console.error('👉 Error: Authentication Failed. Your SMTP_PASS (App Password) may be incorrect.');
        } else if (error.code === 'ESOCKET') {
            console.error('👉 Error: Connection Error. Verify SMTP_HOST and SMTP_PORT (use 587/465).');
        }
    }
};
