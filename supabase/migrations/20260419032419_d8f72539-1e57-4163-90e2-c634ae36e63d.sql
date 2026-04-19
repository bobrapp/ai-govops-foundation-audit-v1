-- Create public bucket for chief auditor portraits used in PDF generation
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-portraits', 'agent-portraits', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (public bucket)
CREATE POLICY "Public read of agent portraits"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-portraits');

-- Only admins can upload/update/delete
CREATE POLICY "Admins manage agent portraits insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'agent-portraits' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage agent portraits update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'agent-portraits' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage agent portraits delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'agent-portraits' AND public.has_role(auth.uid(), 'admin'));