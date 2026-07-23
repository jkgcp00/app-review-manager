// middleware.js
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
    // 1. Create an initial response
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // 2. Initialize the Supabase client safely using the request cookies mapping
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                // Safe mapping of cookies that works natively in the Next.js Edge runtime
                getAll() {
                    return request.cookies.getAll().map(({ name, value }) => ({
                        name,
                        value,
                    }));
                },
                setAll(cookiesToSet) {
                    // Update request cookies for downstream Server Components
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );

                    // Recreate response to commit cookies to browser headers
                    response = NextResponse.next({
                        request,
                    });

                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // 3. Authenticate & refresh token
    const { data: { user } } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();
    const isLoginPage = url.pathname === "/login" || url.pathname === "/auth/callback";

    // 4. Route Guard Rules
    if (!user && !isLoginPage) {
        const { pathname } = request.nextUrl;
        const loginUrl = new URL('/login', request.url);
        // 💡 Save the requested URL as a query param
        loginUrl.searchParams.set('next', pathname);

        return NextResponse.redirect(loginUrl);
    }

    if (user && isLoginPage) {
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};