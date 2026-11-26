# Operações — Cremoso

Primeira versão navegável, com identidade visual aprovada, pronta para desenvolvimento em Next.js e implantação na Vercel. O Supabase fornece autenticação e persistência quando configurado. A versão conectada está publicada em https://cremoso-operacoes.vercel.app. As variáveis do Supabase estão configuradas e a tela de login foi verificada; o teste com uma conta real ainda está pendente. Veja DEPLOYMENT.md.

## Executar

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Sem as variáveis do Supabase, o sistema abre em **demonstração**, com os dados salvos somente no navegador. Não existe sincronização entre celulares nesse modo. Use **Exportar dados** para obter uma cópia JSON de uma empresa.

Os dados da Cremoso estão exclusivamente em `src/lib/demo.ts`. Uma empresa criada em Configurações → Nova empresa começa com todos os cadastros vazios. Nomes de unidades, categorias, setores, atendimentos e produtos não são regras fixas do aplicativo.

## O que é navegável e funcional

- Empresas independentes e múltiplas unidades.
- Cadastros de produtos, categorias, setores, formas de atendimento, produtos correspondentes no ERP, rotinas e acessos.
- Cada forma de atendimento tem nome livre, comportamento operacional (separar ou produzir), título do checklist e identificação do destino de impressão.
- Produtos com embalagem, conteúdo, unidades por pacote, contagem de frações, setor e conversão para o ERP.
- Pedido único com origem, destino, prazo e quantidades, dividido por forma de atendimento e setor.
- Quantidades solicitadas, preparadas e recebidas preservadas separadamente.
- Retirada com volumes, identificação de lacres e entregador.
- Conferência em duas etapas: informar quantidades sem a comparação e depois revisar diferenças. Produtos extras podem ser adicionados.
- Recebimento com faltas, sobras e trocas. Informe como recebido apenas o que foi aceito; descreva recusas e avarias na observação.
- Consolidação para ERP usando quantidades aceitas e os fatores cadastrados. Sabores continuam no histórico.
- Confirmação de lançamento manual no ERP com referência e bloqueio de segunda confirmação.
- Contagem de estoque, histórico por unidade e entradas posteriores à contagem. O consumo entre contagens é desconhecido: essa tela não promete saldo físico em tempo real.
- Auditoria das ações e exportação JSON.
- Compartilhamento manual de resumo no WhatsApp.
- Impressão por setor pelo diálogo do navegador, com folha de estilo para papel de 80 mm. A impressora física ainda precisa ser validada.
- Tema com nome e cores configuráveis por empresa.

## Conectar ao Supabase

1. Crie um projeto Supabase.
2. Execute o conteúdo de `supabase/migrations/202611260001_workspace.sql` no SQL Editor de um projeto novo, ou aplique como migração pelo seu processo habitual. Não reaplique a mesma migração em um banco já configurado.
3. Copie `.env.example` para `.env.local` e preencha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

Use a chave **publicável**, nunca `service_role` ou chave secreta no navegador. A autorização está no banco, não na aparência das telas.

4. Crie a primeira conta em Supabase → Authentication → Users. Entre na aplicação com essa conta e crie a empresa: o criador recebe o perfil administrador.
5. Cadastre unidades, setores, categorias, formas de atendimento e produtos correspondentes no ERP. Depois cadastre os produtos e as rotinas.
6. Para outras pessoas, crie as contas no Supabase Auth e vincule UUID, e-mail, perfil e unidades em Usuários e acessos. O formulário não cria contas nem envia convites. O administrador não altera o próprio acesso nesse formulário.

Com as variáveis presentes, o sistema exige login e **não** carrega automaticamente os exemplos locais. Os dados de demonstração não são importados para o Supabase.

## Publicar na Vercel

