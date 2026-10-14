# Longhand

Focused writing app with shareable **effort receipts** — proof of how long you spent writing, across how many sessions, and how much was typed versus pasted.

See [docs/PRD.md](./docs/PRD.md) for product requirements.

## Local setup

```bash
docker compose up -d
cp .env.example .env   # if needed
npm install
npm run db:migrate
npm run dev
```

- App: http://localhost:3000
- Mailpit (magic-link inbox): http://localhost:8025
- Postgres: `postgres://longhand:longhand@localhost:5432/longhand`

```bash
npm test
```
