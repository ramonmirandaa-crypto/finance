## Financeito

This app was created using https://getmocha.com.
Need help or want to join the community? Join our [Discord](https://discord.gg/shDEGBSe2d).

To run the devserver:
```
npm install
npm run dev
```

### Prisma tooling

This project uses Prisma with a SQLite datasource stored under `prisma/dev.db`. To set it up locally:

1. Copy the environment template and adjust if needed:
   ```bash
   cp .env.example .env
   ```
2. Run database migrations (the `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` flag helps when engine checksums are unavailable):
   ```bash
   PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate dev
   ```
3. Regenerate the Prisma client whenever the schema changes:
   ```bash
   PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
   ```
