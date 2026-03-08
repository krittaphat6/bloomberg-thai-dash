
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-screenshots', 'trade-screenshots', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload trade screenshots" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trade-screenshots');
CREATE POLICY "Anyone can view trade screenshots" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'trade-screenshots');
