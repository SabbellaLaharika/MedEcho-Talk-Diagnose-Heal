import nodemailer from 'nodemailer';

// Create a transporter using standard SMTP
// Create a transporter using Brevo (Sendinblue) - Most reliable for Render
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 30000, 
    greetingTimeout: 30000,
    socketTimeout: 30000,
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
