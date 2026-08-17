const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });
  try {
    await p.$connect();
    console.log('Connected to Prisma');
    const out = await p.outlets.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
    console.log('OUTLETS_LEN', out.length);
    if (out.length > 0) console.log('SAMPLE:', JSON.stringify(out[0], null, 2));
  } catch (e) {
    console.error('PRISMA ERROR:', e);
    console.error(e.stack);
  } finally {
    await p.$disconnect();
  }
})();
