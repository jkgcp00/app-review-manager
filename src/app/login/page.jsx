"use client";

import * as React from "react";
import { useState } from "react";
import { createClient } from "@/components/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Mail, ArrowRight, Loader2, KeyRound, Sparkles } from "lucide-react";

export default function LoginPage() {
    const supabase = createClient();

    const [step, setStep] = useState("email"); // "email" | "otp"
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleGoogleLogin() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline', // Demands a refresh token
                        prompt: 'consent',      // Forces Google's consent screen to reappear
                    },
                    scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/business.manage',
                    redirectTo: `${window.location.origin}/auth/callback?next=/`,
                }
            });

            if (error) throw error;
        } catch (error) {
            console.error("Error initiating Google OAuth:", error.message);
        }
    }

    // Step 1: Send Magic Link / OTP to Email
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            // Example Supabase call:
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm`,
                }
            })
            if (error) throw error;

            console.log("OTP sent to:", email);

            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setStep("otp");
        } catch (error) {
            console.error("Error sending OTP:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify the 6-Digit OTP
    const handleVerifyOtp = async (e) => {
        e?.preventDefault();
        if (otp.length !== 6) return;

        setIsLoading(true);
        try {
            // Example Supabase call:
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email' // or 'magiclink'
            })
            if (error) throw error;

            console.log("Verifying OTP:", otp);

            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            // alert("Successfully logged in!");
            window.location.href = '/'
        } catch (error) {
            console.error("Error verifying OTP:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md shadow-lg border border-border">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {/* {step === "email" ? (
                            <Mail className="h-6 w-6" />
                        ) : (
                            <KeyRound className="h-6 w-6" />
                        )} */}
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {step === "email" ? "Welcome to SmbFlo" : "Enter verification code"}
                    </CardTitle>
                    <CardDescription>Please login using your Google Account</CardDescription>
                    {/* <CardDescription>
                        {step === "email"
                            ? "We'll send a 6-digit login code to your inbox."
                            : `We sent a code to ${email}`}
                    </CardDescription> */}
                </CardHeader>

                <CardContent>
                    {step === "email" ? (
                        // Email Form
                        // <form onSubmit={handleSendOtp} className="space-y-4">
                        //     <div className="space-y-2">
                        //         <Label htmlFor="email" className="sr-only">Email Address</Label>
                        //         <Input
                        //             id="email"
                        //             type="email"
                        //             placeholder="name@example.com"
                        //             required
                        //             value={email}
                        //             onChange={(e) => setEmail(e.target.value)}
                        //             disabled={isLoading}
                        //             className="w-full"
                        //         />
                        //     </div>
                        //     <Button type="submit" className="w-full" disabled={isLoading}>
                        //         {isLoading ? (
                        //             <>
                        //                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        //                 Sending code...
                        //             </>
                        //         ) : (
                        //             <>
                        //                 Send temporary code
                        //                 <ArrowRight className="ml-2 h-4 w-4" />
                        //             </>
                        //         )}
                        //     </Button>


                        // </form>
                        <Button variant="outline" className={`w-full border-primary`} onClick={handleGoogleLogin}>
                            <svg viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                            {/* <svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 24 24">
                                <path
                                    fill="#EA4335"
                                    d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.283 1.434 15.446 0 12.24 0c-6.63 0-12 5.37-12 12s5.37 12 12 12c6.926 0 11.52-4.875 11.52-11.715 0-.795-.085-1.4-.195-2H12.24z"
                                />
                            </svg> */}
                            Continue with Google</Button>
                    ) : (
                        // OTP Form
                        <form onSubmit={handleVerifyOtp} className="space-y-6 flex flex-col items-center">
                            <div className="space-y-2 w-full flex flex-col items-center">
                                <Label htmlFor="otp" className="text-sm font-medium text-muted-foreground self-start pl-1">
                                    6-Digit Code
                                </Label>
                                <InputOTP
                                    id="otp"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(value) => setOtp(value)}
                                    onComplete={() => handleVerifyOtp()}
                                    disabled={isLoading}
                                >
                                    <InputOTPGroup className="gap-2">
                                        <InputOTPSlot index={0} className="rounded-md border" />
                                        <InputOTPSlot index={1} className="rounded-md border" />
                                        <InputOTPSlot index={2} className="rounded-md border" />
                                        <InputOTPSlot index={3} className="rounded-md border" />
                                        <InputOTPSlot index={4} className="rounded-md border" />
                                        <InputOTPSlot index={5} className="rounded-md border" />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>

                            <div className="w-full space-y-3">
                                <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify & Sign In"
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setStep("email");
                                        setOtp("");
                                    }}
                                    disabled={isLoading}
                                >
                                    Back to email
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="flex justify-center border-t border-border pt-6 pb-6">
                    <p className="text-xs text-center text-muted-foreground">
                        By continuing, you agree to our{" "}
                        <a href="http://www.smbflo.com/terms" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{" "}
                        and{" "}
                        <a href="http://www.smbflo.com/privacy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}