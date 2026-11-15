# BackPaper — Especificação (MVP)

> App Android de compartilhamento de papéis de parede para celular, alimentado pelos próprios usuários.
> Documento gerado a partir de sessão de grilling em 2026-11-14. Layout visual fora de escopo (virá do Claude Design); aqui as telas são descritas por **conteúdo e comportamento**.

---

## 1. Escopo

### Dentro do MVP
- Login com Google.
- Feed público em grade com filtro por categoria e ordenação (recentes / mais curtidos).
- Tela de detalhe com curtir, salvar em pasta, download e denúncia.
- Publicação, edição (24h) e exclusão de wallpapers.
- Pastas privadas para salvar wallpapers de outros usuários.
- Perfil próprio e perfil público.
- Moderação automática por denúncias.
- Exclusão de conta com remoção em cascata.

### Fora do MVP
- iOS e Sign in with Apple.
- Painel de moderação humana, bloqueio de usuários, notificações.
- "Definir como papel de parede" dentro do app (o usuário faz pela galeria do aparelho).
- Navegação por swipe entre wallpapers na tela de detalhe.
- Contagem de downloads.
- Página web de exclusão de conta (exigida pela Play Store na publicação — fazer antes do release).
- Seletor de idioma (estrutura i18n já preparada) e tema escuro.

---

## 2. Plataforma e stack

| Item | Decisão |
|---|---|
| App | React Native CLI (sem Expo), TypeScript, **somente Android**, `minSdk 24` |
| Package id / nome | `com.gustavo.backpaper.app` / "BackPaper" |
| Idioma | Inglês (strings isoladas em arquivo i18n para futura escolha de idioma) |
| Tema | Somente light |
| Backend | Supabase: Postgres, Auth (Google), Edge Functions (Deno) |
| Armazenamento de imagens | Cloudflare R2 (bucket público + CDN; upload via URL pré-assinada) |
| Repositório | Monorepo: `app/` (React Native), `supabase/` (migrations + functions via Supabase CLI), `docs/` (specs) |

