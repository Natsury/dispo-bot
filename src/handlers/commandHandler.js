const fs = require('fs');
const path = require('path');

const commands = new Map();

function loadCommands() {
  const dir = path.join(__dirname, '../commands');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(dir, file));
    commands.set(cmd.data.name, cmd);
  }
}

async function handleCommand(interaction) {
  const cmd = commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`Erreur commande ${interaction.commandName}:`, err);
    const reply = { content: '❌ Une erreur est survenue.', flags: 64 };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => null);
    else await interaction.reply(reply).catch(() => null);
  }
}

module.exports = { loadCommands, handleCommand };
