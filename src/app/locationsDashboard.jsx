"use client";

import React, { useState } from "react";
import {
    MapPin,
    Tag,
    CheckCircle2,
    XCircle,
    Eye,
    Play,
    PauseCircle,
    ChevronDown,
    Star,
    Mail,
    MessageSquare,
    AlertCircle,
    Sparkles,
    Save,
} from "lucide-react";

// --- shadcn/ui Component Imports ---
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

const initial_locationSettings = {
    // "loc-1": {
    //     fiveStar: "AUTO_REPLY",
    //     fourStar: "AUTO_REPLY",
    //     threeStar: "NOTIFY_DRAFT",
    //     twoStar: "NOTIFY_DRAFT",
    //     oneStar: "NOTIFY_DRAFT",
    //     notificationChannel: "EMAIL",
    //     notificationDestination_email: "manager@apexbistro.com",
    //     // notificationDestination_email: null,
    // },
    // "loc-2": {
    //     fiveStar: "AUTO_REPLY",
    //     fourStar: "AUTO_REPLY",
    //     threeStar: "NOTIFY_DRAFT",
    //     twoStar: "NOTIFY_DRAFT",
    //     oneStar: "NOTIFY_DRAFT",
    //     notificationChannel: "TEXT",
    //     notificationDestination_txt: "+1 (919) 555-0199",
    // },
    // "loc-3": {
    //     fiveStar: "AUTO_REPLY",
    //     fourStar: "NOTIFY_DRAFT",
    //     threeStar: "NOTIFY_DRAFT",
    //     twoStar: "NOTIFY_DRAFT",
    //     oneStar: "NOTIFY_DRAFT",
    //     notificationChannel: "EMAIL",
    //     notificationDestination_email: "owner@peakcitygrill.com",
    // }
}

const defaultSettings = {
    fiveStar: "AUTO_REPLY",
    fourStar: "AUTO_REPLY",
    threeStar: "NOTIFY_DRAFT",
    twoStar: "NOTIFY_DRAFT",
    oneStar: "NOTIFY_DRAFT",
    notificationChannel: "TEXT",
    notificationDestination_email: '',
    notificationDestination_txt: ''
}

