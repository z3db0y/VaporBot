'use strict';
const fs = require('fs');
const { emit } = require('process');

function checkUpdate(guildID) {

}

module.exports = {
    currentVersion: null,
    setUpdateChannel: function (channelID, guildID) {
        let guildSettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        guildSettings.updateChannel = channelID;
        fs.writeFileSync(`${guildID}.json`, JSON.stringify(guildSettings, null, 2));
    },
    checkForUpdates: function (guildID) {
        checkUpdate(guildID);
    },
    init: function (client) {
        client.guilds.cache.forEach((guild) => {
            setInterval(checkUpdate(guild.id), 60000);
        });
    }
    
}