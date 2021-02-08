const fs = require('fs');
const dotenv = require('dotenv');

let PremiumAPI = {
    guildIsBronze (guildID) {
        let guildsettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        if(!guildsettings.isSilver && !guildsettings.isGold) {
            return true;
        } else return false;
    },

    guildIsSilver (guildID) {
        let guildsettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        if(guildsettings.isSilver) {
            return true;
        } else return false;
    },

    guildIsGold (guildID) {
        let guildsettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        if(guildsettings.isGold) {
            return true;
        } else return false;
    },

    getGuildType (guildID, client) {
        let guildsettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
        var isDevGuild;
        botDevelopers.forEach(dev => {
            isDevGuild = true;
            client.guilds.resolve(guildID).members.fetch(dev) .catch(err => {
                if(err.message === 'Unknown Member') isDevGuild = false
            });
            if(isDevGuild) return "Developer"
            else if(guildsettings.isGold) return "Gold"
            else if(guildsettings.isSilver) return "Silver"
            else return "Bronze"
        });
    }
}

module.exports = PremiumAPI;