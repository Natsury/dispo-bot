const db = require('../db/index');
const { toggleAvailability, confirmUser, getDayCounts, getConfirmedUserIds, getConfig, getUserDays } = require('../db/queries');
const { buildCollectEmbed, DAY_FR } = require('../utils/results');
const { buildActionRows, checkCompletion } = require('../tasks/weeklyTask');
const { MessageFlags } = require('discord.js');

async function handleButton(interaction) {
  const { customId, guild, user, message } = interaction;

  if (customId.startsWith('dispo:')) {
    const [, weekIdStr, day] = customId.split(':');
    const weekId = parseInt(weekIdStr);

    const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(weekId);
    if (!week || week.closed_at) {
      return interaction.reply({ content: '❌ Collecte terminée.', flags: MessageFlags.Ephemeral });
    }

    const config = getConfig(guild.id);
    if (config?.role_id) {
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member?.roles.cache.has(config.role_id)) {
        return interaction.reply({ content: '❌ Accès refusé — rôle requis.', flags: MessageFlags.Ephemeral });
      }
    }

    const newVal = toggleAvailability(weekId, user.id, day);
    const dayFr = DAY_FR[day] || day;
    const msg = newVal === 1 ? `✅ **${dayFr}** sélectionné.` : `❌ **${dayFr}** retiré.`;
    return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
  }

  if (customId.startsWith('confirm:')) {
    const [, weekIdStr] = customId.split(':');
    const weekId = parseInt(weekIdStr);

    const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(weekId);
    if (!week || week.closed_at) {
      return interaction.reply({ content: '❌ Collecte terminée.', flags: MessageFlags.Ephemeral });
    }

    const config = getConfig(guild.id);
    if (config?.role_id) {
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member?.roles.cache.has(config.role_id)) {
        return interaction.reply({ content: '❌ Accès refusé — rôle requis.', flags: MessageFlags.Ephemeral });
      }
    }

    confirmUser(weekId, user.id);

    // Rebuild embed with updated counts + pending list
    const dayCounts = getDayCounts(weekId);
    const confirmedIds = getConfirmedUserIds(weekId);

    const role = config?.role_id ? await guild.roles.fetch(config.role_id).catch(() => null) : null;
    const pendingMentions = role
      ? role.members.filter(m => !confirmedIds.includes(m.id)).map(m => `<@${m.id}>`)
      : [];

    const embed = buildCollectEmbed(week, config, pendingMentions, dayCounts);
    const rows = buildActionRows(weekId, config.active_days);

    await message.edit({ embeds: [embed], components: rows }).catch(() => null);
    const userDays = getUserDays(weekId, user.id);
    const dayList = userDays.length > 0
      ? userDays.map(d => `**${DAY_FR[d] || d}**`).join(', ')
      : 'aucun jour';
    await interaction.reply({ content: `✅ Disponibilités confirmées !\nJours sélectionnés : ${dayList}`, flags: MessageFlags.Ephemeral });

    await checkCompletion(guild, week);
  }
}

module.exports = { handleButton };
