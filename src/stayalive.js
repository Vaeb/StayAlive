console.log('\n-STARTING-\n');

// //////////////////////////////////////////////////////////////////////////////////////////////

const Auth = require('./auth.js');
const NodeUtil = require('util');
// const Forever = require('forever');
const PM2Mod = require('pm2');
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

let autoEnabled = true;
let inProduction = false;
let guildExists = true;
let connections = 0;

function PM2Connect(callback) {
    if (connections++ == 0) {
        PM2Mod.connect((err) => {
            if (err) {
                --connections;
                log(err);
                return;
            }
            callback();
        });
    } else {
        callback();
    }
}

function PM2Disconnect() {
    if (--connections == 0) PM2Mod.disconnect();
}

function doStop(channel) {
    /* if (!nodeProc) {
        log('VaeBot is not in production mode');
        const embedObj = new Discord.MessageEmbed()
        .setTitle('Command Failed')
        .setDescription('VaeBot not in production mode')
        .setColor(0x00E676);

        channel.send(undefined, { embed: embedObj })
        .catch(log);

        return;
    } */

    PM2Connect(() => {
        PM2Mod.delete('/home/flipflop8421/files/discordExp/VaeBot/index.js', (err) => {
            if (err) log(err);
            inProduction = false;
            PM2Disconnect();
        });
    });

    log('[Manual] Stopped VaeBot');

    const embedObj = new Discord.MessageEmbed()
    .setTitle('Handling Process')
    .setDescription('Stopping VaeBot if it\'s running in production mode')
    .setColor(0x00E676);

    channel.send(undefined, { embed: embedObj })
    .catch(log);
}

function doStart(guild, channel) {
    if (!inProduction) {
        inProduction = true;

        log(`[${channel ? 'Manual' : 'Auto'}] Restarted VaeBot`);

        const embedObj = new Discord.MessageEmbed()
        .setTitle(channel ? 'Manual Protection' : 'Automatic Protection')
        .setDescription(channel ? 'Restarting VaeBot in production mode' : 'VaeBot detected offline: Remotely restarting in production mode')
        .setColor(0x00E676);

        (channel || guild.defaultChannel).send(undefined, { embed: embedObj })
        .catch(log);

        /* nodeProc = Forever.startDaemon('/home/flipflop8421/files/discordExp/VaeBot/index.js');
        log(Forever.startServer(nodeProc)); */

        PM2Connect(() => {
            PM2Mod.start({
                script: '/home/flipflop8421/files/discordExp/VaeBot/index.js',
            }, (err) => {
                if (err) log(err);
                // nodeProc = proc;
                PM2Disconnect();
            });
        });
    } else {
        log('VaeBot not found online | Already restarted');
        if (channel) {
            const embedObj = new Discord.MessageEmbed()
            .setTitle('Command Failed')
            .setDescription('VaeBot has already been started into production mode')
            .setColor(0x00E676);

            guild.defaultChannel.send(undefined, { embed: embedObj })
            .catch(log);
        }
    }
}

async function keepAlive() {
    if (!autoEnabled) return false;

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
        doStart(guild);
    } else {
        // log('VaeBot found online');
        // if (inProduction) inProduction = false;
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

function doEnable(channel) {
    autoEnabled = true;

    const embedObj = new Discord.MessageEmbed()
    .setTitle('Settings')
    .setDescription('Automatic protection is now enabled!')
    .setColor(0x00E676);

    channel.send(undefined, { embed: embedObj })
    .catch(log);
}

function doDisable(channel) {
    autoEnabled = false;

    const embedObj = new Discord.MessageEmbed()
    .setTitle('StayAlive Settings')
    .setDescription('Automatic protection is now disabled!')
    .setColor(0x00E676);

    channel.send(undefined, { embed: embedObj })
    .catch(log);
}

function booleanToStr(bool) {
    return bool ? 'Enabled' : 'Disabled';
}

function doStatus(channel) {
    const embedObj = new Discord.MessageEmbed()
    .setTitle('StayAlive Status')
    .setDescription(`Automatic protection: ${booleanToStr(autoEnabled)} | VaeBot production mode: ${booleanToStr(inProduction)}`)
    .setColor(0x00E676);

    channel.send(undefined, { embed: embedObj })
    .catch(log);
}

client.on('message', (msgObj) => {
    const guild = msgObj.guild;
    const speaker = msgObj.member;

    if (guild == null || speaker == null || !admins.includes(speaker.id)) return;

    const channel = msgObj.channel;
    const contentLower = msgObj.content.toLowerCase();

    switch (contentLower) {
        case '!enable':
            doEnable(channel);
            break;
        case '!disable':
            doDisable(channel);
            break;
        case '!status':
            doStatus(channel);
            break;
        case '!start':
            doStart(guild, channel);
            break;
        case '!stop':
            doStop(channel);
            break;
    }
});

log('-CONNECTING-');

client.login(Auth.discordToken);

process.on('unhandledRejection', (err) => {
    console.error(`Uncaught Promise Error: \n${err.stack}`);
});
