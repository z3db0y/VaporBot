class GuildAPI {

    construtor (guildDir) {
      this.guildDir = guildDir;
    }
  
    getGuildSettings(guildID) {
      if(fs.existsSync(`${this.guildDir}${guildID}.json`)) return JSON.parse(fs.readFileSync(`${this.guildDir}${guildID}.json`));
      else return null
    }
    
    setGuildSettings(guildID, settings) {
      fs.writeFileSync(`${this.guildDir}${guildID}.json`, JSON.stringify(settings, null, 2));
      return true;
    }
  
    initGuild(g) {
      if(fs.existsSync(`${this.guildDir}${g.id}.json`)) return console.log(`\x1b[35m[GuildAPI] \x1b[32m${g.name} \x1b[0mready!`);
      let defaultSettings = fs.readFileSync(process.env.CONFIG_PATH).defaultSettings;
      this.setGuildSettings(g.id, defaultSettings);
      console.log(`\x1b[35m[GuildAPI] \x1b[32m${g.name} \x1b[0mready!`);
    }
  
    repairGuild(g) {
      let defaultSettings = JSON.stringify(fs.readFileSync(process.env.CONFIG_PATH).defaultSettings);
      this.setGuildSettings(g.id, defaultSettings);
      console.log(`\x1b[35m[GuildAPI] \x1b[32m${g.name} \x1b[0mrepaired!`);
    }
  
    removeGuild(g) {
      if(fs.existsSync(`${this.guildDir}${g.id}.json`)) {
        fs.unlinkSync(`${this.guildDir}${g.id}.json`);
        console.log(`\x1b[35m[GuildAPI] \x1b[32m${g.name} \x1b[0mremoved!`);
      }
    }
}

module.exports = GuildAPI;