'use strict';
const fs = require('fs');
const { emit } = require('process');

function checkUpdate(guildID, client) {
    let guildSettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
    if(!guildSettings.updateChannel) return;
    let releases = [];
    fs.readdir('/releases', (err, files) => {
        if(err) return console.log(err.message);
        files.forEach(file => {
            console.log(file);
            if(/^[0-9]*$/.test(file.replace('.', '').replace('txt', ''))) releases[releases.length] = {
                filename: file,
                fileInt: parseInt(file.replace('.', '').replace('txt'))
            };
        });
    });
    var largestFileInt = 0;
    releases.forEach(r => {
        if(r.fileInt > largestFileInt) largestFileInt = r.fileInt;
    });
    console.log(JSON.stringify(releases, null, 1));
    let latestRelease = releases.find(e => e.fileInt === largestFileInt).filename;
    if(guildSettings.lastLoggedUpdate == latestRelease) return;

    client.channels.fetch(guildSettings.updateChannel).send({ embed: {
        title: `**Version ${latestRelease.replace('.txt', '')} Released!**`,
        thumbnail: {
            url: client.user.avatarUrl()
        },
        description: `\`\`\`diff\n${fs.readFileSync(latestRelease)}\`\`\``,
        timestamp: new Date()
    }});
    guildSettings.lastLoggedUpdate = latestRelease;
    fs.writeFileSync(`${guildID}.json`, JSON.stringify(guildSettings, null, 2));
}

module.exports = {
    currentVersion: null,
    setUpdateChannel: function (channelID, guildID) {
        let guildSettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        guildSettings.updateChannel = channelID;
        fs.writeFileSync(`${guildID}.json`, JSON.stringify(guildSettings, null, 2));
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