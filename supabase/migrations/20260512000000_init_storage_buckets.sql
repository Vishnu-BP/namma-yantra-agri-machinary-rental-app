-- Storage buckets for machine photos and AI condition reports.
-- Both buckets are public (read by anyone); write access is owner-gated by RLS.

INSERT INTO storage.buckets (id, name, public)
  VALUES ('machine-images', 'machine-images', true)
  ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('condition-reports', 'condition-reports', true)
  ON CONFLICT DO NOTHING;

-- ── machine-images policies ───────────────────────────────────────────────────

CREATE POLICY "machine_images_read_all"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'machine-images');

CREATE POLICY "machine_images_insert_owners"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'machine-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM machines WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "machine_images_delete_owners"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'machine-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM machines WHERE owner_id = auth.uid()
    )
  );

-- ── condition-reports policies ────────────────────────────────────────────────

CREATE POLICY "condition_reports_read_all"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'condition-reports');

CREATE POLICY "condition_reports_insert_owners"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'condition-reports'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM machines WHERE owner_id = auth.uid()
    )
  );
