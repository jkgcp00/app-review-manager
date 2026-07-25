'use server';

import Loading from "@/components/loading";
import { readSampleReviews } from "@/lib/serveractions/googleAuth";
import { Suspense } from "react";
import SamplePage_client from "./sample-client";
import { delay } from "@/lib/utils";

const Sample_server = async ({ params }) => {

    const { accountId, locationId } = await params;
    return (
        <Suspense fallback={<Loading info={'Location details'} />} >
            <SamplePage_Server accountId={accountId} locationId={locationId} />
        </Suspense>
    );
}

const SamplePage_Server = async ({ accountId, locationId }) => {
    const businessAndReviewDetails = await readSampleReviews({ accountId: accountId, locationId: locationId });

    const businessInfo = {
        accountId: accountId,
        locationId: locationId,
        title: businessAndReviewDetails?.location?.title,
        primary_category: businessAndReviewDetails?.location?.primary_category,
        storefrontAddress: businessAndReviewDetails?.location?.storefrontAddress,
    }

    const recentReviews = businessAndReviewDetails?.location?.recentReviews;

    return(
    // <div>
    //     <p>AccountId: {accountId}</p>
    //     <p>LocationId: {locationId}</p>
    //     <p>Business Info: {JSON.stringify(businessInfo)}</p>
    //     <p>Recent Reviews: {JSON.stringify(recentReviews)}</p>
    // </div>
    <SamplePage_client businessInfo={businessInfo} recentReviews={recentReviews} />
    );
}

export default Sample_server;