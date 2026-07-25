'use server';

import { NextResponse } from 'next/server';
import { createAdminClient, getSupabaseClient } from './supabase';
import { GoogleGenAI, Type } from '@google/genai';
import { delay, getRating } from '../utils';
import { revalidatePath } from 'next/cache';

// const initiateGoogleAuth = async () => {

//     const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

//     console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
//     console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

//     const options = {
//         redirect_uri: process.env.GOOGLE_REDIRECT_URI, // Must match your GCP Console redirect precisely!
//         client_id: process.env.GOOGLE_CLIENT_ID,
//         access_type: 'offline',                       // CRITICAL: Forces Google to return a Refresh Token
//         response_type: 'code',
//         prompt: 'consent',                            // CRITICAL: Guarantees a refresh token is issued every test run
//         scope: [
//             'https://www.googleapis.com/auth/userinfo.email',
//             'https://www.googleapis.com/auth/business.manage'
//         ].join(' '),
//     };

//     const queryString = new URLSearchParams(options).toString();
//     const googleAuthUrl = `${rootUrl}?${queryString}`;

//     return NextResponse.redirect(googleAuthUrl);
// }


const isGoogleEmailAlreadyLinked = async ({ googleEmail }) => {

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("google_accounts")
        .select("google_email")             // 1. Only grab the ID column to keep the payload tiny
        .eq("google_email", googleEmail)    // 2. Look for your matching value
        .maybeSingle();                     // 3. Returns null instead of throwing an error if 0 rows found

    if (error) {
        console.error("Database query failed:", error.message);
        return false;
    }

    // If data is not null, the record exists!
    return data !== null;
}

export async function linkGoogleAccount({ googleEmail, accessToken, refreshToken, expiresAt }) {
    try {

        //TODO: DO NOT CHECK AND SKIP. This screws up the Access_Token. Revisit this for linking multiple accounts
        // const googleEmailAlreadyLinked = await isGoogleEmailAlreadyLinked({ googleEmail });

        // if (googleEmailAlreadyLinked) {
        //     //console.log('Email is already linked with this or another account.');
        //     return { success: true, code: 1, error: null }; // Already linked.
        // }

        const supabase = await getSupabaseClient();

        // 1. Authenticate the active session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error("Unauthorized: You must be logged in with a valid Supabase account.");
        }

        // console.log(`linkGoogleAccount for user: ${user.id}, ${user.email}`);

        /* STREAMING_CHUNK: Upserting Google Account Credentials... */
        // 2. Save the credentials securely into the google_accounts table
        const { data: account, error: dbError } = await supabase
            .from('google_accounts')
            .upsert({
                user_id: user.id, // Direct reference to Supabase auth.users
                google_email: googleEmail,
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: expiresAt
            }, { onConflict: 'user_id,google_email' })
            .select()
            .single();

        if (dbError) {
            throw new Error(`Database error saving credentials: ${dbError.message}`);
        }

        // return { success: true, accountId: account.id, message: "Google Account linked successfully." };
        return { success: true, code: 0, error: null };
    } catch (error) {
        console.error("Error in linkGoogleAccount server action:", error.message);
        return { success: false, code: -1, error: error.message };
    }
}

