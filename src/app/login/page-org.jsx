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
import { Mail, ArrowRight, Loader2, KeyRound } from "lucide-react";

export default function LoginPage() {
    const supabase = createClient();

    const [step, setStep] = useState("email"); // "email" | "otp"
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);

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
                        {step === "email" ? (
                            <Mail className="h-6 w-6" />
                        ) : (
                            <KeyRound className="h-6 w-6" />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {step === "email" ? "Welcome back" : "Enter verification code"}
                    </CardTitle>
                    <CardDescription>
                        {step === "email"
                            ? "We'll send a 6-digit login code to your inbox."
                            : `We sent a code to ${email}`}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {step === "email" ? (
                        // Email Form
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="sr-only">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending code...
                                    </>
                                ) : (
                                    <>
                                        Send temporary code
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
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
                        By clicking continue, you agree to our{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">Terms of Service</a>{" "}
                        and{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}