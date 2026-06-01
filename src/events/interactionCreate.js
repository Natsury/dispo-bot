const { handleCommand } = require('../handlers/commandHandler');
const { handleButton } = require('../handlers/buttonHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) return handleCommand(interaction);
    if (interaction.isButton()) return handleButton(interaction);
  },
};
