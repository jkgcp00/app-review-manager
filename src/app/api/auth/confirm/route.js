// app/auth/confirm/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/components/supabase/server'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') // 'signup' or 'recovery' or 'magiclink'
    const next = searchParams.get('next') ?? '/dashboard'

    if (token_hash && type) {
        const supabase = createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Redirect to the destination page (e.g., /dashboard)
            return NextResponse.redirect(new URL(next, request.url))
        }
    }

    // Redirect to an error page if verification fails
    return NextResponse.redirect(new URL('/auth/auth-error', request.url))
}