require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const dir = path.join(__dirname, 'src/commands');
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(dir, file));
  commands.push(cmd.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  console.log(`Enregistrement de ${commands.length} commande(s)...`);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands },
  );
  console.log('✅ Commandes enregistrées.');
})();
