// RainbowRole API
// 16:20 UTC+2 23 December 2020

'use strict';
const fs = require('fs');

class RainbowRole {

    async runRainbowRole(discordClient, guildID) {
        setInterval(() => {
            let guildSettings = null;
            try {
                let guildFileName = guildID + ".json";
                guildSettings = JSON.parse(fs.readFileSync(guildFileName));
                console.log(`\x1b[35m[RainbowRole] \x1b[0mInitiated rainbow role API for \x1b[32m${discordClient.guilds.find(guild => guild.id === guildID).name}\x1b[0m!`);
                if(guildSettings.rainbowRoles.length() > 0) {
                    for(var i = 0; i < 32; ++i) {
                        var frequency = 0.3;
                        for (var i1 = 0; i1 < guildSettings.rainbowRoles.length(); i++) {
                            red   = Math.sin(frequency*i + 0) * 127 + 128;
                            green = Math.sin(frequency*i + 2) * 127 + 128;
                            blue  = Math.sin(frequency*i + 4) * 127 + 128;

                            var color = '0x'+fullColorHex(red,green,blue);
                            discordClient.guilds.cache.find(guild => guild.id === guildID).roles.cache.find(role => role.id === guildSettings.rainbowRoles[i]).setColor(color);
                        }
                    }
                }
            } catch (err) {
                console.log(`\x1b[35m[RainbowRole] \x1b[31m` + err.message + `\x1b[0m`);
            }
        }, 1);
    }

    rgbToHex (rgb) {
        var hex = Number(rgb).toString(16);
        if (hex.length < 2) {
             hex = "0" + hex;
        }
        return hex;
    };

    fullColorHex(r,g,b) {
        var red = rgbToHex(r);
        var green = rgbToHex(g);
        var blue = rgbToHex(b);
        return red+green+blue;
    };
}

module.exports = { RainbowRole }
