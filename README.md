# ⚽ Tipovačka MS 2026

## Spuštění lokálně

```bash
# 1. Instalace závislostí
npm install

# 2. Vytvořit .env ze šablony
cp .env.example .env
# → doplnit VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY

# 3. Spustit dev server
npm run dev
```

## Nasazení na Vercel

```bash
# Přihlásit se do Vercel CLI
npx vercel login

# Nasadit
npx vercel --prod

# Nastavit env proměnné v Vercel Dashboard:
# VITE_SUPABASE_URL  = https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY = eyJ...
```

## Supabase setup

1. Vytvořit nový Supabase projekt
2. Spustit `001_tipovacka_schema.sql` v SQL Editoru
3. Spustit `002_tipovacka_seed.sql` v SQL Editoru
4. Zkopírovat Project URL a anon key do `.env`

## Admin účet

1. Zaregistrovat se normálně přes UI
2. V Supabase Table Editor: nastavit `je_admin = true` pro svůj řádek v `profiles`

## Struktura

```
src/
├── lib/
│   ├── supabase.js    # Supabase klient
│   └── utils.js       # Pomocné funkce (CEST časy, fáze, ceny)
├── contexts/
│   └── AuthContext.jsx
├── components/
│   ├── Layout.jsx       # Shell + dolní navigace
│   ├── ProtectedRoute.jsx
│   └── MatchCard.jsx
└── pages/
    ├── Login.jsx
    ├── Register.jsx
    ├── Home.jsx          # Jackpot + moje saldo + nejbližší zápasy
    ├── Calendar.jsx      # Všechny zápasy s filtrem
    ├── BetForm.jsx       # Zadání/úprava tipu
    ├── Leaderboard.jsx   # Celý žebříček
    ├── LongtermBets.jsx  # Vítěz MS + nejlepší střelec
    └── Admin.jsx         # Správa výsledků + jackpot
```
