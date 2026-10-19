# Longhand

Focused writing app with shareable **effort receipts** — proof of how long you spent writing, across how many sittings, and how much was typed versus brought in.

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

## Production

Production runs on a DigitalOcean droplet with Docker Compose. Copy [`.env.production.example`](./.env.production.example) to `.env` on the server, then use [`docker-compose.prod.yml`](./docker-compose.prod.yml) with [`scripts/deploy.sh`](./scripts/deploy.sh) to pull, build, and restart. Restore a nightly dump with [`scripts/restore.sh`](./scripts/restore.sh) `<file>`.
