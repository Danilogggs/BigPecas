
-- Executar somente em staging, após a migration. Todas as alterações são revertidas.
BEGIN;
DO $test$
DECLARE vendedor bigint; avaliador bigint; anuncio bigint; snap jsonb; respostas jsonb; falhou boolean; qtd integer;
BEGIN
 INSERT INTO public.users(email,full_name,tipo_usuario) VALUES ('review-owner-'||gen_random_uuid()||'@example.test','Teste Vendedor','ambos') RETURNING id INTO vendedor;
 INSERT INTO public.users(email,full_name,tipo_usuario) VALUES ('review-evaluator-'||gen_random_uuid()||'@example.test','Teste Avaliador','avaliador') RETURNING id INTO avaliador;
 INSERT INTO public.pecas(nome_peca,fornecedor_id,preco,preco_base,moeda_base,status_publicacao)
 VALUES ('Teste de avaliação',vendedor,100,100,'BRL','publicada') RETURNING id INTO anuncio;
 IF (SELECT status_publicacao FROM public.pecas WHERE id=anuncio) <> 'pendente_validacao' THEN RAISE EXCEPTION 'Publicou no cadastro'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.notificacoes WHERE user_id=avaliador::text AND peca_id=anuncio) THEN RAISE EXCEPTION 'Notificação ausente'; END IF;
 SELECT criterios_snapshot INTO snap FROM public.avaliacoes_pecas WHERE peca_id=anuncio AND revisao=1;
 IF jsonb_array_length(snap)=0 THEN RAISE EXCEPTION 'Configure critérios antes do teste'; END IF;
 SELECT jsonb_agg(jsonb_build_object('criterio_id',x->'id','resposta',true)) INTO respostas FROM jsonb_array_elements(snap) x;
 UPDATE public.checklist_validacao_peca SET nome_criterio=nome_criterio||' (alterado no teste)';
 IF (SELECT criterios_snapshot FROM public.avaliacoes_pecas WHERE peca_id=anuncio AND revisao=1) <> snap THEN RAISE EXCEPTION 'Snapshot alterado'; END IF;
 falhou:=false;
 BEGIN PERFORM public.decidir_avaliacao_peca(anuncio,avaliador,1,'[]','',false);
 EXCEPTION WHEN raise_exception THEN falhou:=true; END;
 IF NOT falhou THEN RAISE EXCEPTION 'Aceitou checklist vazio'; END IF;
 -- Torna vendedor avaliador para testar autoavaliação, sem alterar a propriedade.
 UPDATE public.users SET tipo_usuario='avaliador' WHERE id=vendedor;
 falhou:=false;
 BEGIN PERFORM public.decidir_avaliacao_peca(anuncio,vendedor,1,respostas,'',false);
 EXCEPTION WHEN raise_exception THEN falhou:=true; END;
 IF NOT falhou THEN RAISE EXCEPTION 'Aceitou autoavaliação'; END IF;
 PERFORM public.decidir_avaliacao_peca(anuncio,avaliador,1,respostas,'Aprovado no teste',false);
 IF (SELECT status_publicacao FROM public.pecas WHERE id=anuncio) <> 'publicada' THEN RAISE EXCEPTION 'Não publicou após aprovação'; END IF;
 falhou:=false;
 BEGIN PERFORM public.decidir_avaliacao_peca(anuncio,avaliador,1,respostas,'',false);
 EXCEPTION WHEN raise_exception THEN falhou:=true; END;
 IF NOT falhou THEN RAISE EXCEPTION 'Aceitou segunda decisão'; END IF;
 UPDATE public.pecas SET nome_peca='Anúncio editado' WHERE id=anuncio;
 IF (SELECT status_publicacao FROM public.pecas WHERE id=anuncio) <> 'pendente_validacao' THEN RAISE EXCEPTION 'Edição não reavaliada'; END IF;
 SELECT count(*) INTO qtd FROM public.avaliacoes_pecas WHERE peca_id=anuncio;
 IF qtd<>2 THEN RAISE EXCEPTION 'Não preservou duas revisões'; END IF;
 falhou:=false;
 BEGIN UPDATE public.avaliacoes_pecas SET comentarios='Adulterado' WHERE peca_id=anuncio AND revisao=1;
 EXCEPTION WHEN raise_exception THEN falhou:=true; END;
 IF NOT falhou THEN RAISE EXCEPTION 'Permitiu alterar histórico'; END IF;
 SELECT jsonb_agg(jsonb_build_object('criterio_id',x->'id','resposta',false)) INTO respostas
 FROM public.avaliacoes_pecas a, jsonb_array_elements(a.criterios_snapshot) x WHERE a.peca_id=anuncio AND a.revisao=2;
 PERFORM public.decidir_avaliacao_peca(anuncio,avaliador,2,respostas,'Faltam evidências',true);
 IF EXISTS (SELECT 1 FROM public.precos_publicos_moeda WHERE id=anuncio) THEN RAISE EXCEPTION 'Reprovado visível publicamente'; END IF;
 IF has_function_privilege('authenticated','public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean)','EXECUTE') THEN
   RAISE EXCEPTION 'RPC exposta a authenticated';
 END IF;
 RAISE NOTICE 'Testes de migration concluídos. A transação será revertida.';
END $test$;
ROLLBACK;