async function refreshGoogleAccessTokenIfNeeded({ google_email }) {
    const supabase = await getSupabaseClient();

    // 1. Fetch the existing tokens
    const { data: account, error: fetchError } = await supabase
        .from('google_accounts')
        .select('id, google_email, refresh_token, expires_at')
        .eq('google_email', google_email)
        .single();

    if (fetchError || !account) {
        throw new Error("Linked Google account not found in database.");
    }

    // console.log('refreshGoogleAccessTokenIfNeeded: ', JSON.stringify(account));

    const now = new Date();
    const tokenExpiry = new Date(account.expires_at);

    // Buffer check: If token is still valid for more than 5 minutes, return early
    if (tokenExpiry.getTime() - now.getTime() > 5 * 60 * 1000) {
        // console.log('Token is still fresh');
        return; // Token is still fresh
    }

    console.log('Renewing token...');

    /* STREAMING_CHUNK: Fetching Fresh Tokens from Google OAuth... */
    // 2. Token is expired or expiring soon, request a fresh one from Google
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to rotate Google OAuth access token: ${errText}`);
    }

    const tokenData = await response.json();
    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // console.log('Saving refreshed token...');

    /* STREAMING_CHUNK: Updating DB with New Access Token... */
    // 3. Persist the updated Access Token in Supabase
    const { error: updateError } = await supabase
        .from('google_accounts')
        .update({
            access_token: tokenData.access_token,
            expires_at: newExpiresAt
        })
        .eq('google_email', google_email);

    console.log('Updated new token');

    if (updateError) {
        throw new Error(`Failed to update fresh access token in database: ${updateError.message}`);
    }
}

export async function syncAllLinkedAccounts() {

    //var accountRecords = await loadGoogleLocationsFromDB();

    var accountRecords = [];
    try {
        const supabase = await getSupabaseClient();
        // console.log('Full sync');
        const { data: linked_accounts, error: fetchError } = await supabase
            .from('google_accounts')
            .select('id, google_email');
        // .select('id, google_email, access_token, expires_at');

        if (fetchError || !linked_accounts) {
            throw new Error("Unable to retrieve valid Google access token.");
        }

        // console.log('Linked accounts: ', JSON.stringify(linked_accounts));


        for (const linked_account of linked_accounts) {
            var p = await discoverAndSyncGoogleLocations({ id: linked_account.id, google_email: linked_account.google_email });
            accountRecords.push(...p)
        }

    } catch (error) {
        console.error("Error in discoverAndSyncGoogleLocations:", error.message);
    }

    return accountRecords;
}

export async function loadGoogleLocationsFromDB() {
    // console.log('Loading location data from db...');

    try {
        await syncAllLinkedAccounts();
    } catch (error) {
        console.log('ERR: Error in syncAllLinkedAccounts - ', error.message);
    }

    // Now lets read the refreshed data from database
    var accountRecords = [];
    try {
        const supabase = await getSupabaseClient();

        // 1. Get all linked google_accounts
        const { data: linked_accounts, error: fetchError } = await supabase
            .from('google_accounts')
            .select('id, google_email');

        if (fetchError || !linked_accounts) {
            throw new Error("Unable to retrieve valid Google access token.");
        }

        // For each linked google account, let further details.
        for (const linked_account of linked_accounts) {
            const accounts = await loadBusinessesAndLocationsFromDB({ linked_google_account_id: linked_account.id });
            accountRecords.push(...accounts);
        }

    } catch (error) {
        console.error("Error in discoverAndSyncGoogleLocations:", error.message);
    }

    // console.log('ACCOUNT_RECORDS: ', JSON.stringify(accountRecords));

    return accountRecords;

}

async function loadBusinessesAndLocationsFromDB({ linked_google_account_id }) {
    var businesses = [];

    try {
        const supabase = await getSupabaseClient();
        const { data: businessesFromDB, error: errBusinessesFromDB } = await supabase
            .from('businesses')
            .select('id, google_account_id, google_business_id, business_name')
            .eq('google_account_id', linked_google_account_id);

        if (errBusinessesFromDB) {
            console.log(`ERR: failed to retrieve businesses for linked_google_accound_id: ${linked_google_account_id}, error: ${errBusinessesFromDB.message}`);
            return;
        }

        // console.log('businessesFromDB: ', businessesFromDB);

        for (const businessFromDB of businessesFromDB) {
            var business = {
                id: businessFromDB.id,
                name: businessFromDB.google_business_id,
                title: businessFromDB.business_name,
            };

            // Read all locations for this business

            const { data: locationsFromDB, error: errLocationsFromDB } = await supabase
                .from('locations')
                .select('id, business_id, google_location_id, location_name, address_line_1, city, state, zip_code, primary_category, is_active, reply_action_1_star, reply_action_2_star, reply_action_3_star, reply_action_4_star, reply_action_5_star, notification_phone, notification_email, notification_preference, prompt_custom_context')
                .eq('business_id', businessFromDB.id);


            if (errLocationsFromDB) {
                console.log(`ERR: Error while reading location from DB for business_id: ${businessFromDB.id}, error: ${errLocationsFromDB.message}`);
                continue;
            }

            // console.log('locationsFromDB: ', locationsFromDB);

            var locations = [];
            for (const locationFromDB of locationsFromDB) {
                var location = {
                    id: locationFromDB.id,
                    name: locationFromDB.google_location_id,
                    title: locationFromDB.location_name,
                    primary_category: locationFromDB.primary_category,
                    storefrontAddress: {
                        addressLines: locationFromDB.address_line_1 ? [locationFromDB.address_line_1] : null,
                        city: locationFromDB.city,
                        state: locationFromDB.state,
                        zip_code: locationFromDB.zip_code
                    }
                }

                locations.push(location);
            }

            business.locations = locations;

            businesses.push(business);
        }

        // console.log('ALL BUSSINESSES: ', JSON.stringify(business));

    } catch (error) {
        console.error("Error in discoverAndSyncGoogleLocations:", error.message);
    }

    return businesses;
}

async function discoverAndSyncGoogleLocations({ id, google_email }) {
    // console.log('Syncing linked account: ', google_email);
    var accountRecords = [];
    try {
        const supabase = await getSupabaseClient();

        // // Load the account info from DB
        // const {data: businessesFromDB, error: errBusinessesFromDB} = await supabase.from('businesses').select('*').eq('google_account_id', id);
        // console.log('errBusinessesFromDB:', errBusinessesFromDB?.message);
        // console.log('businessesFromDB: ', businessesFromDB);

        // 1. Rotate credentials if necessary
        await refreshGoogleAccessTokenIfNeeded({ google_email });

        // 2. Get the updated access token
        const { data: account, error: fetchError } = await supabase
            .from('google_accounts')
            .select('access_token')
            .eq('google_email', google_email)
            .single();

        if (fetchError || !account) {
            throw new Error("Unable to retrieve valid Google access token.");
        }

        /* STREAMING_CHUNK: Querying Google Accounts Endpoint... */
        // 3. Query Google Business Profile Accounts list
        const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
            headers: { Authorization: `Bearer ${account.access_token}` }
        });

        if (!accountsResponse.ok) {
            const errorText = await accountsResponse.text();
            throw new Error(`Google Accounts API error: ${errorText}`);
        }

        const accountsData = await accountsResponse.json();
        const googleAccounts = accountsData.accounts || [];

        // let totalLocationsSynced = 0;

        /* STREAMING_CHUNK: Querying Storefront Locations... */
        // 4. For each Business Account, query child storefront locations
        for (const gAccount of googleAccounts) {
            // Find Personal or Organization type accounts
            const fullAccountName = gAccount.name; // Format: "accounts/10743209187429184"
            const gAccountId = fullAccountName.split('/')[1];
            // console.log(`gAccount: ${gAccount.accountName}, ${gAccountId}, ${gAccount.name}, ${gAccount.type}`);
            if (gAccount.type !== 'PERSONAL' && gAccount.type !== 'LOCATION_GROUP') continue;

            var accountRecord = {
                name: gAccount.name,
                title: gAccount.accountName,
                type: gAccount.type,
                verificationState: gAccount.verificationState
            };

            // Create/Merge the record with DB
            const { data: businessRecord, error: busError } = await supabase
                .from('businesses')
                .upsert(
                    {
                        google_account_id: id,
                        google_business_id: gAccount.name,
                        business_name: gAccount.accountName,
                    },
                    {
                        onConflict: 'google_business_id',
                        ignoreDuplicates: false
                    }
                ).select().single();

            if (busError) {
                console.log('busError: ', busError?.message);
                throw new Error(`Failed to create/merge business record: ${busError.message}`);
            }


            // Upsert a central Business record representing this business group node
            // const { data: businessRecord, error: busError } = await supabase
            //     .from('businesses')
            //     .upsert({
            //         google_account_id: googleAccountId,
            //         google_business_id: gAccount.name, // Format: accounts/{accountId}
            //         business_name: gAccount.accountName || "Google Business Profile Group"
            //     }, { onConflict: 'google_business_id' })
            //     .select()
            //     .single();

            // if (busError) throw new Error(`Failed to create business record: ${busError.message}`);

            // console.log(`gAccount: proceeding...`);

            /* STREAMING_CHUNK: Resolving Storefront Address Context... */
            // Query storefronts inside this specific account
            const locationsResponse = await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${gAccount.name}/locations?readMask=metadata,name,title,categories.primaryCategory.displayName,storefrontAddress,websiteUri`,
                { headers: { Authorization: `Bearer ${account.access_token}` } }
            );

            if (!locationsResponse.ok) {
                console.warn(`Could not fetch locations for Google account ${gAccount.name}`);
                continue;
            }

            const locationsData = await locationsResponse.json();
            const discoveredLocations = locationsData.locations || [];

            // console.log('discovered locations: ', discoveredLocations.length);
            // console.log('discovered locations data: ', JSON.stringify(discoveredLocations));

            /* STREAMING_CHUNK: Storing Discovered Storefronts as Inactive... */
            var locationRecords = [];
            // 5. Store discovered locations in Supabase in an inactive state by default
            for (const loc of discoveredLocations) {
                const address = loc.storefrontAddress || {};

                const { error: locError } = await supabase
                    .from('locations')
                    .upsert({
                        business_id: businessRecord.id,
                        google_location_id: loc.name, // Format: locations/{locationId}
                        location_name: loc.title,
                        address_line_1: address.addressLines?.join(', ') || null,
                        city: address.locality || null,
                        state: address.administrativeArea || null,
                        zip_code: address.postalCode || null,
                        primary_category: loc.categories?.primaryCategory?.displayName,
                        // is_active: false // Explicitly inactive until user activates it in the onboarding checklist
                    }, { onConflict: 'google_location_id' });

                if (locError) {
                    console.error(`Error syncing location ${loc.name}:`, locError.message);
                }
                // else {
                //     totalLocationsSynced++;
                // }

                const fullLocationName = loc.name; // Format: "locations/8327491827491"
                const locId = fullLocationName.split('/')[1];
                // console.log(`Loc [gAccount-${gAccount.name}]:  ${loc.name}, ${locId}, ${loc.title}, ${JSON.stringify(address)}`)
                // console.log('Location: ', JSON.stringify(loc));

                var locationRecord = {
                    name: loc.name,
                    title: loc.title,
                    primary_category: loc.categories?.primaryCategory?.displayName,
                    // storefrontAddress: loc.storefrontAddress,
                    storefrontAddress: {
                        addressLines: loc.storefrontAddress?.addressLines,
                        city: loc.storefrontAddress?.locality,
                        state: loc.storefrontAddress?.administrativeArea,
                        zip_code: loc.storefrontAddress?.postalCode
                    },
                    websiteUri: loc.websiteUri
                };
                // console.log('LocationRecord: ', locationRecord);
                locationRecords.push(locationRecord);

                // Get last 3 reviews

                // const revRes = await fetch(
                //     `https://mybusiness.googleapis.com/v4/accounts/${gAccountId}/locations/${locId}/reviews`,
                //     { headers: { Authorization: `Bearer ${account.access_token}` } }
                // );

                // if (!revRes.ok) {
                //     const errorData = await revRes.json(); // Parses Google's 403 error body
                //     console.error("HTTP Status Code:", revRes.status);
                //     console.error("Full Error Details:", JSON.stringify(errorData, null, 2));
                //     return;
                // }






                // ----------------

                const reviewUrl = new URL(
                    `https://mybusiness.googleapis.com/v4/accounts/${gAccountId}/locations/${locId}/reviews`
                    // `https://mybusiness.googleapis.com/v4/accounts/-/locations/${locId}/reviews`
                );

                // console.log('Review link: ', reviewUrl);

                // Limit the result count to exactly 3
                reviewUrl.searchParams.append("pageSize", "3");


                const response = await fetch(reviewUrl.toString(),
                    { method: "GET", headers: { Authorization: `Bearer ${account.access_token}` } }
                );

                if (!response.ok) {
                    throw new Error(`Error fetching reviews: ${JSON.stringify(response)}`);
                }

                const revdata = await response.json();

                // The list of the 3 most recent reviews
                const reviews = revdata.reviews || [];

                // console.log("Last 3 Reviews:", reviews);
            }

            accountRecord.locations = locationRecords;
            accountRecords.push(accountRecord);
        }

        // console.log('All Accounts-json: ', JSON.stringify(accountRecords));
        // console.log('All Accounts: ', accountRecords);
        // return { success: true, syncedCount: totalLocationsSynced };
    } catch (error) {
        console.error("Error in discoverAndSyncGoogleLocations:", error.message);
        // return { success: false, error: error.message };
    }

    return accountRecords;
}

