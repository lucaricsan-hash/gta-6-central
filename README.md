# GTA 6 Central — versão revisada

Portal independente de fãs de GTA VI, desenvolvido com React, Vite e Supabase. A interface é responsiva e pode ser executada em navegador no computador ou celular.

## Recursos incluídos
- Navegação por Início, Notícias, Comunidade, Garagem, Mapa, Guias e Perfil.
- Cadastro, login, logout e recuperação de senha pelo Supabase Auth.
- Criação automática de perfil após cadastro, com limite de nome compatível com o banco.
- Feed público de publicações, carregado também na página inicial.
- Criação de publicações autenticadas, curtidas e comentários em formulário (sem janela `prompt`).
- Estrutura de favoritos e artigos aprovados no banco.
- Row Level Security (RLS) nas tabelas do Supabase.
- Avisos de configuração, estados de carregamento e mensagens de erro mais claras.

## O que ainda depende de configuração ou desenvolvimento
- O projeto não está hospedado e não inclui credenciais Supabase.
- Notícias automáticas exigem uma fonte/API e uma rotina segura no servidor. O app não inventa notícias.
- O mapa é ilustrativo, não é o mapa oficial nem uma integração cartográfica navegável.
- Garagem e guias estão como áreas iniciais; catálogo detalhado precisa de conteúdo verificado.
- Não há chat em tempo real, seguidores, notificações push, painel administrativo ou publicação em lojas nesta versão.

## Configuração do Supabase

1. Crie um projeto em [Supabase](https://supabase.com).
2. Em um projeto novo, abra **SQL Editor** e execute `supabase/schema.sql`.
3. Em **Project Settings → API**, copie a Project URL e a chave pública `anon`/publishable.
4. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. No terminal, dentro desta pasta, execute:

   ```bash
   npm install
   npm run dev
   ```

6. Para compilar a versão de produção:

   ```bash
   npm run build
   ```

   Os arquivos finais serão gerados na pasta `dist/`.

### Configurações recomendadas no Supabase
- Ative confirmação de e-mail e configure corretamente as URLs de redirecionamento.
- Configure limites de autenticação e monitore tentativas abusivas.
- Revise as políticas RLS antes de abrir a comunidade ao público.
- Adicione moderação, denúncia, rate limiting/anti-spam, política de privacidade e termos de uso antes de um lançamento público.

## Segurança
- Nunca coloque `service_role` ou qualquer segredo administrativo no frontend.
- A chave pública anon/publishable é usada em conjunto com as políticas RLS; ela não substitui as políticas.
- Não publique seu arquivo `.env` nem compartilhe credenciais.
- O SQL foi preparado para ser reaplicável quanto às políticas nomeadas, mas foi pensado como esquema inicial. Se já houver tabelas ou dados, faça backup e revise antes de executar.

## Marca e conteúdo
GTA 6 Central é um projeto independente de fãs, sem afiliação, patrocínio ou aprovação da Rockstar Games. Marcas e direitos pertencem aos respectivos titulares.
