"use client";

import React, { useState, useTransition } from "react";
// import { saveWorkspaceConfig } from "./actions";
import {
    Building2,
    MapPin,
    Globe,
    Sparkles,
    Star,
    Mail,
    MessageSquare,
    Loader2,
    BookmarkCheck,
    EyeOff
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignOutButton } from "@/components/sign-out-button";
// import { initiateGoogleAuth } from "@/lib/serveractions/googleAuth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { discoverAndSyncGoogleLocations, syncAllLinkedAccounts } from "@/lib/serveractions/googleAuth";

// Mock Sync Data representing exact responses from GBP APIs
const mockAccounts = [
    { id: "acc-apex-101", name: "Apex Global Solutions", type: "ORGANIZATION", verificationState: "VERIFIED", isSelected: true },
    { id: "acc-vanguard-202", name: "Vanguard Partners", type: "PERSONAL", verificationState: "VERIFIED", isSelected: false }
];

const mockLocations = [
    { id: "loc-apex-hq", accountId: "acc-apex-101", title: "Apex Home Solutions (HQ)", category: "Handyman Service", address: "120 N Salem St, Apex, NC 27502", website: "https://apexhomesolutions.com", isSelected: true },
    { id: "loc-apex-cary", accountId: "acc-apex-101", title: "Cary Regional Branch", category: "Handyman Service", address: "401 Crossroads Blvd, Cary, NC 27518", website: "https://apexhomesolutions.com/cary", isSelected: true },
    { id: "loc-vanguard-med", accountId: "acc-vanguard-202", title: "Vanguard Medical Group", category: "Urgent Care Clinic", address: "1000 Health Ave, Apex, NC 27502", website: "https://vanguardmed.org", isSelected: false }
];

