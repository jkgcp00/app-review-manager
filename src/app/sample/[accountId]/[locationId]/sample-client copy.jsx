"use client";

import React, { useState, useEffect } from "react";
import {
    Star,
    Loader2,
    Store,
    MapPin,
    MessageSquare,
    Send,
    Sparkles,
    CheckCircle2,
    Clock
} from "lucide-react";
import { useParams } from "next/navigation";
import { generateResponses, generateReviewReply, readSampleReviews } from "@/lib/serveractions/googleAuth";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { SignOutButton } from "@/components/sign-out-button";
import { getRating } from "@/lib/utils";

const SamplePage_client = ({ businessInfo, recentReviews }) => {
    const [reviewReplies, setReivewReplies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const getReviewResponses = async () => {
            const responses = await generateResponses({ buisnessInfo: businessInfo, reviews: recentReviews });

            responses.forEach((response) => {
                setReivewReplies((prev) => ({
                    ...prev,
                    [response.reviewId]: { currentReply: response.response, error: null }

                }))
            });

            setIsLoading(false);
        }

        getReviewResponses();

    }, [])

    const handleReplyChange = (id, newText) => {
        // setReviews((prev) =>
        //     prev.map((r) => (r.id === id ? { ...r, currentReply: newText } : r))
        // );
    };

    const handlePostReply = (id) => {
        // setReviews((prev) =>
        //     prev.map((r) => (r.id === id ? { ...r, isPosted: true } : r))
        // );
    };

    const formatAddress = (address) => {
        if (!address || !address.addressLines) return "Service Area Only"
        const lines = address.addressLines ? address.addressLines.join(', ') : ''
        return `${lines ? lines + ' — ' : ''}${address.city}, ${address.state} ${address.zip_code}`
    }

    return (
        <div className="min-h-screen bg-background text-foreground py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Dashboard Header */}
                <div className="flex flex-row items-center justify-between gap-4 border-b border-border pb-2">
                    <div className="space-y-1">
                        <h1 className="flex flex-row gap-2 text-2xl items-center font-bold tracking-tight text-primary">
                            <Sparkles color="green" size={28} />
                            SmbFlo
                        </h1>
                    </div>
                    <SignOutButton />
                </div>
                
                {/* Business Profile Details */}
                <div className="p-0 pb-0">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                <Store className="h-4 w-4 text-muted-foreground" />
                                {businessInfo?.title}
                            </h3>
                            {/* <p className="text-sm text-muted-foreground">{businessData?.location?.primary_category}</p> */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>
                                    {formatAddress(businessInfo?.storefrontAddress)}
                                </span>
                            </div>
                        </div>
                        {/* <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full border border-border">
                                <Star className="h-4 w-4 fill-primary text-primary" />
                                <span className="text-sm font-bold">
                                    {businessData?.location?.rating}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    ({businessData?.location?.reviewCount} reviews)
                                </span>
                            </div> */}
                    </div>
                </div>

                {/* Active Reviews Workspace */}
                <div className="space-y-6">
                    <h2 className="text-md font-semibold flex items-center gap-2 px-1">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        Recent Google Reviews ({recentReviews?.length})
                    </h2>

                    <div className="space-y-6">
                        {recentReviews?.map((review) => {
                            return (
                                <div key={review.reviewId} className="rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">

                                        {/* Left Column: Author and Content */}
                                        <div className="lg:col-span-5 p-6 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border">
                                                    <img className="aspect-square h-full w-full" src={review.reviewer?.profilePhotoUrl} alt={review.reviewer?.displayName} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm">
                                                        {review.reviewer?.displayName}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <div className="flex gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={`h-3 w-3 ${i < getRating({ rating: review.starRating })
                                                                        ? "fill-primary text-primary"
                                                                        : "text-muted"
                                                                        }`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDistanceToNow(new Date(review.createTime), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <blockquote className="text-sm leading-relaxed text-muted-foreground italic">
                                                "{review.comment}"
                                            </blockquote>
                                        </div>

                                        {/* Right Column: Interactive API Response Flow */}
                                        <div className="lg:col-span-7 p-6 bg-muted/30 flex flex-col justify-between">
                                            {isLoading ? (
                                                /* Status 1: Fetching Response */
                                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                    <div className="text-center">
                                                        <p className="text-sm font-medium flex items-center gap-1.5 justify-center">
                                                            <Sparkles className="h-4 w-4 animate-pulse text-muted-foreground" />
                                                            SmbFlo is drafting a reply...
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Analyzing review text and business context.
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                                // : reviewReplies[review.reviewId]?.isPosted ? (
                                                //     /* Status 2: Active Production Complete */
                                                //     <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                                //         <CheckCircle2 className="h-10 w-10 text-primary" />
                                                //         <div className="text-center">
                                                //             <h4 className="text-sm font-semibold">
                                                //                 Reply Posted Successfully
                                                //             </h4>
                                                //             <p className="text-xs text-muted-foreground mt-1">
                                                //                 Your response is live on Google Business Profile.
                                                //             </p>
                                                //         </div>
                                                //         <div className="w-full max-w-md bg-card p-3 rounded-lg border border-border mt-2">
                                                //             <p className="text-xs text-muted-foreground italic">
                                                //                 "{reviewReplies[review.reviewId]?.currentReply}"
                                                //             </p>
                                                //         </div>
                                                //     </div>
                                                // ) 
                                                // 
                                                : (
                                                    /* Status 3: Live Verification Block */
                                                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold flex items-center gap-1">
                                                                    <Sparkles className="h-3 w-3" />
                                                                    Suggested Reply (Editable)
                                                                </span>
                                                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">
                                                                    Drafted by SmbFlo
                                                                </span>
                                                            </div>

                                                            <textarea
                                                                value={reviewReplies[review.reviewId]?.currentReply}
                                                                onChange={(e) => handleReplyChange(review.id, e.target.value)}
                                                                className="flex min-h-[110px] w-full rounded-md border border-input bg-card px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                                                placeholder="Draft custom reply here..."
                                                            />
                                                        </div>

                                                        <div className="flex justify-end pt-2">
                                                            <button
                                                                onClick={() => handlePostReply(review.id)}
                                                                className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:opacity-90 h-9 px-4 gap-2"
                                                            >
                                                                <Send className="h-3.5 w-3.5" />
                                                                Post Reply to Google
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>

                                    </div>
                                </div>)
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default SamplePage_client;