export async function readSampleReviews({ accountId, locationId }) {

    var businessData = null;
    try {

        //1. Get Supabase client
        const supabase = await getSupabaseClient();

        //2. Confirm the accountId and locationId belongs to current user
        const { data: accountData, error: accountDataError } = await supabase.from('businesses').select('id, google_account_id, business_name').eq('google_business_id', `accounts/${accountId}`).single();
        if (accountDataError) {
            console.log(`ERR: readSampleReviews. While getting account - accountId ${accountId} locationId ${locationId}`);
            return;
        }

        businessData = {
            title: accountData.business_name
        };

        //Get location
        var locationDetails = null;
        const { data: locationData, error: locationDataError } = await supabase
            .from('locations')
            .select('id, location_name, primary_category, address_line_1, city, state, zip_code, is_active')
            .eq('google_location_id', `locations/${locationId}`)
            .eq('business_id', accountData.id)
            .single();

        if (locationDataError) {
            console.log(`ERR: readSampleReviews. While getting location -  accountId ${accountId} locationId ${locationId}`);
            return;
        }

        // 3. Fetch review summary
        // const { rating, reviewCount } = await fetchReviewSummary({ placeId: 'ChIJcdhwhAEe2YgRr54sLaq3Ef4' });

        // 3. Now fetch latest reviews for this location from GBP
        const reviews = await fetchRecentReviews({ google_account_id: accountData.google_account_id, accountId: accountId, locationId: locationId });
        // console.log('Reviews: ', reviews);

        businessData.location = {
            title: locationData.location_name,
            primary_category: locationData.primary_category,
            // rating: rating ? rating : 'N/A',
            // reviewCount: reviewCount ? reviewCount : 'N/A',
            storefrontAddress: {
                addressLines: locationData.address_line_1 ? [locationData.address_line_1] : null,
                city: locationData.city,
                state: locationData.state,
                zip_code: locationData.zip_code,
            },
            recentReviews: reviews ? [...reviews] : []
        }

        // console.log('BusinessData: ', JSON.stringify(businessData));
        // const geminiRes = await generateResponses({businessData: businessData});
        return businessData;

    } catch (error) {
        console.log('ERR: ', error);
        return null;
    }
}


