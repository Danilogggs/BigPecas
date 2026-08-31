-- BigPecas: avaliação e moedas. Executar como owner no Supabase, antes do deploy.
-- Independente de 001 (rascunho antigo). Reexecutável; não apaga dados históricos.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS moeda_padrao varchar DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS pais_origem varchar DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
-- A coluna tipo_usuario do schema fornecido é varchar sem enum/check.
-- Restrições locais incompatíveis devem ser revisadas pelo operador, nunca removidas silenciosamente.

ALTER TABLE public.pecas
  ADD COLUMN IF NOT EXISTS status_publicacao varchar DEFAULT 'pendente_validacao',
  ADD COLUMN IF NOT EXISTS url_video text,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text,
  ADD COLUMN IF NOT EXISTS dados_api_validacao jsonb,
  ADD COLUMN IF NOT EXISTS status_api_serie varchar NOT NULL DEFAULT 'nao_verificado',
  ADD COLUMN IF NOT EXISTS verificado_serie_em timestamptz,
  ADD COLUMN IF NOT EXISTS requer_revalidacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisao_avaliacao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS publicada_em timestamptz,
  ADD COLUMN IF NOT EXISTS moeda_base varchar NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS preco_base numeric;
ALTER TABLE public.pecas ALTER COLUMN status_publicacao SET DEFAULT 'pendente_validacao';
UPDATE public.pecas SET preco_base = preco WHERE preco_base IS NULL;
ALTER TABLE public.pecas ALTER COLUMN preco_base SET NOT NULL;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS peca_id bigint REFERENCES public.pecas(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.checklist_validacao_peca (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome_criterio varchar NOT NULL, descricao text,
  obrigatorio boolean NOT NULL DEFAULT true, ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now()
);
-- Compatibilidade com a grafia acentuada do rascunho 001.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='checklist_validacao_peca' AND column_name='nome_critério')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='checklist_validacao_peca' AND column_name='nome_criterio') THEN
    ALTER TABLE public.checklist_validacao_peca RENAME COLUMN nome_critério TO nome_criterio;
  END IF;
END $$;
ALTER TABLE public.checklist_validacao_peca ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
-- Só semeia quando não existe configuração, sem reativar critérios desativados.
INSERT INTO public.checklist_validacao_peca (nome_criterio, descricao, obrigatorio, ordem)
SELECT v.nome, v.descricao, true, v.ordem FROM (VALUES
 ('Peça real? (Futura API de validação de peça)', 'Verificação manual; API de série ainda não integrada.', 1),
 ('Imagem e/ou vídeo no anúncio?', 'Confirme que a mídia representa a peça.', 2),
 ('Possui todas as informações de tamanho e peso?', 'Comprimento, largura, altura e peso informados.', 3)
) v(nome, descricao, ordem) WHERE NOT EXISTS (SELECT 1 FROM public.checklist_validacao_peca);

-- Nova tabela versionada: não altera nem descarta validacao_peca do rascunho antigo.
CREATE TABLE IF NOT EXISTS public.avaliacoes_pecas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  peca_id bigint NOT NULL REFERENCES public.pecas(id),
  revisao integer NOT NULL CHECK (revisao > 0),
  avaliador_id bigint REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada','substituida')),
  criterios_snapshot jsonb NOT NULL CHECK (jsonb_typeof(criterios_snapshot)='array'),
  respostas jsonb NOT NULL DEFAULT '[]'::jsonb,
  comentarios text,
  criada_em timestamptz NOT NULL DEFAULT now(), decidida_em timestamptz,
  UNIQUE (peca_id, revisao)
);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_pecas_avaliador ON public.avaliacoes_pecas(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_pecas_fila ON public.pecas(status_publicacao, data_cadastro);

CREATE TABLE IF NOT EXISTS public.taxas_cambio (
  moeda varchar PRIMARY KEY CHECK (moeda ~ '^[A-Z]{3}$'),
  unidades_por_brl numeric CHECK (unidades_por_brl > 0),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  fonte text NOT NULL DEFAULT 'configuracao',
  CHECK (moeda <> 'BRL' OR unidades_por_brl = 1)
);
-- Sem inventar cotações. Configure USD/EUR antes de habilitar conversões.
INSERT INTO public.taxas_cambio(moeda, unidades_por_brl) VALUES ('BRL',1),('USD',NULL),('EUR',NULL)
ON CONFLICT (moeda) DO NOTHING;

CREATE OR REPLACE FUNCTION public.snapshot_checklist_peca() RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id', id, 'nome_criterio', nome_criterio, 'descricao', descricao,
  'obrigatorio', COALESCE(obrigatorio,true), 'ordem', ordem) ORDER BY ordem NULLS LAST, id), '[]'::jsonb)
 FROM public.checklist_validacao_peca WHERE ativo = true
