"use client"

import * as React from "react"
import { ExternalLink, Settings, Building2, ChevronDown, ChevronUp, Save, Loader2, Star, MessageSquare } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { syncAllLinkedAccounts } from "@/lib/serveractions/googleAuth"

export default function GBPConfigurationDashboard(
    // { accounts = [], onSaveLocationSettings }
) {
    const [selectedLocations, setSelectedLocations] = React.useState([])
    const [expandedLocation, setExpandedLocation] = React.useState(null)
    const [isSaving, setIsSaving] = React.useState(false)

    const [accounts, setAccounts] = React.useState(null);

    React.useEffect(() => {
        const loadData = async () => {
            const data = await syncAllLinkedAccounts();
            console.log('Data: ', JSON.stringify(data));
            setAccounts(data);
        }

        loadData();
    }, [])

    // --- Inline Workspace State Structure ---
    const [starConfigurations, setStarConfigurations] = React.useState({
        fiveStar: "AUTO_REPLY",
        fourStar: "AUTO_REPLY",
        threeStar: "NOTIFY_DRAFT",
        twoStar: "NOTIFY_DRAFT",
        oneStar: "NOTIFY_DRAFT",
    })
    const [notificationChannel, setNotificationChannel] = React.useState("EMAIL") // "EMAIL" | "TEXT"
    const [notificationDestination, setNotificationDestination] = React.useState("")
    const [additionalNotes, setAdditionalNotes] = React.useState("")

    const toggleLocationSelection = (locationName) => {
        setSelectedLocations((prev) =>
            prev.includes(locationName)
                ? prev.filter((name) => name !== locationName)
                : [...prev, locationName]
        )
    }

    // Open workspace and apply defaults or map existing database criteria
    const handleToggleConfigure = (location) => {
        if (expandedLocation === location.name) {
            setExpandedLocation(null)
        } else {
            setExpandedLocation(location.name)
            // Reset workspace parameters to your specific functional defaults
            setStarConfigurations({
                fiveStar: "AUTO_REPLY",
                fourStar: "AUTO_REPLY",
                threeStar: "NOTIFY_DRAFT",
                twoStar: "NOTIFY_DRAFT",
                oneStar: "NOTIFY_DRAFT",
            })
            setNotificationChannel("EMAIL")
            setNotificationDestination("")
            setAdditionalNotes("")
        }
    }

    const handleInlineSave = async (accountName, location) => {
        setIsSaving(true)
        try {
            // await onSaveLocationSettings?.({
            //     accountName,
            //     locationName: location.name,
            //     settings: {
            //         starConfigurations,
            //         notificationChannel,
            //         notificationDestination,
            //         additionalNotes
            //     }
            // })
            await new Promise((resolve) => setTimeout(resolve, 1500));

            setExpandedLocation(null)
        } catch (err) {
            console.error("Failed to update settings inline:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const formatAddress = (address) => {
        if (!address) return "Service Area Only"
        const lines = address.addressLines ? address.addressLines.join(', ') : ''
        return `${lines ? lines + ' — ' : ''}${address.locality}, ${address.administrativeArea} ${address.postalCode}`
    }

    // UI helper component to map stars uniformly
    const StarRow = ({ count, value, onChange }) => (
        <div className="flex items-center justify-between py-2 border-b last:border-0 border-muted/60">
            <div className="flex items-center gap-1.5">
                <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < count ? "fill-current" : "text-muted/30"}`} />
                    ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium ml-1">Reviews</span>
            </div>
            <Select value={value} onValueChange={onChange} disabled={isSaving}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="AUTO_REPLY">Auto Reply</SelectItem>
                    <SelectItem value="NOTIFY_DRAFT">Notify with Draft</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Google Business Profile Sync</h1>
                <p className="text-muted-foreground text-sm">
                    Configure rule states, alerts, and custom instructions for AI-driven automated reviews.
                </p>
            </div>

            {!accounts ? <><p>Loading...</p></> :
                accounts.map((account) => {
                    const accountId = account.name?.split('/')[1] || ""

                    return (
                        <Card key={account.name} className="overflow-hidden">
                            <CardHeader className="bg-muted/40 border-b flex flex-row flex-wrap items-center justify-between gap-4 py-4 space-y-0">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-muted-foreground" />
                                        {account.title}
                                        {/* <span className="text-xs font-normal text-muted-foreground font-mono">({accountId})</span> */}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="capitalize">{account.type?.toLowerCase()}</Badge>
                                        <Badge variant={account.verificationState === 'VERIFIED' ? 'default' : 'outline'}>
                                            {account.verificationState?.toLowerCase()}
                                        </Badge>
                                    </div>
                                </div>
                                <CardDescription className="font-medium text-sm text-foreground/70">
                                    {account.locations?.length || 0} {account.locations?.length === 1 ? 'Location' : 'Locations'} Available
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-0 divide-y">
                                {(!account.locations || account.locations.length === 0) ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">No business locations found.</div>
                                ) : (
                                    account.locations.map((location) => {
                                        const isChecked = selectedLocations.includes(location.name)
                                        const isExpanded = expandedLocation === location.name

                                        return (
                                            <div key={location.name} className="divide-y divide-border/60 cursor-pointer bg-red-300">
                                                {/* Standard row component container */}
                                                <div className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${isExpanded ? 'bg-muted/50' : isChecked ? 'bg-muted/20' : 'hover:bg-muted/10'
                                                    }`}>
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="pt-1">
                                                            <Checkbox
                                                                id={location.name}
                                                                checked={isChecked}
                                                                onCheckedChange={() => toggleLocationSelection(location.name)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label htmlFor={location.name} className="text-sm font-medium leading-none cursor-pointer hover:text-primary transition-colors">
                                                                {location.title}
                                                            </label>
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                                <span className="font-medium text-foreground">{location.primaryCategory}</span>
                                                                <span>•</span>
                                                                <span>{formatAddress(location.storefrontAddress)}</span>
                                                            </div>
                                                            {location.websiteUri && (
                                                                <a href={location.websiteUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-0.5">
                                                                    Visit URL <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="self-end sm:self-center">
                                                        <Button
                                                            variant={isExpanded ? "secondary" : "outline"}
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => handleToggleConfigure(location)}
                                                        >
                                                            <Settings className="h-3.5 w-3.5" />
                                                            Automation Settings
                                                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Expanded Automation Sub-Panel View */}
                                                {isExpanded && (
                                                    <div className="p-6 bg-muted/20 border-l-4 border-primary grid gap-6 animate-in fade-in duration-200">

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                                            {/* Column 1: Star Breakdown Routing Configurations */}
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                        <MessageSquare className="h-4 w-4 text-primary" />
                                                                        Review Star Routing Rules
                                                                    </h4>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">Determine workflow fallback mechanics based on review scores.</p>
                                                                </div>

                                                                <div className="bg-background border rounded-lg p-3 shadow-sm space-y-1">
                                                                    <StarRow count={5} value={starConfigurations.fiveStar} onChange={(val) => setStarConfigurations(p => ({ ...p, fiveStar: val }))} />
                                                                    <StarRow count={4} value={starConfigurations.fourStar} onChange={(val) => setStarConfigurations(p => ({ ...p, fourStar: val }))} />
                                                                    <StarRow count={3} value={starConfigurations.threeStar} onChange={(val) => setStarConfigurations(p => ({ ...p, threeStar: val }))} />
                                                                    <StarRow count={2} value={starConfigurations.twoStar} onChange={(val) => setStarConfigurations(p => ({ ...p, twoStar: val }))} />
                                                                    <StarRow count={1} value={starConfigurations.oneStar} onChange={(val) => setStarConfigurations(p => ({ ...p, oneStar: val }))} />
                                                                </div>
                                                            </div>

                                                            {/* Column 2: Notifications & Context Prompts */}
                                                            <div className="space-y-6">
                                                                {/* Notification Channel Block */}
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold">Notification Channel</h4>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">Target medium to route notifications for reviews flagged as draft previews.</p>
                                                                    </div>
                                                                    <div className="bg-background border rounded-lg p-4 shadow-sm space-y-4">
                                                                        <RadioGroup
                                                                            value={notificationChannel}
                                                                            onValueChange={(val) => {
                                                                                setNotificationChannel(val)
                                                                                setNotificationDestination("") // Reset dynamic field value on swap
                                                                            }}
                                                                            className="flex gap-4"
                                                                            disabled={isSaving}
                                                                        >
                                                                            <div className="flex items-center space-x-2">
                                                                                <RadioGroupItem value="EMAIL" id="r-email" />
                                                                                <Label htmlFor="r-email" className="text-xs cursor-pointer">Email Notifications</Label>
                                                                            </div>
                                                                            <div className="flex items-center space-x-2">
                                                                                <RadioGroupItem value="TEXT" id="r-text" />
                                                                                <Label htmlFor="r-text" className="text-xs cursor-pointer">Text Messages (SMS)</Label>
                                                                            </div>
                                                                        </RadioGroup>

                                                                        <div className="space-y-1.5">
                                                                            <Label htmlFor="dest-input" className="text-xs font-medium">
                                                                                {notificationChannel === "EMAIL" ? "Destination Email Address" : "Destination Phone Number"}
                                                                            </Label>
                                                                            <Input
                                                                                id="dest-input"
                                                                                type={notificationChannel === "EMAIL" ? "email" : "tel"}
                                                                                placeholder={notificationChannel === "EMAIL" ? "owner@business.com" : "+1 (555) 000-0000"}
                                                                                value={notificationDestination}
                                                                                onChange={(e) => setNotificationDestination(e.target.value)}
                                                                                className="h-8 text-xs"
                                                                                disabled={isSaving}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Additional Context Prompt Area */}
                                                                <div className="space-y-2">
                                                                    <div className="space-y-0.5">
                                                                        <Label htmlFor="notes" className="text-sm font-semibold">AI Generation Modifiers</Label>
                                                                        <p className="text-xs text-muted-foreground">Add specific operational boundaries, instructions, or brand voice guidelines for the AI engine.</p>
                                                                    </div>
                                                                    <Textarea
                                                                        id="notes"
                                                                        placeholder="e.g., Mention our seasonal menu. If a customer complains about wait times, apologize and state that we handle custom orders from scratch..."
                                                                        value={additionalNotes}
                                                                        onChange={(e) => setAdditionalNotes(e.target.value)}
                                                                        className="text-xs min-h-[90px] bg-background resize-none focus-visible:ring-1"
                                                                        disabled={isSaving}
                                                                    />
                                                                </div>

                                                            </div>
                                                        </div>

                                                        {/* Footer Operations Row */}
                                                        <div className="flex items-center justify-end gap-2 border-t pt-4 mt-2">
                                                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpandedLocation(null)} disabled={isSaving}>
                                                                Cancel
                                                            </Button>
                                                            <Button size="sm" className="gap-2 text-xs" onClick={() => handleInlineSave(account.name, location)} disabled={isSaving}>
                                                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                                {isSaving ? "Saving Config..." : "Save Location Settings"}
                                                            </Button>
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