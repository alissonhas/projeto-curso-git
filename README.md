# Marca AH Produções — v0.3

Aplicação web pessoal em Next.js 16, TypeScript e Tailwind 4. Logo AH, navegação responsiva, login por e-mail/senha com Supabase, autorização por lista de usuários e Eventos, agenda automática, materiais por evento, ações com responsáveis e fornecedores básicos. PWA com instalação e página offline sem dados privados em cache.

## Ativar na Vercel e no Supabase

O login fica bloqueado se não houver configuração. Não existe usuário/senha padrão nem modo de acesso sem autenticação.

1. Crie um projeto em [Supabase](https://supabase.com/dashboard). Guarde a senha do banco com segurança; a aplicação não usa essa senha.
2. Abra **SQL Editor** e execute o conteúdo de [supabase/migrations/202610140001_private_events.sql](supabase/migrations/202610140001_private_events.sql) uma vez no projeto novo. Se já tiver outras tabelas com esses nomes, revise antes de aplicar. Não execute os arquivos em `tests/sql` no projeto real: são fixtures exclusivas do banco descartável.
3. Em **Authentication → Users**, crie seu usuário com e-mail e senha; marque confirmação automática de e-mail se estiver criando manualmente. Copie o UUID desse usuário. Não envie a senha em chat nem coloque em código.
4. Autorize somente esse UUID, executando no SQL Editor (substitua o texto abaixo pelo UUID real):

```sql
insert into public.app_members (user_id)
values ('UUID_DO_USUARIO')
on conflict (user_id) do nothing;
```

5. Desabilite a opção de novos cadastros nas configurações de **Authentication / Sign In / Providers**. Não há cadastro público na interface, mas a configuração do provedor também deve impedir novos cadastros. Configure a URL do seu site Vercel no Supabase. Esta entrega usa senha e não depende de redirecionamento OAuth ou link mágico.
6. Copie a **Project URL** e a chave **Publishable** (`sb_publishable_…`) em Settings/API Keys do projeto. Na Vercel, abra **Project → Settings → Environment Variables** e adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL HTTPS do projeto.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave pública Publishable.
7. Aplique as variáveis aos ambientes desejados e faça **Redeploy** na Vercel. Entre com o usuário criado e abra Eventos.

Nunca use `service_role`, `sb_secret_…`, senha de banco ou credenciais administrativas nas variáveis públicas. A chave pública sozinha não autoriza acesso aos dados: RLS e a função de mutação verificam a identidade autenticada e a lista `app_members`. Arquivos `.env.local` são ignorados pelo Git.

## O que testar depois da configuração real

- Sem login, `/` e `/eventos` redirecionam para `/login`.
- Senha incorreta exibe mensagem sem revelar detalhes internos. Um usuário autenticado fora de `app_members` também deve ser bloqueado.
- Seu usuário autorizado entra, cria um evento e vê o mesmo evento ao recarregar e em outro dispositivo.
- Abra o mesmo evento em duas abas. Salve uma alteração na primeira e tente salvar uma edição antiga na segunda: aparece a versão do servidor, o rascunho permanece preenchido e só é sobrescrito após resolução explícita. Mudanças adicionais geram novo conflito.
- Excluir exige confirmar no formulário. O evento desaparece da lista; `deleted_at` fica preenchido no banco, preservando o tombstone.
- Use **Sair** e confirme que voltar a uma rota privada exige login. O cookie é HttpOnly e o servidor não usa cache compartilhado para respostas autenticadas.
- Instale pelo navegador e teste abrir online/offline. Não interprete a instalação como suporte a edição offline.

A integração com um projeto Supabase real e a instalação em um aparelho físico precisam dessa configuração e desses testes. Os testes locais descritos abaixo não substituem essa validação.

## Instalar como aplicativo

O site publicado precisa de HTTPS. Em Chrome/Edge e Android, use a opção **Instalar app** no menu; o botão da interface aparece quando o navegador oferece o evento de instalação. No iPhone, abra no Safari e use **Compartilhar → Adicionar à Tela de Início**. Não é necessário instalar Node.js no celular nem gerar APK.

Manifesto, ícones PNG nos tamanhos exigidos e Service Worker estão implementados. O worker funciona no build de produção e guarda somente logo, ícones e `offline.html`. Navegações online sempre consultam a rede; sem rede, aparece uma página pública informando a limitação. HTML autenticado, chamadas de API, respostas RSC e dados Supabase não entram no cache do worker. A sessão exige rede para validação.

## Executar localmente

Requer Node.js 24 e npm 11. No diretório do checkout:

```sh
npm ci
# Para login real, copie .env.example para .env.local e configure as variáveis públicas.
npm run dev
```

Para produção/PWA: `npm run build` e `npm start`. Cada tarefa na nuvem já é isolada: use o checkout existente, sem criar worktrees.

## Verificações automatizadas

```sh
npm run test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Se Chromium estiver instalado: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` (sintaxe Bash). Playwright usa porta 3100, build de produção e variáveis Supabase vazias propositalmente, para verificar que a ausência de configuração bloqueia o acesso, os ícones carregam, a navegação offline recupera a tela pública e não são cacheadas páginas privadas. O perfil móvel é uma emulação Chromium, não teste de instalação em iPhone/Android físico.

Vitest valida entradas, formato monetário em centavos, configuração, gates de autenticação com mocks e preservação de rascunhos/conflitos no formulário. Mocks não comprovam uma integração Supabase real.

Para validar a migração e as regras no PostgreSQL 17 (Docker, Bash e internet no primeiro download):

```sh
npm run test:db
```

O teste usa uma imagem fixada por digest, sem porta exposta e sem rede no contêiner; cria um banco descartável e o remove ao final. Simula os papéis `anon`/`authenticated` e `auth.uid()` para executar RLS, mutações, conflito de versão, tombstones, retries e tentativas concorrentes. Nunca utiliza o banco de produção. Não testa o serviço Supabase Auth, a emissão real de JWTs ou as configurações do seu projeto.

## Dados, segurança e limites

- `app_members` autoriza explicitamente o usuário inicial. Usuários não podem se autorizar pela API. Para futura expansão, somente o administrador adiciona novos UUIDs.
- Eventos possuem UUID estável, `user_id` derivado de `auth.uid()` no servidor, `created_at`, `updated_at`, `deleted_at` e `version`. RLS restringe leituras. Escritas diretas são revogadas: a única entrada é `mutate_event`, que verifica usuário autorizado, valida entradas e opera em transação.
- `event_operations` guarda UUID de operação, payload e resultado por usuário. Retry da mesma operação devolve o resultado anterior. Reutilização do UUID para outro payload é rejeitada. Locks transacionais serializam criações concorrentes e comparação de versão; conflitos não aplicam o rascunho automaticamente.
- Os formulários preservam o rascunho ao falhar ou detectar conflito. Fechar/recarregar a página descarta o rascunho local: não há IndexedDB ou fila de sincronização nesta entrega. Não armazene dados locais privados sem uma política explícita de troca de usuário e limpeza.
- Eventos, agenda e planejamento carregam todas as páginas das consultas. Restauração de exclusões, recuperação de senha na interface, auditoria e gerenciamento de usuários ainda não estão implementados. O administrador pode redefinir o acesso no Supabase.
- Contatos gerais e despesas continuam em preparação; fornecedores possuem cadastro separado. Materiais registram quantidades inteiras em unidades e fornecedor opcional, sem valores financeiros. Cada ação exige nome do responsável e pode ser marcada como concluída. Valores financeiros serão armazenados em centavos inteiros ou decimal; custos estimados de materiais não serão somados às despesas realizadas.
- Próxima etapa: validar esta fatia em Supabase real e dispositivo móvel, depois adicionar Dexie/IndexedDB e fila com confirmação persistida, resolução explícita de conflitos e tombstones, antes de anunciar sincronização offline.

A logo é uma adaptação da imagem enviada pelo usuário. Não há credenciais ou dados pessoais no repositório.

## Atualizar do v0.2 para v0.3 (projeto já configurado)

**Não execute novamente a primeira migração.** No SQL Editor do Supabase, execute uma vez somente [202610140002_planning.sql](supabase/migrations/202610140002_planning.sql). Ela adiciona `planning_records`, `planning_operations`, RLS e a função transacional de cadastro; não remove ou modifica seus eventos e usuários existentes. Novos projetos devem executar a migração 001 e depois a 002. Não há novas variáveis de ambiente.

A agenda utiliza a tabela `events` existente: todos os eventos ativos aparecem agrupados por mês, sem cadastro adicional nem cópias. Ao mudar a data ou excluir um evento, a agenda reflete o estado atual quando carregada novamente.

Em Eventos, use **Materiais do evento** ou **Ações e responsáveis**. Esses links filtram o planejamento daquele evento. Nos módulos gerais, é possível selecionar o evento no formulário, alterar os vínculos e editar/excluir os registros. **Fornecedores** contém somente nome, contato e produto ofertado como informações de negócio. Quantidades de materiais são inteiras e não geram despesas automaticamente.

Responsáveis são nomes informados pelo usuário, sem criar contas de acesso para essas pessoas. Fornecedores também não recebem acesso ao app. Todas as consultas e ações continuam exigindo o usuário autenticado e autorizado; o banco verifica a propriedade dos eventos e fornecedores antes de aceitar um vínculo.

Os novos registros possuem UUID, `user_id`, timestamps, versão, exclusão lógica e confirmação persistida por operação. Duplicação de envio retorna o resultado anterior, e conflitos exigem comparação/resolução explícita com o rascunho preservado. Ao excluir um evento ou fornecedor, vínculos históricos permanecem; não é possível atribuir novos cadastros a pais excluídos. Para salvar alterações de um material ligado a fornecedor excluído, escolha outro fornecedor ou “Sem fornecedor definido”. A exclusão lógica do próprio material/ação continua permitida.

Teste no app real após aplicar a migração:

1. Abra Agenda e confira o evento já cadastrado. Altere sua data em Eventos e confirme a nova posição na Agenda.
2. Cadastre um fornecedor com nome, contato e produto ofertado, edite-o e recarregue.
3. No evento, adicione um material, quantidade e fornecedor; altere a quantidade e confirme a persistência.
4. Adicione uma ação e seu responsável; altere o responsável, marque como concluída e recarregue.
5. Repita a edição em duas abas para verificar conflitos. Exclua um registro de teste e confirme que sai das listas.

A nova migração, RLS, vínculos, atualizações e retries são testados em PostgreSQL descartável; formulários e ações têm testes locais. A nova integração no seu Supabase depende da aplicação da migração e desse teste autenticado. O suporte offline continua restrito à página pública de aviso: não há edição nem sincronização offline.
