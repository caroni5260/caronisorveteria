# Publicação

Prévia publicada em 26/11/2026:

https://cremoso-operacoes.vercel.app

Projeto Vercel: `palomas-projects-aec41c69/cremoso-operacoes`.

Deploy confirmado como READY. O primeiro deploy recebeu automaticamente o domínio de produção da Vercel, mas a aplicação ainda é uma demonstração: não há Supabase conectado e os dados ficam somente no navegador de cada visitante.

## Próximo passo: Supabase

1. Crie um projeto em https://supabase.com/dashboard e mantenha a senha do banco em local seguro.
2. Execute `supabase/migrations/202611260001_workspace.sql` no SQL Editor do projeto novo.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` na Vercel e publique novamente para incorporar as variáveis ao frontend.
4. Crie a primeira conta no Supabase Auth. Ao entrar no sistema, crie a empresa e seus cadastros.

Não compartilhe senha do banco, chave secreta nem service_role. A URL e a chave publicável são suficientes para configurar o frontend; elas não permitem que o agente execute a migração SQL remotamente.

As instruções completas e as limitações desta versão estão em README.md.