// const SYSTEM_INSTRUCTION_1 = `
// You are an expert Local SEO & Reputation Management Specialist. Your task is to craft high-converting, humanized responses to Google Reviews for local businesses.

// ### OBJECTIVES
// 1. **Human & Authentic**: Sound like a warm, appreciative business owner. Avoid robotic clichés like "Valued customer", "We strive to provide", or generic corporate fluff.
// 2. **Local SEO Optimization**: Subtly weave in the business name, city, neighborhood, or specific cuisine/services mentioned in the context payload *when natural*. Never keyword-stuff.
// 3. **Specific Recognition**: Call out specific menu items, staff members (e.g., Manny), or details the reviewer praised. If an employee is mentioned, mention passing the praise to them.
// 4. **Tone Matching**: Enthusiastic for 5-star reviews; empathetic and resolution-focused for negative ones.

// ### INPUT DATA
// You will receive a JSON payload containing business metadata (title, category, city) and an array of recent reviews.

// ### OUTPUT REQUIREMENTS
// Return a JSON array where each object contains only the \`reviewId\` and the generated \`response\`.
// `;
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// async function generateResponses1({ businessData }) {
//     console.log('Generating response...');
//     try {
//         const response = await ai.models.generateContent({
//             model: "gemini-3.5-flash",
//             contents: JSON.stringify(businessData),
//             config: {
//                 systemInstruction: SYSTEM_INSTRUCTION_1,
//                 // Force output into strict JSON structure
//                 responseMimeType: "application/json",
//                 responseSchema: {
//                     type: Type.ARRAY,
//                     description: "List of review responses matched by reviewId",
//                     items: {
//                         type: Type.OBJECT,
//                         properties: {
//                             reviewId: {
//                                 type: Type.STRING,
//                                 description: "The unique ID of the review being responded to"
//                             },
//                             response: {
//                                 type: Type.STRING,
//                                 description: "The crafted humanized response text"
//                             }
//                         },
//                         required: ["reviewId", "response"]
//                     }
//                 },
//                 // Low temperature for reliable execution, slightly higher than 0 for organic phrasing
//                 temperature: 0.3
//             }
//         });

