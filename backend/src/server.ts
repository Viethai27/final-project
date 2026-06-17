import dotenv from 'dotenv';
import { app } from './app';
import { ensureDatabaseAvailable } from './shared/ensure-database';

dotenv.config();

const port = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  await ensureDatabaseAvailable();

  app.listen(port, () => {
    console.log(`Patient dispatch backend listening on http://localhost:${port}`);
  });
}

void bootstrap().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