1. Envie esta pasta para um repositório Git de sua preferência.
2. Importe esse repositório na Vercel, usando esta pasta como raiz do projeto.
3. Framework: Next.js. Instalação: `npm ci`. Build: `npm run build`. Deixe o diretório de saída no padrão do Next.js.
4. Configure as duas variáveis do Supabase no ambiente correspondente e publique.
5. No Supabase Auth, configure a URL do site para o endereço da Vercel. Esta versão usa login por e-mail/senha, sem callback de OAuth.

## Controle de acesso e persistência

O banco usa três tabelas: empresas, vínculos de usuários e auditoria. Cada empresa tem um agregado JSONB com os cadastros e registros operacionais. É uma base inicial para uma operação pequena; haverá necessidade de normalizar e paginar os registros conforme o volume crescer.

As tabelas têm RLS e não concedem leitura/escrita direta aos papéis públicos. As funções RPC validam o usuário autenticado, o vínculo com a empresa, o perfil e as unidades autorizadas. Não se usa chave privilegiada na aplicação.

- Administrador: cadastros e acessos, todas as unidades.
- Gestor: cadastros e operação, todas as unidades; não gerencia acessos.
- Atendente: solicita, conta, prepara, despacha e recebe dentro das unidades autorizadas.
- Produção: registra preparação na unidade de origem autorizada.
- Entregador: registra retirada na origem autorizada.

Nomes de unidades fornecedoras e o catálogo são referências compartilhadas dentro da mesma empresa. Pedidos e contagens são filtrados pelas unidades autorizadas. A seleção de unidade na interface é um filtro; a permissão é validada novamente pelo banco.

Cada comando altera os dados e grava auditoria na mesma transação, com bloqueio da empresa durante a alteração para evitar perda de atualizações concorrentes. Pedidos expedidos não podem ter as quantidades preparadas alteradas e não podem ser recebidos duas vezes. Divergências só são resolvidas por outro gestor que não tenha despachado nem recebido aquele pedido. A auditoria não tem operação pública de edição ou exclusão.

O modo de demonstração permite avaliar todas as funções como administrador e não é um ambiente de segurança: seu armazenamento local pode ser editado pelo usuário do navegador.

## Ainda não conectado / próximo ciclo antes do uso real

- Envio automático e confirmação de entrega de mensagens via WhatsApp. Hoje o usuário abre e envia uma mensagem manualmente.
- Integração automática com o Mogo: hoje há resumo e confirmação manual, sem comunicação com o ERP.
- Impressão silenciosa por rede e confirmação pela impressora. Hoje é o diálogo do navegador. O campo destino é uma identificação, não um driver.
- Upload de fotos, lotes/validade e estoque de produção da loja principal.
- Assinatura independente de quem entrega e de quem recebe, checklist de lacres na chegada e tratamento estruturado de recusas. Nesta versão a retirada identifica o entregador, mas não exige que ele autentique pessoalmente o recebimento dos volumes.
- Recuperação de senha, convite por e-mail e experiência específica por setor/perfil.
- Notificações por horário, seleção automática da próxima rotina e quantidade sugerida. Os horários cadastrados orientam o pedido; o operador confirma a data e o prazo.
- Teste com duas contas reais, o projeto Supabase remoto, aparelhos da equipe e a impressora térmica da loja antes de liberar uso operacional.
- Perdas permanece fora do fluxo até verificar a cobertura do Mogo.

## Verificação

```sh
npm test
npm run typecheck
npm run build
```

Os testes de domínio cobrem troca de sabor com total consolidado igual, produtos extras, quantidades inválidas, recebimento duplicado, cadastros livres e empresa vazia. O teste SQL usa PostgreSQL embarcado via PGlite, com um pequeno substituto do `auth.uid()` para executar a migração, validar isolamento entre empresas, permissões de operação, auditoria, imutabilidade da expedição e confirmação única do ERP. Não substitui a validação no projeto Supabase real.

Referências da integração: [Supabase — clientes e autenticação](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js — implantação](https://nextjs.org/docs/app/getting-started/deploying).


