const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getLastWeek, getVotesByDay } = require('../db/queries');
const { buildDetailEmbed } = require('../utils/results');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apercu')
    .setDescription('Disponibilités de la semaine avec les votants par jour')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const week = getLastWeek(interaction.guildId);
    if (!week) return interaction.reply({ content: '❌ Aucune semaine trouvée.', flags: MessageFlags.Ephemeral });
    const votes = getVotesByDay(week.id);
    return interaction.reply({ embeds: [buildDetailEmbed(week, votes)], flags: MessageFlags.Ephemeral });
  },
};
