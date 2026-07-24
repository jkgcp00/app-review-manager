// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { linkGoogleAccount } from '@/lib/serveractions/googleAuth';

const GOOGLE_TOKEN_LIFESPAN_SECONDS = 3600 - 300; //deduct 5 min for safety
export async function GET(request) {
    console.log('inside - /auth/callback/routejs');
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    // You can pass a fallback or dynamic return path, e.g., /dashboard
    const next = requestUrl.searchParams.get('next') ?? '/'

    if (code) {
        const cookieStore = await cookies()

        // 1. Initialize the Server Client
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method can be ignored if called from a Server Component
                        }
                    },
                },
            }
        )

        // 2. Exchange the Auth Code for a secure session
        const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

        if (!authError && authData?.user) {
            const googleAccessTokenExpiresAt = new Date(Date.now() + GOOGLE_TOKEN_LIFESPAN_SECONDS * 1000).toISOString();

            const user = authData.user;
            const email = user.email;
            const userId = user.id;

            const session = authData.session;
            const googleAccessToken = session.provider_token;   // Used to make direct Google API calls
            const googleRefreshToken = session.provider_refresh_token; // CRUCIAL: Used to refresh Google access background tasks            

            // console.log(`User: ${user}, email: ${email}, id: ${userId}`);
            // console.log('[Tokens Received]:', { googleAccessToken, googleRefreshToken });

            const { code: status } = await linkGoogleAccount({ googleEmail: email, accessToken: googleAccessToken, refreshToken: googleRefreshToken, expiresAt: googleAccessTokenExpiresAt });
            // console.log('linkGoogleAccount.status: ', status);

            // // 3. CAPTURE & UPDATE DATABASE BEFORE REDIRECTING
            // // You can upsert the user details into your custom public.users or public.profiles table
            // const { error: dbError } = await supabase
            //     .from('users') // replace with your custom profiles/users table name
            //     .upsert({
            //         id: userId,
            //         email: email,
            //         updated_at: new Date().toISOString(),
            //         // google provider details can also be grabbed via: user.user_metadata.full_name
            //     }, { onConflict: 'id' })

            // if (dbError) {
            //     console.error('Error syncing user metadata to database:', dbError)
            //     // Decide if you want to block login or proceed anyway
            // }

            // 4. Everything succeeded, proceed to dashboard safely
            return NextResponse.redirect(`${requestUrl.origin}${next}`)
        }
    }

    // If code exchange fails or code is missing, redirect to an error landing page
    return NextResponse.redirect(`${requestUrl.origin}/auth/auth-error`)
}