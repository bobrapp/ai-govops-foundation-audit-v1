DROP POLICY IF EXISTS "attestations public read" ON storage.objects;
-- Public bucket already serves individual files via CDN without a SELECT policy.
-- We only need an explicit policy for listing; by NOT creating one, listing is denied.
-- Keep the write policy (admin only).