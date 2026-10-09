-- Permite que administradores avaliem os proprios anuncios e remove criterios
-- temporarios do checklist sem apagar o historico das revisoes anteriores.

UPDATE public.checklist_validacao_peca
SET nome_criterio = 'Autenticidade e identificação da peça',
    descricao = 'Confirme visualmente que a peça e seus códigos de identificação correspondem ao anúncio.',
    obrigatorio = true,
    ordem = 1,
    ativo = true
WHERE lower(trim(nome_criterio)) = lower('Peça real? (Futura API de validação de peça)');

UPDATE public.checklist_validacao_peca
SET nome_criterio = 'Imagem ou vídeo representa a peça anunciada',
    descricao = 'Confirme que a mídia mostra claramente a peça cadastrada.',
    obrigatorio = true,
    ordem = 2,
    ativo = true
WHERE lower(trim(nome_criterio)) = lower('Imagem e/ou vídeo no anúncio?');

UPDATE public.checklist_validacao_peca
SET nome_criterio = 'Dimensões e peso estão informados',
    descricao = 'Verifique se comprimento, largura, altura e peso foram preenchidos.',
    obrigatorio = true,
    ordem = 3,
    ativo = true
WHERE lower(trim(nome_criterio)) = lower('Possui todas as informações de tamanho e peso?');

UPDATE public.checklist_validacao_peca
SET ativo = false
WHERE lower(trim(nome_criterio)) IN (
  lower('teste att critério'),
  lower('Aprovação Prof Rafa'),
  lower('testando novamente')
);

CREATE OR REPLACE FUNCTION public.decidir_avaliacao_peca(
  p_peca bigint, p_avaliador bigint, p_revisao integer, p_respostas jsonb,
  p_comentarios text DEFAULT '', p_rejeitar boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.pecas; a public.avaliacoes_pecas; c jsonb; r jsonb; aprovada boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_avaliador AND (tipo_usuario='avaliador' OR is_admin)) THEN
    RAISE EXCEPTION 'Usuário sem permissão para avaliar.';
  END IF;
  SELECT * INTO p FROM public.pecas WHERE id=p_peca FOR UPDATE;
  IF NOT FOUND OR p.status_publicacao <> 'pendente_validacao' OR p.revisao_avaliacao <> p_revisao THEN
    RAISE EXCEPTION 'O anúncio mudou ou já foi avaliado. Recarregue a fila.';
  END IF;
  IF p.fornecedor_id=p_avaliador AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id=p_avaliador AND is_admin=true
  ) THEN
    RAISE EXCEPTION 'Somente administradores podem avaliar o próprio anúncio.';
  END IF;
  SELECT * INTO a FROM public.avaliacoes_pecas WHERE peca_id=p_peca AND revisao=p_revisao FOR UPDATE;
  IF NOT FOUND OR a.status <> 'pendente' THEN RAISE EXCEPTION 'Avaliação indisponível.'; END IF;
  IF jsonb_typeof(p_respostas) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Checklist inválido.'; END IF;
  IF jsonb_array_length(p_respostas) <> jsonb_array_length(a.criterios_snapshot) THEN
    RAISE EXCEPTION 'Responda todos os critérios desta revisão.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) x
    GROUP BY x->>'criterio_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Critérios duplicados.'; END IF;
  aprovada := jsonb_array_length(a.criterios_snapshot)>0;
  FOR c IN SELECT * FROM jsonb_array_elements(a.criterios_snapshot) LOOP
    SELECT x INTO r FROM jsonb_array_elements(p_respostas) x WHERE x->>'criterio_id'=c->>'id';
    IF r IS NULL OR jsonb_typeof(r->'resposta') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'Resposta ausente ou inválida.';
    END IF;
    IF (c->>'obrigatorio')::boolean AND NOT (r->>'resposta')::boolean THEN aprovada:=false; END IF;
  END LOOP;
  IF p_rejeitar THEN
    IF length(trim(COALESCE(p_comentarios,'')))=0 THEN RAISE EXCEPTION 'Informe o motivo da reprovação.'; END IF;
    aprovada:=false;
  ELSIF NOT aprovada THEN
    RAISE EXCEPTION 'Marque positivamente todos os critérios obrigatórios ou reprove com motivo.';
  END IF;
  UPDATE public.avaliacoes_pecas SET avaliador_id=p_avaliador, respostas=p_respostas,
    comentarios=p_comentarios, decidida_em=now(), status=CASE WHEN aprovada THEN 'aprovada' ELSE 'rejeitada' END
    WHERE id=a.id;
  UPDATE public.pecas SET status_publicacao=CASE WHEN aprovada THEN 'publicada' ELSE 'rejeitada' END,
    publicada_em=CASE WHEN aprovada THEN now() ELSE NULL END,
    motivo_rejeicao=CASE WHEN aprovada THEN NULL ELSE p_comentarios END, requer_revalidacao=NOT aprovada
    WHERE id=p_peca;
  INSERT INTO public.notificacoes(user_id,tipo,titulo,mensagem,status_envio,peca_id)
    VALUES (p.fornecedor_id::text,CASE WHEN aprovada THEN 'validacao_aprovada' ELSE 'validacao_rejeitada' END,
      CASE WHEN aprovada THEN 'Peça aprovada e publicada' ELSE 'Peça reprovada' END,
      CASE WHEN aprovada THEN 'Seu anúncio está disponível no catálogo.' ELSE p_comentarios END,'enviada',p_peca);
  RETURN jsonb_build_object('publicada',aprovada,'status',CASE WHEN aprovada THEN 'aprovada' ELSE 'rejeitada' END);
END $$;

REVOKE ALL ON FUNCTION public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean)
  TO service_role;
