# GTA 6 Central — pacote de evolução v2

Portal independente de fãs de GTA VI, feito com React, Vite e Supabase.

## O que esta versão acrescenta
- Busca geral por personagens, regiões, categorias de veículos e guias.
- Favoritos persistidos no Supabase para membros autenticados.
- Ranking de membros com pontuação calculada no banco.
- Conquistas automáticas por participação.
- Área administrativa para publicar e excluir notícias verificadas.
- Comunidade com login, publicações, curtidas e comentários.
- Interface responsiva e aviso de conteúdo ilustrativo/fan-made.

## Importante antes de publicar
Esta é uma versão de evolução funcional, não um catálogo oficial completo. Algumas fichas e categorias são estruturas iniciais; imagens de pessoas e lugares são ilustrativas. Notícias são inseridas pelo administrador com link da fonte. Não há raspagem automática de notícias.

## Atualização segura do Supabase EXISTENTE
1. Faça backup do projeto Supabase antes de qualquer migração.
2. Abra o SQL Editor do projeto existente.
3. Execute `supabase/migration-v2.sql`. Essa migração é complementar e não apaga as tabelas nem publicações existentes.
4. Crie uma conta pelo site e confirme o e-mail.
5. No final do arquivo SQL, copie a instrução comentada de inserção em `admin_users`, substitua `SEU_EMAIL_AQUI` pelo e-mail da conta que você acabou de criar e execute-a. Não compartilhe esse e-mail ou credenciais aqui.
6. A conta passa a ter acesso ao formulário administrativo de notícias.

## Variáveis de ambiente
Mantenha na Vercel as variáveis já configuradas:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (chave pública/publishable)

Nunca use `service_role`, `sb_secret` ou segredos no frontend. Não envie `.env` ao GitHub.

## Desenvolvimento local
```bash
npm install
npm run dev
npm run build
```

## Limites e próximos incrementos
- O mapa geográfico completo, filtros avançados de catálogo, upload próprio de mídia, notificações em tempo real, denúncia/moderação e recuperação de senha precisam de etapas adicionais.
- Pontos atuais: 10 por publicação e 3 por comentário. As medalhas iniciais são concedidas por primeira publicação, cinco publicações e primeiro comentário.
- O administrador pode publicar notícias verificadas com URL de fonte. Confirme cada informação antes de publicar.

GTA 6 Central é um projeto independente, sem afiliação à Rockstar Games.
