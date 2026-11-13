require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const db = require('./database'); // Laadt de database

console.log("Bot script wordt geladen...");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const ongoing = new Set();
const points = [10, 8, 6, 4, 2];

client.once('ready', () => {
    console.log(`Ingelogd als ${client.user.tag}! Bot staat aan.`);
});

// Lijst met landen waar de bot uit kiest
const countries = [
    "France", "Italy", "Japan", "Egypt", "Greece",
    "Spain", "United Kingdom", "United States", "China",
    "Germany", "Australia", "Brazil", "India", "Mexico"
];

// Functie om een landmark op te halen op basis van een willekeurig gekozen land
async function getRandomLandmark() {
    while (true) {
        // Kies een willekeurig land uit de lijst
        const randomCountry = countries[Math.floor(Math.random() * countries.length)];

        // Zoek naar landmarks of monumenten in dat specifieke land via Wikipedia
        const searchQuery = `landmark in ${randomCountry}`;
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrnamespace=0&gsrlimit=15&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=600&exintro=true&explaintext=true&format=json&origin=*`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.query && data.query.pages) {
                const pages = data.query.pages;
                const pageIds = Object.keys(pages);

                // Pak een willekeurige pagina uit de zoekresultaten
                const randomPageId = pageIds[Math.floor(Math.random() * pageIds.length)];
                const page = pages[randomPageId];

                // Controleer of de pagina een geldige thumbnail heeft
                if (page && page.thumbnail) {
                    return {
                        title: page.title,       // De naam van het gebouw/monument (voor de leuk)
                        country: randomCountry,  // HET LAND (dit is het antwoord voor het spel!)
                        image: page.thumbnail.source
                    };
                }
            }
        } catch (error) {
            console.error('Fout bij ophalen van Wikipedia landmark:', error);
            return null;
        }
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!score') {
        const rij = db.prepare('SELECT score FROM pinpoint_scores WHERE guild_id = ? AND user_id = ?')
            .get(message.guild.id, message.author.id);
        message.reply('Jouw score op deze server: ' + (rij ? rij.score : 0) + ' punten');
    }

    if (message.content === '!board') {
        const rijen = db.prepare('SELECT username, score FROM pinpoint_scores WHERE guild_id = ? ORDER BY score DESC LIMIT 5')
            .all(message.guild.id);
        if (rijen.length === 0) return message.reply('Nog geen scores! Typ !pinpoint om te beginnen.');

        let tekst = '**Top 5**\n';
        rijen.forEach((rij, nummer) => {
            tekst += (nummer + 1) + '. ' + rij.username + ' - ' + rij.score + ' punten\n';
        });
        message.channel.send(tekst);
    }

    // Het !pinpoint commando
    if (message.content === '!pinpoint') {
        await message.channel.send('Even een mooie bezienswaardigheid opzoeken...');

        const landmark = await getRandomLandmark();

        if (!landmark) {
            return message.channel.send('Oeps, kon even geen bezienswaardigheid vinden. Probeer het nog eens!');
        }

        if (message.content === '!score') {
            const rij = db.prepare('SELECT score FROM pinpoint_scores WHERE guild_id = ? AND user_id = ?')
                .get(message.guild.id, message.author.id);
            message.reply(' Jouw score op deze server: ' + (rij ? rij.score : 0) + ' punten');
        }

        // Maak een strakke embed met de vraag om het land te raden
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Welk land is dit?')
            .setImage(landmark.image)
            .setDescription('*Bekijk de foto goed en raad in welk land dit staat!*\n30 seconden, 5 pogingen.')
            .setFooter({ text: 'PinPoint Spel' });

        await message.channel.send({ embeds: [embed] });

        // Het juiste land wordt in je VS Code terminal geprint als antwoord
        console.log(`[HET JUISTE LAND IS]: ${landmark.country} (Locatie: ${landmark.title})`);

        // Het raden: 30 seconden, 5 pogingen per speler
        const pogingen = {};
        let winnaar = null;
        let punten = 0;

        const collector = message.channel.createMessageCollector({
            filter: (m) => !m.author.bot && !m.content.startsWith('!'),
            time: 30000
        });

        collector.on('collect', (m) => {
            const id = m.author.id;
            pogingen[id] = (pogingen[id] || 0) + 1;
            if (pogingen[id] > 5) return;

            if (m.content.toLowerCase().includes(landmark.country.toLowerCase())) {
                winnaar = m.author;
                punten = points[pogingen[id] - 1];
                m.reply('Goed!');
                collector.stop();
            } else {
                m.reply('Fout, probeer opnieuw (poging ' + pogingen[id] + ' van 5)');
            }
        });

        collector.on('end', () => {
            ongoing.delete(message.channel.id);

            if (winnaar) {
                db.prepare(`INSERT INTO pinpoint_scores (guild_id, user_id, username, score)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT(guild_id, user_id) DO UPDATE SET
                              username = ?, score = score + ?`)
                    .run(message.guild.id, winnaar.id, winnaar.username, punten,
                        winnaar.username, punten);
                message.channel.send('**' + winnaar.username + '** heeft het goed! +' + punten + ' punten. Het was: **' + landmark.country + '** (' + landmark.title + ')');
            } else {
                message.channel.send('Tijd is om! Het was: **' + landmark.country + '** (' + landmark.title + ')');
            }
        });
    }
});

client.login(process.env.DISCORD_TOKEN);