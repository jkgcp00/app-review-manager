"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut, Ellipsis, User2Icon, ChevronDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { logOut } from "@/lib/serveractions/googleAuth";

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

    return (
        <div className="flex flex-col gap-1 w-fit max-w-full items-center">
            {
                isLoadingUser ? <Ellipsis className="h-4 w-4 animate-ping mr-2" />
                    :
                    user &&
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <div className="flex flex-row gap-1  text-muted-foreground">
                                <User2Icon size={20} className="text-muted-foreground/80" />
                                <ChevronDown size={20} className="text-muted-foreground/80" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='flex w-full px-2'>
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                    <p className="text-sm truncate w-0 min-w-full text-centers text-muted-foreground">{user?.email}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled onClick={() => console.log('Profile selected.')}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Link Account
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                    await logOut();
                                    window.location.origin
                                        ? (window.location.href = `${window.location.origin}/login`)
                                        : (window.location.href = '/login')
                                }}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    <p>Log out</p>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
            }
        </div>
    );
}