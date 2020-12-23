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
            let guildSettings = getGuild(guildID);
            if(guildSettings.rainbowRoles.length() > 0) {
                for(int i; i<guildSettings.rainbowRoles; i++) {
                    var frequency = 0.3;
                    for (var i = 0; i < 32; ++i) {
                        red   = Math.sin(frequency*i + 0) * 127 + 128;
                        green = Math.sin(frequency*i + 2) * 127 + 128;
                        blue  = Math.sin(frequency*i + 4) * 127 + 128;
                    }
                }
            }
        });
    }
}
