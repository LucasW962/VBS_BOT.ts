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

bot.on('interactionCreate', async (interaction): Promise<void> => {
    if (!interaction.isCommand()) return;

    const command = bot.commands.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});


bot.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== 'GUILD_TEXT') return;

    let prefix: string = config.prefix;
    let messageArgs = message.content.slice(prefix.length).trim().split(/ +/);
    let cmd = messageargs[0];
    let args = messageArgs.slice(1);

    if (!message.content.startsWith(prefix)) return;

    let commandName = bot.commands.get(cmd) || bot.commands.find((c) => c.aliases && c.aliases.includes(cmd));
    let ocmmandfile = bot.commands.get(commandName);

    if (commandfile) {
        try {
            await commandfile.execute(message, args);
        } catch (error) {
            console.error(`Error executing command ${cmd}:`, error);
            await message.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

bot.login(config.Token);