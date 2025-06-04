import { Client, GatewayIntentBits, Collection, SlashCommandBuilder } from 'discord.js';
import {REST} from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import config from './config.json' with { type: "json" };
import fs from 'fs';
import { error } from 'console';


interface BotClient extends Client {
    commands: Collection<string, any>;
}

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
}) as BotClient;

bot.commands = new Collection();

fs.readdir('./commands', (error, files):void =>  {
    if (error) {
        console.error("Found an error when reading commands!:", error)
    }

    let tsFile = files.filter((f) => f.split('.').pop() === 'ts');
    if (tsFile.length <= 0) {
        console.error("No commands found!");
        return;
    }    tsFile.forEach(async (f) => {
        const { default: prop } = await import(`./commands/${f}`);
        console.log(`Loading command: ${prop.data.name}`);
        bot.commands.set(prop.data.name, prop);
    });
})

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'), // test command lul
].map(command => command.toJSON());


const rest = new REST({ version: '9' }).setToken(config.Token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

bot.on('ready', ():void => {
    if (bot.user) {
        console.log(`Logged in as ${bot.user.tag}!`);
        bot.user.setActivity('with Discord.js');
    }
});

bot.login(config.Token);