export default function GBPConfigurationPage() {

    const searchParams = useSearchParams();
    const google_email = searchParams.get('google_email');
    console.log('Email is: ', google_email);

    const [isPending, startTransition] = useTransition();
    const [saveStatus, setSaveStatus] = useState(null);

    // Core Selection Trees
    const [accounts, setAccounts] = useState(mockAccounts);
    const [locations, setLocations] = useState(mockLocations);

    // Multi-location rule states stored per location ID
    const [configs, setConfigs] = useState({
        "loc-apex-hq": {
            rating5: "auto",
            rating4: "auto",
            rating3: "draft",
            rating2: "draft",
            rating1: "draft",
            notifyChannel: "email",
            notifyDestination: "alerts@apexhomesolutions.com",
            additionalNotes: "Promote free diagnostic assessments for five-star replies."
        },
        "loc-apex-cary": {
            rating5: "auto",
            rating4: "auto",
            rating3: "draft",
            rating2: "draft",
            rating1: "draft",
            notifyChannel: "sms",
            notifyDestination: "(919) 555-0142",
            additionalNotes: "Redirect bad responses immediately to Cary division manager."
        },
        "loc-vanguard-med": {
            rating5: "auto",
            rating4: "auto",
            rating3: "draft",
            rating2: "draft",
            rating1: "draft",
            notifyChannel: "email",
            notifyDestination: "compliance@vanguardmed.org",
            additionalNotes: "Strict HIPAA disclaimer on all automated templates."
        }
    });

    // Account Checkbox Toggle Controller
    const handleAccountToggle = (accId, checked) => {
        setAccounts(prev => prev.map(acc => acc.id === accId ? { ...acc, isSelected: checked } : acc));

        // Automatically select/deselect all nested child locations for this account
        setLocations(prev => prev.map(loc => {
            if (loc.accountId === accId) {
                return { ...loc, isSelected: checked };
            }
            return loc;
        }));
    };

    // Location Checkbox Toggle Controller
    const handleLocationToggle = (locId, checked) => {
        setLocations(prev => prev.map(loc => loc.id === locId ? { ...loc, isSelected: checked } : loc));
    };

    // Config field modifier
    const updateConfigValue = (locId, field, value) => {
        setConfigs(prev => ({
            ...prev,
            [locId]: {
                ...prev[locId],
                [field]: value
            }
        }));
    };

    // Save changes using Next.js Server Actions
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaveStatus(null);

        // startTransition(async () => {
        //     const payload = { accounts, locations, configs };
        //     const response = await saveWorkspaceConfig(payload);

        //     if (response.success) {
        //         setSaveStatus({ success: true, message: "Configurations securely synced with Supabase." });
        //     } else {
        //         setSaveStatus({ success: false, message: response.error || "Execution failed." });
        //     }
        // });
    };

    const initiateGoogleAuthProcess = async () => {
        await initiateGoogleAuth();
    }

    return (
        <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
            <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto space-y-8">

                {/* Workspace Title Card Header */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-1">
                        {/* <Badge variant="outline" className="mb-2">Integrations Portal</Badge> */}
                        <h1 className="text-2xl font-extrabold tracking-tight">Connect your Google Business Profiles</h1>
                        {/* <p className="text-sm text-muted-foreground">Manage automated AI review responses inline for each linked location.</p> */}
                        <a href={'/api/auth/google'}>
                            <Button variant="outline" className={`px-6 w-full border-primary`}>Add Google Business Account</Button>
                        </a>
                        <Button onClick={async() => await syncAllLinkedAccounts()}>Sync</Button>
                    </div>
                    <div className="flex items-center gap-3">
                        {saveStatus && (
                            <span className={`text-xs font-semibold ${saveStatus.success ? "text-emerald-500" : "text-destructive"}`}>
                                {saveStatus.message}
                            </span>
                        )}
                        <Button type="submit" disabled={isPending} className="font-semibold shadow-sm">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <BookmarkCheck className="mr-2 h-4 w-4" />
                                    Save Setup
                                </>
                            )}
                        </Button>
                        <SignOutButton />
                    </div>
                </header>

                {/* Master Accounts List */}
                <div className="space-y-8">
                    {accounts.map((acc) => {
                        const accLocs = locations.filter(l => l.accountId === acc.id);
                        return (
                            <Card key={acc.id} className="border-border shadow-sm overflow-hidden">

                                {/* Account-level Header Row */}
                                <div className="p-5 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id={acc.id}
                                            checked={acc.isSelected}
                                            onCheckedChange={(checked) => handleAccountToggle(acc.id, !!checked)}
                                        />
                                        <div>
                                            <Label htmlFor={acc.id} className="text-base font-bold flex items-center gap-1.5 cursor-pointer">
                                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                                {acc.name}
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Account Type: {acc.type}</p>
                                        </div>
                                    </div>
                                    <Badge variant={acc.verificationState === "VERIFIED" ? "secondary" : "destructive"} className="text-xs self-start sm:self-auto">
                                        {acc.verificationState}
                                    </Badge>
                                </div>

                                {/* Inline Locations List */}
                                <CardContent className="p-0 divide-y divide-border">
                                    {accLocs.map((loc) => {
                                        const isLocSelected = loc.isSelected;
                                        const config = configs[loc.id] || {};

                                        return (
                                            <div key={loc.id} className={`p-6 transition-colors ${isLocSelected ? "bg-background" : "bg-muted/10"}`}>

                                                {/* Location Header Meta Panel */}
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="pt-1">
                                                            <Checkbox
                                                                id={loc.id}
                                                                checked={isLocSelected}
                                                                onCheckedChange={(checked) => handleLocationToggle(loc.id, !!checked)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label htmlFor={loc.id} className="font-bold text-sm cursor-pointer hover:text-primary">
                                                                {loc.title}
                                                            </Label>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                                <span className="font-semibold text-primary">{loc.category}</span>
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                                    {loc.address}
                                                                </span>
                                                                {loc.website && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Globe className="h-3.5 w-3.5 shrink-0" />
                                                                        <a href={loc.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-muted-foreground">
                                                                            {loc.website}
                                                                        </a>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Dynamic Management Status Badge */}
                                                    <Badge variant={isLocSelected ? "default" : "outline"} className="text-xs self-start sm:self-auto">
                                                        {isLocSelected ? "Managed" : "Not Managed"}
                                                    </Badge>
                                                </div>

                                                {/* Expandable Inline Configuration Area */}
                                                {isLocSelected ? (
                                                    <div className="mt-4 pt-6 border-t border-border/80 grid grid-cols-1 md:grid-cols-2 gap-8">

                                                        {/* Left Sub-Column: Star Rules */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                                <Sparkles className="h-4 w-4 text-primary" />
                                                                Review Star Matrix Rules
                                                            </h4>

                                                            <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border">
                                                                {[5, 4, 3, 2, 1].map((stars) => {
                                                                    const fieldName = `rating${stars}`;
                                                                    const val = config[fieldName] || (stars >= 4 ? "auto" : "draft");

                                                                    return (
                                                                        <div key={stars} className="flex items-center justify-between gap-4 py-1 border-b border-border/30 last:border-0 last:pb-0">
                                                                            {/* Fancy Stars & Label Track */}
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex items-center">
                                                                                    {Array.from({ length: 5 }).map((_, index) => (
                                                                                        <Star
                                                                                            key={index}
                                                                                            className={`h-3.5 w-3.5 ${index < stars
                                                                                                ? "fill-amber-400 text-amber-400"
                                                                                                : "text-muted-foreground/20"
                                                                                                }`}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                                <span className="text-[11px] font-medium text-muted-foreground">Rating</span>
                                                                            </div>

                                                                            {/* Sliding Tab Segmented Controls */}
                                                                            <Tabs
                                                                                value={val}
                                                                                onValueChange={(newVal) => updateConfigValue(loc.id, fieldName, newVal)}
                                                                                className="w-[180px]"
                                                                            >
                                                                                <TabsList className="grid w-full grid-cols-2 h-8 p-1">
                                                                                    <TabsTrigger value="auto" className="text-[10px] h-6 font-semibold">
                                                                                        Auto Reply
                                                                                    </TabsTrigger>
                                                                                    <TabsTrigger value="draft" className="text-[10px] h-6 font-semibold">
                                                                                        Draft Only
                                                                                    </TabsTrigger>
                                                                                </TabsList>
                                                                            </Tabs>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Right Sub-Column: Notifications & Prompt Context */}
                                                        <div className="space-y-6">

                                                            {/* Notifications Section */}
                                                            <div className="space-y-3">
                                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                                    <Mail className="h-4 w-4 text-primary" />
                                                                    Notification Destination
                                                                </h4>

                                                                <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border">
                                                                    <RadioGroup
                                                                        value={config.notifyChannel || "email"}
                                                                        onValueChange={(val) => updateConfigValue(loc.id, "notifyChannel", val)}
                                                                        className="flex gap-4"
                                                                    >
                                                                        <div className="flex items-center space-x-1.5">
                                                                            <RadioGroupItem value="email" id={`ch-email-${loc.id}`} />
                                                                            <Label htmlFor={`ch-email-${loc.id}`} className="text-xs cursor-pointer">Email</Label>
                                                                        </div>
                                                                        <div className="flex items-center space-x-1.5">
                                                                            <RadioGroupItem value="sms" id={`ch-sms-${loc.id}`} />
                                                                            <Label htmlFor={`ch-sms-${loc.id}`} className="text-xs cursor-pointer">Text Message</Label>
                                                                        </div>
                                                                    </RadioGroup>

                                                                    <div className="space-y-1.5 pt-1">
                                                                        <Label htmlFor={`dest-${loc.id}`} className="text-[11px] text-muted-foreground uppercase font-semibold">
                                                                            {config.notifyChannel === "sms" ? "Mobile Phone Number" : "Recipient Email"}
                                                                        </Label>
                                                                        <Input
                                                                            id={`dest-${loc.id}`}
                                                                            type={config.notifyChannel === "sms" ? "text" : "email"}
                                                                            value={config.notifyDestination || ""}
                                                                            onChange={(e) => updateConfigValue(loc.id, "notifyDestination", e.target.value)}
                                                                            placeholder={config.notifyChannel === "sms" ? "(919) 555-0100" : "operations@company.com"}
                                                                            className="h-9"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Prompts Section */}
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`notes-${loc.id}`} className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                                    <MessageSquare className="h-4 w-4 text-primary" />
                                                                    AI Suggested Prompt Guidelines
                                                                </Label>
                                                                <Textarea
                                                                    id={`notes-${loc.id}`}
                                                                    value={config.additionalNotes || ""}
                                                                    onChange={(e) => updateConfigValue(loc.id, "additionalNotes", e.target.value)}
                                                                    placeholder="e.g., Include local seasonal pricing discount codes in all replies..."
                                                                    className="min-h-[80px] text-xs resize-none"
                                                                />
                                                            </div>

                                                        </div>

                                                    </div>
                                                ) : (
                                                    // Unselected Location warning state
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-dashed border-border/60">
                                                        <EyeOff className="h-4 w-4 text-muted-foreground/60" />
                                                        <span>This location is unselected. Upon saving, its properties will be saved under <strong>not_managed</strong>.</span>
                                                    </div>
                                                )}

                                            </div>
                                        );
                                    })}
                                </CardContent>

                            </Card>
                        );
                    })}
                </div>

            </form>
        </div>
    );
}