export default function LocationsDashboard({ account, locationsFromServer }) {
    const [locations, SetLocations] = useState(locationsFromServer);
    const [locationSettings, SetlocationSettings] = useState(initial_locationSettings);
    const [validationErrors, setValidationErrors] = useState({});
    const [expandedLocationId, setExpandedLocationId] = useState(null);

    // Sample replies preview modal state
    const [previewLocation, setPreviewLocation] = useState(null);

    const getSettingsForLocation = (locationId) => {
        if (locationSettings[locationId]) {
            return locationSettings[locationId]
        } else {
            const settingForLocation = { ...defaultSettings };
            SetlocationSettings((prev) => ({
                ...prev,
                [locationId]: settingForLocation
            }));

            return settingForLocation;
        }
    }

    const handleStartOrEditConfig = (location) => {
        // If opening this panel, collapse any other and initialize its draft state
        if (expandedLocationId !== location.id) {
            setExpandedLocationId(location.id);
            // setDraftConfigs((prev) => ({
            //     ...prev,
            //     [location.id]: {
            //         // ...location.config,
            //         //...locationSettings[location.id],
            //         ...draftConfigs[location.id],
            //         isManagedDraft: true, // Target state upon saving will be managed
            //     },
            // }));
        } else {
            setExpandedLocationId(null);
        }
    };

    // Directly pause a managed location
    const handlePauseManagement = (locationId) => {
        SetLocations((prev) =>
            prev.map((item) => {
                if (item.id === locationId) {
                    return {
                        ...item,
                        isManaged: false,
                    };
                }
                return item;
            })
        );

        if (expandedLocationId === locationId) {
            setExpandedLocationId(null);
        }
    };

    // Update local draft fields while editing in expanded configuration
    const handleUpdateDraftField = (locationId, key, value) => {
        SetlocationSettings((prev) => ({
            ...prev,
            [locationId]: {
                ...prev[locationId],
                [key]: value,
            },
        }));
    };

    // Save draft configuration and officially update location management state
    const handleSaveConfiguration = (location) => {

        // Validate settings
        const locSettings = locationSettings[location.id];
        if (locSettings.notificationChannel === 'EMAIL' && !locSettings.notificationDestination_email) {
            setValidationErrors((prev) => ({
                ...prev,
                [location.id]: 'Email address is required.'
            }));
            return;
        }
        if (locSettings.notificationChannel === 'TEXT' && !locSettings.notificationDestination_txt) {
            setValidationErrors((prev) => ({
                ...prev,
                [location.id]: 'Phone number is required.'
            }));
            return;
        }

        // Collapse configuration panel on save
        setExpandedLocationId(null);

        SetLocations((prev) =>
            prev.map((item) => (item.id === location.id ? { ...item, isManaged: true } : item))
        );

        // SetLocations((prev) => ({
        //     ...prev,
        //     [location.id]: {
        //         ...prev[location.id],
        //         isManaged: true,
        //     }
        // }))
    };

    const ToggleSelector = ({ value, onChange }) => {
        const isAuto = value === "AUTO_REPLY"
        const isNotify = value === "NOTIFY_DRAFT"

        return (
            <div className="flex p-0.5 bg-muted rounded-md border text-xs">
                <button
                    type="button"
                    onClick={() => onChange("AUTO_REPLY")}
                    className={`px-3 py-1 font-medium transition-all rounded-sm ${isAuto
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Auto Reply
                </button>
                <button
                    type="button"
                    onClick={() => onChange("NOTIFY_DRAFT")}
                    className={`px-3 py-1 font-medium transition-all rounded-sm ${isNotify
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Notify with Draft
                </button>
            </div>
        )
    }

    const formatAddress = (address) => {
        if (!address || !address.addressLines) return "Service Area Only"
        const lines = address.addressLines ? address.addressLines.join(', ') : ''
        return `${lines ? lines + ' — ' : ''}${address.city}, ${address.state} ${address.zip_code}`
    }

    if (!account) {
        return (
            <div className="max-w-5xl mx-auto p-2 sm:p-6 space-y-6 text-foreground font-sans">
                <h1>No Account information found.</h1>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-2 sm:p-6 space-y-6 text-foreground font-sans">
            {/* ================= ACCOUNT HEADER ================= */}
            <div className="flex flex-col sm:flex-row sm:items-center  gap-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {/* <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Building2 className="w-5 h-5" />
                        </div> */}
                        <h1 className="text-xl font-bold tracking-tight">{account.title}</h1>
                    </div>
                    {/* <p className="text-xs text-muted-foreground font-mono pl-9">
                        ID: {account.id}
                    </p> */}
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1 text-xs">
                        {locations.length} Locations Total
                    </Badge>
                    <Badge
                        variant="outline"
                        className="px-3 py-1 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    >
                        {locations.filter((l) => l.isManaged).length} Active
                    </Badge>
                </div>
            </div>

            {/* ================= LOCATIONS LIST ================= */}
            <div className="space-y-4">
                {locations.map((location) => {
                    const isExpanded = expandedLocationId === location.id;
                    // const currentDraft = getDraftForLocation(location);
                    const currentSettings = getSettingsForLocation(location.id);

                    return (
                        <div
                            key={location.id}
                            className={`transition-all duration-200 rounded-2xl border bg-background overflow-hidden ${location.isManaged
                                ? "border-border shadow-xs"
                                : "border-border opacity-85"
                                } ${isExpanded
                                    ? "ring-2 ring-primary/20 border-primary/40 shadow-md"
                                    : ""
                                }`}
                        >
                            {/* --- LOCATION DETAILS HEADER --- */}
                            <div className="p-5 sm:p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-base font-semibold text-foreground">
                                                {location.title}
                                            </h2>
                                            {/* Managed status badge */}
                                            {location.isManaged ? (
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[11px]"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> Managed
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1 border-red-500/30 text-red-600 dark:text-red-400 text-[11px]">
                                                    <XCircle className="w-3 h-3" /> Not Managed
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Category & Address */}
                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                <span>{location.primary_category}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                {/* <span>{location.address}</span> */}
                                                <span>{formatAddress(location.storefrontAddress)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Config Toggle Button (when already managed) */}
                                    {location.isManaged && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleStartOrEditConfig(location)}
                                            className="text-xs text-primary hover:text-primary/80 gap-1"
                                        >
                                            <span>{isExpanded ? "Hide Setup" : "Edit Setup"}</span>
                                            <ChevronDown
                                                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                            />
                                        </Button>
                                    )}
                                </div>

                                <Separator className="my-2" />

                                {/* --- ACTION BAR --- */}
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Status:</span>{" "}
                                        {location.isManaged
                                            ? "Automated review management active"
                                            : "Automation paused"}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* View Sample Replies */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPreviewLocation(location)}
                                            className="hidden text-xs gap-1.5"
                                        >
                                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                            View Sample Replies
                                        </Button>

                                        {/* Start / Pause Management Action Button */}
                                        {location.isManaged ? (<></>
                                            // <Button
                                            //     size="sm"
                                            //     variant="destructive"
                                            //     onClick={() => handlePauseManagement(location.id)}
                                            //     className="text-xs gap-1.5"
                                            // >
                                            //     <PauseCircle className="w-3.5 h-3.5" />
                                            //     Pause Management
                                            // </Button>
                                        ) : ( expandedLocationId != location.id &&
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleStartOrEditConfig(location)}
                                                className="text-xs gap-1.5"                                                
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                Start Managing
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ================= EXPANDED CONFIGURATION ================= */}
                            {isExpanded && (
                                <div className="border-t border-border bg-muted/20 p-5 sm:p-6 space-y-6 animate-in fade-in duration-200">
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-1 justify-between pb-2 border-b border-border/60">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Automation Settings & Rules
                                            </h3>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {!location.isManaged &&
                                                "Set up your rules and click Save to start managing."}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* SECTION A: Star Rating Rules */}
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    Rating-Based Actions
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Configure auto-posting versus notification rules for
                                                    each rating score.
                                                </p>
                                            </div>

                                            <div className="bg-background rounded-xl border border-border p-2 space-y-2.5 shadow-2xs">
                                                {[
                                                    { key: "fiveStar", stars: 5 },
                                                    { key: "fourStar", stars: 4 },
                                                    { key: "threeStar", stars: 3 },
                                                    { key: "twoStar", stars: 2 },
                                                    { key: "oneStar", stars: 1 },
                                                ].map(({ key, stars }) => (
                                                    <div
                                                        key={key}
                                                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                                                    >
                                                        <div className="flex flex-col sm:flex-row items-center gap-1.5">
                                                            <div className="flex text-amber-600">
                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                    <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-current" : ""}`} />
                                                                ))}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground font-medium ml-1">Reviews</span>
                                                        </div>

                                                        <ToggleSelector
                                                            value={currentSettings[key]}

                                                            // onChange={(val) => updateSettingsForLocation({ locationId: location.id, updatedSettings: { ...currentSettings, [key]: val } })} />
                                                            onChange={(val) => handleUpdateDraftField(location.id, key, val)} />

                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* SECTION B: Notification Destinations */}
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    Notification/Update Channel
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Where to route pending draft reviews and critical rating
                                                    alerts.
                                                </p>
                                            </div>

                                            <div className="bg-background rounded-xl border border-border p-4 space-y-4 shadow-2xs">
                                                {/* Channel selector using Tabs */}
                                                <Tabs
                                                    value={currentSettings.notificationChannel}
                                                    onValueChange={(val) => {
                                                        if (validationErrors[location.id]) {
                                                            setValidationErrors(prev => ({ ...prev, [location.id]: null }));
                                                        }
                                                        handleUpdateDraftField(
                                                            location.id,
                                                            "notificationChannel",
                                                            val
                                                        )
                                                    }
                                                    }
                                                    className="w-full"
                                                >
                                                    <TabsList className="grid w-full grid-cols-2">
                                                        <TabsTrigger value="EMAIL" className="text-xs gap-1.5">
                                                            <Mail className="w-3.5 h-3.5" /> Email Alert
                                                        </TabsTrigger>
                                                        <TabsTrigger value="TEXT" className="text-xs gap-1.5">
                                                            <MessageSquare className="w-3.5 h-3.5" /> Text (SMS)
                                                        </TabsTrigger>
                                                    </TabsList>
                                                </Tabs>

                                                {/* Destination Input */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-foreground">
                                                        {currentSettings.notificationChannel === "EMAIL"
                                                            ? "Email Address"
                                                            : "Phone Number"}
                                                    </label>
                                                    <Input
                                                        type={
                                                            currentSettings.notificationChannel === "EMAIL"
                                                                ? "email"
                                                                : "tel"
                                                        }
                                                        value={currentSettings.notificationChannel === "EMAIL" ? currentSettings.notificationDestination_email || '' : currentSettings.notificationDestination_txt || ''}
                                                        onChange={(e) => {
                                                            if (validationErrors[location.id]) {
                                                                setValidationErrors(prev => ({ ...prev, [location.id]: null }));
                                                            }
                                                            handleUpdateDraftField(
                                                                location.id,
                                                                currentSettings.notificationChannel === "EMAIL" ? "notificationDestination_email" : "notificationDestination_txt",
                                                                e.target.value
                                                            );
                                                        }
                                                        }
                                                        placeholder={
                                                            currentSettings.notificationChannel === "EMAIL"
                                                                ? "owner@business.com"
                                                                : "+1 (555) 000-0000"
                                                        }
                                                        className="h-8 text-xs"
                                                    />
                                                </div>

                                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-[11px]">
                                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <span>
                                                        Draft notifications require one-click approval before posting to Google.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SAVE / UPDATE BUTTON FOOTER */}
                                    <div className="pt-4 border-t border-border/60 flex flex-col items-end gap-1">
                                        {/* <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2"> */}
                                        {validationErrors[location.id] && (
                                            <span className="text-[11px] font-medium text-destructive animate-in fade-in duration-100">
                                                {validationErrors[location.id]}
                                            </span>
                                        )}
                                        <div className="flex flex-row items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedLocationId(null)}
                                                className="text-xs"
                                            >
                                                Cancel
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={() => handleSaveConfiguration(location)}
                                                className="text-xs gap-1.5"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                {location.isManaged
                                                    ? "Update Settings"
                                                    : "Save & Activate Management"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ================= SAMPLE REPLIES DIALOG ================= */}
            <Dialog
                open={!!previewLocation}
                onOpenChange={(open) => !open && setPreviewLocation(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sample Automated Replies</DialogTitle>
                        <DialogDescription>
                            Preview AI-generated responses for {previewLocation?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    5-Star Review
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                    Positive
                                </Badge>
                            </div>
                            <p className="text-xs text-foreground italic">
                                &ldquo;Great experience at {previewLocation?.name}! Friendly team and quick service.&rdquo;
                            </p>
                            <Separator className="my-1.5" />
                            <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">AI Draft:</span> &ldquo;Thank you so much! We&apos;re thrilled to hear you enjoyed your visit to {previewLocation?.name}. Looking forward to serving you again soon!&rdquo;
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    2-Star Review
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                    Needs Attention
                                </Badge>
                            </div>
                            <p className="text-xs text-foreground italic">
                                &ldquo;Wait time was longer than expected.&rdquo;
                            </p>
                            <Separator className="my-1.5" />
                            <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">AI Draft:</span> &ldquo;We appreciate your feedback and apologize for the wait. We always aim for timely service at {previewLocation?.name}. Please reach out to us directly so we can make this right.&rdquo;
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            size="sm"
                            onClick={() => setPreviewLocation(null)}
                            className="text-xs"
                        >
                            Close Preview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}