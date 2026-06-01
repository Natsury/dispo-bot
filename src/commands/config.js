const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getConfig, setConfig } = require('../db/queries');

const DAY_MAP = {
  lun: 'monday', lundi: 'monday', mon: 'monday', monday: 'monday',
  mar: 'tuesday', mardi: 'tuesday', tue: 'tuesday', tuesday: 'tuesday',
  mer: 'wednesday', mercredi: 'wednesday', wed: 'wednesday', wednesday: 'wednesday',
  jeu: 'thursday', jeudi: 'thursday', thu: 'thursday', thursday: 'thursday',
  ven: 'friday', vendredi: 'friday', fri: 'friday', friday: 'friday',
  sam: 'saturday', samedi: 'saturday', sat: 'saturday', saturday: 'saturday',
  dim: 'sunday', dimanche: 'sunday', sun: 'sunday', sunday: 'sunday',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurer le bot de disponibilités (sans option = affiche la config)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(o => o.setName('role').setDescription('Rôle cible des membres'))
    .addChannelOption(o => o.setName('channel').setDescription('Channel de collecte'))
    .addStringOption(o => o.setName('jours').setDescription('Jours actifs (ex: lun,mar,jeu)'))
    .addIntegerOption(o => o.setName('deadline').setDescription('Heures avant fermeture automatique').setMinValue(1).setMaxValue(336))
    .addStringOption(o => o
      .setName('cron-day')
      .setDescription('Jour de lancement automatique')
      .addChoices(
        { name: 'Samedi', value: 'saturday' },
        { name: 'Dimanche', value: 'sunday' },
      )),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel');
    const jours = interaction.options.getString('jours');
    const deadline = interaction.options.getInteger('deadline');
    const cronDay = interaction.options.getString('cron-day');

    if (!role && !channel && !jours && deadline === null && !cronDay) {
      const config = getConfig(interaction.guildId);
      if (!config) return interaction.reply({ content: '⚙️ Aucune config. Utilise `/config` avec des options.', flags: MessageFlags.Ephemeral });
      const days = config.active_days.join(', ');
      return interaction.reply({
        content: `**Config actuelle**\n- Rôle: ${config.role_id ? `<@&${config.role_id}>` : 'non défini'}\n- Channel: ${config.channel_id ? `<#${config.channel_id}>` : 'non défini'}\n- Jours: ${days}\n- Deadline: ${config.deadline_hours}h\n- Cron: ${config.cron_day}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const fields = {};
    const changes = [];

    if (role) {
      fields.role_id = role.id;
      changes.push(`Rôle : <@&${role.id}>`);
    }
    if (channel) {
      fields.channel_id = channel.id;
      changes.push(`Channel : <#${channel.id}>`);
    }
    if (jours) {
      const tokens = jours.split(',').map(s => s.trim().toLowerCase());
      const parsed = tokens.map(s => DAY_MAP[s]).filter(Boolean);
      const unknown = tokens.filter(s => !DAY_MAP[s]);
      if (parsed.length === 0) return interaction.reply({ content: '❌ Jours invalides. Ex: `lun,mar,jeu`', flags: MessageFlags.Ephemeral });
      fields.active_days = JSON.stringify(parsed);
      const warnDays = unknown.length > 0 ? ` ⚠️ Ignorés : ${unknown.join(', ')}` : '';
      changes.push(`Jours : ${parsed.join(', ')}${warnDays}`);
    }
    if (deadline !== null) {
      fields.deadline_hours = deadline;
      changes.push(`Deadline : ${deadline}h`);
    }
    if (cronDay) {
      fields.cron_day = cronDay;
      changes.push(`Cron : ${cronDay}`);
    }

    setConfig(interaction.guildId, fields);
    return interaction.reply({
      content: `✅ Config mise à jour :\n${changes.map(c => `- ${c}`).join('\n')}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
