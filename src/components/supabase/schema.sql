CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STREAMING_CHUNK: Dropping existing tables to prevent migration conflicts...
DROP TRIGGER IF EXISTS update_google_accounts_modtime ON public.google_accounts;
DROP TRIGGER IF EXISTS update_businesses_modtime ON public.businesses;
DROP TRIGGER IF EXISTS update_locations_modtime ON public.locations;
DROP TRIGGER IF EXISTS update_review_logs_modtime ON public.review_logs;

DROP TABLE IF EXISTS public.location_analytics_snapshots CASCADE;
DROP TABLE IF EXISTS public.review_logs CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP TABLE IF EXISTS public.google_accounts CASCADE;
-- DROP TABLE IF EXISTS public.waitlist CASCADE;

DROP TYPE IF EXISTS business_subscription_status CASCADE;
DROP TYPE IF EXISTS review_workflow_status CASCADE;
DROP TYPE IF EXISTS reply_action_type CASCADE;
DROP TYPE IF EXISTS notification_preference_type CASCADE;

-- =========================================================================
-- ENUMS DEFINITION
-- =========================================================================
CREATE TYPE business_subscription_status AS ENUM ('trialing', 'active', 'suspended', 'canceled');
CREATE TYPE review_workflow_status AS ENUM ('pending_draft', 'scheduled', 'posted', 'flagged_low_rating', 'paused_trial_expired');
CREATE TYPE reply_action_type AS ENUM ('auto_reply', 'notify_draft');
CREATE TYPE notification_preference_type AS ENUM ('email', 'sms', 'none');

-- =========================================================================
-- 1. CONNECTED GOOGLE ACCOUNTS (Directly Linked with Native Auth)
-- =========================================================================
-- STREAMING_CHUNK: Creating google_accounts table linked to auth.users...
CREATE TABLE public.google_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Maps directly to native auth.users table bypassing redundant profile entities
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_email VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT unique_user_google_email UNIQUE (user_id, google_email)
);

-- =========================================================================
-- 2. BUSINESSES TABLE (The Primary Billing, Configuration & Subscription Node)
-- =========================================================================
-- STREAMING_CHUNK: Creating businesses table to manage subscriptions and configurations...
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_account_id UUID NOT NULL REFERENCES public.google_accounts(id) ON DELETE CASCADE,
    google_business_id VARCHAR(255) UNIQUE NOT NULL, -- GBP business ID
    business_name VARCHAR(255) NOT NULL,
    
    -- Billing Status & Trial Window
    billing_status business_subscription_status DEFAULT 'trialing' NOT NULL,
    trial_start_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    trial_end_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '30 days') NOT NULL,
    stripe_subscription_item_id VARCHAR(255) UNIQUE, -- Map to Stripe invoice schedules
    
    -- Star-by-Star Automated Action Rules (Moved to Business)
    reply_action_1_star reply_action_type DEFAULT 'notify_draft' NOT NULL,
    reply_action_2_star reply_action_type DEFAULT 'notify_draft' NOT NULL,
    reply_action_3_star reply_action_type DEFAULT 'notify_draft' NOT NULL,
    reply_action_4_star reply_action_type DEFAULT 'auto_reply' NOT NULL,
    reply_action_5_star reply_action_type DEFAULT 'auto_reply' NOT NULL,
    
    -- Communication preferences (Moved to Business)
    notification_phone VARCHAR(30),
    notification_email VARCHAR(255),
    notification_preference notification_preference_type DEFAULT 'email' NOT NULL,
    
    -- Prompt parameters for Local AI Generation Context (Moved to Business)
    prompt_custom_context TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 3. LOCATIONS TABLE (Physical Storefront Children)
-- =========================================================================
-- STREAMING_CHUNK: Creating locations table for individual storefronts...
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    google_location_id VARCHAR(255) UNIQUE NOT NULL, -- Format: locations/12345
    location_name VARCHAR(255) NOT NULL,
    
    -- Address context for local SEO indexing
    address_line_1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    
    -- Onboarding Toggle (Active vs Discovered)
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 4. REVIEW LOGS & WORKFLOW QUEUE
-- =========================================================================
-- STREAMING_CHUNK: Creating review_logs table with scheduled_post_at...
CREATE TABLE public.review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    google_review_id VARCHAR(255) UNIQUE NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_profile_photo TEXT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- AI response properties
    ai_suggested_reply TEXT,
    posted_reply TEXT,
    workflow_status review_workflow_status DEFAULT 'pending_draft' NOT NULL,
    
    -- Delay dispatcher scheduler (Controlled by your backend calculations)
    scheduled_post_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 5. PERFORMANCE METRICS SNAPSHOTS (Analytics Cache)
-- =========================================================================
-- STREAMING_CHUNK: Creating location_analytics_snapshots table...
CREATE TABLE public.location_analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    snapshot_date DATE DEFAULT CURRENT_DATE NOT NULL,
    total_reviews INT DEFAULT 0 NOT NULL,
    average_rating NUMERIC(3, 2) DEFAULT 0.00 NOT NULL,
    response_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -- =========================================================================
