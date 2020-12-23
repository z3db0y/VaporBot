// RainbowRole API
// 16:20 UTC+2 23 December 2020

'use strict';
const fs = require('fs');

class RainbowRole {
    getGuild(guildID) {
        let guildFileName = guildID + ".json";
        return JSON.parse(fs.readFileSync(guildFileName));
    }

    async runRainbowRole(discordClient, guildID) {
        setIntrerval(10, function () {
            getGuild()
        });
    }
}