//         const parsedOutput = JSON.parse(response.text);
//         console.log('Response: ', parsedOutput);
//         return parsedOutput;

//     } catch (error) {
//         console.error("Error generating responses:", error);
//         throw error;
//     }

// }

// const SYSTEM_INSTRUCTION = `
// You are an expert Local SEO & Reputation Management Specialist. Your task is to craft high-converting, humanized responses to Google Reviews for local businesses.

// ### OBJECTIVES
// 1. **Human & Authentic**: Sound like a warm, appreciative business owner. Avoid robotic clichés like "Valued customer", "We strive to provide", or generic corporate fluff.
// 2. **Local SEO Optimization**: Subtly weave in the business name, city, neighborhood, or specific cuisine/services mentioned in the context payload *when natural*. Never keyword-stuff.
// 3. **Specific Recognition**: Call out specific menu items, staff members (e.g., Manny), or details the reviewer praised. If an employee is mentioned, mention passing the praise to them.
// 4. **Tone Matching**: Enthusiastic for 5-star reviews; empathetic and resolution-focused for negative ones.

// ### INPUT DATA
// You will receive a JSON payload containing business metadata (title, category, city) and an array of recent reviews.

// ### OUTPUT REQUIREMENTS
// Return a JSON array where each object contains only the \`reviewId\` and the generated \`response\`.
// `;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export async function generateResponses({ buisnessInfo, reviews }) {
    // console.log('Generating response...');

    const system_intructions = `
You are an expert Local SEO & Reputation Management Specialist for ${buisnessInfo.title} (${buisnessInfo.primary_category}) at ${buisnessInfo.city}, ${buisnessInfo.state}. Your task is to craft high-converting, humanized responses to Google Reviews for local businesses.

### OBJECTIVES
1. **Human & Authentic**: Sound like a warm, appreciative business owner. Avoid robotic clichés like "Valued customer", "We strive to provide", or generic corporate fluff.
2. **Local SEO Optimization**: Subtly weave in the business name, city, neighborhood, or specific cuisine/services mentioned in the context payload *when natural*. Never keyword-stuff.
3. **Specific Recognition**: Call out specific menu items, staff members, or details the reviewer praised. If an employee is mentioned, mention passing the praise to them (keep it gender neutral).
4. **Tone Matching**: Enthusiastic for 5-star reviews; empathetic and resolution-focused for negative ones.
5. **Punctuation**: Do not use em dashes or other LLM specific punctuation styles. 

### INPUT DATA
You will receive an array of reviews, each containing reviewId, reviewer name, star rating and the review comments.

### OUTPUT REQUIREMENTS
Return a JSON array where each object contains only the \`reviewId\` and the generated \`response\`.
`;

    // console.log('Prompt: ', syste_intructions);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: JSON.stringify(reviews),
            config: {
                systemInstruction: system_intructions,
                // Force output into strict JSON structure
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    description: "List of review responses matched by reviewId",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            reviewId: {
                                type: Type.STRING,
                                description: "The unique ID of the review being responded to"
                            },
                            response: {
                                type: Type.STRING,
                                description: "The crafted humanized response text"
                            }
                        },
                        required: ["reviewId", "response"]
                    }
                },
                // Low temperature for reliable execution, slightly higher than 0 for organic phrasing
                temperature: 0.3
            }
        });

        const parsedOutput = JSON.parse(response.text);

        // console.log('NEW Response: ', parsedOutput);

        //  FAKE DATA
        // const parsedOutput = [
        //     {
        //         reviewId: 'AbFvOqnfoEkjdaZjububQY9waQO4fFLBRNtidpaFJsPjikIXzdnmpflaKVDrpYe4dXFfxHUxrCkejw',
        //         response: 'Hello Sowmya. Thank you for sharing your feedback with us. We are sorry to hear that the buffet did not meet your expectations and that you felt the food lacked freshness. We take great pride in our Indian cuisine at Bombay Grove Indian Kitchen + Bar, and we will certainly review our recipes and preparation standards with the culinary team. We hope you will give us another chance in the future to provide a much better dining experience.'
        //     },
        //     {
        //         reviewId: 'AbFvOqlUBJKAqIP_vP_TGLI3e2keb9cKkjGisbcMKXl2z2SyFQoWxR0gaShzM0UhMnTUfYsTsPMj',
        //         response: 'Hi Sonal. Thank you so much for the wonderful review. We are thrilled to hear you enjoyed the food and that Steve took such great care of you. I will be sure to pass along your kind words to Steve. We cannot wait to welcome you back to Bombay Grove Indian Kitchen + Bar soon.'
        //     },
        //     {
        //         reviewId: 'AbFvOqnYQDE1-XtbX_PwN-IcnmLlWLXNioXtOCIGnU98AdwuDSUMFRrskwGQhzno6pFW-HRR6SZCEA',
        //         response: 'Hello Ansh. Thank you for the fantastic 5 star rating. We are so glad you loved our appetizers and overall food selection. Steve will be very happy to hear your kind compliments. We look forward to seeing you again soon at Bombay Grove Indian Kitchen + Bar.'
        //     }
        // ]
        // await delay(500);


        return parsedOutput;

    } catch (error) {
        console.error("Error generating responses:", error);
        throw error;
    }

}


