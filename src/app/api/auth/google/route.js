import { NextResponse } from 'next/server';

export async function GET() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

    const options = {
        redirect_uri: process.env.GOOGLE_REDIRECT_URI, // Must match your GCP Console redirect precisely!
        client_id: process.env.GOOGLE_CLIENT_ID,
        access_type: 'offline',                       // CRITICAL: Forces Google to return a Refresh Token
        response_type: 'code',
        prompt: 'consent',                            // CRITICAL: Guarantees a refresh token is issued every test run
        scope: [
            // 'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/business.manage'
        ].join(' '),
    };

    const queryString = new URLSearchParams(options).toString();
    const googleAuthUrl = `${rootUrl}?${queryString}`;

    return NextResponse.redirect(googleAuthUrl);
}