'use server';

import Loading from "@/components/loading";
import { loadGoogleLocationsFromDB } from "@/lib/serveractions/googleAuth";
import { Suspense } from "react";
import LocationsDashboard from "./locationsDashboard";

const Dashboard_server = async ({ params }) => {

    // const { accountId, locationId } = await params;
    return (
        <Suspense fallback={<Loading info={'Location details'} />} >
            <DashboardPage_Server />
        </Suspense>
    );
}

const DashboardPage_Server = async () => {
    
    const accountAndLocationDetails = await loadGoogleLocationsFromDB();
    const account = accountAndLocationDetails && accountAndLocationDetails[0] ? {
        id: accountAndLocationDetails[0].id,
        name: accountAndLocationDetails[0].name,
        title: accountAndLocationDetails[0].title
    } : null;

    const locations = accountAndLocationDetails && accountAndLocationDetails[0] ? accountAndLocationDetails[0].locations : [];
    
    return(
        <LocationsDashboard account={account} locationsFromServer={locations}/>
    );
}

export default Dashboard_server;