export async function generateReviewReply({ locationName,
    category,
    city,
    state,
    reviwerName,
    starRating,
    reviewComment }) {
    const prompt = `
    You are the manager of "${locationName}" (${category}) in location ${city}, ${state}.
    Write a concise, professional, and friendly response to a customer review.
    
    Customer Name: ${reviwerName}
    Customer Rating: ${getRating(starRating)}/5 stars
    Customer Review: "${reviewComment}"

    Response requirements:
    - Keep it under 3 sentences.
    - Sound authentic and polite.
    - Address feedback directly.
  `;

    // console.log(`Generating reply for ${locationName} from ${reviwerName}`);
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
        });

        // console.log(`Review generated successfully for ${locationName} from ${reviwerName} `);
        return { success: true, reply: response.text };
    } catch (error) {
        // Gracefully handle Gemini busy errors
        if (error?.status === 503) {
            console.log(`Review generation failed for ${locationName} from ${reviwerName} 503 `);
            return {
                success: false,
                error: "AI service is currently busy. Click to generate again."
            };
        }
        console.log(`Review generation failed for ${locationName} from ${reviwerName} error: ${JSON.stringify(error)}`);
        return { success: false, error: "Failed to generate reply." };
    }
}


async function refreshGoogleAccessTokenIfNeededById({ google_account_id }) {

    const supabase = await getSupabaseClient();

    // 1. Fetch the existing tokens
    const { data: account, error: fetchError } = await supabase
        .from('google_accounts')
        .select('id, google_email, access_token, refresh_token, expires_at')
        .eq('id', google_account_id)
        .single();

    // console.log('Done readin');
    if (fetchError || !account) {
        console.log('FetchErr: ', fetchError)
        throw new Error("Linked Google account not found in database.");
    }


    const now = new Date();
    const tokenExpiry = new Date(account.expires_at);

    // Buffer check: If token is still valid for more than 5 minutes, return early
    if (tokenExpiry.getTime() - now.getTime() > 5 * 60 * 1000) {
        // console.log('Token is still fresh');
        return account.access_token; // Token is still fresh
    }

    console.log('Renewing token...');

    /* STREAMING_CHUNK: Fetching Fresh Tokens from Google OAuth... */
    // 2. Token is expired or expiring soon, request a fresh one from Google
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to rotate Google OAuth access token: ${errText}`);
    }

    const tokenData = await response.json();
    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // console.log('Saving refreshed token...');

    /* STREAMING_CHUNK: Updating DB with New Access Token... */
    // 3. Persist the updated Access Token in Supabase
    const { error: updateError } = await supabase
        .from('google_accounts')
        .update({
            access_token: tokenData.access_token,
            expires_at: newExpiresAt
        })
        .eq('id', google_account_id);

    // console.log('Updated new token');

    if (updateError) {
        throw new Error(`Failed to update fresh access token in database: ${updateError.message}`);
    }

    // console.log('Returning token');
    return tokenData.access_token;
}

async function fetchReviewSummary({ placeId }) {

    try {
        const responsePlaces = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}`,
            {
                headers: {
                    "X-Goog-Api-Key": process.env.MAPS_API_KEY,
                    "X-Goog-FieldMask": "rating,userRatingCount"
                }
            }
        );
        const { rating, userRatingCount } = await responsePlaces.json();
        console.log(`Rating: ${rating}, count:${userRatingCount}`);
        return { rating: rating, reviewCount: userRatingCount };
    } catch (error) {
        console.log(`ERR: Failed to get review summary for place: `, placeId);
        return { rating: null, reviewCount: null };
    }

}