$$;

CREATE OR REPLACE FUNCTION public.preparar_avaliacao_peca() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE taxa numeric; alterou boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_publicacao := 'pendente_validacao';
    NEW.revisao_avaliacao := 1;
    NEW.publicada_em := NULL;
    NEW.status_api_serie := 'nao_verificado';
    NEW.dados_api_validacao := NULL;
    NEW.verificado_serie_em := NULL;
  ELSE
    -- Estoque e campos internos de pagamento não invalidam a avaliação.
    alterou := (to_jsonb(NEW) - ARRAY['estoque_atual','status','updated_at','preco',
      'status_publicacao','revisao_avaliacao','publicada_em','motivo_rejeicao','requer_revalidacao',
      'status_api_serie','dados_api_validacao','verificado_serie_em'])
      IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['estoque_atual','status','updated_at','preco',
      'status_publicacao','revisao_avaliacao','publicada_em','motivo_rejeicao','requer_revalidacao',
      'status_api_serie','dados_api_validacao','verificado_serie_em']);
    IF alterou THEN
      NEW.status_publicacao := 'pendente_validacao';
      NEW.revisao_avaliacao := OLD.revisao_avaliacao + 1;
      NEW.publicada_em := NULL;
      NEW.motivo_rejeicao := NULL;
      NEW.requer_revalidacao := true;
    END IF;
    IF NEW.num_serie IS DISTINCT FROM OLD.num_serie THEN
      NEW.status_api_serie := 'nao_verificado';
      NEW.dados_api_validacao := NULL;
      NEW.verificado_serie_em := NULL;
    END IF;
  END IF;
  NEW.moeda_base := upper(COALESCE(NEW.moeda_base, 'BRL'));
  NEW.preco_base := COALESCE(NEW.preco_base, NEW.preco);
  SELECT unidades_por_brl INTO taxa FROM public.taxas_cambio WHERE moeda = NEW.moeda_base;
  IF taxa IS NULL OR NEW.preco_base IS NULL OR NEW.preco_base <= 0 THEN
    RAISE EXCEPTION 'Preço ou moeda base inválidos; configure a taxa de câmbio.';
  END IF;
  -- preco legado continua em BRL para pedidos, frete e vendas existentes.
  NEW.preco := round(NEW.preco_base / taxa, 2);
  IF NEW.status_publicacao = 'publicada' AND NOT EXISTS (
    SELECT 1 FROM public.avaliacoes_pecas WHERE peca_id = NEW.id
      AND revisao = NEW.revisao_avaliacao AND status = 'aprovada'
  ) THEN RAISE EXCEPTION 'Publicação exige uma avaliação aprovada da revisão atual.'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enfileirar_avaliacao_peca() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.revisao_avaliacao = OLD.revisao_avaliacao THEN RETURN NEW; END IF;
    UPDATE public.avaliacoes_pecas SET status='substituida'
      WHERE peca_id=NEW.id AND status='pendente';
  END IF;
  INSERT INTO public.avaliacoes_pecas(peca_id, revisao, criterios_snapshot)
    VALUES (NEW.id, NEW.revisao_avaliacao, public.snapshot_checklist_peca());
  INSERT INTO public.notificacoes(user_id, tipo, titulo, mensagem, status_envio, peca_id)
    SELECT id::text, 'nova_peca_para_validar', 'Nova peça aguardando avaliação',
      'Avalie o anúncio: ' || NEW.nome_peca, 'enviada', NEW.id
    FROM public.users WHERE tipo_usuario='avaliador' AND id <> NEW.fornecedor_id;
  RETURN NEW;
END $$;

-- Backfill seguro: nunca publica por suposição; reexecução preserva decisões desta migration.
UPDATE public.pecas p SET status_publicacao='pendente_validacao', publicada_em=NULL
WHERE NOT EXISTS (SELECT 1 FROM public.avaliacoes_pecas a WHERE a.peca_id=p.id AND a.revisao=p.revisao_avaliacao);
WITH novas AS (
  INSERT INTO public.avaliacoes_pecas(peca_id, revisao, criterios_snapshot)
    SELECT id, revisao_avaliacao, public.snapshot_checklist_peca() FROM public.pecas
    ON CONFLICT (peca_id,revisao) DO NOTHING RETURNING peca_id
)
INSERT INTO public.notificacoes(user_id,tipo,titulo,mensagem,status_envio,peca_id)
SELECT u.id::text,'nova_peca_para_validar','Peça aguardando avaliação',
  'Anúncio existente encaminhado para avaliação.','enviada',n.peca_id
