-- ══════════════════════════════════════════════════
-- ZonCharge OS — Schema Supabase
-- ══════════════════════════════════════════════════

-- Extensão para UUID
create extension if not exists "pgcrypto";

-- ── TABELA: ordens_servico ──
create table if not exists ordens_servico (
  id          uuid primary key default gen_random_uuid(),
  num         text unique not null,              -- "OS-2026-0045"
  tipo        text not null,                     -- Vistoria | Instalação | Manutenção corretiva | Manutenção preventiva
  desc        text,
  prest       text,
  estado      text,
  cidade      text,
  inicio      date,
  prazo       date,
  conclusao   date,
  crg         text default '–',                  -- código do carregador
  serie       text,
  local       text,
  status      text default 'Aberta',             -- Aberta | Em andamento | Em validação | Concluída | Cancelada
  valor       text default '–',
  obs         text,
  preenchida  boolean default false,
  preenchida_por  text,
  preenchida_em   text,
  aprovacao       text,                          -- aprovado | reprovado
  aprovado_por    text,
  aprovado_em     text,
  pagamento_status text default 'pendente',      -- pendente | pago
  pagamento_data   date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── TABELA: preenchimentos ──
create table if not exists preenchimentos (
  id          uuid primary key default gen_random_uuid(),
  os_num      text not null references ordens_servico(num) on delete cascade,
  dados       jsonb not null,                    -- checklist completo em JSON
  preenchido_por text,
  preenchido_em  text,
  fotos       jsonb default '[]',                -- array de URLs Cloudinary
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── TABELA: usuarios ──
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  usuario     text unique not null,
  senha_hash  text not null,
  nome        text not null,
  perfil      text not null default 'operador',  -- gestor | financeiro | operador
  ativo       boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── TABELA: prestadores ──
create table if not exists prestadores (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique not null,              -- e.g. "PREST-001"
  nome        text not null,
  login       text unique not null,
  senha_hash  text not null,
  tel         text,
  tipos       text,                              -- tipos de serviço separados por vírgula
  status      text default 'ativo',             -- ativo | bloqueado
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── ÍNDICES ──
create index if not exists idx_os_num      on ordens_servico(num);
create index if not exists idx_os_status   on ordens_servico(status);
create index if not exists idx_os_prest    on ordens_servico(prest);
create index if not exists idx_os_updated  on ordens_servico(updated_at desc);
create index if not exists idx_preen_os    on preenchimentos(os_num);

-- ── TRIGGER: updated_at automático ──
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_os_updated_at
  before update on ordens_servico
  for each row execute procedure set_updated_at();

create trigger trg_preen_updated_at
  before update on preenchimentos
  for each row execute procedure set_updated_at();

create trigger trg_usuarios_updated_at
  before update on usuarios
  for each row execute procedure set_updated_at();

create trigger trg_prest_updated_at
  before update on prestadores
  for each row execute procedure set_updated_at();

-- ── RLS (Row Level Security) — desativado por padrão ──
-- O backend Node valida JWT próprio; Supabase é acessado apenas via service_role key
alter table ordens_servico  disable row level security;
alter table preenchimentos  disable row level security;
alter table usuarios        disable row level security;
alter table prestadores     disable row level security;

-- ── SEED: usuários padrão (senhas em texto — o backend faz hash no primeiro uso) ──
-- Execute após rodar o backend pela primeira vez para gerar os hashes corretos.
-- insert into usuarios (usuario, senha_hash, nome, perfil) values
--   ('gestor',     'HASH_AQUI', 'Ricardo Dias',    'gestor'),
--   ('financeiro', 'HASH_AQUI', 'Camila Souza',    'financeiro'),
--   ('operador',   'HASH_AQUI', 'Lucas Mendes',    'operador');