async function fetchRecentReviews({ google_account_id, accountId, locationId }) {


    var reviews = null;

    try {
        // Get the access token for linked google_account_id that was used for login/onboarding
        const access_token = await refreshGoogleAccessTokenIfNeededById({ google_account_id });

        if (!access_token) {
            console.log(`ERR: Cannot get access_token for accountId ${accountId} locationId ${locationId}`);
            return reviews;
        }

        const reviewUrl = new URL(
            `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime%20desc`
        );

        const response = await fetch(reviewUrl.toString(),
            { method: "GET", headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (!response.ok) {
            // console.log('ERROR: ', JSON.stringify(response))
            let errorDetails;
            try {
                // Try parsing the error body from Google (contains code, message, status)
                errorDetails = await response.json();
                // console.error("Exact API Error Details (try):", errorDetails);
            } catch {
                // Fallback if response body wasn't JSON (e.g., HTML error page)
                errorDetails = await response.text();
                // console.error("Exact API Error Details (catch):", errorDetails);
            }

            console.error("HTTP Error Status:", response.status, response.statusText);
            console.error("fetchRecentReviews - Error Details:", errorDetails);

            throw new Error(`Error fetching reviews: ${JSON.stringify(response)}`);
        }
        const revdata = await response.json();
        reviews = revdata.reviews || [];

        const unrepliedReviews = reviews.filter(review => !review.reviewReply).slice(0, 5);

        return unrepliedReviews;

        // FAKE DATA
        // reviews = [
        //     {
        //         reviewId: 'AbFvOqn-VRavh2NEoR8BnOdXfp_e0tLxxEprCFYUrEcGZ89vKw9vpVJwRju8Vh0Gi4IEi6oOKMvs',
        //         reviewer: {
        //             profilePhotoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocLu6u-hdIh5BOE7O-Mz-oUDDbnNYvEV1wNRMmaLn6hr-5o6gA=s120-c-rp-mo-br100',
        //             displayName: 'Francoise Sejourne'
        //         },
        //         starRating: 'FIVE',
        //         comment: 'Delicious, great atmosphere',
        //         createTime: '2026-07-21T01:19:47.174478Z',
        //         updateTime: '2026-07-21T01:19:47.174478Z',
        //         name: 'accounts/106541109887686928651/locations/9559411719754817822/reviews/AbFvOqn-VRavh2NEoR8BnOdXfp_e0tLxxEprCFYUrEcGZ89vKw9vpVJwRju8Vh0Gi4IEi6oOKMvs'
        //     },
        //     {
        //         reviewId: 'AbFvOqkM7Z8uAXyHRV3X_GT3FsG098_Xgy6RSw8yJ6dPPTGtTeAuL7yvnNJyMskyYoieJuI4TtU9',
        //         reviewer: {
        //             profilePhotoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocKlCiSn0uVG40WfLeMcyqzbf0klFVSRkyOE_SdPI2dpCnxv5g=s120-c-rp-mo-br100',
        //             displayName: 'Theo Ihedoro'
        //         },
        //         starRating: 'FIVE',
        //         comment: 'Manny is excellent!\nFood was great.\nHumorous! Superb service!',
        //         createTime: '2026-07-20T18:24:54.096560Z',
        //         updateTime: '2026-07-20T18:24:54.096560Z',
        //         name: 'accounts/106541109887686928651/locations/9559411719754817822/reviews/AbFvOqkM7Z8uAXyHRV3X_GT3FsG098_Xgy6RSw8yJ6dPPTGtTeAuL7yvnNJyMskyYoieJuI4TtU9'
        //     },
        //     {
        //         reviewId: 'AbFvOqnUiMUOuaYReb1swWrjDzhKX43V0jLaHdBM9Qyh1T6K-PUKxKgIGReXuUfs92ahFxYdbTHhgg',
        //         reviewer: {
        //             profilePhotoUrl: 'https://lh3.googleusercontent.com/a-/ALV-UjULEpXiPz4k4PbFwi0wJdC0ndDnIaynqHApEmnIenls1zW0HWRJ9Q=s120-c-rp-mo-br100',
        //             displayName: 'Khushboo Patel'
        //         },
        //         starRating: 'FIVE',
        //         comment: 'This has been the best Indian restaurant we have been to in east coast of Florida! Hands down!!\n' +
        //             'We started with the spinach chaat that delicious and it kept on getting better with the main course and dessert. We will driving an hour each way to come eat here every time we crave authentic Indian food!!',
        //         createTime: '2026-07-20T00:48:28.412368Z',
        //         updateTime: '2026-07-20T00:48:28.412368Z',
        //         name: 'accounts/106541109887686928651/locations/9559411719754817822/reviews/AbFvOqnUiMUOuaYReb1swWrjDzhKX43V0jLaHdBM9Qyh1T6K-PUKxKgIGReXuUfs92ahFxYdbTHhgg'
        //     }
        // ]

    } catch (error) {
        console.log(`ERR: fetchRecentReviews from GBP for accountId ${accountId} locationId ${locationId} error: ${error}`);
    }

    return reviews;
}


export async function logOut() {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    revalidatePath('/login', 'layout')
}

// lib/google-notifications.js
export async function registerGoogleReviewWebhook({ accountId }) {
    const topicName = "projects/smbflo-review-manager-502402/topics/gbp-reviews-topic";//"projects//topics/google-reviews-topic";

    console.log('Inside registerGoogleReviewWebhook');

    //1. Get Supabase client
    const supabase = await getSupabaseClient();

    //2. Confirm the accountId and locationId belongs to current user
    const { data: accountData, error: accountDataError } = await supabase.from('businesses').select('id, google_account_id, business_name').eq('google_business_id', `accounts/${accountId}`).single();
    if (accountDataError) {
        console.log(`ERR: registerGoogleReviewWebhook. While getting account - accountId ${accountId} locationId ${locationId}`);
        return;
    }

    console.log(`google_account_id: ${accountData.google_account_id}`);
    const access_token = await refreshGoogleAccessTokenIfNeededById({ google_account_id: accountData.google_account_id });

    console.log('Got access token.');

    try {
        const response = await fetch(
            `https://mybusinessnotifications.googleapis.com/v1/accounts/${accountId}/notificationSetting?updateMask=pubsubTopic,notificationTypes`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    pubsubTopic: topicName,
                    notificationTypes: ["NEW_REVIEW", "UPDATED_REVIEW"],
                }),
            }
        );

        // 1. Read the raw text once regardless of status
        const rawText = await response.text();

        // 2. Parse JSON safely from string
        let responseData = {};
        try {
            responseData = rawText ? JSON.parse(rawText) : {};
        } catch {
            responseData = { rawBody: rawText };
        }

        if (!response.ok) {
            console.error("Google Notification Setup Failed:", {
                status: response.status,
                statusText: response.statusText,
                details: responseData,
            });

            const googleMessage =
                responseData?.error?.message ||
                responseData?.error_description ||
                `HTTP Error ${response.status}: ${response.statusText}`;

            throw new Error(`Google Notification Registration Failed: ${googleMessage}`);
        }

        return responseData;
    } catch (error) {
        console.error("Error inside registerGoogleReviewWebhook:", error);
        throw error;
    }
}

