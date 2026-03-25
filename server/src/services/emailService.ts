import nodemailer from 'nodemailer';

// Create a transporter using standard SMTP
// Create a transporter using Brevo (Sendinblue) - Most reliable for Render
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465,
    secure: true, // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        // This helps with connection issues in some cloud environments
        rejectUnauthorized: false
    },
    connectionTimeout: 15000, // Detect failure faster
    greetingTimeout: 15000,
    socketTimeout: 15000,
});

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
        const currentHost = 'smtp-relay.brevo.com'; // Hardcoded as per nodemailer.createTransport
        const currentPort = 465;
        console.log(`📡 SMTP Config: Host=${currentHost}, Port=${currentPort}, SSL=true, User=${process.env.SMTP_USER || 'NOT SET'}`);

        // If SMTP credentials aren't set, just log it instead of crashing
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ SMTP credentials are NOT SET in environment! Email will not be sent.');
            console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
            return;
        }

        const fromAddress = process.env.SMTP_FROM || 'sabbellalaharika05@gmail.com'; 
        const info = await transporter.sendMail({
            from: `"MedEcho Notifications" <${fromAddress}>`,
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
