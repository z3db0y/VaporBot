const { EventEmitter } = require('events');
const fs = require('fs');
require('dotenv').config();

class GuildAPI extends EventEmitter {

    initialiseGuild(guild) {
        let guildFilename = guild.id.toString() + ".json";
        if(fs.existsSync(guildFilename)) {
            console.log(`\x1b[35m[GuildManager]\x1b[0m Guild \x1b[32m${guild.name}\x1b[0m ready!`);
        }
        else {
            let settings = JSON.stringify(JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).defaultSettings, null, 2);
            fs.writeFileSync(guildFilename, settings);
            if(fs.existsSync(guildFilename)) {
                console.log(`\x1b[35m[GuildManager]\x1b[0m Guild \x1b[32m${guild.name}\x1b[0m ready!`);
            }
            else {
                console.log(`\x1b[35m[GuildManager]\x1b[0m Guild \x1b[31m${guild.name}\x1b[0m was not initialised!`);
            }
        }
        this.emit('guildReady', guild);
    }

    guildDeleted(guild) {
        let guildFilename = guild.id.toString() + ".json";
        fs.unlinkSync(guildFilename);
        console.log(`\x1b[35m[GuildManager]\x1b[0m Guild \x1b[32m${guild.name}\x1b[0m removed!`);
        this.emit('guildRemoved', guild);
    }

    repairFiles(guild) {
        let guildFilename = guild.id.toString() + ".json";
        let settings = JSON.stringify(JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).defaultSettings, null, 2);
        fs.writeFileSync(guildFilename, settings);
        console.log(`\x1b[35m[GuildManager]\x1b[0m Guild \x1b[32m${guild.name}\x1b[0m has been repaired!`);
        this.emit('guildRepaired', guild);
    }

    updateConfig(guild) {
        let guildFilename = guild.id.toString() + ".json";
        let settings = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).defaultSettings;
        if(fs.existsSync(guildFilename)) {
            let guildsettings = JSON.parse(fs.readFileSync(guildFilename));
            for(let key in settings) {
                if(!guildsettings.hasOwnProperty(key)) {
                    guildsettings[key] = settings[key];
                }
            }
            fs.writeFileSync(guildFilename, JSON.stringify(guildsettings, null, 2));
        } else {
            fs.writeFileSync(guildFilename, JSON.stringify(settings, null, 2));
        }
        console.log(`\x1b[35m[GuildManager]\x1b[0m Guild \x1b[32m${guild.name}\x1b[0m has been updated!`);
        this.emit('updateComplete', guild);
    }
}

module.exports = { GuildAPI }
