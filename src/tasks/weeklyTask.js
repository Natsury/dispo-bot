const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createWeek, getWeek, setWeekMessageId, closeWeek, getDayCounts, getConfirmationCount, getResults, getConfig } = require('../db/queries');
const { buildCollectEmbed, buildResultsEmbed, DAY_FR } = require('../utils/results');

function nextMonday() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() + daysUntilMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function buildActionRows(weekId, activeDays, disabled = false) {
  const dayButtons = activeDays.map(day =>
    new ButtonBuilder()
      .setCustomId(`dispo:${weekId}:${day}`)
      .setLabel(DAY_FR[day] || day)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm:${weekId}`)
    .setLabel('✔️ Confirmer mes disponibilités')
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);

  const rows = [];
  // Max 4 buttons per row
  for (let i = 0; i < dayButtons.length; i += 4) {
    rows.push(new ActionRowBuilder().addComponents(dayButtons.slice(i, i + 4)));
  }
  rows.push(new ActionRowBuilder().addComponents(confirmButton));
  return rows;
}

async function publishResults(guild, week) {
  const config = getConfig(guild.id);
  if (!config || !config.channel_id) return;

  const results = getResults(week.id);
  const embed = buildResultsEmbed(week, results);
  const channel = await guild.channels.fetch(config.channel_id).catch(() => null);
  if (!channel) return;

  // Disable buttons on collect message
  if (week.message_id) {
    const msg = await channel.messages.fetch(week.message_id).catch(() => null);
    if (msg) {
      const activeDays = config.active_days;
      const disabledRows = buildActionRows(week.id, activeDays, true);
      await msg.edit({ components: disabledRows }).catch(() => null);
    }
  }

  await channel.send({ embeds: [embed] });
  closeWeek(week.id);
}

async function checkCompletion(guild, week) {
  const config = getConfig(guild.id);
  if (!config || !config.role_id) return;

  const role = await guild.roles.fetch(config.role_id).catch(() => null);
  if (!role) return;

  await guild.members.fetch().catch(() => null);
  const memberCount = role.members.size;
  const confirmedCount = getConfirmationCount(week.id);

  if (confirmedCount >= memberCount) {
    await publishResults(guild, week);
  }
}

async function startWeek(guild) {
  const config = getConfig(guild.id);
  if (!config || !config.channel_id || !config.role_id)
    return '❌ Config incomplète. Utilise `/config role` et `/config channel` d\'abord.';

  const weekStart = nextMonday();
  const deadlineAt = new Date();
  deadlineAt.setUTCHours(deadlineAt.getUTCHours() + config.deadline_hours);

  const result = createWeek(guild.id, weekStart, deadlineAt.toISOString());
  if (result.changes === 0) {
    const existing = getWeek(guild.id, weekStart);
    if (existing.closed_at)
      return `❌ La semaine du ${weekStart} a déjà été clôturée. Lance une nouvelle semaine lundi prochain.`;
    return `❌ Collecte déjà en cours pour la semaine du ${weekStart}.`;
  }

  const week = getWeek(guild.id, weekStart);
  const channel = await guild.channels.fetch(config.channel_id).catch(() => null);
  if (!channel) return '❌ Channel introuvable. Reconfigure avec `/config channel`.';

  const role = await guild.roles.fetch(config.role_id).catch(() => null);
  if (role) await guild.members.fetch().catch(() => null);
  const pendingMentions = role ? role.members.map(m => `<@${m.id}>`) : [];

  const embed = buildCollectEmbed(week, config, pendingMentions, []);
  const rows = buildActionRows(week.id, config.active_days);

  const mentionStr = role ? `<@&${config.role_id}>` : '';
  const msg = await channel.send({ content: mentionStr, embeds: [embed], components: rows });
  setWeekMessageId(week.id, msg.id);
}

module.exports = { startWeek, checkCompletion, publishResults, buildActionRows };
