console.log('\n-STARTING-\n');

// //////////////////////////////////////////////////////////////////////////////////////////////

const Auth = require('./auth.js');
const NodeUtil = require('util');
const Exec = require('child_process').exec;
const Forever = require('forever-monitor');
const DateFormat = require('dateformat');
const Discord = require('discord.js');

const client = new Discord.Client({
    disabledEvents: ['TYPING_START', 'MESSAGE_DELETE', 'GUILD_MEMBER_UPDATE', 'GUILD_MEMBER_ADD', 'GUILD_MEMBER_REMOVE', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE', 'USER_UPDATE'],
    disableEveryone: true,
});

const mainBotId = '224529399003742210';

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

async function keepAlive() {
    const guild = client.guilds.first();
    if (!guild) return;
    const mainBot = await guild.fetchMember(mainBotId, false);
    if (!mainBot && !hasRestarted) {
        hasRestarted = true;

        log('[Auto] Restarted VaeBot');

        const child = new (Forever.Monitor)('/home/flipflop8421/files/discordExp/VaeBot/index.js', {
            max: 10,
            silent: true,
            args: [],
        });

        child.on('exit', () => {
            log('VaeBot has exited after 10 restarts');
        });

        child.start();
    } else if (mainBot && hasRestarted) {
        // hasRestarted = false;
    }
}

client.on('ready', async () => {
    log(`> Connected as ${client.user.username}!`);
});

client.on('disconnect', (closeEvent) => {
    log('> Disconnected');
    log(closeEvent);
    log(`Code: ${closeEvent.code}`);
    log(`Reason: ${closeEvent.reason}`);
    log(`Clean: ${closeEvent.wasClean}`);
});

setInterval(keepAlive, 1000 * 60);

keepAlive();

log('-CONNECTING-');

client.login(Auth.discordToken);

process.on('unhandledRejection', (err) => {
    console.error(`Uncaught Promise Error: \n${err.stack}`);
});