### Bibliotecas do app
- Navegação: **React Navigation** — bottom tabs (Feed · Publish · Profile) + stacks.
- Dados/cache: **TanStack Query** + **supabase-js**.
- Login: **@react-native-google-signin/google-signin** → `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- Seleção de imagem: **react-native-image-picker** (galeria) e **@react-native-documents/picker** (arquivo).
- Redimensionar / remover EXIF: **@bam.tech/react-native-image-resizer**.
- Exibição com cache: **@d11/react-native-fast-image**.
- Grade: **@shopify/flash-list**.
- Download: **react-native-blob-util** + **@react-native-camera-roll/camera-roll** (álbum "BackPaper").

---

## 3. Glossário

| Termo | Significado |
|---|---|
| **Wallpaper** | Imagem publicada por um usuário, com título opcional e 1–5 categorias. |
| **Feed** | Galeria pública de todos os wallpapers. |
| **Curtir** | Marcar um wallpaper de outro usuário como curtido. Alimenta "Most liked". |
| **Salvar** | Adicionar um wallpaper de outro usuário a uma **pasta**. Não existe "salvo" fora de pasta. |
| **Pasta (Folder)** | Coleção nomeada, privada e pessoal de wallpapers salvos. Sinônimo de "álbum" no app. |
| **Download** | Baixar o arquivo original para a galeria do aparelho, álbum "BackPaper". |
| **Denúncia (Report)** | Sinalização de conteúdo impróprio. 3 denúncias apagam o wallpaper. |

---

## 4. Regras de negócio

### 4.1 Autenticação e conta
- R-AUTH-1: Único método de login: Google.
- R-AUTH-2: No primeiro login cria-se um `profile` com nome e foto vindos do Google.
- R-AUTH-3: O usuário pode editar o **display name** (1–40 caracteres). A foto vem do Google e não é editável no MVP.
- R-AUTH-4: Usuário não autenticado só vê a tela de login.

### 4.2 Categorias
Lista fixa (seed no banco):
`AI, Dark, Light, Minimalist, Nature, Abstract, Anime/Illustration, Cityscape, Space, AMOLED, Gradient, Photography`.

- R-CAT-1: Cada wallpaper tem **de 1 a 5** categorias.
- R-CAT-2: O filtro do feed aceita **várias categorias ao mesmo tempo** (seleção múltipla, até as 12). Nenhuma selecionada = todas. Semântica **OU**: aparece o wallpaper que tiver **pelo menos uma** das categorias selecionadas.

### 4.3 Feed
- R-FEED-1: Grade de 2 colunas com miniaturas; **só a imagem**, sem contagens.
- R-FEED-2: Ordenação **Recent** (padrão): `created_at DESC`. Ordenação **Most liked**: `like_count DESC, created_at DESC` (todo o período).
- R-FEED-3: Ordenação e filtro de categoria são combináveis.
- R-FEED-4: Rolagem infinita com paginação por cursor (keyset), páginas de 20. Pull-to-refresh.
- R-FEED-5: Os wallpapers do próprio usuário **aparecem** no feed.
- R-FEED-6: Wallpapers que o usuário denunciou **não aparecem** para ele (nem no feed, nem em perfis públicos, nem em pastas).

### 4.4 Tela de detalhe
Aberta ao tocar numa miniatura. Fecha voltando à grade (sem swipe lateral).

Conteúdo:
- Imagem (miniatura enquanto o original carrega, se aplicável).
- Título (se houver), chips de categoria, data relativa ("3 days ago").
- Autor: foto + nome → toque abre o **perfil público**.
- Contagem de curtidas.

Ações para **wallpaper de outro usuário**:
- Curtir/Descurtir (botão ou duplo toque na imagem).
- Save → bottom sheet de pastas (ver 4.6).
- Download.
- Menu "⋯" → Report.

Ações para **wallpaper próprio**:
- Download.
- Edit (visível apenas nas primeiras 24h após publicação).
- Delete (com confirmação).
- Sem Like, Save ou Report.

- R-DET-1: Tocar num chip de categoria fecha o detalhe e aplica no feed um filtro **somente com essa categoria** (substitui a seleção anterior).

### 4.5 Curtidas
- R-LIKE-1: Um usuário curte um wallpaper no máximo uma vez; pode descurtir.
- R-LIKE-2: Não é possível curtir o próprio wallpaper (validado no servidor).
- R-LIKE-3: `like_count` é mantido desnormalizado por trigger.

### 4.6 Pastas e Salvar
- R-FOLD-1: Pastas são **privadas**: só o dono lê ou escreve (RLS). Não aparecem no perfil público nem podem ser compartilhadas.
- R-FOLD-2: Nome com 1–40 caracteres, **único por usuário** e case-insensitive.
- R-FOLD-3: Operações: criar, renomear, excluir (com confirmação; não exclui os wallpapers), remover item.
- R-FOLD-4: Pastas vazias são permitidas. A capa é o wallpaper adicionado mais recentemente.
- R-FOLD-5: Um wallpaper pode estar em várias pastas do mesmo usuário (no máximo uma vez por pasta).
- R-FOLD-6: Os wallpapers do próprio usuário **não podem** ser salvos em pastas (validado no servidor).
- R-FOLD-7: Bottom sheet de Save: lista as pastas do usuário com check nas que já contêm o wallpaper; tocar alterna (adiciona/remove); item "+ New folder" cria a pasta e já salva o wallpaper nela.

### 4.7 Download
- R-DL-1: Baixa o **arquivo original** para a galeria do aparelho, no álbum **"BackPaper"**.
- R-DL-2: Android 10+ (API 29+): sem permissão (MediaStore). API 24–28: pedir `WRITE_EXTERNAL_STORAGE`.
- R-DL-3: Feedback de sucesso ou erro via toast/snackbar.

### 4.8 Publicação
- R-PUB-1: Uma imagem por publicação, da **galeria** ou de **arquivo**.
- R-PUB-2: Campos: imagem (obrigatória), título (opcional, até 60 caracteres), categorias (1–5).
- R-PUB-3: Formatos aceitos: **JPEG, PNG, WebP**. HEIC/HEIF é convertido para JPEG no cliente. Recusados: GIF, SVG, BMP, TIFF e outros.
- R-PUB-4: Tamanho máximo do original: **15 MB**.
- R-PUB-5: Resolução mínima: **1080 px no lado menor**.
- R-PUB-6: Somente **retrato** com `altura >= largura × 1.5`.
- R-PUB-7: Antes do upload o cliente **remove o EXIF** (re-encode) e gera uma **miniatura WebP de ~720 px de largura**.
- R-PUB-8: Validação no cliente e **repetida no servidor** (ver 6.1).
- R-PUB-9: Limite de **10 publicações por janela móvel de 24h**. Publicações excluídas **continuam contando**.

### 4.9 Edição e exclusão de wallpaper
- R-EDIT-1: O autor pode editar **título e categorias** quantas vezes quiser durante **24h após a publicação**. A imagem nunca é editável.
- R-EDIT-2: Depois de 24h o botão Edit some e o servidor rejeita a edição.
- R-DEL-1: O autor pode excluir o wallpaper a qualquer momento (com confirmação). A exclusão é definitiva: remove do feed, do perfil, de **todas as pastas** de todos os usuários, apaga curtidas e denúncias e os objetos no R2.

### 4.10 Denúncias
- R-REP-1: Motivos fixos, sem texto livre: `nudity_sexual`, `violence_gore`, `hate_harassment`, `copyright`, `spam_low_quality`, `other`.
- R-REP-2: Uma denúncia por usuário por wallpaper; não é possível denunciar o próprio.
- R-REP-3: Após denunciar, o wallpaper some imediatamente para quem denunciou.
- R-REP-4: Ao atingir **3 denúncias** (qualquer motivo), o wallpaper é **apagado definitivamente**, com o mesmo efeito de R-DEL-1. Sem aviso ao autor, sem log de auditoria e sem mitigações (decisão consciente para o MVP; risco de abuso aceito).

### 4.11 Perfil
**Meu perfil**
- Cabeçalho: avatar, display name, total de wallpapers publicados.
- Abas: **Published** (grade dos meus wallpapers) e **Folders** (primeiro card "+ New folder", depois as pastas com capa, nome e contagem).
- Engrenagem → **Settings**: Edit display name, Log out, Delete account.

**Perfil público** (de outro usuário)
- Avatar, display name, grade dos wallpapers publicados. Nunca mostra pastas.

### 4.12 Exclusão de conta
- R-ACC-1: Em Settings → Delete account. Confirmação digitando **"DELETE"** (a UI é em inglês).
- R-ACC-2: Imediata e irreversível.
- R-ACC-3: Remove profile, wallpapers (e seus objetos no R2), curtidas feitas e recebidas, pastas, itens das pastas de **outros usuários** que continham wallpapers dessa conta, denúncias feitas e recebidas.
- R-ACC-4: Executada pela Edge Function `delete-account`; o restante é feito por `ON DELETE CASCADE`.

---

## 5. Modelo de dados (Postgres / Supabase)

```sql
-- Perfis (1:1 com auth.users)
profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  avatar_url    text,
  created_at    timestamptz not null default now()
)

