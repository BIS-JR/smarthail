# 🛡️ SMARTHAIL

**Plataforma de proteção climática inteligente para automóveis.**

O SMARTHAIL monitora as condições meteorológicas em tempo real na localização do veículo, antecipa riscos (chuva, granizo, geada, vento, alagamento), comanda uma capa inflável de proteção e gera relatórios de sinistro prontos para a seguradora.

> Projeto recriado a partir do protótipo feito no Base44, agora como aplicação React independente, **sem dependência do Base44**, com dados meteorológicos reais.

---

## 📑 Índice

1. [Visão geral](#-visão-geral)
2. [O que mudou em relação ao protótipo Base44](#-o-que-mudou-em-relação-ao-protótipo-base44)
3. [Stack técnica](#-stack-técnica)
4. [Como rodar](#️-como-rodar)
5. [Arquitetura](#-arquitetura)
6. [De onde vêm os dados](#-de-onde-vêm-os-dados)
7. [Modelo de dados](#-modelo-de-dados)
8. [Telas e rotas](#-telas-e-rotas)
9. [Navegação e transições](#-navegação-e-transições)
10. [Design system](#-design-system)
11. [Deploy](#-deploy)
12. [Roadmap](#-roadmap)

---

## 🌤 Visão geral

| Frente | O que faz |
| --- | --- |
| **Monitoramento** | Leituras horárias de temperatura, umidade, vento, pressão e condição climática, com histórico de 60h |
| **Prevenção** | Previsão de risco de 72h com probabilidade, intensidade e janela de tempo + alertas automáticos + comando da capa |
| **Comprovação** | Sinistro com data, hora, coordenadas GPS, intensidade do impacto e clima no momento do dano, com dupla checagem |

### Módulos

- **Clima Local** — condições atuais, gráfico e histórico das últimas 60 horas
- **Alertas Climáticos** — granizo, tempestade, geada, vento e inundação, por severidade
- **Previsões de Risco** — probabilidade e intensidade de chuva, granizo e geada nas próximas 72h
- **Mapas de Risco** — trajeto georreferenciado com nível de exposição por ponto
- **Seguro Inteligente** — abertura (com "Double-Check") e acompanhamento de sinistros
- **Automação da Capa** — inflar, desinflar, verificar, emergência; magnetos, integridade e bateria

---

## 🔄 O que mudou em relação ao protótipo Base44

| Antes (Base44) | Agora |
| --- | --- |
| `@base44/sdk` para entidades e auth | `src/api/` — camada própria com **a mesma interface** (`api.entities.X.list('-timestamp', 10)`) |
| Dados climáticos inseridos manualmente | **Open-Meteo** (gratuita, sem chave): clima real, histórico e previsão |
| Alertas e previsões cadastrados à mão | Calculados a partir da previsão + **avisos oficiais do INMET** |
| Tiles de mapa CARTO (hoje exigem chave) | **OpenFreeMap** (vetorial, gratuito) + radar **RainViewer** |
| Backend e login Base44 | **Supabase**: Postgres com RLS, Auth, Edge Functions e pg_cron |
| Sem notificações | **Web Push** com o app fechado (PWA instalável) |
| ~50 componentes shadcn/ui | Apenas os necessários (dialog, sheet, spinner) + `sonner` para toasts |

**Modo local:** sem as variáveis `VITE_SUPABASE_*`, o app funciona com dados no `localStorage` (útil para desenvolver offline). Com elas — caso de `.env.production` — usa o Supabase. As páginas são as mesmas nos dois modos.

---

## 🧰 Stack técnica

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 18 + Vite 6 |
| Estilização | Tailwind CSS 3 |
| Rotas | React Router DOM 6 |
| Animação | Framer Motion |
| Mapas | React Leaflet + MapLibre GL (OpenFreeMap) + radar RainViewer |
| Backend | Supabase (Postgres + RLS, Auth, Edge Functions em Deno, pg_cron) |
| Notificações | Web Push (VAPID) via service worker |
| Gráficos | Recharts |
| Datas | Moment.js (pt-BR) |
| Ícones | Lucide React |
| Diálogos | Radix UI Dialog |
| Toasts | Sonner |
| Clima | Open-Meteo API · avisos oficiais: INMET · geocodificação reversa: BigDataCloud |

---

## ▶️ Como rodar

Pré-requisito: **Node.js 20+**.

```bash
npm install
npm run dev        # http://localhost:5173
```

Build de produção:

```bash
npm run build
npm run preview    # serve a pasta dist/
```

`npm run dev` roda em **modo local** (sem `.env.local`): o código de verificação e o link de redefinição de senha aparecem na própria tela. Para usar o Supabase no desenvolvimento, copie `.env.production` para `.env.local`.

**Localização:** permita o acesso à localização no navegador. Sem permissão, o app usa São Paulo como referência.

**Demonstração:** em dias de tempo bom quase não há alertas. Use **Menu → Adicionar demonstração** para inserir eventos simulados (marcados como `[Simulação]`), e **Remover demonstração** para limpá-los.

---

## 🏗 Arquitetura

```
src/
├── main.jsx                    # Entrada; configura moment em pt-BR
├── App.jsx                     # Rotas + AuthProvider + Toaster
├── index.css                   # Tailwind + tema escuro do Leaflet
├── api/
│   ├── client.js               # `api` — ponto único de acesso (substitui base44Client)
│   ├── supabase.js             # Cliente Supabase (ou null → modo local)
│   ├── store.js                # Entidades: Supabase ou localStorage, mesma interface
│   ├── auth.js                 # Supabase Auth ou autenticação local
│   ├── weather.js              # Localização do aparelho + reexporta o núcleo climático
│   ├── push.js                 # Inscrição Web Push e posição usada pelos alertas
│   └── sync.js                 # Orquestra a sincronização + dados de demonstração
├── lib/
│   ├── AuthContext.jsx         # Sessão do usuário
│   ├── ClimateContext.jsx      # Sincroniza ao entrar e a cada 15 min; expõe `version`
│   ├── modules.js              # Definição dos 6 módulos (cores, ícones, textos, rotas)
│   ├── labels.js               # Rótulos e cores de severidade, risco, status…
│   ├── forecast.js             # Config visual dos tipos de previsão
│   ├── cover.js                # Comandos da capa
│   └── utils.js                # cn()
├── hooks/
│   └── useEntityList.js        # Carrega entidade e recarrega após cada sincronização
├── components/
│   ├── AppLayout.jsx           # Rota protegida + ClimateProvider + TopBar
│   ├── AuthLayout.jsx          # Layout e campos das telas de autenticação
│   ├── ui/                     # dialog, sheet, spinner
│   └── smarthail/
│       ├── TopBar.jsx          # Relógio + menu (fixo em todas as telas)
│       ├── DateTimeHeader.jsx
│       ├── HamburgerMenu.jsx   # Sobre, Ajuda, Produto, Dados, Sair
│       ├── HomeButton.jsx      # "Visão Geral"
│       ├── PageHeader.jsx      # Voltar + título + ações + Visão Geral
│       ├── SyncStatus.jsx      # Local monitorado + última atualização
│       ├── WeatherIcon.jsx
│       ├── RiskMap.jsx         # Mapa Leaflet reutilizado no painel e na página
│       └── panels/             # Os 6 painéis do Dashboard
└── pages/                      # Login, Register, ForgotPassword, ResetPassword, Home,
                                # FeatureDetail, Dashboard, ClimateHistory, AlertsList,
                                # ForecastDetail, RiskMaps, Insurance, CoverAutomation, NotFound

public/
├── sw.js                       # Service worker: exibe notificações push
├── manifest.webmanifest        # PWA (instalável; necessário para push no iPhone)
└── icons/

supabase/
├── config.toml                 # Auth, URLs permitidas, funções
├── migrations/                 # Esquema do banco + RLS
├── templates/                  # E-mails em pt-BR (código de cadastro, redefinição)
├── setup/cron.sql              # Agenda check-alerts a cada 30 min
└── functions/
    ├── _shared/climate.js      # Núcleo climático (usado também pelo app)
    ├── _shared/inmet.js        # Avisos do INMET + ponto-em-polígono
    ├── check-alerts/           # pg_cron → calcula riscos e envia Web Push
    └── inmet-alerts/           # App → avisos do INMET para a posição do usuário
```

### Padrões

- Cada módulo tem duas camadas: **painel** resumido (Dashboard) e **página** completa.
- Páginas carregam dados com `useEntityList(entidade, ordenação, limite)`, que já trata carregamento e recarga após sincronização.
- `Home` e `FeatureDetail` são só apresentação; todo o conteúdo vem de `lib/modules.js`.

---

## 🌐 De onde vêm os dados

A cada login e a cada 15 minutos (ou no botão ↻), `sync.js`:

1. Obtém a posição do navegador (fallback: São Paulo) e o nome da cidade.
2. Busca na Open-Meteo: 3 dias passados + 4 dias de previsão, de hora em hora.
3. Gera **WeatherData** das últimas 60h (código WMO → condição: ensolarado, chuva, tempestade, granizo…).
4. Calcula **RiskForecast** para as próximas 72h:
   - **Granizo**: indicador estimado por instabilidade atmosférica — CAPE, *lifted index*, isoterma de 0 °C, trovoada e rajadas (os códigos WMO 96/99 da Open-Meteo só existem para a Europa Central).
   - **Chuva**: probabilidade ≥ 50% ou ≥ 1 mm/h; o risco depende da intensidade (fraca → baixo; forte/severa → alto/extremo).
   - **Geada**: temperatura ≤ 3 °C (≤ 0 °C alto, ≤ −2 °C extremo).
5. Busca os **avisos oficiais do INMET** (via Edge Function `inmet-alerts`, pois o INMET não libera CORS) e mantém só os cujo polígono contém a posição. Severidade: Perigo Potencial → médio, Perigo → alto, Grande Perigo → crítico.
6. Gera **ClimateAlert** a partir dos avisos do INMET, das previsões de risco moderado ou maior, rajadas ≥ 60 km/h, tempestades observadas nas últimas 60h e acumulado ≥ 50 mm em 24h. Alertas são atualizados por chave e expiram em 30 dias.
7. Registra um ponto de **GpsTracking** se passaram 30 min ou o veículo andou mais de 200 m, e atualiza a posição usada pelas notificações.

> No primeiro acesso é criado um trajeto de demonstração ao redor da posição atual, já que ainda não há rastreador no veículo. O risco de cada ponto usa o clima real daquele horário.

### Notificações com o app fechado

A cada 30 minutos o **pg_cron** chama a Edge Function `check-alerts`, que, para cada usuário com notificações ativas, consulta Open-Meteo + INMET na última posição conhecida, grava os alertas e envia **Web Push** para os de severidade alta ou crítica ainda não notificados. No iPhone, o push só funciona com o app adicionado à tela de início.

---

## 🔐 Backend (Supabase)

Projeto `smarthail` na região **São Paulo (sa-east-1)**.

| Item | Onde |
| --- | --- |
| Esquema e RLS | `supabase/migrations/` — cada usuário só acessa as próprias linhas |
| Configuração de Auth | `supabase/config.toml` (senha ≥ 8 com letras e números, URLs de retorno) |
| Funções | `supabase functions deploy check-alerts` / `inmet-alerts` |
| Segredos | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`supabase secrets set`) |
| Agendamento | `supabase/setup/cron.sql` (executar uma vez com a URL da função) |
| Variáveis do app | `.env.production` — só valores públicos (URL, chave *publishable*, chave pública VAPID) |

Comandos úteis (com a CLI logada via `npx supabase login`):

```bash
npx supabase db push --remote          # aplica novas migrations
npx supabase functions deploy check-alerts inmet-alerts --use-api
npx supabase config push --remote      # aplica mudanças do config.toml
```

**E-mails:** o envio padrão do Supabase só entrega para membros da organização. Para enviar código de cadastro e redefinição de senha a qualquer pessoa, configure um SMTP próprio (ex.: Gmail com senha de app) em *Authentication → Emails → SMTP Settings*, depois ative `enable_confirmations` e os modelos de e-mail no `config.toml` e rode `config push`.

---

## 🗄 Modelo de dados

| Entidade | Campos principais |
| --- | --- |
| **WeatherData** | `timestamp`, `temperature`, `temp_min/max`, `condition`, `humidity`, `wind_speed`, `pressure`, `location_lat/lng`, `location_name` |
| **ClimateAlert** | `title`, `description`, `severity` (low→critical), `type` (rain, hail, frost, storm, wind, flood), `timestamp`, `is_active`, `key` |
| **RiskForecast** | `type` (rain/hail/frost), `risk_level` (low→extreme), `probability`, `intensity`, `expected_start/end`, `description`, `recommendations` |
| **GpsTracking** | `timestamp`, `latitude`, `longitude`, `location_name`, `risk_level` (safe→critical) |
| **InsuranceClaim** | `incident_date`, `impact_intensity`, `description`, `location_*`, `weather_condition`, `status`, `confirmed`, `insurer_sent`, `report_summary` |
| **CoverStatus** | `timestamp`, `is_inflated`, `magnets_status`, `integrity`, `battery_level`, `last_action` |

`CoverStatus` é um **log de ações**: cada comando cria um registro e o estado atual é o mais recente.

---

## 🗺 Telas e rotas

| Rota | Tela | Acesso |
| --- | --- | --- |
| `/login` | Login (e-mail/senha, mostrar senha, Google*) | Público |
| `/register` | Cadastro em 2 etapas com código | Público |
| `/forgot-password` | Pedido de redefinição (mensagem neutra) | Público |
| `/reset-password?token=` | Nova senha | Público |
| `/` | Home — mosaico dos 6 módulos + Painel Completo | Protegida |
| `/feature/:id` | Explicação do módulo antes de abri-lo | Protegida |
| `/dashboard` | Carrossel com os 6 painéis | Protegida |
| `/climate-history` | Clima Local | Protegida |
| `/alerts-list` | Alertas Climáticos (limite 10/20/50) | Protegida |
| `/forecast-detail` | Previsões de Risco (cartões expansíveis) | Protegida |
| `/risk-maps` | Mapa + histórico de posições sincronizado | Protegida |
| `/insurance` | Sinistros + novo acionamento com Double-Check | Protegida |
| `/cover-automation` | Controle e diagnóstico da capa | Protegida |

\* O botão Google informa que depende de um provedor de autenticação real.

---

## ✨ Navegação e transições

- **TopBar persistente** com relógio e menu, fundo translúcido com blur.
- **Três caminhos**: mosaico → módulo (via FeatureDetail); mosaico → Painel Completo; painel → página completa.
- **Home**: cards entram em *stagger* (70 ms, mola `stiffness 260 / damping 22`), `active:scale-95` no toque.
- **FeatureDetail**: cabeçalho e blocos em cascata (0,1 / 0,18 / 0,24 / 0,35 s).
- **Dashboard**: `AnimatePresence` em modo `wait`, deslize direcional de ±300 px em 0,25 s; navegação por **abas, dots, setas, swipe (> 50 px) e teclado (← →)**, sempre circular.
- **Retorno em um toque**: seta voltar + botão **Visão Geral** em todas as telas internas.

---

## 🎨 Design system

| Token | Valor |
| --- | --- |
| Fundo | gradiente `slate-950 → slate-900 → slate-950` |
| Cards | `bg-white/5` + `border-white/5`, `rounded-2xl` |
| Texto | `white` / `slate-400` / `slate-500` |
| Ação primária | `blue-500` / `blue-600` |
| Fonte | Inter (200 nos números grandes até 700 nos títulos) |

| Módulo | Cor |
| --- | --- |
| Clima | Sky / Blue |
| Alertas | Amber / Orange |
| Previsão | Violet / Purple |
| Mapas | Emerald / Teal |
| Seguro | Rose / Pink |
| Capa | Cyan / Blue |

---

## 🚀 Deploy

### Render (principal)

O arquivo `render.yaml` descreve o app como **Static Site** (gratuito, servido por CDN, sem cold start):

1. No [dashboard do Render](https://dashboard.render.com): **New → Blueprint**.
2. Selecione o repositório `smarthail` e confirme em **Apply**.
3. O site fica em `https://smarthail.onrender.com` (ou com sufixo, se o nome já existir) e é atualizado a cada push na `main`.

O `render.yaml` já configura o *rewrite* de rotas da SPA (`/* → /index.html`), cache longo para `/assets/*` e cabeçalhos de segurança.

### GitHub Pages (alternativo)

O workflow `.github/workflows/deploy.yml` publica no **GitHub Pages** a cada push na `main`:

1. No GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Faça push na `main`. O app fica em `https://<usuario>.github.io/<repositorio>/`.

O build usa `VITE_BASE=/<repositorio>/` e copia `index.html` para `404.html`, para que rotas como `/dashboard` funcionem ao recarregar a página.

---

## 📍 Roadmap

- [x] Backend real (Supabase): contas e dados sincronizados entre dispositivos
- [ ] Login com Google
- [x] Notificações push para alertas críticos
- [ ] Acionamento automático da capa a partir de regras de risco
- [ ] Integração com o hardware da capa (hoje os comandos são simulados)
- [ ] Rastreador GPS do veículo (hoje usa a localização do celular)
- [ ] Envio do sinistro à seguradora por API + upload de fotos do dano
- [ ] Múltiplos veículos por conta
- [ ] Painel administrativo da frota (visão seguradora)

---

## 📄 Créditos

- Dados meteorológicos: [Open-Meteo](https://open-meteo.com) (CC BY 4.0)
- Avisos meteorológicos oficiais: [INMET](https://portal.inmet.gov.br)
- Mapas: [OpenFreeMap](https://openfreemap.org), © OpenMapTiles, © colaboradores do [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Radar: [RainViewer](https://www.rainviewer.com)
- Geocodificação reversa: [BigDataCloud](https://www.bigdatacloud.com)
