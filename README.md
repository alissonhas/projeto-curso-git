# Marca AH Produções

Fundação inicial de uma aplicação pessoal de gestão de produções. Interface em português brasileiro, responsiva, com identidade visual e navegação entre visão geral, eventos, agenda, tarefas, materiais, contatos e despesas.

## Executar

Requer Node.js 24 e npm 11 (versões usadas na validação).

```sh
npm ci
npm run dev
```

Execute no diretório do checkout. Para produção: `npm run build` e `npm start`.

## Configuração

Copie `.env.example` para `.env.local` quando preparar a integração real. Variáveis públicas previstas:

- `NEXT_PUBLIC_SUPABASE_URL`: URL HTTPS do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave pública `sb_publishable_…`.

Nenhuma variável é necessária para executar esta fundação. O código verifica somente o formato; não faz conexão e não comprova autenticação. Não foram criadas credenciais nem banco de dados. Nunca use `service_role`, `sb_secret_…`, senha do banco ou credenciais administrativas em variáveis `NEXT_PUBLIC_*`. Arquivos locais de ambiente são ignorados pelo Git. Não há necessidade de chave administrativa nesta entrega.

## Verificação

```sh
npm run test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Se já houver Chromium instalado, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` para dispensar o download.

Os testes unitários validam configuração, navegação declarada e formatação. Playwright abre o aplicativo em Chromium com tamanhos desktop e móvel, exercita todas as áreas e verifica o menu e a ausência de transbordamento horizontal. A instalação do navegador é um preparo local de testes; não faz parte da aplicação.

## Limites desta entrega

A aplicação não autentica, cadastra, consulta ou salva informações. Os módulos exibem estados de preparação. Não há dados pessoais, registros de demonstração, proteção de rotas, RLS, banco local, Service Worker, instalação PWA ou sincronização implementados. `robots` desabilitado não constitui controle de acesso. Não publicar como sistema privado funcional nem inserir dados sensíveis antes da implementação e validação de autenticação e RLS.

## Próximas etapas e contratos

1. Configurar um projeto real Supabase e implementar login, sessão e proteção de rotas. Desabilitar cadastro público para o uso inicial por um único usuário. Criar migrações e testar RLS com sessões de usuários diferentes e acesso anônimo antes de armazenar dados.
2. Implementar um primeiro módulo vertical, recomendado eventos, com UUID estável, `user_id`, `created_at`, `updated_at`, `deleted_at` e versão para concorrência. RLS deve restringir todas as operações a `auth.uid() = user_id`, incluindo validação de inserção e atualização. Não aceitar `user_id` arbitrário do navegador como autorização.
3. Adicionar Dexie/IndexedDB para armazenamento local e uma fila de operações. Cada operação terá UUID próprio e confirmação persistida no servidor por usuário. Repetições devem retornar o resultado anterior. A atualização usa comparação atômica de versão: conflito preserva ambas as versões para resolução explícita, sem sobrescrever silenciosamente. Exclusões usam tombstones e também participam desse protocolo. Implementar e testar antes de anunciar suporte offline.
4. Adicionar manifesto, ícones e Service Worker com política de cache explícita, evitando cache de respostas autenticadas compartilhadas. Limpar dados locais ao sair/trocar usuário e definir os limites de privacidade do dispositivo. Validar instalação e recuperação offline em dispositivo móvel real.
5. Expandir módulos após validar a primeira fatia e a sincronização. Dinheiro será armazenado como centavos inteiros, com limites seguros ou decimal no PostgreSQL; entrada decimal deve ser convertida por parsing textual validado. Estimativas de materiais permanecem separadas de despesas realizadas.

Next.js App Router e TypeScript estrito sustentam a estrutura; Tailwind CSS 4 está configurado via PostCSS, com tokens e estilos responsivos em `globals.css`. Bibliotecas de Supabase e Dexie serão adicionadas quando suas integrações forem implementadas, evitando dependências sem uso. A navegação atual é estado local de interface; URLs individuais serão introduzidas com os módulos reais.

Em tarefas na nuvem, usar o checkout existente: cada tarefa já tem ambiente isolado, sem criar worktrees. Não há serviço externo ou processo adicional obrigatório nesta fundação.

## Pacote inicial para teste

Extraia o ZIP, abra um terminal na pasta `marca-ah-producoes` e execute `npm ci`, `npm run build` e `npm start`. Abra o endereço local exibido pelo terminal no seu navegador. Requer Node.js 24 e acesso à internet para instalar dependências. No Windows, os comandos podem ser executados no PowerShell.

Esta distribuição contém código-fonte e lockfile, sem credenciais ou dependências instaladas. É uma versão web para teste da fundação, não um APK nem uma versão com módulos completos. A logo incluída é uma adaptação da imagem enviada; o arquivo original não estava disponível para cópia direta.
