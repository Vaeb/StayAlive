console.log('\n-STARTING-\n');

// //////////////////////////////////////////////////////////////////////////////////////////////

const Auth = require('./auth.js');
const NodeUtil = require('util');
const Forever = require('forever');
const DateFormat = require('dateformat');
const Discord = require('discord.js');

const client = new Discord.Client({
    disabledEvents: ['TYPING_START', 'MESSAGE_DELETE', 'GUILD_MEMBER_UPDATE', 'GUILD_MEMBER_ADD', 'GUILD_MEMBER_REMOVE', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE', 'USER_UPDATE'],
    disableEveryone: true,
});

const mainBotId = '224529399003742210';

const admins = [
    '107593015014486016', // Vaeb
    '75743432164773888',  // Pkamara
];

// //////////////////////////////////////////////////////////////////////////////////////////////

let lastWasEmpty = true;

function postOutString(args, startNewline) {
    const nowDate = new Date();
    nowDate.setHours(nowDate.getHours() + 1);

    let out = (startNewline && !lastWasEmpty) ? '\n' : '';
    out += NodeUtil.format(...args);

    let outIndex = out.search(/[^\n\r]/g);
    if (outIndex === -1) outIndex = 0;

    out = out.slice(0, outIndex) + DateFormat(nowDate, '| dd/mm/yyyy | HH:MM | ') + out.slice(outIndex);

    console.log(out);

    lastWasEmpty = /[\n\r]\s*$/.test(out);
}

function log(...args) {
    postOutString(args, true);
}

let hasRestarted = false;
let guildExists = true;

function doStop() {
    console.log(Forever.list());
}

function doRestart(guild, channel) {
    if (!hasRestarted) {
        hasRestarted = true;

        log('[Auto] Restarted VaeBot');

        const embedObj = new Discord.MessageEmbed()
        .setTitle(channel ? 'Manual Protection' : 'Automatic Protection')
        .setDescription(channel ? 'Restarting VaeBot in production mode' : 'VaeBot detected offline: Remotely restarting in production mode')
        .setColor(0x00E676);

        (channel || guild.defaultChannel).send(undefined, { embed: embedObj })
        .catch(log);

        /* const child = new (Forever.Monitor)('/home/flipflop8421/files/discordExp/VaeBot/index.js', {
            max: 10,
            silent: true,
            args: [],
        });

        child.on('exit', () => {
            log('VaeBot has exited after 10 restarts');
        });

        child.start(); */

        console.log(Forever.startDaemon('/home/flipflop8421/files/discordExp/VaeBot/index.js'));
    } else {
        log('VaeBot not found online | Already restarted');
        if (channel) {
            const embedObj = new Discord.MessageEmbed()
            .setTitle('Command Failed')
            .setDescription('VaeBot has already been put into production mode')
            .setColor(0x00E676);

            guild.defaultChannel.send(undefined, { embed: embedObj })
            .catch(log);
        }
    }
}

async function keepAlive() {
    const guild = client.guilds.first();
    if (!guild) {
        if (guildExists) {
            guildExists = false;
            log('[ERROR] Guild not found');
        }
        return false;
    }

    const mainBot = await guild.fetchMember(mainBotId, false);
    const isOnline = mainBot ? mainBot.user.presence.status == 'online' : false;

    if (!isOnline) {
        doRestart(guild);
    } else {
        // log('VaeBot found online');
        // if (hasRestarted) hasRestarted = false;
    }

    return true;
}

client.on('ready', async () => {
    log(`> Connected as ${client.user.username}!`);

    client.setInterval(keepAlive, 1000 * 15);

    keepAlive();
});

client.on('disconnect', (closeEvent) => {
    log('> Disconnected');
    log(closeEvent);
    log(`Code: ${closeEvent.code}`);
    log(`Reason: ${closeEvent.reason}`);
    log(`Clean: ${closeEvent.wasClean}`);
});

client.on('message', (msgObj) => {
    const guild = msgObj.guild;
    const speaker = msgObj.member;

    if (guild == null || speaker == null || !admins.includes(speaker.id)) return;

    const channel = msgObj.channel;
    const contentLower = msgObj.content.toLowerCase();

    switch (contentLower) {
        case '!restart':
            doRestart(guild, channel);
            break;
        case '!stop':
            doStop();
            break;
    }
});

log('-CONNECTING-');

client.login(Auth.discordToken);

process.on('unhandledRejection', (err) => {
    console.error(`Uncaught Promise Error: \n${err.stack}`);
});