categories (
  slug   text primary key,          -- 'ai', 'dark', 'light', ...
  label  text not null,             -- 'AI', 'Dark', ...
  sort   int  not null
)

wallpapers (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references profiles(id) on delete cascade,
  title          text check (title is null or char_length(title) <= 60),
  original_key   text not null,     -- chave no R2
  thumb_key      text not null,
  mime           text not null check (mime in ('image/jpeg','image/png','image/webp')),
  width          int  not null,
  height         int  not null,
  size_bytes     int  not null check (size_bytes <= 15728640),
  like_count     int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
)
-- índices: (created_at desc, id desc), (like_count desc, created_at desc, id desc), (author_id, created_at desc)

wallpaper_categories (
  wallpaper_id   uuid references wallpapers(id) on delete cascade,
  category_slug  text references categories(slug),
  primary key (wallpaper_id, category_slug)
)
-- 1..5 por wallpaper: garantido pelas RPCs de publicação e edição

likes (
  user_id       uuid references profiles(id) on delete cascade,
  wallpaper_id  uuid references wallpapers(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, wallpaper_id)
)
-- trigger: incrementa/decrementa wallpapers.like_count; impede curtir o próprio

folders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)
-- unique index (owner_id, lower(name))

folder_items (
  folder_id     uuid references folders(id) on delete cascade,
  wallpaper_id  uuid references wallpapers(id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (folder_id, wallpaper_id)
)
-- trigger: impede salvar wallpaper cujo author_id = dono da pasta

reports (
  reporter_id   uuid references profiles(id) on delete cascade,
  wallpaper_id  uuid references wallpapers(id) on delete cascade,
  reason        report_reason not null,   -- enum
  created_at    timestamptz not null default now(),
  primary key (reporter_id, wallpaper_id)
)
-- trigger AFTER INSERT: impede denunciar o próprio; se count(*) >= 3 → DELETE FROM wallpapers

publish_events (            -- conta publicações para o limite de 10/24h; NÃO cascateia com wallpapers
  id          bigserial primary key,
  author_id   uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
)

r2_deletion_queue (         -- sem FK de propósito: sobrevive a cascatas
  id          bigserial primary key,
  object_key  text not null,
  created_at  timestamptz not null default now(),
  attempts    int not null default 0
)
-- trigger AFTER DELETE em wallpapers: insere original_key e thumb_key na fila
```

### 5.1 Remoção dos objetos no R2
Toda exclusão de wallpaper (pelo autor, por denúncias ou por cascata da exclusão de conta) passa pelo trigger que enfileira as chaves em `r2_deletion_queue`. A Edge Function `process-r2-deletions` consome a fila (agendada via `pg_cron` a cada poucos minutos, ou disparada por Database Webhook) e apaga os objetos no R2 com retry.

### 5.2 Row Level Security
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | autenticados | via trigger de signup | próprio (`display_name`) | via `delete-account` |
| categories | autenticados | — | — | — |
| wallpapers | autenticados, exceto os que o usuário denunciou | só via `publish-wallpaper` (service role) | só via RPC `update_wallpaper` | autor |
| wallpaper_categories | autenticados | via RPC/função | via RPC | cascata |
| likes | autenticados | próprio `user_id` | — | próprio |
| folders | **dono** | dono | dono | dono |
| folder_items | **dono da pasta** | dono da pasta | — | dono da pasta |
| reports | próprio | próprio `reporter_id` | — | — |
| publish_events, r2_deletion_queue | — (service role) | — | — | — |

### 5.3 RPCs (funções Postgres)
- `feed(categories text[] null, sort text, cursor jsonb null, limit int = 20)`: `categories` nulo ou vazio = todas; caso contrário, wallpapers com pelo menos uma das categorias (`exists` em `wallpaper_categories`, sem duplicar linhas). Keyset pagination. Retorna wallpapers com autor e flag `liked_by_me`. Exclui os denunciados pelo usuário.
- `user_wallpapers(user_id uuid, cursor, limit)`: grade de perfil (próprio ou público).
- `update_wallpaper(id uuid, title text, categories text[])`: valida autor, `now() - created_at < interval '24 hours'` e 1–5 categorias.
- `folder_contents(folder_id, cursor, limit)`.
- `wallpaper_folder_membership(wallpaper_id)`: pastas do usuário com flag `contains`, para o bottom sheet.

---

## 6. Edge Functions

### 6.1 Upload e publicação
1. **`request-upload`** (autenticado)
   - Entrada: `{ mime, size_bytes }`.
   - Verifica o limite de 10 em `publish_events` (últimas 24h), o tipo e o tamanho.
   - Gera `upload_id` e devolve 2 URLs PUT pré-assinadas do R2 (expiram em ~10 min):
     `pending/{user_id}/{upload_id}/original.{ext}` e `pending/{user_id}/{upload_id}/thumb.webp`.
2. O app faz o upload direto para o R2.
3. **`publish-wallpaper`** (autenticado)
   - Entrada: `{ upload_id, title?, categories[] }`.
   - Revalida o limite de 10/24h.
   - Lê o cabeçalho do original no R2 (Range GET) e confirma: magic bytes = JPEG/PNG/WebP, `size <= 15MB`, lado menor `>= 1080`, `height >= width * 1.5`. Confirma que a miniatura é WebP.
   - Valida o título (≤ 60) e as categorias (1–5, existentes).
   - Copia os objetos para `w/{wallpaper_id}/original.{ext}` e `w/{wallpaper_id}/thumb.webp` e apaga os `pending/`.
   - Insere `wallpapers`, `wallpaper_categories` e `publish_events` numa transação.
   - Em qualquer falha: apaga os objetos `pending/` e retorna erro.
- Rede de segurança: lifecycle rule no bucket R2 apaga `pending/*` com mais de 1 dia.

### 6.2 `delete-account`
- Autenticado. Apaga o usuário via Admin API (`auth.admin.deleteUser`). O cascade cuida do banco, e o trigger enfileira os objetos do R2.
- Faz logout no cliente (Google + Supabase) e volta para a tela de login.

### 6.3 `process-r2-deletions`
- Service role / cron. Consome `r2_deletion_queue` em lotes, chama `DeleteObjects` no R2 e remove as linhas processadas. Incrementa `attempts` em caso de falha.

### 6.4 URLs públicas
- Bucket R2 público via domínio `r2.dev` (MVP) ou domínio próprio depois. O app monta as URLs a partir de `R2_PUBLIC_BASE_URL + key`.
- O acesso a URLs fica atrás de um módulo `storage` no app, para facilitar a troca de provedor.

---

## 7. Telas

| Tela | Conteúdo / comportamento |
|---|---|
| **Login** | Logo, botão "Continue with Google". |
| **Feed** (tab) | Botão "Categories" que abre a seleção múltipla, com contador e chips removíveis das selecionadas ("All categories" quando nenhuma), seletor Recent / Most liked, grade 2 colunas, rolagem infinita, pull-to-refresh, estados vazio/erro/loading. |
| **Wallpaper detail** | Ver 4.4. |
| **Save sheet** | Ver R-FOLD-7. |
| **New folder** | Campo nome com validação (1–40, único). Usado a partir do sheet e do perfil. |
| **Publish** (tab) | Escolher "From gallery" ou "From files" → preview → validação (com mensagens específicas: formato, tamanho, resolução, proporção) → título → categorias (multi-select 1–5) → Publish com progresso. Mostra quantas publicações restam nas últimas 24h quando o limite estiver próximo. |
| **Edit wallpaper** | Título + categorias. Só em até 24h. |
| **My profile** (tab) | Ver 4.11. |
| **Folder** | Grade dos wallpapers da pasta; menu: Rename, Delete folder; remover item. Wallpapers abrem o detalhe. |
| **Public profile** | Ver 4.11. |
| **Settings** | Edit display name, Log out, Delete account. |
| **Delete account** | Explicação do que será apagado + campo "type DELETE" + botão destrutivo. |
| **Report sheet** | Lista de motivos (R-REP-1) → confirmar. |

---

## 8. Requisitos não funcionais
- i18n: todas as strings em `app/src/i18n/en.ts` (ou equivalente) acessadas por chave.
- Imagens do feed usam a miniatura; o original só é carregado no detalhe (progressivo) e no download.
- Segredos (chaves R2, service role) apenas nas Edge Functions; o app só tem a `anon key` e a URL pública do R2.
- Migrations versionadas em `supabase/migrations`, com seed de `categories`.
- Antes do release na Play Store: página web de exclusão de conta, política de privacidade e declaração de conteúdo gerado por usuários (UGC).

---

## 9. Riscos aceitos
- **Abuso de denúncias**: 3 contas quaisquer apagam qualquer wallpaper, sem revisão. Aceito no MVP; revisitar se houver abuso.
- **Plano grátis do Supabase**: limites de banco e de invocações de Edge Functions. As imagens ficam no R2 (10 GB grátis, tráfego de saída grátis), o que comporta ~1.000–2.000 wallpapers.
