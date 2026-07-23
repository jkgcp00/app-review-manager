import { linkGoogleAccount } from '@/lib/serveractions/googleAuth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    console.log('inside - /api/auth/callback/google/route.js');
    try {
        // 1. EXTRACT code parameters from incoming callback URL query
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        const redirectUrl = new URL('/', request.url);

        if (error) {
            return NextResponse.json({ error: `User denied authentication: ${error}` }, { status: 400 });
        }

        if (!code) {
            return NextResponse.json({ error: 'Missing code parameter from Google callback' }, { status: 400 });
        }

        // 2. EXCHANGE the temporary authorization code for real system access tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`Token trade failed: ${tokens.error_description || tokens.error}`);
        }

        const accessToken = tokens.access_token;
        const accessToken_expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
        const refreshToken = tokens.refresh_token; // Save this string permanently!

        // console.log('[Tokens Received]:', { accessToken, refreshToken });

        const idToken = tokens.id_token;
        const base64Payload = idToken.split('.')[1]; // Get the payload part of the JWT
        const decodedPayload = Buffer.from(base64Payload, 'base64').toString('utf-8');
        const userProfile = JSON.parse(decodedPayload);

        // 3. Destructure the email and display name (name)
        const { email } = userProfile;
        // console.log('User Email:', email);

        redirectUrl.searchParams.set('google_email', email);
        const { code: status } = await linkGoogleAccount({ googleEmail: email, accessToken: accessToken, refreshToken: refreshToken, expiresAt: accessToken_expiry });
        if (status === 1) { // Already linked?
            redirectUrl.searchParams.set('link_status', 1);
        } else {
            redirectUrl.searchParams.set('link_status', 0);
        }

        // 3. AUTO-DISCOVER the Customer's Google ACCOUNT_ID
        const accountResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const accountData = await accountResponse.json();

        console.log('[Account Response]:', accountResponse);
        console.log('[Account Discovery]:', JSON.stringify(accountData));

        if (!accountResponse.ok || !accountData.accounts || accountData.accounts.length === 0) {
            throw new Error('Could not retrieve a valid Google Business Account folder.');
        }


        // Isolate top-level active client account path folder name
        const fullAccountName = accountData.accounts[0].name; // Format: "accounts/10743209187429184"
        const accountId = fullAccountName.split('/')[1];

        console.log('fullAccountName: ', fullAccountName);
        console.log('accountId: ', accountId);

        // 4. AUTO-DISCOVER the Customer's Location/Listing ID
        const locationResponse = await fetch(
            // `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,title`,
            `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,title,storeCode,storefrontAddress,categories,phoneNumbers,websiteUri`,
            // `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations?readMask=name,storeCode,title,phoneNumbers.primaryPhone,categories.primaryCategory.name,categories.primaryCategory.displayName,categories.additionalCategories.name,categories.additionalCategories.displayName,storefrontAddress,websiteUri`,
            {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` },
            }
        );

        // const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`);
        // // Define your fields in a clean array
        // const fields = [
        //     "name",
        //     "storeCode",
        //     "title",
        //     "phoneNumbers",
        //     "categories",
        //     "storefrontAddress",
        //     "websiteUri"
        // ];

        // // This automatically handles the commas and URL encoding perfectly
        // url.searchParams.append("readMask", fields.join(","));

        // // Now fetch safely
        // const locationResponse = await fetch(url.toString(),
        //     {
        //         method: 'GET',
        //         headers: { 'Authorization': `Bearer ${accessToken}` },
        //     }
        // );

        const locationData = await locationResponse.json();

        // console.log('locationData: ', JSON.stringify(locationData));

        if (!locationResponse.ok || !locationData.locations || locationData.locations.length === 0) {
            // throw new Error('Account found, but no physical location listings were discovered inside it.');
            console.log('Account found, but no physical location listings were discovered inside it.');
            redirectUrl.searchParams.set('loc', 0);
        } else {
            redirectUrl.searchParams.set('loc', locationData.locations.length);
        }

        // const businessName = locationData.locations[0].title;
        // const fullLocationName = locationData.locations[0].name; // Format: "accounts/X/locations/8327491827491"
        // const locationId = fullLocationName.split('/')[3];

        // // 5. WRITE EVERYTHING DIRECTLY TO YOUR POSTGRESQL DATABASE
        // console.log('=== DISCOVERED NEW CLIENT PROFILE ===');
        // console.log('Business:', businessName);
        // console.log('Account ID:', accountId);
        // console.log('Location ID:', locationId);
        // console.log('Refresh Token length:', refreshToken?.length);

        /* SQL Execution Pseudo-code:
        await db.query(`
          INSERT INTO clients (business_name, google_account_id, gbp_location_id, google_refresh_token, ai_brand_voice_prompt)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (gbp_location_id) DO UPDATE SET google_refresh_token = $4;
        `, [businessName, accountId, locationId, refreshToken, "Be polite and professional."]);
        */

        // Redirect the user back to the front-end dashboard with success UI parameters
        // return NextResponse.redirect(new URL('/', request.url));
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error('[Onboarding Callback Exception]:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // always redirect back to home
    // return NextResponse.redirect(new URL('/', request.url));
    // return NextResponse.redirect(redirectUrl);
}