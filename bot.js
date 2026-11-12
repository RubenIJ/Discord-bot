require('dotenv').config(); // Laadt de variabelen uit het .env bestand
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database');

console.log("Bot script wordt geladen...");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Ingelogd als ${client.user.tag}! Bot staat aan.`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    if (message.content === '!test') {
        const userId = message.author.id;
        const userName = message.author.username;

        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO project_data (id, waarde) VALUES (?, ?)');
            stmt.run(userId, userName);

            message.channel.send('Werkt als een trein! Je gegevens zijn opgeslagen.');
            console.log(`Gegevens opgeslagen voor ${userName}`);
        } catch (error) {
            console.error('Fout bij opslaan in database:', error);
            message.channel.send('Er ging iets mis bij het opslaan.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);