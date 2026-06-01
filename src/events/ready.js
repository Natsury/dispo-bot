const cron = require('node-cron');
const { getConfig, getExpiredWeeks } = require('../db/queries');
const { startWeek, publishResults } = require('../tasks/weeklyTask');
const db = require('../db/index');

async function checkExpiredWeeks(client) {
  const expired = getExpiredWeeks();
  for (const week of expired) {
    const guild = await client.guilds.fetch(week.guild_id).catch(() => null);
    if (!guild) continue;
    await publishResults(guild, week);
  }
}

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`Connecté en tant que ${client.user.tag}`);

    // Rattrape les semaines expirées pendant un éventuel downtime
    await checkExpiredWeeks(client);

    // Vérifie les deadlines expirées toutes les 15 min
    cron.schedule('*/15 * * * *', () => checkExpiredWeeks(client));

    // Cron samedi 09h00 et dimanche 09h00 — vérifier config de chaque guild
    const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

    cron.schedule('0 9 * * 6,0', async () => {
      const configs = db.prepare('SELECT * FROM guild_config WHERE channel_id IS NOT NULL AND role_id IS NOT NULL').all();
      for (const row of configs) {
        if (new Date().getDay() !== DAY_INDEX[row.cron_day]) continue;
        const guild = await client.guilds.fetch(row.guild_id).catch(() => null);
        if (!guild) continue;
        const err = await startWeek(guild);
        if (err) console.error(`[startWeek] ${row.guild_id}:`, err);
      }
    }, { timezone: 'Europe/Paris' });
  },
};
