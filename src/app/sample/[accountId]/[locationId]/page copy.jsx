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

const businessProfile = {
    name: "Apex Home Solutions",
    category: "General Contracting & Handyman Services",
    phone: "(919) 555-0142",
    website: "https://www.apexhomesolutions.com",
    location: {
        address: "120 N Salem St",
        city: "Apex",
        state: "NC",
        zip: "27502",
        country: "United States",
    },
    rating: 4.9,
    totalReviews: 128,
};

const initialReviews = [
    {
        id: "rev-1",
        authorName: "Sarah Jenkins",
        authorPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        rating: 5,
        relativeTime: "2 hours ago",
        text: "Absolutely fantastic experience! They arrived right on time to repair our drywall and install custom shelving in the pantry. The craftsmanship is flawless, and they cleaned up completely before leaving. Highly recommend Apex Home Solutions!",
        suggestedReply: "Hi Sarah! Thank you so much for the wonderful 5-star review. We're thrilled to hear you're loving your new pantry shelving and drywall repairs. It was a pleasure working with you, and we look forward to helping you with any future home projects!",
    },
    {
        id: "rev-2",
        authorName: "Marcus Chen",
        authorPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        rating: 4,
        relativeTime: "1 day ago",
        text: "Great communication throughout the deck repair process. They encountered some rotten joists we hadn't seen initially, but explained the issue clearly and fixed it efficiently. Took slightly longer than estimated, but the final result is solid as a rock.",
        suggestedReply: "Thank you for the detailed feedback, Marcus! We always prioritize safety, so we're glad we could catch and repair those hidden joists for you. We appreciate your patience with the extended timeline and are glad you're happy with the final result!",
    },
    {
        id: "rev-3",
        authorName: "David Ross",
        authorPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        rating: 5,
        relativeTime: "3 days ago",
        text: "We had a list of about 6 small handyman tasks around the house (leaky faucet, fixing a door sweep, mounting a TV, etc.). The technician knocked them all out in under 3 hours. Super professional and polite.",
        suggestedReply: "Hi David! Thanks for sharing your experience. We love tackling those tedious to-do lists so you don't have to! Glad our technician could get everything sorted out so quickly. Give us a call next time you need a hand!",
    },
];

export default async function ReviewDashboard() {

    const [reviews, setReviews] = useState(
        initialReviews.map((rev) => ({
            ...rev,
            isGenerating: true,
            currentReply: "",
            isPosted: false,
        }))
    );

    useEffect(() => {
        reviews.forEach((review, index) => {
            const delay = (index + 1) * 1200;
            setTimeout(() => {
                setReviews((prev) =>
                    prev.map((r) =>
                        r.id === review.id
                            ? { ...r, isGenerating: false, currentReply: r.suggestedReply }
                            : r
                    )
                );
            }, delay);
        });
    }, []);

    const handleReplyChange = (id, newText) => {
        setReviews((prev) =>
            prev.map((r) => (r.id === id ? { ...r, currentReply: newText } : r))
        );
    };

    const handlePostReply = (id) => {
        setReviews((prev) =>
            prev.map((r) => (r.id === id ? { ...r, isPosted: true } : r))
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Dashboard Header */}
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                            Google Business Profile Sync
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Review Assistant
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Generate, edit, and post smart AI replies powered by Gemini.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border p-2 rounded-lg shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        Live Connection: Connected to Google
                    </div>
                </header>

                {/* Business Profile Details */}
                <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
                    <div className="p-6 pb-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                                    <Store className="h-5 w-5 text-muted-foreground" />
                                    {businessProfile.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">{businessProfile.category}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full border border-border">
                                <Star className="h-4 w-4 fill-primary text-primary" />
                                <span className="text-sm font-bold">
                                    {businessProfile.rating}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    ({businessProfile.totalReviews} reviews)
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground border-t border-border pt-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                                {businessProfile.location.address}, {businessProfile.location.city}, {businessProfile.location.state} {businessProfile.location.zip}
                            </span>
                        </div>
                        <div className="flex items-center md:justify-end gap-4 text-xs">
                            <span><strong>Phone:</strong> {businessProfile.phone}</span>
                            <span><strong>Web:</strong> <a href="#" className="underline text-primary hover:opacity-80">{businessProfile.website.replace("https://www.", "")}</a></span>
                        </div>
                    </div>
                </div>

                {/* Active Reviews Workspace */}
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 px-1">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        Recent Google Reviews ({reviews.length})
                    </h2>

                    <div className="space-y-6">
                        {reviews.map((review) => (
                            <div key={review.id} className="rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">

                                    {/* Left Column: Author and Content */}
                                    <div className="lg:col-span-5 p-6 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border">
                                                <img className="aspect-square h-full w-full" src={review.authorPhoto} alt={review.authorName} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">
                                                    {review.authorName}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`h-3 w-3 ${i < review.rating
                                                                    ? "fill-primary text-primary"
                                                                    : "text-muted"
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {review.relativeTime}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <blockquote className="text-sm leading-relaxed text-muted-foreground italic">
                                            "{review.text}"
                                        </blockquote>
                                    </div>

                                    {/* Right Column: Interactive API Response Flow */}
                                    <div className="lg:col-span-7 p-6 bg-muted/30 flex flex-col justify-between">
                                        {review.isGenerating ? (
                                            /* Status 1: Fetching Response */
                                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium flex items-center gap-1.5 justify-center">
                                                        <Sparkles className="h-4 w-4 animate-pulse text-muted-foreground" />
                                                        Gemini is drafting a reply...
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Analyzing review text and business context.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : review.isPosted ? (
                                            /* Status 2: Active Production Complete */
                                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                                <CheckCircle2 className="h-10 w-10 text-primary" />
                                                <div className="text-center">
                                                    <h4 className="text-sm font-semibold">
                                                        Reply Posted Successfully
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Your response is live on Google Business Profile.
                                                    </p>
                                                </div>
                                                <div className="w-full max-w-md bg-card p-3 rounded-lg border border-border mt-2">
                                                    <p className="text-xs text-muted-foreground italic">
                                                        "{review.currentReply}"
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Status 3: Live Verification Block */
                                            <div className="space-y-4 flex-1 flex flex-col justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold flex items-center gap-1">
                                                            <Sparkles className="h-3 w-3" />
                                                            Suggested Reply (Editable)
                                                        </span>
                                                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border">
                                                            Drafted by Gemini
                                                        </span>
                                                    </div>

                                                    <textarea
                                                        value={review.currentReply}
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
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}