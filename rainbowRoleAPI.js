// RainbowRole API
// 16:20 UTC+2 23 December 2020

'use strict';
const fs = require('fs');

class RainbowRole {

    async runRainbowRole(discordClient, guildID) {
        let initiated = 0;
        setInterval(() => {
            let guildSettings = null;
            try {
                let guildFileName = guildID + ".json";
                guildSettings = JSON.parse(fs.readFileSync(guildFileName));
                if(initiated == 0) {
                    console.log(`\x1b[35m[RainbowRole] \x1b[0mInitiated rainbow role API for \x1b[32m${discordClient.guilds.cache.find(guild => guild.id === guildID).name}\x1b[0m!`);
                    initiated = 1;
                } else {
                }
                if(guildSettings.rainbowRoles.length > 0) {
                    for (var i = 0; i < guildSettings.rainbowRoles.length; i++) {
                        let rainbowRoleID = null;
                        if(guildSettings.rainbowRoles.length == 1) {
                            rainbowRoleID = guildSettings.rainbowRoles;
                        } else {
                            rainbowRoleID = guildSettings.rainbowRoles[i];
                        }
                        let rainbowRole = discordClient.guilds.cache.find(guild => guild.id === guildID).roles.cache.find(role => role.id == rainbowRoleID);
                        setTimeout(() => {
                            var color = '0xff0000';
                            rainbowRole.setColor(color);
                            setTimeout(() => {
                                var color = '0x00ff00';
                                rainbowRole.setColor(color);
                                setTimeout(() => {
                                    var color = '0x0000ff';
                                    rainbowRole.setColor(color);
                                },7500);
                            }, 7500);
                        }, 7500);
                    }
                }
            } catch (err) {}
        }, 7500);
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