FROM novas n CROSS JOIN public.users u JOIN public.pecas p ON p.id=n.peca_id
WHERE u.tipo_usuario='avaliador' AND u.id<>p.fornecedor_id;

DROP TRIGGER IF EXISTS preparar_avaliacao_peca ON public.pecas;
CREATE TRIGGER preparar_avaliacao_peca BEFORE INSERT OR UPDATE ON public.pecas
FOR EACH ROW EXECUTE FUNCTION public.preparar_avaliacao_peca();
DROP TRIGGER IF EXISTS enfileirar_avaliacao_peca ON public.pecas;
CREATE TRIGGER enfileirar_avaliacao_peca AFTER INSERT OR UPDATE ON public.pecas
FOR EACH ROW EXECUTE FUNCTION public.enfileirar_avaliacao_peca();

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
  IF p.fornecedor_id=p_avaliador THEN RAISE EXCEPTION 'Não é permitido avaliar o próprio anúncio.'; END IF;
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

-- Proteções também contra acesso direto ao Supabase. API usa service_role.
ALTER TABLE public.checklist_validacao_peca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxas_cambio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checklist_validacao_peca, public.avaliacoes_pecas, public.taxas_cambio FROM anon, authenticated;
GRANT ALL ON public.checklist_validacao_peca, public.avaliacoes_pecas, public.taxas_cambio TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.checklist_validacao_peca_id_seq, public.avaliacoes_pecas_id_seq TO service_role;
REVOKE ALL ON FUNCTION public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.enfileirar_avaliacao_peca() FROM PUBLIC, anon, authenticated;

-- Bloqueia gravação direta: alterações devem passar pelas permissões da API.
REVOKE INSERT, UPDATE, DELETE ON public.pecas FROM anon, authenticated;
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bigpecas_publicadas_restricao ON public.pecas;
CREATE POLICY bigpecas_publicadas_restricao ON public.pecas AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (status_publicacao='publicada');
DROP POLICY IF EXISTS bigpecas_publicadas_leitura ON public.pecas;
CREATE POLICY bigpecas_publicadas_leitura ON public.pecas FOR SELECT TO anon, authenticated
  USING (status_publicacao='publicada');

-- Conversão derivada: nunca mantém cache de preço desatualizado; preço base é preservado.
CREATE OR REPLACE VIEW public.precos_publicos_moeda AS
 SELECT p.*, t.moeda AS moeda_exibicao,
 round(p.preco_base / origem.unidades_por_brl * t.unidades_por_brl, 2) AS preco_exibicao
 FROM public.pecas p
 JOIN public.taxas_cambio origem ON origem.moeda=p.moeda_base AND origem.unidades_por_brl IS NOT NULL
 CROSS JOIN public.taxas_cambio t
 WHERE p.status_publicacao='publicada' AND t.unidades_por_brl IS NOT NULL;
REVOKE ALL ON public.precos_publicos_moeda FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.precos_publicos_moeda TO service_role;

-- Histórico é imutável após decisão; reenvios criam outra revisão.
CREATE OR REPLACE FUNCTION public.proteger_historico_avaliacao() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'O histórico de avaliação não pode ser excluído.'; END IF;
  IF NEW.criterios_snapshot IS DISTINCT FROM OLD.criterios_snapshot OR
     NEW.peca_id IS DISTINCT FROM OLD.peca_id OR NEW.revisao IS DISTINCT FROM OLD.revisao OR
     OLD.status <> 'pendente' THEN
    RAISE EXCEPTION 'O histórico de avaliação é imutável. Crie uma nova revisão.';
  END IF;
  RETURN NEW;
END $;
DROP TRIGGER IF EXISTS proteger_historico_avaliacao ON public.avaliacoes_pecas;
CREATE TRIGGER proteger_historico_avaliacao BEFORE UPDATE OR DELETE ON public.avaliacoes_pecas
FOR EACH ROW EXECUTE FUNCTION public.proteger_historico_avaliacao();

DO $ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.pecas'::regclass AND conname='pecas_api_serie_status_check') THEN
    ALTER TABLE public.pecas ADD CONSTRAINT pecas_api_serie_status_check
    CHECK (status_api_serie IN ('nao_verificado','pendente','aprovado','reprovado','erro')) NOT VALID;
  END IF;
END $;

COMMIT;

