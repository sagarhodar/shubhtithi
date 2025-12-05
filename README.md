Actual Color Display in Calendar - Day cells now show the actual good/bad colors from entries (not just green/red/black)

Single View Toggle Button - One beautiful button to switch between Calendar and List views

2FA Security - Google Authenticator-based 2FA for admin access

Professional Footer - Credit line added for developer

Improved Day Cell Design - Better visual indicators with actual entry colors

📁 File Structure
jyotish-calendar-v3/
├── index.html          (Updated with 2FA modals & single toggle)
├── styles.css          (Updated with new button styles & footer)
├── app.js             (COMBINE all 3 parts into ONE file)
│   ├── Part 1: Core, Auth, 2FA
│   ├── Part 2: Calendar, Entries
│   └── Part 3: Admin, Utilities
├── firebase-config.js  (Same as before)
├── manifest.json       (Same as before)
├── sw.js              (Same as before)
└── netlify.toml       (Same as before)

🔐 How 2FA Works
First-Time Admin Access

User clicks "Admin Mode"

Signs in with Google

2FA Setup Modal appears (first time only)

User scans QR code with Google Authenticator app

User enters 6-digit code to verify setup

2FA is now enabled for this user

User gets admin access

Subsequent Admin Access

User clicks "Admin Mode"

Signs in with Google

2FA Verify Modal appears

User enters current 6-digit code from app

User gets admin access

Security Features

TOTP secret stored securely in Firestore

Each user has their own secret

Codes change every 30 seconds

Window of 1 code tolerance for clock drift

New Features Checklist

Single toggle button switches views correctly

Button text/icon changes appropriately

Day cells show actual entry colors

2FA setup modal appears on first admin access

QR code generates correctly

Manual entry key displays

2FA verification works with Google Authenticator

Subsequent logins require 2FA code

Footer credit displays correctly

Footer email link works

Existing Features Checklist

All previous functionality still works

Calendar navigation

Entry CRUD operations

Admin statistics

Toast notifications

Offline functionality

📱 Setting Up Google Authenticator
For Users

Download Google Authenticator from app store:

iOS App Store: https://apps.apple.com/app/google-authenticator/id388497605

Android Play Store: https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2

Open app and tap "+" or "Scan QR code"

Scan the QR code shown in the app

Enter the 6-digit code shown to verify

Done! Use this app for all future logins

Alternative Apps

Microsoft Authenticator

Authy

1Password

Any TOTP-compatible app

🐛 Troubleshooting V3

QR Code Not Showing

Check browser console for errors

Check QRCode.js library is loaded

Verify script tag in index.html

2FA Code Invalid

Phone time is synced correctly

Using the latest code (changes every 30 seconds)

Wait for new code to generate

OTPAuth Library Error

OTPAuth library is loaded

Verify script tag: otpauth.umd.min.js

Day Cell Colors Not Showing

Entries have colors assigned

goodColor.hex and badColor.hex exist in data

Edit old entries to add colors

Toggle Button Not Working

Check browser console for errors

toggleView function is defined

Ensure all 3 app.js parts are combined

🔒 Security Best Practices

Never share 2FA secret - Each user has unique secret

Backup your 2FA - Save the manual entry key somewhere safe

Don't expose Firebase config - Keep credentials secure

Monitor Firestore usage - Check for unusual activity

Regular security reviews - Update dependencies

Customize 2FA Window
In app.js - verifyTOTP function:

const delta = totp.validate({ token, window: 1 }); // Change window

📈 Performance Tips

Lazy load QR library - Only load when 2FA modal opens

Cache 2FA status - Don't query Firestore on every page load

Optimize calendar queries - Use date range filters

Enable Firestore indexes - For common queries

Common Issues

"Cannot read properties of undefined" - Make sure all 3 app.js parts are combined

"2FA setup fails" - Check OTPAuth library is loaded, Firestore rules allow writes, browser console

"Colors not showing in day cells" - Verify entries have goodColor.hex and badColor.hex, inspect HTML

🎉 You're All Set!

Your enhanced Calendar with:

Actual color display in calendar

Single toggle button

2FA security

Professional footer

All previous features

Is now ready to use! 🕉️✨

Developed by Sagar Hodar | hodarsagar@gmail.com
