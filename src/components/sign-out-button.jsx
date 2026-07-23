// components/sign-out-button.jsx
"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    useEffect(() => {
        const getLoggedInUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (!error && user) {
                setUser(user);
            }
            setIsLoadingUser(false);
        }

        getLoggedInUser();
    }, [supabase]);

    const handleSignOut = async () => {
        setIsLoggingOut(true);

        // 1. Clear the session in Supabase (deletes local session and cookies)
        await supabase.auth.signOut();

        // 2. Refresh the current router state to trigger middleware route guards
        router.refresh();

        // 3. Send the user back to the login screen
        router.push("/login");
    };

    return (
        <div className="flex flex-col gap-1 w-fit max-w-full items-center">
            {
                isLoadingUser ? <Ellipsis className="h-4 w-4 animate-ping mr-2" />
                    : <p className="text-xs truncate w-0 min-w-full text-centers text-muted-foreground">{user?.email}</p>
            }
            {
                user && 
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    disabled={isLoggingOut}
                    className="text-muted-foreground"
                >
                    {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Log Out
                </Button>
            }
        </div>
    );
}