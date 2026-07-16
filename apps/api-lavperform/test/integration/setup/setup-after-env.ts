import * as fs from 'fs';
import * as path from 'path';

const testEnvPath = path.join(__dirname, 'test-env.json');
if (fs.existsSync(testEnvPath)) {
  const env = JSON.parse(fs.readFileSync(testEnvPath, 'utf-8'));
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.REDIS_HOST = env.REDIS_HOST;
  process.env.REDIS_PORT = env.REDIS_PORT;
  process.env.ASAAS_BASE_URL = env.ASAAS_BASE_URL;
  process.env.ASAAS_API_KEY = env.ASAAS_API_KEY;
}
