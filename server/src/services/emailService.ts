import nodemailer from 'nodemailer';

// Create a transporter using standard SMTP
// Create a transporter using Brevo (Sendinblue) - Most reliable for Render
const smtpUser = process.env.SMTP_USER || '';
const isGmail = smtpUser.toLowerCase().includes('gmail.com');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || (isGmail ? 'smtp.gmail.com' : 'smtp-relay.brevo.com'),
    port: parseInt(process.env.SMTP_PORT || (isGmail ? '465' : '2525')),
    secure: isGmail, // Port 465 uses SSL/TLS (secure=true), 2525 uses STARTTLS (secure=false)
    auth: {
        user: smtpUser,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000,
});
// Verify the connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection Verification Failed:', error.message);
    } else {
        console.log('✅ SMTP Server is ready to take messages');
    }
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
        const currentHost = process.env.SMTP_HOST || (isGmail ? 'smtp.gmail.com' : 'smtp-relay.brevo.com');
        const currentPort = parseInt(process.env.SMTP_PORT || (isGmail ? '465' : '2525'));
        console.log(`📡 SMTP Config: Host=${currentHost}, Port=${currentPort}, SSL=${isGmail}, User=${smtpUser || 'NOT SET'}`);

        // If SMTP credentials aren't set, just log it instead of crashing
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ SMTP credentials are NOT SET in environment! Email will not be sent.');
            console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
            return;
        }

        const fromAddress = process.env.SMTP_FROM || 'slaharisvrsslsmr712@gmail.com'; 
        const info = await transporter.sendMail({
            from: `"MedEcho Notifications" <${fromAddress}>`,
            to,
            subject,
            text,
            html,
        });

        console.log(`✅ SMTP Handoff Successful to: ${to}`);
        console.log(`ℹ️ Check your Brevo Dashboard (Transactional -> Logs) for delivery status.`);
    } catch (error: any) {
        console.error('❌ FATAL Email Delivery Error:', error.message);
        if (error.code === 'EAUTH') {
            console.error('👉 Error: Authentication Failed. Your SMTP_PASS (App Password) may be incorrect.');
        } else if (error.code === 'ESOCKET') {
            console.error('👉 Error: Connection Error. Verify SMTP_HOST and SMTP_PORT (use 587/465).');
        }
    }
};
