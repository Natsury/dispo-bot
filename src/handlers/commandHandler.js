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
  await cmd.execute(interaction);
}

module.exports = { loadCommands, handleCommand };