export async function readRegistration({ accountId }) {

    // const formattedAccountId = accountId.replace(/^accounts\//, "");
    const url = `https://mybusinessnotifications.googleapis.com/v1/accounts/${accountId}/notificationSetting`;

    try {

        console.log('Inside readRegistration');

        //1. Get Supabase client
        const supabase = await getSupabaseClient();

        //2. Confirm the accountId and locationId belongs to current user
        const { data: accountData, error: accountDataError } = await supabase.from('businesses').select('id, google_account_id, business_name').eq('google_business_id', `accounts/${accountId}`).single();
        if (accountDataError) {
            console.log(`ERR: registerGoogleReviewWebhook. While getting account - accountId ${accountId} locationId ${locationId}`);
            return;
        }

        console.log(`google_account_id: ${accountData.google_account_id}`);
        const access_token = await refreshGoogleAccessTokenIfNeededById({ google_account_id: accountData.google_account_id });

        console.log('Got access token.');

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
            },
        });

        const rawText = await response.text();
        let responseData = {};

        try {
            responseData = rawText ? JSON.parse(rawText) : {};
        } catch {
            responseData = { rawBody: rawText };
        }

        if (!response.ok) {
            console.error("Failed to fetch notification settings:", {
                status: response.status,
                details: responseData,
            });
            throw new Error(`Google Notification Get Failed: ${responseData?.error?.message || response.statusText}`);
        }

        console.log('Final response: ', responseData);

        return responseData;
    } catch (error) {
        console.error("Error in getGoogleReviewWebhookSetting:", error);
        throw error;
    }
}

export async function postReviewReply({ accountId, locationId, reviewId, replyText }) {
    //1. Get Supabase client
    const supabase = await getSupabaseClient();

    //2. Confirm the accountId and locationId belongs to current user
    const { data: accountData, error: accountDataError } = await supabase.from('businesses').select('id, google_account_id').eq('google_business_id', `accounts/${accountId}`).single();
    if (accountDataError) {
        console.log(`ERR: postReviewRepl - while getting account for accountId ${accountId} locationId ${locationId}`);
        return;
    }

    // console.log(`google_account_id: ${accountData.google_account_id}`);
    const access_token = await refreshGoogleAccessTokenIfNeededById({ google_account_id: accountData.google_account_id });
    // console.log('Got access token.');

    //3. Try posting the reply
    try {
        const response = await fetch(
            `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment: replyText
                }),
            }
        );

        // 1. Read the raw text once regardless of status
        const rawText = await response.text();

        // 2. Parse JSON safely from string
        let responseData = {};
        try {
            responseData = rawText ? JSON.parse(rawText) : {};
        } catch {
            responseData = { rawBody: rawText };
        }

        if (!response.ok) {
            responseData.success = false;
            console.error("Post Reply Failed:", {
                accountId: accountId,
                locationId: locationId,
                reviewId: reviewId,
                status: response.status,
                statusText: response.statusText,
                details: responseData,
            });

            const googleMessage =
                responseData?.error?.message ||
                responseData?.error_description ||
                `HTTP Error ${response.status}: ${response.statusText}`;

            throw new Error(`Post Reply Failed: ${googleMessage}`);
        } else {
            responseData.success = true;
            console.log(`Reply posted successfully for accountId ${accountId} loctionId ${locationId} reviewId ${reviewId}`);
        }

        console.log('Returning responseData: ', JSON.stringify(responseData));
        return responseData;
        // delay(2000);
        // return { comment: replyText, success: true};
    } catch (error) {
        console.error(`Error inside postReviewReply accountId ${accountId} loctionId ${locationId} reviewId ${reviewId} - ${error}`);
        throw error;
    }
}