-- -- 6. EARLY ACCESS WAITLIST
-- -- =========================================================================
-- -- STREAMING_CHUNK: Creating waitlist table...
-- CREATE TABLE public.waitlist (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     email VARCHAR(255) UNIQUE NOT NULL,
--     business_name VARCHAR(255),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
--     status VARCHAR(50) DEFAULT 'pending' NOT NULL,
--     referral_code VARCHAR(10) UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
--     referred_by_code VARCHAR(10)
-- );

-- =========================================================================
-- AUTOMATED SYSTEM TRIGGERS (Database Sync)
-- =========================================================================
-- STREAMING_CHUNK: Setting up trigger functions for updated_at columns...

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_accounts_modtime BEFORE UPDATE ON public.google_accounts FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_businesses_modtime BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_locations_modtime BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_review_logs_modtime BEFORE UPDATE ON public.review_logs FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- =========================================================================
-- PERFORMANCE TUNING INDEXES
-- =========================================================================
-- STREAMING_CHUNK: Setting up database performance indexes...
CREATE INDEX idx_google_accounts_user ON public.google_accounts(user_id);
CREATE INDEX idx_businesses_google_account ON public.businesses(google_account_id);
CREATE INDEX idx_businesses_billing_status ON public.businesses(billing_status);
CREATE INDEX idx_locations_business ON public.locations(business_id);
CREATE INDEX idx_locations_is_active ON public.locations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_review_logs_location ON public.review_logs(location_id);
CREATE INDEX idx_review_logs_workflow_status ON public.review_logs(workflow_status);
CREATE INDEX idx_review_logs_scheduler ON public.review_logs(scheduled_post_at) WHERE workflow_status = 'scheduled';
-- CREATE INDEX idx_waitlist_email ON public.waitlist(email);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
-- STREAMING_CHUNK: Enabling and configuring Row Level Security (RLS) policies...

ALTER TABLE public.google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_analytics_snapshots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- 1. Policies for google_accounts
CREATE POLICY "Users can only select their own linked Google OAuth tokens"
    ON public.google_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own Google OAuth tokens"
    ON public.google_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own Google OAuth tokens"
    ON public.google_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own Google OAuth tokens"
    ON public.google_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Policies for businesses (Chained to user_id of parent google_account)
CREATE POLICY "Users can only view their own businesses"
    ON public.businesses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.google_accounts
            WHERE google_accounts.id = businesses.google_account_id
            AND google_accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only insert businesses into their own accounts"
    ON public.businesses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.google_accounts
            WHERE google_accounts.id = google_account_id
            AND google_accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only update their own businesses"
    ON public.businesses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.google_accounts
            WHERE google_accounts.id = businesses.google_account_id
            AND google_accounts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.google_accounts
            WHERE google_accounts.id = google_account_id
            AND google_accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only delete their own businesses"
    ON public.businesses FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.google_accounts
            WHERE google_accounts.id = businesses.google_account_id
            AND google_accounts.user_id = auth.uid()
        )
    );

-- 3. Policies for locations (Chained via businesses -> google_accounts)
CREATE POLICY "Users can only view their own active locations"
    ON public.locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            JOIN public.google_accounts ON google_accounts.id = businesses.google_account_id
            WHERE businesses.id = locations.business_id
            AND google_accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only insert locations under their own businesses"
    ON public.locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            JOIN public.google_accounts ON google_accounts.id = businesses.google_account_id
            WHERE businesses.id = business_id
            AND google_accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only update locations under their own businesses"
    ON public.locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            JOIN public.google_accounts ON google_accounts.id = businesses.google_account_id
            WHERE businesses.id = locations.business_id
            AND google_accounts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            JOIN public.google_accounts ON google_accounts.id = businesses.google_account_id
            WHERE businesses.id = business_id
            AND google_accounts.user_id = auth.uid()
        )
    );

-- 4. Policies for review_logs (Chained via locations -> businesses -> google_accounts)
CREATE POLICY "Users can only access reviews under their own locations"
    ON public.review_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.locations
            JOIN public.businesses ON businesses.id = locations.business_id
            JOIN public.google_accounts ON google_accounts.id = businesses.google_account_id
            WHERE locations.id = review_logs.location_id
            AND google_accounts.user_id = auth.uid()
        )
    );

-- -- 5. Policies for location_analytics_snapshots
-- CREATE POLICY "Users can only view analytics under their own locations"
--     ON public.location_analytics_snapshots FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM public.locations
--             JOIN public.businesses ON businesses.id = locations.business_id
--             JOIN public.google_accounts ON google_accounts.id = businesses.google_account_id
--             WHERE locations.id = location_analytics_snapshots.location_id
--             AND google_accounts.user_id = auth.uid()
--         )
--     );

-- -- 6. Policies for waitlist (Public registration but restricted reading)
-- CREATE POLICY "Anyone can submit their email anonymously to the waitlist"
--     ON public.waitlist FOR INSERT
--     WITH CHECK (true);