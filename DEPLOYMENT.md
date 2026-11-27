# Publicação

Prévia publicada em 26/11/2026:

https://cremoso-operacoes.vercel.app

Projeto Vercel: `palomas-projects-aec41c69/cremoso-operacoes`.

Deploy conectado confirmado como READY em 26/11/2026. URL e chave publicável do Supabase estão configuradas nos ambientes Production e Preview da Vercel. A tela de login foi verificada no site publicado.

Projeto Supabase: `axntuqrzzqjspjyejowr`.

A função `workspace_list` existe e negou corretamente uma chamada anônima. Ainda falta validar uma sessão real e os fluxos autenticados no banco remoto. Nenhuma senha de usuário foi solicitada ou configurada pelo agente.

GitHub: código enviado à branch `main` de `caroni5260/caronisorveteria` em 26/11/2026. O acesso de escrita para `paloma-amaral` foi confirmado. A tentativa de vinculação automática pela Vercel ainda não foi concluída; a publicação atual usa a CLI da Vercel e continua disponível independentemente dessa integração.

## Próximo passo: Supabase

1. No Supabase, abra Authentication → Users e crie sua primeira conta. Escolha a senha diretamente lá e mantenha-a com você.
2. Entre no sistema publicado com essa conta. Se não houver empresa vinculada, a aplicação oferecerá a criação da empresa e o criador será administrador.
3. Valide os cadastros e uma operação completa com contas de duas unidades antes de usar na loja.
4. Não reaplique a migração inicial sobre tabelas existentes. A presença da função foi verificada; quaisquer ajustes posteriores devem usar novas migrações.

Não compartilhe senha do banco, chave secreta nem service_role. A URL e a chave publicável são suficientes para configurar o frontend; elas não permitem que o agente execute a migração SQL remotamente.

As instruções completas e as limitações desta versão estão em README.md.

## Atualização de 27/11/2026

- Publicada a visão de central fornecedora, com fila por destino/setor, histórico e impressão A4 das contagens.
- A central não mostra tarefas próprias de contagem/reposição. O perfil é configurável por unidade; a identificação automática usa as rotinas/pedidos existentes.
- Deploy `dpl_3NmEKW7UaE3bkwe7QaDZubaZwtcT` confirmado READY no endereço habitual.
- 19 testes passaram e a compilação de produção foi concluída. A navegação foi verificada em um ambiente local de demonstração isolado. Não foram criados registros fictícios no banco remoto.
- A migração `202611270002_supplier_count_read.sql` foi testada localmente e ainda precisa ser aplicada no projeto Supabase remoto para contas Atendente lerem contagens das unidades atendidas. A aplicação exibe um aviso caso essa função não esteja disponível. Administradores e gestores continuam com a leitura existente.
- A impressão A4 foi implementada; a validação em impressora física ainda depende do equipamento da loja.

