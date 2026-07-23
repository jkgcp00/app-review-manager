"use client"

import * as React from "react"
import { ExternalLink, Building2, ChevronDown, ChevronUp, Save, Star, MessageSquare, Sparkles } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { loadGoogleLocationsFromDB, syncAllLinkedAccounts } from "@/lib/serveractions/googleAuth"
import { SignOutButton } from "@/components/sign-out-button"
import Loading from "@/components/loading"
import Link from "next/link"

// Standard setup templates used for clean local initialization
const createDefaultConfig = () => ({
    starConfigurations: {
        fiveStar: "NOTIFY_DRAFT",
        fourStar: "NOTIFY_DRAFT",
        threeStar: "NOTIFY_DRAFT",
        twoStar: "NOTIFY_DRAFT",
        oneStar: "NOTIFY_DRAFT",
    },
    notificationChannel: "EMAIL",
    notificationDestination: "",
    additionalNotes: "",
})

export default function GBPConfigurationDashboard() {
    const [expandedLocation, setExpandedLocation] = React.useState(null)

    // --- Central In-Memory State Store Variable ---
    // Captures all settings for all locations locally in real-time.
    const [allConfigurations, setAllConfigurations] = React.useState({})
    // Track text validation errors per location (e.g., { "locations/123": "Email is required" })
    const [validationErrors, setValidationErrors] = React.useState({})

    const [accounts, setAccounts] = React.useState(null);

    React.useEffect(() => {
        const loadData = async () => {
            // const data = await syncAllLinkedAccounts();
            const data = await loadGoogleLocationsFromDB();
            // console.log('Data: ', JSON.stringify(data));
            setAccounts(data);
        }

        loadData();
    }, [])

    // Helper utility to merge updates into a specific location's configuration state map
    const updateLocationConfig = (locationName, updates) => {
        setAllConfigurations((prev) => {
            const currentConfig = prev[locationName] || createDefaultConfig()
            return {
                ...prev,
                [locationName]: {
                    ...currentConfig,
                    ...updates,
                },
            }
        })
        // console.log('Config: ', (allConfigurations));
    }

    const handleRowClick = (locationName) => {
        if (expandedLocation === locationName) {
            setExpandedLocation(null)
        } else {
            setExpandedLocation(locationName)
            // Initialize with standard project baseline rule configurations on first interaction if empty
            if (!allConfigurations[locationName]) {
                setAllConfigurations((prev) => ({
                    ...prev,
                    [locationName]: createDefaultConfig(),
                }))
            }
        }
    }

    const handleSaveAction = (locationName) => {
        // Console log the central state payload map to track local changes easily

        const currentLocalConfig = allConfigurations[locationName] || createDefaultConfig()
        const destination = currentLocalConfig.notificationDestination?.trim()
        const channel = currentLocalConfig.notificationChannel

        if (!destination) {
            const channelLabel = channel === "EMAIL" ? "Email address" : "Phone number"
            setValidationErrors((prev) => ({
                ...prev,
                [locationName]: `${channelLabel} is mandatory.`,
            }))
            return // Block closing or saving
        }

        // Clear any existing errors for this location if validation passes
        setValidationErrors((prev) => {
            const copy = { ...prev }
            delete copy[locationName]
            return copy
        })

        // console.log("Current App State Map for all configurations:", allConfigurations)
        // console.log(`Saved settings locally for location: ${locationName}`, allConfigurations[locationName])
        setExpandedLocation(null)
    }

    const formatAddress = (address) => {
        if (!address || !address.addressLines) return "Service Area Only"
        const lines = address.addressLines ? address.addressLines.join(', ') : ''
        return `${lines ? lines + ' — ' : ''}${address.city}, ${address.state} ${address.zip_code}`
    }

    // Visual Toggle Button Component representing specific tier configurations
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

    return (
        // <div className="container mx-auto py-4 sm:py-6 max-w-5xl space-y-8 px-4">
        <div className="container mx-auto py-4 sm:py-6  px-0">
            {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6"> */}
            {/* <div className="flex flex-row items-center justify-between gap-4 border-b border-border pb-2">
                <div className="space-y-1">
                    <h1 className="flex flex-row gap-2 text-2xl items-center font-bold tracking-tight text-primary">
                        <Sparkles color="green" size={28}/>
                        SmbFlo</h1>
                </div>
                <SignOutButton />
            </div> */}

            {
                !accounts ? <Loading info={'Account details'} />
                    :
                    accounts.map((account) => {
                        const accountId = account.name?.split('/')[1] || ""

                        return (
                            <Card key={account.name} className="overflow-hidden">
                                <CardHeader className="bg-muted border-b flex flex-row flex-wrap items-center justify-between gap-4 py-4 space-y-0">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                            {account.title}
                                            {/* <span className="text-xs font-normal text-muted-foreground font-mono">({accountId})</span> */}
                                        </CardTitle>
                                        {/* <div className="flex gap-2">
                                            <Badge variant="secondary" className="capitalize">{account.type?.toLowerCase()}</Badge>
                                            <Badge variant={account.verificationState === 'VERIFIED' ? 'default' : 'outline'}>
                                                {account.verificationState?.toLowerCase()}
                                            </Badge>
                                        </div> */}
                                    </div>
                                    <CardDescription className="font-medium text-sm text-foreground/70">
                                        {account.locations?.length || 0} {account.locations?.length === 1 ? 'Location' : 'Locations'}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-0 divide-y">
                                    {(!account.locations || account.locations.length === 0) ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground">No business locations found.</div>
                                    ) : (
                                        account.locations.map((location) => {
                                            const locationId = location.name?.split('/')[1] || ""
                                            const isExpanded = expandedLocation === location.name
                                            const currentLocalConfig = allConfigurations[location.name] || createDefaultConfig()
                                            const locationHasSavedData = !!allConfigurations[location.name]

                                            return (
                                                <div key={location.name} className="divide-y divide-border/60">

                                                    {/* Unified Clickable Row Action Wrapper */}
                                                    <div
                                                        onClick={() => handleRowClick(location.name)}
                                                        className={`p-5 flex items-center justify-between gap-4 cursor-pointer select-none transition-all duration-200 ${isExpanded ? 'bg-muted/50 shadow-sm' : 'hover:bg-muted/20'
                                                            }`}
                                                    >
                                                        <div className="space-y-1 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold tracking-tight text-foreground">
                                                                    {location.title}
                                                                </span>
                                                                {locationHasSavedData && (
                                                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-destructive text-destructive bg-primary/5 font-medium">
                                                                        Not Managed
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                                <span className="font-medium text-foreground/80">{location.primary_category}</span>
                                                                <span>•</span>
                                                                <span>{formatAddress(location.storefrontAddress)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-muted-foreground/70 px-2">
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </div>
                                                    </div>

                                                    {/* Expanded Sub-Panel Workspace Input Form */}
                                                    {isExpanded && (
                                                        <div
                                                            className="p-6 bg-muted/30 border-l-4 border-primary grid gap-6 animate-in fade-in duration-150"
                                                            onClick={(e) => e.stopPropagation()} // Safe shield to prevent clicking parameters from toggling the row closed
                                                        >
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                                                {/* Section A: Redesigned High-Fidelity Star Rules Toggles */}
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                            <MessageSquare className="h-4 w-4 text-primary" />
                                                                            Review Star Rules
                                                                        </h4>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">Toggle fallback automation mechanics based on review score.</p>
                                                                    </div>

                                                                    <div className="bg-background border rounded-lg p-3 shadow-sm space-y-2">
                                                                        {[
                                                                            { label: "fiveStar", count: 5 },
                                                                            { label: "fourStar", count: 4 },
                                                                            { label: "threeStar", count: 3 },
                                                                            { label: "twoStar", count: 2 },
                                                                            { label: "oneStar", count: 1 }
                                                                        ].map((row) => (
                                                                            <div key={row.label} className="flex items-center justify-between py-1.5 border-b last:border-0 border-muted/50">
                                                                                {/* <div className="flex text-amber-500">
                                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                                        <Star key={i} className={`h-4 w-4 ${i < row.count ? "fill-current" : "text-muted/20"}`} />
                                                                                    ))}
                                                                                </div> */}
                                                                                <div className="flex flex-col sm:flex-row items-center gap-1.5">
                                                                                    <div className="flex text-emerald-600">
                                                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                                                            <Star key={i} className={`h-4 w-4 ${i < row.count ? "fill-current" : ""}`} />
                                                                                        ))}
                                                                                    </div>
                                                                                    <span className="text-xs text-muted-foreground font-medium ml-1">Reviews</span>
                                                                                </div>
                                                                                <ToggleSelector
                                                                                    value={currentLocalConfig.starConfigurations[row.label]}
                                                                                    onChange={(val) => updateLocationConfig(location.name, {
                                                                                        starConfigurations: { ...currentLocalConfig.starConfigurations, [row.label]: val }
                                                                                    })}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Section B: Notification Target Channels & Strings */}
                                                                <div className="space-y-6">
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <h4 className="text-sm font-semibold">Notification Channel</h4>
                                                                            <p className="text-xs text-muted-foreground mt-0.5">Where to route draft alerts.</p>
                                                                        </div>
                                                                        <div className="bg-background border rounded-lg p-4 shadow-sm space-y-4">
                                                                            <RadioGroup
                                                                                value={currentLocalConfig.notificationChannel}
                                                                                onValueChange={
                                                                                    (val) => {
                                                                                        // 1. Clear any error when they swap channels
                                                                                        setValidationErrors(prev => ({ ...prev, [location.name]: null }))
                                                                                        updateLocationConfig(location.name, { notificationChannel: val, notificationDestination: "" })
                                                                                    }
                                                                                }
                                                                                className="flex gap-4"
                                                                            >
                                                                                <div className="flex items-center space-x-2">
                                                                                    <RadioGroupItem value="EMAIL" id={`r-email-${location.name}`} />
                                                                                    <Label htmlFor={`r-email-${location.name}`} className="text-xs cursor-pointer">Email</Label>
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <RadioGroupItem value="TEXT" id={`r-text-${location.name}`} />
                                                                                    <Label htmlFor={`r-text-${location.name}`} className="text-xs cursor-pointer">Text (SMS)</Label>
                                                                                </div>
                                                                            </RadioGroup>

                                                                            <div className="space-y-1.5">
                                                                                <Label htmlFor={`dest-${location.name}`} className="text-xs font-medium">
                                                                                    {currentLocalConfig.notificationChannel === "EMAIL" ? "Email Destination" : "Phone Number Destination"}
                                                                                </Label>
                                                                                <Input
                                                                                    id={`dest-${location.name}`}
                                                                                    type={currentLocalConfig.notificationChannel === "EMAIL" ? "email" : "tel"}
                                                                                    placeholder={currentLocalConfig.notificationChannel === "EMAIL" ? "owner@business.com" : "+1 (555) 000-0000"}
                                                                                    value={currentLocalConfig.notificationDestination}
                                                                                    onChange={
                                                                                        (e) => {
                                                                                            if (validationErrors[location.name]) {
                                                                                                setValidationErrors(prev => ({ ...prev, [location.name]: null }))
                                                                                            }
                                                                                            updateLocationConfig(location.name, { notificationDestination: e.target.value })
                                                                                        }
                                                                                    }
                                                                                    className="h-8 text-xs"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Section C: Modifier Prompt Context Box */}
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor={`notes-${location.name}`} className="text-xs font-semibold">AI Generation Custom Prompt Notes</Label>
                                                                        <Textarea
                                                                            id={`notes-${location.name}`}
                                                                            placeholder="Provide unique instructions regarding promotions, brand voice guidelines, or specific customer service workflows..."
                                                                            value={currentLocalConfig.additionalNotes}
                                                                            onChange={(e) => updateLocationConfig(location.name, { additionalNotes: e.target.value })}
                                                                            className="text-xs min-h-[105px] bg-background resize-none focus-visible:ring-1"
                                                                        />
                                                                    </div>

                                                                </div>
                                                            </div>

                                                            {/* Footer Actions Row Control Bar */}
                                                            <div className="flex flex-col items-end border-t pt-4">
                                                                {validationErrors[location.name] && (
                                                                    <span className="text-[11px] font-medium text-destructive animate-in fade-in duration-100">
                                                                        {validationErrors[location.name]}
                                                                    </span>
                                                                )}
                                                                <div className="flex w-full items-center justify-between gap-2">
                                                                    <Link href={`/sample/${accountId}/${locationId}`}>
                                                                        <Button size="sm" className="text-xs h-8">Sample Replies</Button>
                                                                    </Link>
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setExpandedLocation(null)}>
                                                                            Cancel
                                                                        </Button>
                                                                        <Button disabled size="sm" className="gap-2 text-xs h-8" onClick={() => handleSaveAction(location.name)}>
                                                                            <Save className="h-3.5 w-3.5" />
                                                                            Apply Settings
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
        </div>
    )
}