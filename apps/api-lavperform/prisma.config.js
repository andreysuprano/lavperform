require('dotenv/config');
const { defineConfig } = require('prisma/config');

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is missing in environment variables!');
    // Allow generation to pass without DB URL if strictly needed, but warn.
    // However, migrate deploy needs it.
}

module.exports = defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL
    },
});
