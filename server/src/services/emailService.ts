import nodemailer from 'nodemailer';

// Create a transporter using standard SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
    try {
        // If SMTP credentials aren't set, just log it instead of crashing
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ SMTP credentials are not set. Email will not be sent.');
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

        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
};
