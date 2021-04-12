'use strict';
const fs = require('fs');
const { emit } = require('process');
const GuildAPI = require('./guildAPI');
const guildAPI = new GuildAPI('guilds/');

function checkUpdate(guildID, client) {
    let guildSettings = guildAPI.getGuildSettings(guildID);
    if(!guildSettings.updateChannel) return;
    let releases = [];
    let files = fs.readdirSync(__dirname + '/releases');
    if(files) {
        files.forEach(file => {
            if(/^[0-9]*$/.test(file.replace(/\./g, '').replace('txt', ''))) {
                releases[releases.length] = {
                    filename: file,
                    fileInt: file.replace(/\./g, '').replace('txt', '')
                }
            }
        });
    }
    var largestFileInt = 0;
    releases.forEach(r => {
        if(r.fileInt > largestFileInt) largestFileInt = r.fileInt;
    });
    if(releases.length == 0) return;
    let latestRelease = releases.find(e => e.fileInt === largestFileInt).filename;
    if(guildSettings.lastLoggedUpdate == latestRelease) return;
    let channelResolvable = client.channels.fetch(guildSettings.updateChannel) .then(channel => {
        channel.send({ embed: {
            title: `**Version ${latestRelease.replace('.txt', '')} Released!**`,
            thumbnail: {
                url: client.user.avatarURL()
            },
            color: `0x${channel.guild.me.displayHexColor.substring(1)}`,
            description: `\`\`\`diff\n${fs.readFileSync(__dirname + '/releases/' + latestRelease)}\`\`\``,
            timestamp: new Date()
        }}) .then(() => {
            guildSettings.lastLoggedUpdate = latestRelease;
            guildAPI.setGuildSettings(guildID, guildSettings);
        }) .catch(err => {
            if(err.message === 'Missing Permissions') console.log(`\x1b[31m[Error] \x1b[0mGuild \x1b[31m${client.channels.cache.get(guildSettings.updateChannel).guild.name} \x1b[0mChannel \x1b[31m\#${client.channels.cache.get(guildSettings.updateChannel).name}\x1b[0m: Missing Text Permissions.`);
        });
    }) .catch(err => {});
}

module.exports = {
    currentVersion: null,
    setUpdateChannel: function (channelID, guildID) {
        let guildSettings = guildAPI.getGuildSettings(guildID);
        guildSettings.updateChannel = channelID;
        guildAPI.setGuildSettings(guildID, guildSettings);
    },
    checkForUpdates: function (guildID, client) {
        checkUpdate(guildID, client);
    },
    init: function (client) {
        client.guilds.cache.forEach((guild) => {
            setInterval(() => checkUpdate(guild.id, client), 60000);
        });
    }
    
}