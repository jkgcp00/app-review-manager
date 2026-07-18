'use server';

import { NextResponse } from 'next/server';
import { createAdminClient, getSupabaseClient } from './supabase';

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

        const googleEmailAlreadyLinked = await isGoogleEmailAlreadyLinked({ googleEmail });

        if (googleEmailAlreadyLinked) {
            console.log('Email is already linked with this or another account.');
            return { success: true, code: 1, error: null }; // Already linked.
        }

        const supabase = await getSupabaseClient();

        // 1. Authenticate the active session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error("Unauthorized: You must be logged in with a valid Supabase account.");
        }

        console.log(`linkGoogleAccount for user: ${user.id}, ${user.email}`);

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

export async function refreshGoogleAccessTokenIfNeeded({ google_email }) {
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

    console.log('refreshGoogleAccessTokenIfNeeded: ', JSON.stringify(account));

    const now = new Date();
    const tokenExpiry = new Date(account.expires_at);

    // Buffer check: If token is still valid for more than 5 minutes, return early
    if (tokenExpiry.getTime() - now.getTime() > 5 * 60 * 1000) {
        console.log('Token is still fresh');
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

    console.log('Saving refreshed token...');

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
        console.log('Full sync');
        const { data: linked_accounts, error: fetchError } = await supabase
            .from('google_accounts')
            .select('id, google_email');
        // .select('id, google_email, access_token, expires_at');

        if (fetchError || !linked_accounts) {
            throw new Error("Unable to retrieve valid Google access token.");
        }

        console.log('Linked accounts: ', JSON.stringify(linked_accounts));


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
    console.log('Loading location data from db...');

    try {
        await syncAllLinkedAccounts();
    } catch(error) {
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

    console.log('ACCOUNT_RECORDS: ', JSON.stringify(accountRecords));

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

        console.log('businessesFromDB: ', businessesFromDB);

        for (const businessFromDB of businessesFromDB) {
            var business = {
                id: businessFromDB.id,
                name: businessFromDB.google_business_id,
                title: businessFromDB.business_name,
            };

            // Read all locations for this business

            const {data: locationsFromDB, error: errLocationsFromDB} = await supabase
            .from('locations')
            .select('id, business_id, google_location_id, location_name, address_line_1, city, state, zip_code, primary_category, is_active, reply_action_1_star, reply_action_2_star, reply_action_3_star, reply_action_4_star, reply_action_5_star, notification_phone, notification_email, notification_preference, prompt_custom_context')
            .eq('business_id', businessFromDB.id);


            if (errLocationsFromDB) {
                console.log(`ERR: Error while reading location from DB for business_id: ${businessFromDB.id}, error: ${errLocationsFromDB.message}`);
                continue;
            }

            console.log('locationsFromDB: ', locationsFromDB);

            var locations = [];
            for (const locationFromDB of locationsFromDB) {
                var location ={
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

        console.log('ALL BUSSINESSES: ', JSON.stringify(business));

    } catch (error) {
        console.error("Error in discoverAndSyncGoogleLocations:", error.message);
    }

    return businesses;
}

async function discoverAndSyncGoogleLocations({ id, google_email }) {
    console.log('Syncing linked account: ', google_email);
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
            console.log(`gAccount: ${gAccount.accountName}, ${gAccountId}, ${gAccount.name}, ${gAccount.type}`);
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

            console.log(`gAccount: proceeding...`);

            /* STREAMING_CHUNK: Resolving Storefront Address Context... */
            // Query storefronts inside this specific account
            const locationsResponse = await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${gAccount.name}/locations?readMask=name,title,categories.primaryCategory.displayName,storefrontAddress,websiteUri`,
                { headers: { Authorization: `Bearer ${account.access_token}` } }
            );

            if (!locationsResponse.ok) {
                console.warn(`Could not fetch locations for Google account ${gAccount.name}`);
                continue;
            }

            const locationsData = await locationsResponse.json();
            const discoveredLocations = locationsData.locations || [];

            console.log('discovered locations: ', discoveredLocations.length);

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
                console.log('Location: ', JSON.stringify(loc));

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
                console.log('LocationRecord: ', locationRecord);
                locationRecords.push(locationRecord);

                // Get last 3 reviews
                // const reviewUrl = new URL(
                //     `https://mybusiness.googleapis.com/v4/accounts/${gAccountId}/locations/${locId}/reviews`
                // );

                // // Limit the result count to exactly 3
                // reviewUrl.searchParams.append("pageSize", "3");


                // const response = await fetch(reviewUrl.toString(),
                //     { method: "GET", headers: { Authorization: `Bearer ${account.access_token}` } }
                // );

                // if (!response.ok) {
                //     throw new Error(`Error fetching reviews: ${response.statusText}`);
                // }

                // const revdata = await response.json();

                // // The list of the 3 most recent reviews
                // const reviews = revdata.reviews || [];

                // console.log("Last 3 Reviews:", reviews);
            }

            accountRecord.locations = locationRecords;
            accountRecords.push(accountRecord);
        }

        console.log('All Accounts-json: ', JSON.stringify(accountRecords));
        console.log('All Accounts: ', accountRecords);
        // return { success: true, syncedCount: totalLocationsSynced };
    } catch (error) {
        console.error("Error in discoverAndSyncGoogleLocations:", error.message);
        // return { success: false, error: error.message };
    }

    return accountRecords;
}