const BASE_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

export interface PatientEmailProps {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    header: string;
    greeting: string;
    message: string;
    docLabel: string;
    dateLabel: string;
    timeLabel: string;
    footer: string;
    btn: string;
    meetingLink?: string;
    appointmentId?: string;
}

export const getPatientAppointmentTemplate = (p: PatientEmailProps) => {
    const link = `${BASE_URL}?goto=appointments${p.appointmentId ? `&appointmentId=${p.appointmentId}` : ''}`;
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">MedEcho</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">${p.header}</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #1f2937; margin-top: 0;">${p.greeting}</h2>
            <p style="font-size: 16px; line-height: 1.5;">
                ${p.message}
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px;"><strong>👨‍⚕️ ${p.docLabel}</strong> Dr. ${p.doctorName}</p>
                <p style="margin: 0 0 10px;"><strong>📅 ${p.dateLabel}</strong> ${p.date}</p>
                <p style="margin: 0;"><strong>⏰ ${p.timeLabel}</strong> ${p.time}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                ${p.footer}
            </p>
            <a href="${link}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px;">${p.btn}</a>
            ${p.meetingLink ? `
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px dashed #e0e0e0;">
                <p style="font-size: 14px; margin-bottom: 15px; color: #4b5563;">You can also join the video call directly via Jitsi Meet:</p>
                <a href="${p.meetingLink}" style="display: inline-block; background-color: #f1f5f9; color: #1e40af; border: 2px solid #3b82f6; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 14px;">🎥 JOIN JITSI MEETING</a>
            </div>` : ''}
        </div>
    </div>
    `;
};

export interface DoctorEmailProps {
    doctorName: string;
    patientName: string;
    date: string;
    time: string;
    header: string;
    greeting: string;
    message: string;
    patLabel: string;
    dateLabel: string;
    timeLabel: string;
    btn: string;
    meetingLink?: string;
    appointmentId?: string;
}

export const getDoctorAppointmentTemplate = (d: DoctorEmailProps) => {
    const link = `${BASE_URL}?goto=appointments${d.appointmentId ? `&appointmentId=${d.appointmentId}` : ''}`;
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">MedEcho</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">${d.header}</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #1f2937; margin-top: 0;">${d.greeting}</h2>
            <p style="font-size: 16px; line-height: 1.5;">
                ${d.message}
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px;"><strong>👤 ${d.patLabel}</strong> ${d.patientName}</p>
                <p style="margin: 0 0 10px;"><strong>📅 ${d.dateLabel}</strong> ${d.date}</p>
                <p style="margin: 0;"><strong>⏰ ${d.timeLabel}</strong> ${d.time}</p>
            </div>
            <a href="${link}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">${d.btn}</a>
            ${d.meetingLink ? `
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px dashed #e0e0e0;">
                <p style="font-size: 14px; margin-bottom: 15px; color: #4b5563;">Start the clinical video session here:</p>
                <a href="${d.meetingLink}" style="display: inline-block; background-color: #ecfdf5; color: #065f46; border: 2px solid #10b981; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 14px;">📹 START CLINICAL CALL</a>
            </div>` : ''}
        </div>
    </div>
    `;
};

export interface MedicalReportEmailProps {
    patientName: string;
    doctorName: string;
    date: string;
    diagnosis: string;
    precautions: string[];
    headerTitle: string;
    btn: string;
    reportId?: string;
}

export const getMedicalReportTemplate = (r: MedicalReportEmailProps) => {
    const link = `${BASE_URL}?goto=reports${r.reportId ? `&reportId=${r.reportId}` : ''}`;
    const safePrecautions = Array.isArray(r.precautions) ? r.precautions : [];
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #8b5cf6; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">MedEcho</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">${r.headerTitle}</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${r.patientName},</h2>
            <p style="font-size: 16px; line-height: 1.5;">
                Your medical report has been generated following your consultation with <strong>Dr. ${r.doctorName}</strong> on ${r.date}.
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px;"><strong>🩺 Diagnosis:</strong></p>
                <p style="margin: 0 0 20px; color: #4f46e5; font-weight: bold; font-size: 18px;">${r.diagnosis}</p>
                <p style="margin: 0 0 10px;"><strong>💊 Precautions &amp; Advice:</strong></p>
                <ul style="margin: 0; padding-left: 20px;">
                    ${safePrecautions.map(p => `<li style="margin-bottom: 5px;">${p}</li>`).join('')}
                </ul>
            </div>
            <a href="${link}" style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px;">${r.btn}</a>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e0e0e0;">
            &copy; ${new Date().getFullYear()} MedEcho. All rights reserved.
        </div>
    </div>
    `;
};

export const getCallInviteTemplate = (params: {
    recipientName: string;
    callerName: string;
    appointmentId: string;
    btn: string;
}) => {
    const link = `${BASE_URL}?joinCall=${params.appointmentId}`;
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">MedEcho</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">📞 Incoming Call Notification</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${params.recipientName},</h2>
            <p style="font-size: 16px; line-height: 1.5;">
                <strong>${params.callerName}</strong> is calling you on MedEcho. Click below to join the call directly.
            </p>
            <a href="${link}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; font-size: 16px;">📞 ${params.btn}</a>
        </div>
    </div>
    `;
};

export const getPasswordResetTemplate = (params: {
    name: string;
    email: string;
    otp: string;
}) => {
    const link = `${BASE_URL}?resetEmail=${encodeURIComponent(params.email)}&authMode=RESET_PASSWORD`;
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #f59e0b; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">MedEcho</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">🔐 Password Reset Request</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${params.name},</h2>
            <p style="font-size: 16px; line-height: 1.5;">
                You requested a password reset. Use the OTP below, or click the button to open the reset page directly.
            </p>
            <div style="background-color: #fef3c7; border: 2px dashed #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 5px; font-size: 12px; color: #92400e; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Your OTP</p>
                <p style="margin: 0; font-size: 40px; font-weight: 900; color: #b45309; letter-spacing: 12px;">${params.otp}</p>
                <p style="margin: 10px 0 0; font-size: 12px; color: #92400e;">Valid for 15 minutes</p>
            </div>
            <a href="${link}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">🔐 Open Reset Password Page</a>
        </div>
    </div>
    `;
};
