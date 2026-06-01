const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getOpenWeek } = require('../db/queries');
const { publishResults, startWeek } = require('../tasks/weeklyTask');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resultats')
    .setDescription('Forcer la publication des résultats ou démarrer une semaine')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('publier')
      .setDescription('Publier les résultats de la semaine en cours'))
    .addSubcommand(sub => sub
      .setName('demarrer')
      .setDescription('Démarrer manuellement la collecte de la semaine prochaine')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'publier') {
      const week = getOpenWeek(interaction.guildId);
      if (!week) return interaction.reply({ content: '❌ Aucune semaine en cours.', flags: MessageFlags.Ephemeral });
      await interaction.reply({ content: '⏳ Publication en cours...', flags: MessageFlags.Ephemeral });
      await publishResults(interaction.guild, week);
    }

    if (sub === 'demarrer') {
      await interaction.reply({ content: '⏳ Démarrage de la collecte...', flags: MessageFlags.Ephemeral });
      const err = await startWeek(interaction.guild);
      if (err) await interaction.followUp({ content: err, flags: MessageFlags.Ephemeral });
    }
  },
};
