const fs = require('fs');

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
    }
}

module.exports = PremiumAPI;