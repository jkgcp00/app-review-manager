"use client"

import * as React from "react"
import { useEffect } from "react"
import { ExternalLink, Settings, Building2 } from "lucide-react"

// Import your custom shadcn component layout elements
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { syncAllLinkedAccounts } from "@/lib/serveractions/googleAuth"

export default function GBPConfigurationDashboard({
    // accounts = [],
    // onConfigureLocation=null
}) {
    const [selectedLocations, setSelectedLocations] = React.useState([])

    const [accounts, setAccounts] = React.useState([]);

    React.useEffect(() => {
        const loadData = async () => {
            const data = await syncAllLinkedAccounts();
            console.log('Data: ', JSON.stringify(data));
            setAccounts(data);
        }

        loadData();
    }, [])

    // Safely manage checkboxes across location strings
    const toggleLocationSelection = (locationName) => {
        setSelectedLocations((prev) =>
            prev.includes(locationName)
                ? prev.filter((name) => name !== locationName)
                : [...prev, locationName]
        );
    }

    // Format the nested storefrontAddress reliably
    const formatAddress = (address) => {
        if (!address) return "Service Area Only"
        const lines = address.addressLines ? address.addressLines.join(', ') : ''
        return `${lines ? lines + ' — ' : ''}${address.locality}, ${address.administrativeArea} ${address.postalCode}`
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Google Business Profile Sync</h1>
                <p className="text-muted-foreground text-sm">
                    Select and configure the specific locations you want to monitor.
                </p>
            </div>

            {/* Main Accounts Loop */}
            {accounts.map((account) => {
                const accountId = account.name?.split('/')[1] || ""

                return (
                    <Card key={account.name} className="overflow-hidden">
                        {/* Account Card Header Panel */}
                        <CardHeader className="bg-muted/40 border-b flex flex-row flex-wrap items-center justify-between gap-4 py-4 space-y-0">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                    {account.title}
                                    <span className="text-xs font-normal text-muted-foreground font-mono">
                                        ({accountId})
                                    </span>
                                </CardTitle>

                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="capitalize">
                                        {account.type?.toLowerCase()}
                                    </Badge>
                                    <Badge
                                        variant={account.verificationState === 'VERIFIED' ? 'default' : 'outline'}
                                        className={account.verificationState !== 'VERIFIED' ? 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400' : ''}
                                    >
                                        {account.verificationState?.toLowerCase()}
                                    </Badge>
                                </div>
                            </div>

                            <CardDescription className="font-medium text-sm text-foreground/70">
                                {account.locations?.length || 0} {account.locations?.length === 1 ? 'Location' : 'Locations'} Available
                            </CardDescription>
                        </CardHeader>

                        {/* Account Locations List */}
                        <CardContent className="p-0 divide-y">
                            {!account.locations || account.locations.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    No active business profiles found for this account.
                                </div>
                            ) : (
                                account.locations.map((location) => {
                                    const isChecked = selectedLocations.includes(location.name)

                                    return (
                                        <div
                                            key={location.name}
                                            className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${isChecked ? 'bg-muted/30' : 'hover:bg-muted/10'
                                                }`}
                                        >
                                            {/* Selection Box & Location Information */}
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="pt-1">
                                                    <Checkbox
                                                        id={location.name}
                                                        checked={isChecked}
                                                        onCheckedChange={() => toggleLocationSelection(location.name)}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label
                                                        htmlFor={location.name}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer hover:text-primary transition-colors"
                                                    >
                                                        {location.title}
                                                    </label>

                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                        <span className="font-medium text-foreground">{location.primaryCategory}</span>
                                                        <span>•</span>
                                                        <span>{formatAddress(location.storefrontAddress)}</span>
                                                    </div>

                                                    {location.websiteUri && (
                                                        <a
                                                            href={location.websiteUri}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline pt-0.5"
                                                        >
                                                            Visit URL <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Explicit Row Configuration Actions */}
                                            <div className="self-end sm:self-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                // onClick={() => onConfigureLocation?.(account.name, location)}
                                                >
                                                    <Settings className="h-3.5 w-3.5" />
                                                    Configure
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>
                )
            })}

            {/* Floating Global Action Bar (When Multi-Locations are Checked) */}
            {selectedLocations.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border shadow-xl rounded-full px-5 py-3 flex items-center gap-4 z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                    <p className="text-xs font-medium">
                        <span className="font-bold text-primary mr-1">{selectedLocations.length}</span>
                        {selectedLocations.length === 1 ? 'location' : 'locations'} selected
                    </p>
                    <Button
                        size="sm"
                        className="rounded-full h-8 text-xs px-4"
                        onClick={() => console.log("Bulk action running for IDs: ", selectedLocations)}
                    >
                        Bulk Sync Accounts
                    </Button>
                </div>
            )}
        </div>
    )
}