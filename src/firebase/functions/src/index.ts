
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Creates a user profile document in Firestore when a new Firebase Auth user is created.
 */
export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  // Prepare the user profile data
  const userProfile = {
    uid,
    email: email || "",
    displayName: displayName || email?.split('@')[0] || "Anonymous User", // Fallback for display name
    photoURL: photoURL || `https://placehold.co/100x100.png?text=${(displayName || email || 'A')[0].toUpperCase()}`, // Generic placeholder
    role: "Viewer", // Default role for new users, can be changed by an admin later
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true, // Default to active
    // Add any other default fields you want for a new user profile
    // e.g., preferences: {}, lastLogin: null (though lastLogin is often handled by client/auth directly)
  };

  try {
    // Set the user profile in Firestore
    await db.collection("users").doc(uid).set(userProfile);
    console.log(`Successfully created profile for user: ${uid}, email: ${email}`);
    
    // Optionally set initial custom claims (e.g., default role)
    // This allows Firestore rules to check for 'request.auth.token.role'
    await admin.auth().setCustomUserClaims(uid, { role: 'Viewer' });
    console.log(`Successfully set custom claim 'role: Viewer' for user: ${uid}`);

  } catch (error) {
    console.error(`Error creating profile or setting claims for user: ${uid}, email: ${email}`, error);
    // Consider what to do if profile creation fails. 
    // For instance, you might log this for manual intervention.
    // Deleting the Auth user if profile creation fails can be complex and might not always be desired.
  }
});


/**
 * Placeholder callable function to send an interview invitation email.
 * This function would be called from your frontend after scheduling an interview.
 */
export const sendInterviewEmail = functions.https.onCall(async (data, context) => {
    // Basic validation
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { to, subject, body } = data;
    if (!to || !subject || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with "to", "subject", and "body" arguments.');
    }

    //
    // TODO: Implement your email sending logic here.
    //
    // 1. Choose an email service provider (e.g., SendGrid, Mailgun, or Nodemailer with SMTP).
    // 2. Install the necessary SDK (e.g., `npm install @sendgrid/mail`).
    // 3. Configure API keys securely using Firebase Functions configuration:
    //    `firebase functions:config:set sendgrid.key="YOUR_API_KEY"`
    //    and access it in code with `functions.config().sendgrid.key`.
    // 4. Implement the logic to send the email.
    //
    // Example using SendGrid (conceptual):
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(functions.config().sendgrid.key);
    // const msg = { to, from: 'you@yourdomain.com', subject, html: body };
    // await sgMail.send(msg);

    console.log(`[SIMULATION] Would send email to: ${to} with subject: "${subject}"`);
    return { success: true, message: `Email invitation would be sent to ${to}.` };
});

/**
 * Placeholder callable function to create a calendar event for an interview.
 * This function would be called from your frontend after scheduling an interview.
 */
export const createCalendarEvent = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { title, startTime, endTime, attendees, description } = data;
    if (!title || !startTime || !endTime || !attendees) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required arguments for calendar event.');
    }
    
    //
    // TODO: Implement your Google Calendar integration logic here.
    //
    // 1. Enable the Google Calendar API in your Google Cloud project.
    // 2. Install the Google APIs client library: `npm install googleapis`.
    // 3. Set up authentication. This is the most complex part. You might use a service account
    //    if the app owns the calendar, or an OAuth flow if you need to act on behalf of a user.
    //    Store credentials securely using Firebase Functions configuration.
    // 4. Implement the logic to create the event.
    //
    // Example using googleapis (conceptual):
    // const { google } = require('googleapis');
    // const auth = new google.auth.GoogleAuth({ /* ... your auth config ... */ });
    // const calendar = google.calendar({ version: 'v3', auth });
    // const event = {
    //   summary: title,
    //   description,
    //   start: { dateTime: startTime, timeZone: 'America/New_York' },
    //   end: { dateTime: endTime, timeZone: 'America/New_York' },
    //   attendees: attendees.map(email => ({ email })),
    // };
    // await calendar.events.insert({
    //   calendarId: 'primary',
    //   resource: event,
    // });
    
    console.log(`[SIMULATION] Would create calendar event: "${title}" for ${attendees.join(', ')}.`);
    return { success: true, message: "Calendar event would be created." };
});
