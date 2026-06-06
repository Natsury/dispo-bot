const { EmbedBuilder } = require('discord.js');

const DAY_FR = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

function formatWeekRange(weekStart) {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `${fmt(start)} au ${fmt(end)}`;
}

function buildCollectEmbed(week, config, pendingMentions, dayCounts) {
  const countMap = Object.fromEntries(dayCounts.map(r => [r.day, r.count]));
  const activeDays = config.active_days;
  const deadline = new Date(week.deadline_at);
  const deadlineStr = deadline.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

  const dayLines = activeDays
    .map(d => `**${DAY_FR[d] || d}** — ${countMap[d] ?? 0} confirmé(s)`)
    .join('\n');

  const waitingStr = pendingMentions.length > 0
    ? pendingMentions.join(' ')
    : '✅ Tout le monde a répondu !';

  return new EmbedBuilder()
    .setTitle(`📅 Disponibilités — semaine du ${formatWeekRange(week.week_start)}`)
    .setDescription(`Deadline : **${deadlineStr}**\n\nCliquez sur les jours où vous êtes disponibles (multi-sélection), puis confirmez.\n\n${dayLines}`)
    .addFields({ name: 'En attente de', value: waitingStr })
    .setColor(0x5865F2);
}

function buildResultsEmbed(week, results) {
  if (results.length === 0) {
    return new EmbedBuilder()
      .setTitle(`📊 Résultats — semaine du ${formatWeekRange(week.week_start)}`)
      .setDescription('Aucune disponibilité enregistrée.')
      .setColor(0xED4245);
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = results.map((r, i) => {
    const medal = medals[i] || '▫️';
    return `${medal} **${DAY_FR[r.day] || r.day}** — ${r.count} personne(s)`;
  });

  return new EmbedBuilder()
    .setTitle(`📊 Résultats — semaine du ${formatWeekRange(week.week_start)}`)
    .setDescription(lines.join('\n'))
    .setColor(0x57F287);
}

function buildDetailEmbed(week, rows) {
  const byDay = {};
  for (const r of rows) {
    if (!byDay[r.day]) byDay[r.day] = [];
    byDay[r.day].push(r.user_id);
  }
  const lines = Object.entries(byDay).map(([day, ids]) =>
    `**${DAY_FR[day] || day}** — ${ids.length} personne(s)\n${ids.map(id => `<@${id}>`).join(' ')}`
  );
  return new EmbedBuilder()
    .setTitle(`📋 Votes détaillés — semaine du ${formatWeekRange(week.week_start)}`)
    .setDescription(lines.length ? lines.join('\n\n') : 'Aucun vote enregistré.')
    .setColor(0x5865F2);
}

module.exports = { buildCollectEmbed, buildResultsEmbed, buildDetailEmbed, DAY_FR };
