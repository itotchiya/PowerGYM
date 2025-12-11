/**
 * PowerGYM Cloud Functions
 * Uses environment variables from .env file
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Initialize admin
admin.initializeApp();

// Set global options
setGlobalOptions({ maxInstances: 10 });

/**
 * sendEmailOTP - Sends a 6-digit OTP to the provided email
 */
exports.sendEmailOTP = onCall(async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in to request OTP.");
    }

    const { email } = request.data;
    if (!email) {
        throw new HttpsError("invalid-argument", "Email address is required.");
    }

    // Configure transporter using process.env
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    try {
        // Store OTP in Firestore
        await admin.firestore().collection("otp_codes").doc(request.auth.uid).set({
            email,
            otp,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            verified: false,
        });

        // Send Email
        const mailOptions = {
            from: `PowerGYM <noreply@powergym.com>`,
            to: email,
            subject: "Your PowerGYM Verification Code",
            text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">PowerGYM Verification</h2>
                    <p>You requested to change your email address.</p>
                    <p>Your verification code is:</p>
                    <h1 style="letter-spacing: 5px; background: #f3f4f6; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return { success: true, message: "OTP sent successfully" };
    } catch (error) {
        console.error("Error sending OTP:", error);
        throw new HttpsError("internal", "Failed to send OTP email.");
    }
});

/**
 * verifyEmailOTP - Verifies the OTP code
 */
exports.verifyEmailOTP = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const { otp, email } = request.data;
    if (!otp || !email) {
        throw new HttpsError("invalid-argument", "OTP and email are required.");
    }

    try {
        const doc = await admin.firestore().collection("otp_codes").doc(request.auth.uid).get();
        if (!doc.exists) {
            throw new HttpsError("not-found", "No OTP request found.");
        }

        const record = doc.data();

        if (record.email !== email) {
            throw new HttpsError("invalid-argument", "Email does not match OTP request.");
        }

        if (Date.now() > record.expiresAt) {
            throw new HttpsError("deadline-exceeded", "OTP has expired.");
        }

        if (record.otp !== otp) {
            throw new HttpsError("invalid-argument", "Invalid OTP code.");
        }

        // Mark as verified
        await admin.firestore().collection("otp_codes").doc(request.auth.uid).update({
            verified: true,
        });

        return { success: true };
    } catch (error) {
        console.error("Error verifying OTP:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Verification failed.");
    }
});
