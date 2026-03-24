import nodemailer from 'nodemailer';

// Create a transporter using standard SMTP
// Create a transporter using Mailtrap (Reliable for Render)
// Gmail Port 465/587 is frequently blocked by Render.
// Mailtrap uses Port 2525 which is much more reliable in cloud environments.
const transporter = nodemailer.createTransport({
    host: 'live.smtp.mailtrap.io', // Live SMTP host for Mailtrap
    port: 587, // Mailtrap works well on 587 or 2525
    secure: false, 
    auth: {
        user: process.env.SMTP_USER, // The API User from Mailtrap
        pass: process.env.SMTP_PASS, // The API Password from Mailtrap
    },
    connectionTimeout: 20000, 
    greetingTimeout: 20000,
    socketTimeout: 20000,
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
