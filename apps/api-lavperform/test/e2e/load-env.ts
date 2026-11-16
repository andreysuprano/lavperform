import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '.test-env.json');
if (fs.existsSync(envPath)) {
  const env = JSON.parse(fs.readFileSync(envPath, 'utf8')) as Record<
    string,
    string
  >;
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
}
