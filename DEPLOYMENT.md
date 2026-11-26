# Publicação

Prévia publicada em 26/11/2026:

https://cremoso-operacoes.vercel.app

Projeto Vercel: `palomas-projects-aec41c69/cremoso-operacoes`.

Deploy conectado confirmado como READY em 26/11/2026. URL e chave publicável do Supabase estão configuradas nos ambientes Production e Preview da Vercel. A tela de login foi verificada no site publicado.

Projeto Supabase: `axntuqrzzqjspjyejowr`.

A função `workspace_list` existe e negou corretamente uma chamada anônima. Ainda falta validar uma sessão real e os fluxos autenticados no banco remoto. Nenhuma senha de usuário foi solicitada ou configurada pelo agente.

GitHub: o commit inicial está disponível localmente, mas o envio ao repositório `caroni5260/caronisorveteria` foi recusado por falta de acesso de escrita para `paloma-amaral`. A publicação atual usa a CLI da Vercel e não depende desse envio.

## Próximo passo: Supabase

1. No Supabase, abra Authentication → Users e crie sua primeira conta. Escolha a senha diretamente lá e mantenha-a com você.
2. Entre no sistema publicado com essa conta. Se não houver empresa vinculada, a aplicação oferecerá a criação da empresa e o criador será administrador.
3. Valide os cadastros e uma operação completa com contas de duas unidades antes de usar na loja.
4. Não reaplique a migração inicial sobre tabelas existentes. A presença da função foi verificada; quaisquer ajustes posteriores devem usar novas migrações.

Não compartilhe senha do banco, chave secreta nem service_role. A URL e a chave publicável são suficientes para configurar o frontend; elas não permitem que o agente execute a migração SQL remotamente.

As instruções completas e as limitações desta versão estão em README.md.
