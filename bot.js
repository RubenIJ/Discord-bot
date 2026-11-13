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

    // Het !pinpoint commando
    if (message.content === '!pinpoint') {
        await message.channel.send('Even een mooie bezienswaardigheid opzoeken...');

        const landmark = await getRandomLandmark();

        if (!landmark) {
            return message.channel.send('Oeps, kon even geen bezienswaardigheid vinden. Probeer het nog eens!');
        }

        // Maak een strakke embed met de vraag om het land te raden
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Welk land is dit?')
            .setImage(landmark.image)
            .setDescription('*Bekijk de foto goed en raad in welk land dit staat!*')
            .setFooter({ text: 'PinPoint Spel' });

        await message.channel.send({ embeds: [embed] });

        // Het juiste land wordt in je VS Code terminal geprint als antwoord
        console.log(`[HET JUISTE LAND IS]: ${landmark.country} (Locatie: ${landmark.title})`);
    }

    if (message.content === '!test') {
        message.channel.send('PinPoint bot is online en operationeel!');
    }
});

client.login(process.env.DISCORD_TOKEN);