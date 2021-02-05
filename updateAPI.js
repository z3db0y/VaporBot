'use strict';
const fs = require('fs');
const { emit } = require('process');


module.exports = {
    currentVersion: null,
    setUpdateChannel: function (channelID, guildID) {
        let guildSettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        guildSettings.updateChannel = channelID;
        fs.writeFileSync(`${guildID}.json`, JSON.stringify(guildSettings, null, 2));
    },
    init: function (client) {
        client.guilds.cache.forEach((guild) => {
            setInterval(this.checkForUpdates(guild.id), 60000);
        });
    },
    checkForUpdates: function (guildID) {

    }
}