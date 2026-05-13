CREATE OR REPLACE FUNCTION public.start_document_session(p_document_id UUID)
RETURNS TABLE (
  session_id UUID,
  session_modul TEXT,
  created_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_document public.documents%ROWTYPE;
  v_session_id UUID;
  v_session_modul TEXT;
  v_initial_message TEXT;
BEGIN
  SELECT *
  INTO v_document
  FROM public.documents
  WHERE id = p_document_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dokumen tidak ditemukan';
  END IF;

  IF v_document.status <> 'parsed' THEN
    RAISE EXCEPTION 'Dokumen harus dianalisis terlebih dahulu sebelum memulai bimbingan';
  END IF;

  SELECT s.id, s.modul
  INTO v_session_id, v_session_modul
  FROM public.sessions AS s
  WHERE s.user_id = auth.uid()
    AND s.document_id = v_document.id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  v_initial_message := format(
$message$Saya sudah membaca dokumen "%s".

Ringkasan awal dokumen:
%s

Sekarang kita akan mulai bimbingan berbasis dokumen ini.

Pertanyaan awal:
Menurut kamu, bagian mana dari dokumen ini yang paling perlu diperkuat terlebih dahulu: topik, rumusan masalah, metode, referensi, atau kontribusi penelitian?$message$,
    v_document.nama_file,
    COALESCE(v_document.ai_summary, 'Belum ada ringkasan AI.')
  );

  IF v_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.messages AS m
      WHERE m.session_id = v_session_id
    ) THEN
      INSERT INTO public.messages (
        session_id,
        role,
        content,
        model_used,
        tokens_used
      )
      VALUES (
        v_session_id,
        'assistant',
        v_initial_message,
        'system-context',
        0
      );
    END IF;

    RETURN QUERY SELECT v_session_id, v_session_modul, false;
    RETURN;
  END IF;

  v_session_modul := CASE v_document.jenis
    WHEN 'skripsi' THEN 'skripsi'
    WHEN 'jurnal' THEN 'jurnal'
    WHEN 'laporan_kp' THEN 'proposal'
    WHEN 'proposal' THEN 'proposal'
    ELSE 'proposal'
  END;

  INSERT INTO public.sessions (
    user_id,
    document_id,
    modul,
    status
  )
  VALUES (
    auth.uid(),
    v_document.id,
    v_session_modul,
    'active'
  )
  RETURNING id, modul INTO v_session_id, v_session_modul;

  INSERT INTO public.messages (
    session_id,
    role,
    content,
    model_used,
    tokens_used
  )
  VALUES (
    v_session_id,
    'assistant',
    v_initial_message,
    'system-context',
    0
  );

  RETURN QUERY SELECT v_session_id, v_session_modul, true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_document_session(UUID) TO authenticated;
