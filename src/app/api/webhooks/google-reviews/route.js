import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
    let logId = null;

    console.log('Inside webhook...');

    try {
        const rawBody = await request.json();

        // 1. Verify Pub/Sub envelope
        if (!rawBody?.message?.data) {
            await supabase.from("webhook_logs").insert({
                event_type: "INVALID_PUBSUB_ENVELOPE",
                payload: rawBody,
                status: "failed",
                error_message: "Missing message.data in Pub/Sub body",
            });
            return NextResponse.json({ error: "Invalid Pub/Sub envelope" }, { status: 400 });
        }

        // 2. Decode the Base64 message payload into plain JSON
        // console.log(`rawBody.message.data: ${rawBody.message.data}`);
        // const decodedString = Buffer.from(rawBody.message.data, "base64").toString("utf-8");
        // console.log(`decodedString: ${decodedString}`)
        // const decodedMessage = JSON.parse(decodedString);
        // Fallback if testing with pre-decoded JSON in Postman
        let decodedMessage;
        if (rawBody.message?.data_decoded) {
            decodedMessage = rawBody.message.data_decoded;
        } else {
            try {
                const decodedString = Buffer.from(rawBody.message.data, "base64").toString("utf-8");
                decodedMessage = JSON.parse(decodedString);
            } catch (err) {
                console.error("Failed to parse Base64 data string as JSON:", err);
                return NextResponse.json(
                    { error: "Malformed Base64 payload in message.data" },
                    { status: 400 }
                );
            }
        }

        // 3. Assemble complete decoded payload structure
        const decodedPayload = {
            ...rawBody,
            message: {
                ...rawBody.message,
                data_decoded: decodedMessage, // Store parsed JSON here
            },
        };

        // 4. Dump decoded JSON straight into Supabase
        const { data: logEntry, error: logError } = await supabase
            .from("webhook_logs")
            .insert({
                event_type: decodedMessage.notificationType || "GOOGLE_PUBSUB_REVIEW",
                payload: decodedPayload, // Decoded JSON payload stored
                status: "processing",
            })
            .select("id")
            .single();

        if (logError) {
            console.error("Failed to insert log entry into Supabase:", logError);
        } else {
            logId = logEntry?.id;
        }

        // 5. Execute Review Business Logic
        const { notificationType, locationName, reviewName } = decodedMessage;

        // if (notificationType === "NEW_REVIEW" || notificationType === "UPDATED_REVIEW") {
        //     // Fetch access token for the location
        //     const accessToken = await getClientAccessTokenForLocation(locationName);

        //     if (accessToken) {
        //         // Fetch full review details from Google API
        //         const reviewDetails = await fetchReviewDetails(reviewName, accessToken);

        //         // Run your automated response / internal notification logic
        //         await handleReviewEvent({
        //             type: notificationType,
        //             locationName,
        //             review: reviewDetails,
        //         });
        //     }
        // }

        // // 6. Mark log status as processed in Supabase
        // if (logId) {
        //     await supabase
        //         .from("webhook_logs")
        //         .update({ status: "processed" })
        //         .eq("id", logId);
        // }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Webhook Processing Error:", error);

        if (logId) {
            await supabase
                .from("webhook_logs")
                .update({
                    status: "failed",
                    error_message: error.message || "Unknown processing error",
                })
                .eq("id", logId);
        }

        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// Helper: Fetch review details from Google API
// async function fetchReviewDetails(reviewName, accessToken) {
//     const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}`, {
//         headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     if (!res.ok) {
//         throw new Error(`Failed to fetch review details: ${res.statusText}`);
//     }

//     return await res.json();
// }