'use strict';

const updateAPI = require('./updateAPI');
let botChannels = { "BETA":0, "STABLE":1 };

const BOT_CHANNEL = botChannels.BETA;

require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client({ws: {intents: ['DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'DIRECT_MESSAGE_TYPING', 'GUILDS', 'GUILD_BANS', 'GUILD_EMOJIS', 'GUILD_INTEGRATIONS', 'GUILD_INVITES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING', 'GUILD_VOICE_STATES', 'GUILD_WEBHOOKS']}});
const fs = require('fs');
const GuildAPI = require('./guildAPI');
const guildAPI = new GuildAPI.GuildAPI();
const { exit, emit } = require('process');
const RainbowRoleAPI = require('./rainbowRoleAPI');
const rainbowRoleAPI = new RainbowRoleAPI.RainbowRole();
const premiumAPI = require('./premiumAPI');
//const musicBotAPI = require('./musicBotAPI');
const events = require('events');
const developerEmitter = new events.EventEmitter();
const ytdl = require('ytdl-core');
const ytsearch = require('yt-search');
const { doesNotMatch } = require('assert');

class MusicBot {
  play(c, query) {
    this.searchYoutube(query).then(res => {
      c.play(ytdl(res.url, {quality: 'highestaudio'}));
    });
  }

  stop(c) {
    if(c.dispatcher) c.dispatcher.end();
  }

  pause(c) {
    if(c.dispatcher) {
      if(c.dispatcher.paused) c.dispatcher.resume()
      else c.dispatcher.pause()
    }
  }

  async searchYoutube(query) {
    let results = await ytsearch({query: query});
    return results.videos[0];
  }
}
//////////////////////
//     IMPORTANT    //
//////////////////////
const musicBotAPI = new MusicBot();

function validateURl(url) {
  let validUrlRegex = new RegExp(/(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#()?&//=]*)/g);
  if(validUrlRegex.test(url)) return true;
  else return false;
}

client.on('ready', () => {
    console.log(`\x1b[35m[Discord] \x1b[32m${client.user.tag}\x1b[0m is ready to use the \x1b[32mVapor\x1b[0m script!`);
    if(BOT_CHANNEL == 0) {
      client.user.setPresence({activity: {type: "PLAYING", name: "Vapor Beta | Buggy and mostly offline"}, status: 'idle', afk: false})
      .then(() => {
        console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mBETA\x1b[0m)!');
      });
    }
    else if (BOT_CHANNEL == 1) {
      client.user.setPresence({activity: {type: "STREAMING", name: "Vapor | v!help", url: "https://twitch.tv/z3db0y"}, status: "online", afk: false})
      .then(() => {
        console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mSTABLE\x1b[0m)!');
      });
    }
    updateAPI.init(client);
    let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
    client.guilds.cache.forEach((guild) => {
        let guildsettings = JSON.parse(fs.readFileSync(`${guild.id}.json`));
        guildAPI.initialiseGuild(guild);
        rainbowRoleAPI.runRainbowRole(client, guild.id);
        botDevelopers.forEach(dev => {
          guild.members.fetch(dev) .then(user => {
            if(guildsettings.devRole) user.roles.add(guildsettings.devRole, "Vapor Developer automatical grant.") .catch(err => {});
          }) .catch(err => {});
        });
    });
});

client.on('guildDelete', (guild) => {
    guildAPI.guildDeleted(guild);
});

client.on('guildCreate', (guild) => {
    console.log(`\x1b[35m[GuildManager]\x1b[0m I have been added to \x1b[32m${guild.name}\x1b[0m!`);
    guildAPI.initialiseGuild(guild);
    rainbowRoleAPI.runRainbowRole(client, guild.id);
});

client.on('guildMemberAdd', (member) => {
  let guildsettings = JSON.parse(fs.readFileSync(`${member.guild.id}.json`));
  let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
  if(botDevelopers.includes(member.id) && guildsettings.devRole) {
    member.roles.add(guildsettings.devRole, "Vapor Developer automatical grant.");
  }
});

client.on('message', (msg) => {
    let filename;
    try{
        filename = msg.guild.id.toString() + ".json";
    }
    catch (err) {
        return;
    }
    let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
    if(!fs.existsSync(filename)) {
        guildAPI.repairFiles(msg.guild);
    }
    let prefix = JSON.parse(fs.readFileSync(filename)).prefix.toLowerCase();
    if(!msg.content.toLowerCase().startsWith(prefix)) {
        return;
    }
    if(msg.content.toLowerCase().startsWith(prefix + 'help')) {
        msg.channel.send({ embed: {
            title: "Vapor Help",
            color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
            author: {
                name: msg.author.tag,
                icon_url: msg.author.avatarURL()
            },
            thumbnail: {
                url: client.user.avatarURL()
            },
            fields: [
                {
                    name: prefix + "ban",
                    value: "Bans a user."
                },
                {
                    name: prefix + "unban",
                    value: "Unbans a user."
                },
                {
                    name: prefix + "kick",
                    value: "Kicks a user."
                },
                {
                    name: prefix + "warn",
                    value: "Warns a user."
                },
                {
                    name: prefix + "delwarn",
                    value: "Removes a warning for a user."
                },
                {
                    name: prefix + "warnings | " + prefix + "warns",
                    value: "Shows a user's warnings."
                },
                {
                    name: prefix + "purge",
                    value: "Removes amount of messages specified."
                },
                {
                    name: prefix + "play",
                    value: "Plays a song in your voice channel."
                },
                {
                    name: prefix + "pause",
                    value: "Pauses current song (music bot)."
                },
                {
                    name: prefix + "stop",
                    value: "Stops the current song (music bot)."
                },
                {
                    name: prefix + "queue",
                    value: "Displays the song queue (music bot)."
                },
                {
                    name: prefix + "add",
                    value: "Adds a song to the queue (music bot)."
                },
                {
                    name: prefix + "remove",
                    value: "Removes a song from the queue (music bot)."
                },
                {
                    name: prefix + "join",
                    value: "Makes bot join your voice channel."
                },
                {
                    name: prefix + "disconnect | " + prefix + "dc",
                    value: "Makes bot leave your voice channel."
                },
                {
                    name: prefix + "autokick",
                    value: "Set amount of warnings before a user is automatically kicked from the server."
                },
                {
                    name: prefix + "autoban",
                    value: "Set amount of warnings before a user is automatically banned from the server."
                },
                {
                    name: prefix + "store",
                    value: "Link to server store."
                },
                {
                    name: prefix + "setstore",
                    value: "Set the link to server store."
                },
                {
                    name: prefix + "setprefix",
                    value: "Update the guild's prefix."
                }
            ],
            timestamp: new Date()
        } }) .catch(err => checkError(err.message, msg.channel));
        msg.channel.send({embed: {
          title: "Still Need Help?",
            color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
            description: "Join our support server! [\[link\]](https://discord.gg/ptg4EC9eyA)",
            author: {
                name: msg.author.tag,
                icon_url: msg.author.avatarURL()
            },
            thumbnail: {
                url: client.user.avatarURL()
            },
            timestamp: new Date()
        }}) .catch(err => checkError(err.message));
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'updateconfigs')) {
        if(msg.author.id == "740167253491843094") {
            client.guilds.cache.forEach((guild) => {
                guildAPI.updateConfig(guild);
                if(guild.owner) {
                  guild.owner.send('**Vapor** has updated his configs! Set it up again please!');
                }
             });
             msg.author.send('You have updated everybody\'s configs!');
        }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'setprefix')) {
        if(msg.member.hasPermission('ADMINISTRATOR') || botDevelopers.includes(msg.member.id)) {
            let args = msg.content.split(' ');
            let rawData = JSON.parse(fs.readFileSync(filename));
            args.splice(0, 1);
            let newPrefix = args.join(' ');
            rawData.prefix = newPrefix;
            fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(rawData, null, 2));
            successMessage(msg.channel, 'Prefix set to **' + newPrefix + '**');
        }
        else {
            permissionDenied(msg.channel, "ADMINISTRATOR");
        }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'ban')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      if(args.length < 2) {
        errorMessage(msg.channel, 'Usage: ' + prefix + 'ban <UserID>|<@User>');
        return;
      }
      let user = args[1];
      let reason;
      if(args.length > 2) {
        let newArgs = args;
        newArgs.splice(0, 2);
        reason = newArgs.join(' ');
      }
      if(/^<@/.test(user)) {
        let userId = user.substring(2, user.length-1);
        if (userId.startsWith('!')) userId = userId.substring(1);
        if(client.users.resolve(userId).bot) return errorMessage(msg.channel, 'User is a bot!');
        if(reason) {
          msg.guild.members.ban(userId, {reason: reason}) .then((bannedUser) => {
            successMessage(msg.channel, `Banned **${bannedUser.tag}** (${userId}) with reason **${reason}**!`);
          }) .catch(err => {});
        } else msg.guild.members.ban(userId, {reason: `Banned by ${msg.author.tag}`}) .then((bannedUser) => {
          successMessage(msg.channel, `Banned **${bannedUser.tag}** (${userId}) with reason **Banned by ${msg.author.tag}**!`);
        }) .catch(err => {});
      } else if(/^[0-9]*$/.test(user)) {
        if(reason) {
          msg.guild.members.ban(user, {reason: reason}) .then((bannedUser) => {
            successMessage(msg.channel, `Banned **${bannedUser.tag}** (${user}) with reason **${reason}**!`);
          }) .catch(err => {});
        } else msg.guild.members.ban(user, {reason: `Banned by ${msg.author.tag}`}) .then((bannedUser) => {
          successMessage(msg.channel, `Banned **${bannedUser.tag}** (${user}) with reason **Banned by ${msg.author.tag}**!`);
        }) .catch(err => {});
      } else {
        errorMessage(msg.channel, 'Invalid user provided!');
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'unban')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      if(args.length < 2) {
        errorMessage(msg.channel, 'Usage: ' + prefix + 'unban <UserID>|<@User>');
        return;
      }
      let user = args[1];
      let reason;
      if(args.length > 2) {
        let newArgs = args;
        newArgs.splice(0, 2);
        reason = newArgs.join(' ');
      }
      if(/^<@/.test(user)) {
        let userId = user.substring(2, user.length-1);
        if(userId.startsWith('!')) userId = userId.substring(1);
        let isBanned;
        msg.guild.fetchBans().then(bans => {
          if(bans.get(userId) == null) {
            isBanned=false
          } else isBanned=true
        });
        if(reason) {
          msg.guild.members.unban(userId, reason) .then((unbannedUser) => {
            successMessage(msg.channel, `Unbanned **${unbannedUser.tag}** (${userId}) with reason **${reason}**!`);
          }) .catch(err => { if(err.message === 'Unknown Ban') { errorMessage(msg.channel, 'User is not banned!') }});
        } else msg.guild.members.unban(userId, `Unbanned by ${msg.author.tag}`) .then((unbannedUser) => {
          successMessage(msg.channel, `Unbanned **${unbannedUser.tag}** (${userId}) with reason **Unbanned by ${msg.author.tag}**!`);
        }) .catch(err => { if(err.message === 'Unknown Ban') { errorMessage(msg.channel, 'User is not banned!') }});
      } else if(/^[0-9]*$/.test(user)) {
        if(reason) {
          msg.guild.members.unban(user, reason) .then((unbannedUser) => {
            successMessage(msg.channel, `Unbanned **${unbannedUser.tag}** (${user}) with reason **${reason}**!`);
          }) .catch(err => { if(err.message === 'Unknown Ban') { errorMessage(msg.channel, 'User is not banned!') }});
        } else msg.guild.members.unban(user, `Unbanned by ${msg.author.tag}`) .then((unbannedUser) => {
          successMessage(msg.channel, `Unbanned **${unbannedUser.tag}** (${user}) with reason **Unbanned by ${msg.author.tag}**!`);
        }) .catch(err => { if(err.message === 'Unknown Ban') { errorMessage(msg.channel, 'User is not banned!') }});
      } else {
        errorMessage(msg.channel, 'Invalid user provided!');
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'kick')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      if(args.length < 2) {
        errorMessage(msg.channel, 'Usage: ' + prefix + 'kick <UserID>|<@User>');
        return;
      }
      let userID = args[1].replace('<@!', '').replace('<@').replace('>', '');
      if(!/^[0-9]*$/.test(userID)) return errorMessage(msg.channel, 'Invalid user provided!');
      if(client.users.resolve(userID).bot) return successMessage(msg.channel, 'User is a bot!');
      let newArgs = args;
      let reason;
      if(args.length > 2) {
        newArgs.splice(0, 2);
        reason = newArgs.join(' ');
      }
      msg.guild.members.fetch(userID) .then(user => {
        user.kick(reason ? reason : `Kicked by ${msg.author.tag}`) .then(() => {
          successMessage(msg.channel, `Kicked **${user.user.tag}** (${userID}) with reason **${reason ? reason : `Kicked by ${msg.author.tag}`}**!`);
        }) .catch(err => {});
      }) .catch(() => errorMessage(msg.channel, 'Invalid user provided!'));
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'warnings') || msg.content.toLowerCase().startsWith(prefix + 'warns')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      if(args.length < 2) {
        errorMessage(msg.channel, 'Usage: ' + prefix + 'warnings <UserID>|<@User>');
        return;
      }
      let userID = args[1].replace('<@!', '').replace('<@', '').replace('>', '');
      if(!/^[0-9]*$/.test(userID)) return msg.channel.send('Invalid user provided!');
      let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      if(!guildsettings.warnings.find(e => e.user === userID)) {
        errorMessage(msg.channel, 'This user has no warnings!');
      } else {
        let warns = guildsettings.warnings.find(e => e.user === userID).warns;
        if(warns.length < 1) return errorMessage(msg.channel, 'This user has no warnings!');
        let warnList = [];
        for(var i = 0; i < warns.length; i++) {
          if(i != warns.length-1) {
            warnList[warnList.length] = {
              name: `${i+1}. ${warns[i]}\n`,
              value: '*.*'
            }
          } else warnList[warnList.length] = {
            name: `${i+1}. ${warns[i]}`,
            value: '*.*'
          }
        }
        let userTag = client.users.resolve(userID).tag;
        msg.channel.send({ embed: {
          title: `${userTag}'s Warnings`,
          thumbnail: {
            url: client.user.avatarURL()
          },
          fields: warnList,
          timestamp: new Date()
        }})
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'warn')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      if(args.length < 2) {
        errorMessage(msg.channel, 'Usage: ' + prefix + 'warn <UserID>|<@User>');
        return;
      }
      let userID = args[1].replace('<@!', '').replace('<@', '').replace('>', '');
      if(!/^[0-9]*$/.test(userID)) return errorMessage(msg.channel, 'Invalid user provided!');
      if(!msg.guild.members.fetch().then(e => e.get(userID))) {
        errorMessage(msg.channel, 'User is not in this guild!');
        return;
      }
      let reason;
      if(args.length > 2) {
        var newArgs = args;
        newArgs.splice(0, 2);
        reason = newArgs.join(' ');
      }
      let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      let warnings = guildsettings.warnings;
      let warnUser = warnings.find(e => e.user === userID);
      if(client.users.resolve(userID).bot) return errorMessage(msg.channel, 'User is a bot!');
      if(!warnUser) {
        warnings[warnings.length] = {
          "user": userID,
          "warns": []
        }
        warnUser = warnings.find(e => e.user === userID);
      }
      let useReason = false;
      if(reason) useReason=true;
      warnUser.warns[warnUser.warns.length] = useReason ? reason : "No reason provided.";
      guildsettings.warnings = warnings;

      if(guildsettings.warnings.find(e => e.user === userID).warns.length == guildsettings.autokick) msg.guild.members.fetch().then(e => e.get(userID).kick('Auto kick by ' + client.user.tag) .catch(err => {}));
      if(guildsettings.warnings.find(e => e.user === userID).warns.length == guildsettings.autoban) msg.guild.members.fetch().then(e => e.get(userID).ban({reason: 'Auto ban by ' + client.user.tag}) .catch(err => {}));

      fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));

      successMessage(msg.channel, `Warned **${client.users.resolve(userID).tag}** (${userID}) with reason **${useReason ? reason : "No reason provided."}**!`);
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'delwarn')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      if(args.length < 3) {
        errorMessage(msg.channel, 'Usage: ' + prefix + 'delwarn <UserID>|<@User> <WarningID>');
        return;
      }
      let userID = args[1].replace('<@!', '').replace('<@', '').replace('>', '');
      if(!/[0-9]*$/.test(userID)) return errorMessage(msg.channel, 'Invalid user provided!');
      if(!/[0-9]*$/.test(args[2])) return errorMessage(msg.channel, 'Invalid warning ID!');
      let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      if(!guildsettings.warnings.find(e => e.user === userID)) return errorMessage(msg.channel, 'This user has no warnings!');
      let warnUser = guildsettings.warnings.find(e => e.user === userID);
      if(args[2] > 0 && args[2] <= warnUser.warns.length) {
        let warnID = args[2]-1;
        warnUser.warns.splice(warnID, 1);
        fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));
        successMessage(msg.channel, `Removed warning with ID **${warnID+1}** from **${client.users.resolve(userID).tag}** (${userID})!`);
      } else return errorMessage(msg.channel, 'Invalid warning ID!');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'autokick')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      if(args.length < 2) {
        successMessage(msg.channel, `Warnings until kick: **${guildsettings.autokick}**`);
        return;
      }
      if(!/^[0-9]*$/.test(args[1]) && args[1].toLowerCase() !== 'none') return errorMessage(msg.channel, 'Invalid number!')
      let autokick;
      if(args[1].toLowerCase() === 'none') {
        autokick = 0;
      } else autokick = parseInt(args[1]);
      if(autokick < 0) autokick = 0;
      if(autokick > 500) autokick = 500;
      guildsettings.autokick = autokick;
      fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));
      successMessage(msg.channel, `Set warnings until kick to **${autokick}**!`);
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'autoban')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      if(args.length < 2) {
        successMessage(msg.channel, `Warnings until ban: **${guildsettings.autoban}**`);
        return;
      }
      if(!/^[0-9]*$/.test(args[1]) && args[1].toLowerCase() !== 'none') return errorMessage(msg.channel, 'Invalid number!')
      let autoban;
      if(args[1].toLowerCase() === 'none') {
        autoban = 0;
      } else autoban = parseInt(args[1]);
      if(autoban < 0) autoban = 0;
      if(autoban > 500) autoban = 500;
      guildsettings.autoban = autoban;
      fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));
      successMessage(msg.channel, `Set warnings until ban to **${autoban}**!`);
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'store')) {
        if(JSON.parse(fs.readFileSync(filename)).store == null) {
            errorMessage(msg.channel, 'This server has no store');
        }
        else {
            msg.channel.send({ embed: {
                title: "Click Here to go to the server's store!",
                url: JSON.parse(fs.readFileSync(filename)).store,
                color: `0x${msg.guild.me.displayHexColor.substring(1)}`
            } });
        }
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'setstore')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      let args = msg.content.split(' ');
      if(args.length < 2) return errorMessage(msg.channel, 'Usage: ' + prefix + 'setstore <URL>');
      if(args[1].toLowerCase().startsWith('none')) {
        let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
        guildsettings.store = null;
        fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));
        successMessage(msg.channel, 'Server store reset!');
        return;
      }
      if(!validateURl(args[1])) return errorMessage(msg.channel, 'Invalid URL!');
      let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      guildsettings.store = args[1].startsWith('http' || 'https') ? args[1] : `http://${args[1]}`;
      fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));
      successMessage(msg.channel, 'Server store updated!');
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'rainbowrole')) {
      if(!botDevelopers.includes(msg.member.id)) {
        permissionDenied(msg.channel, "BOT_DEVELOPER");
        return;
      }
      if(msg.content.length < prefix.length+33) {
        errorMessage(msg.channel, 'Invalid usage! Use: ' + prefix + 'rainbowrole <ROLE>');
        return;
      }
      let guildData = JSON.parse(fs.readFileSync(filename));
      msg.guild.roles.cache.find(role => role.id === msg.content.substring(prefix.length+15, prefix.length+33)).setColor(msg.guild.roles.cache.find(role => role.id === msg.content.substring(prefix.length+15, prefix.length+33)).color)
      .then( () => {
          for( var i = 0; i < guildData.rainbowRoles; i++) {
              if(guildData.rainbowRoles[i] === msg.content.substring(prefix.length+15, prefix.length+33)) {
                  guildData.rainbowRoles.splice(i, 1);
                  fs.writeFileSync(filename, JSON.stringify(guildData, null, 2));
                  successMessage(msg.channel, 'Rainbow role disabled!');
                  return;
              }
          }
          guildData.rainbowRoles.push(msg.content.substring(prefix.length+15, prefix.length+33));
          successMessage(msg.channel, 'Enabled rainbow role for ' + msg.content.substring(prefix.length+12, prefix.length+33) + '>!');
          fs.writeFileSync(filename, JSON.stringify(guildData, null, 2));
      })
      .catch((err) => {
          if(err.message === "Missing Permissions") {
            errorMessage(msg.channel, 'Sorry, I don\'t have permission to do that!');
          } else {
            errorMessage(msg.channel, 'An error has occurred! Please try again later.');
          }
      });
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'purge')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      if(msg.content.length < prefix.length+7) {
        errorMessage(msg.channel, 'Usage: ' + prefix + 'purge <number>');
        return;
      }
      let args = msg.content.substring(prefix.length+6).split(' ');
      if(!/^[0-9]*$/.test(args[0])) {
        errorMessage(msg.channel, 'Amount must be a number!');
        return;
      }
      var purgeAmount = parseInt(args[0]);
      try {
        msg.channel.messages.fetch({limit: purgeAmount}) .then((messages) => {
          messages.forEach(m => m.delete() .catch(err => {}));
          successMessage(msg.channel, 'Successfully deleted ' + purgeAmount + ' messages!');
        }) .catch(err => { return errorMessage(msg.channel, `Error: ${err.message}`)});
      } catch (err) {
        errorMessage(msg.channel, 'An error has occurred! Please try again.');
      };
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'info')) {
      let developerServers = [];
      let goldServers = [];
      let silverServers = [];
      let bronzeServers = [];

      client.guilds.cache.forEach(g => {
        botDevelopers.forEach(dev => {
          let isDevGuild = true;
          g.members.fetch(dev) .catch(err => {
            if(err.message === 'Unknown Member') isDevGuild = false;
          })
          if(developerServers.includes(g.id)) return;
          if(isDevGuild) {
            developerServers[developerServers.length] = g.id;
          }
        });
        if(premiumAPI.guildIsGold(g.id) && !developerServers.includes(g.id)) {
          goldServers[goldServers.length] = g.id;
          return;
        }
        if(premiumAPI.guildIsSilver(g.id) && !developerServers.includes(g.id)) {
          silverServers[silverServers.length] = g.id;
          return;
        }
        if(premiumAPI.guildIsBronze(g.id) && !developerServers.includes(g.id)) {
          bronzeServers[bronzeServers.length] = g.id;
        }
      });
      msg.channel.send({embed: {
          title: "Vapor Stats",
          color: '0x' + msg.guild.me.displayHexColor.substring(1),
          author: {
              name: msg.author.tag,
              icon_url: msg.author.avatarURL()
          },
          thumbnail: {
              url: client.user.avatarURL()
          },
          fields: [
              {
                  name: "Guild Count: **" + client.guilds.cache.size + "**",
                  value: "*.*"
              },
              {
                  name: "Vapor Bronze (Free) Guild Count: **" + bronzeServers.length + "**",
                  value: "*.*"
              },
              {
                  name: "Vapor Silver Guild Count: **" + silverServers.length + "**",
                  value: "*.*"
              },
              {
                  name: "Vapor Gold Guild Count: **" + goldServers.length + "**",
                  value: "*.*"
              },
              {
                  name: "Vapor Developer Guild Count: **" + developerServers.length + "**",
                  value: "*.*"
              },
              {
                  name: "Developer Accounts: **" + botDevelopers.length + "**",
                  value: "*.*"
              },
              {
                  name: "This Guild's Type: **" + premiumAPI.getGuildType(msg.guild.id, client) + "**",
                  value: "*.*"
              }
          ],
          timestamp: new Date()
      }});
      msg.channel.send({embed: {
        title: "Need Help?",
            color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
            description: "Join our support server! [\[link\]](https://discord.gg/ptg4EC9eyA)",
            author: {
                name: msg.author.tag,
                icon_url: msg.author.avatarURL()
            },
            thumbnail: {
                url: client.user.avatarURL()
            },
            timestamp: new Date()
      }});
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'passwordprotect')) {
      /*if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          permissionDenied(msg.channel, "ADMINISTRATOR");
          return;
        }
      }
      msg.channel.send('Please enter the channel where you want to accept passwords:');
      msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 60000}) .then(collected => {
        msg.channel.send(collected.first().content);
      }) .catch(() => {
        msg.channel.send('Operation timed out.');
      });*/
      errorMessage(msg.channel, 'This concept is too in-production to even have a developer version. Please check back later.');
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'dev')) {
      if(!botDevelopers.includes(msg.member.id)) {
        return;
      }
      if(msg.content.length < prefix.length+5) {
        msg.channel.send('Usage: ' + prefix + 'dev <argument>');
        return;
      }
      let args = msg.content.toLowerCase().substring(prefix.length+4).split(' ');
      switch(args[0]) {
        case 'guildsettings':
          msg.channel.send('```json\n' + fs.readFileSync(filename) + '```');
          break;
        case 'add':
          if(args.length > 1) {
            if(/^[0-9]*$/.test(args[1])) {
              botDevelopers.push(args[1]);
              let botSettings = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH));
              if(botSettings.botDevelopers.includes(args[1])) {
                msg.channel.send('User is already a bot developer!');
                return;
              }
              botSettings.botDevelopers = botDevelopers;
              fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(botSettings,null,2));
              msg.channel.send('Added user as bot developer!');
              let userID = args[1];
              developerEmitter.emit('devAdded', userID);
            } else if(/^\<\@/.test(args[1])) {
              let userId;
              if(args[1].substring(2).startsWith('!')) {
                userId = args[1].substring(3, args[1].length-1);
              } else { userId = args[1].substring(2, args[1].length-1); }
              botDevelopers.push(userId);
              let botSettings = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH));
              if(botSettings.botDevelopers.includes(userId)) {
                msg.channel.send('User is already a bot developer!');
                return;
              }
              botSettings.botDevelopers = botDevelopers;
              fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(botSettings,null,2));
              msg.channel.send('Added user as bot developer!');
              developerEmitter.emit('devAdded', userId);
            } else {
              msg.channel.send('Usage: ' + prefix + 'dev add <UserID>|<UserMention>');
            }
          }
          else {
            msg.channel.send('Usage: ' + prefix + 'dev add <UserID>|<UserMention>');
          }
          break;
        case 'remove':
          if(args.length > 1) {
            if(args[1] == '740167253491843094' || args[1].substring(2,args[1].length-1) == '740167253491843094') {
              msg.channel.send('You can\'t remove developer permissions from the owner of the bot!');
              return;
            }
            if(/^[0-9]*$/.test(args[1])) {
              let botSettings = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH));
              if(!botSettings.botDevelopers.includes(args[1])) {
                msg.channel.send('User is not a bot developer!');
                return;
              }
              for(var i = 0; i < botSettings.botDevelopers.length; i++) {
                if(botSettings.botDevelopers[i] == args[1]) {
                  botSettings.botDevelopers.splice(i, 1);
                  fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(botSettings, null, 2));
                  msg.channel.send('Removed user from bot developers!');
                  developerEmitter.emit('devRemoved', args[1]);
                  return;
                }
              }
            } else if(/^\<\@/.test(args[1])) {
              let userId;
              if(args[1].startsWith('!')) {
                userId = args[1].substring(3, args[1].length-1);
              } else { userId = args[1].substring(3, args[1].length-1); }
              let botSettings = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH));
              if(!botSettings.botDevelopers.includes(userId)) {
                msg.channel.send('User is not a bot devleoper!');
                return;
              }
              for(var i = 0; i < botSettings.botDevelopers.length; i++) {
                if(botSettings.botDevelopers[i] == userId) {
                  botSettings.botDevelopers.splice(i, 1);
                  fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(botSettings, null, 2));
                  msg.channel.send('Removed user from bot developers!');
                  developerEmitter.emit('devRemoved', userId);
                  return;
                }
              }
            }
            else {
              msg.channel.send('Usage: ' + prefix + 'dev remove <UserID>|<UserMention>');
            }
          }
          else {
            msg.channel.send('Usage: ' + prefix + 'dev remove <UserID>|<UserMention>');
          }
          break;
        case 'list':
          let message = 'Bot developers:\n';
          for(var i = 0; i < botDevelopers.length; i++) {
            message += '<@' + botDevelopers[i] + '> | ID: ' + botDevelopers[i] + '\n';
          }
          msg.channel.send(message);
          break;
        case 'updatechannel':
          updateAPI.setUpdateChannel(msg.channel.id, msg.guild.id);
          msg.channel.send('This channel will now receive update logs!');
          break;
        case 'role':
          if(args.length < 2) return msg.channel.send('Usage: ' + prefix + 'dev role <RoleID>|<RoleMention>');
          let guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
          let role = args[1].replace('<&', '').replace('>', '');
          if(role === 'none') {
            let devrole = guildsettings.devRole;
            guildsettings.devRole = null;
            fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));
            developerEmitter.emit('devRoleRemoved', msg.guild.id, devrole);
            return;
          }
          let roleIsValid = (msg.guild.roles.cache.get(role));

          if(!roleIsValid) return msg.channel.send('Invalid Role!');
          let oldRole = guildsettings.devRole;
          guildsettings.devRole = role;
          fs.writeFileSync(`${msg.guild.id}.json`, JSON.stringify(guildsettings, null, 2));
          msg.channel.send(`Set developer role to **${msg.guild.roles.cache.get(role).name}**!`);
          developerEmitter.emit('devRoleUpdated', msg.guild.id, role, oldRole);
          break;
        case 'help':
          msg.channel.send({ embed: {
              title: "Vapor Developer Options",
              color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
              author: {
                  name: msg.author.tag,
                  icon_url: msg.author.avatarURL()
              },
              thumbnail: {
                  url: client.user.avatarURL()
              },
              fields: [
                  {
                      name: prefix + "dev help",
                      value: "Displays this message."
                  },
                  {
                      name: prefix + "dev list",
                      value: "Lists developer accounts."
                  },
                  {
                      name: prefix + "dev add",
                      value: "Adds a developer account."
                  },
                  {
                      name: prefix + "dev remove",
                      value: "Removes a developer account."
                  },
                  {
                      name: prefix + "dev guildsettings",
                      value: "Displays the guild's settings."
                  },
                  {
                      name: prefix + "rainbowrole",
                      value: "Toggles rainbow roles."
                  }
              ],
              timestamp: new Date()
          }});
          break;
        default:
          msg.channel.send('Usage: ' + prefix + 'dev <argument>');
          break;
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'play')) {
      //errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
      var guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      let args = msg.content.split(' ');
      let query;
      if(args.length < 2) return msg.channel.send('Usage: ' + prefix + 'play <SearchText>');
      let newArgs = args;
      newArgs.splice(0, 1);
      query = newArgs.join(' ');
      if(!msg.guild.me.voice.connection) {
        if(!msg.member.voice.channel) return msg.channel.send('You are not in a voice channel!');
        msg.member.voice.channel.join() .then(c => {
        });
      }
      musicBotAPI.play(msg.guild.me.voice.connection, query);
      //if(msg.guild.me.voice.connection) musicBotAPI.play(query, msg.guild.me.voice.connection);
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'stop')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'pause')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'skip')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'queue')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'add')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'remove')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'disconnect') || msg.content.toLowerCase().startsWith(prefix + 'dc')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'join')) {
      errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
    }
});

developerEmitter.on('devRemoved', (userID) => {
  client.guilds.cache.forEach(g => {
    let userResolvable = g.members.fetch(userID) .catch(err => {});
    let guildsettings = JSON.parse(fs.readFileSync(`${g.id}.json`));
    if(userResolvable && guildsettings.devRole) {
      userResolvable.then(user => {
        user.roles.remove(guildsettings.devRole, "Vapor Developer automatical removal.");
      });
    }
  });
});

developerEmitter.on('devAdded', (userID) => {
  client.guilds.cache.forEach(g => {
    let userResolvable = g.members.fetch(userID) .catch(err => {});
    let guildsettings = JSON.parse(fs.readFileSync(`${g.id}.json`));
    if(userResolvable && guildsettings.devRole) {
      userResolvable.then(user => {
        user.roles.add(guildsettings.devRole, "Vapor Developer automatical grant.");
      });
    }
  });
});

developerEmitter.on('devRoleUpdated', (guildID, role, oldRole) => {
  let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
  client.guilds.fetch(guildID).then(guild => {
    if(oldRole) {
      botDevelopers.forEach(dev => {
        guild.members.fetch(dev) .then(user => {
          user.roles.remove(oldRole) .catch(err => {});
          user.roles.add(role, "Vapor Developer automatical grant.") .catch(err => {});
        }) .catch(err => {});
      });
    } else {
      botDevelopers.forEach(dev => {
        guild.members.fetch(dev) .then(user => {
          user.roles.add(role, "Vapor Developer automatical grant.") .catch(err => {});
        }) .catch(err => {});
      });
    }
  }) .catch(err => {});
});

developerEmitter.on('devRoleRemoved', (guildID, devRoleID) => {
  let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
  client.guilds.fetch(guildID) .then(guild => {
    botDevelopers.forEach(dev => {
      guild.members.fetch(dev) .then(member => {
        member.roles.remove(devRoleID) .catch(err => {});
      }) .catch(err => {});
    });
  }) .catch(err => {});
});

function permissionDenied(channel, permission) {
  channel.send({embed: {
    title: "You need **" + permission + "** to perform this action.",
    color: "0xFF0000"
  }})
}

function successMessage(channel, message) {
  channel.send({embed: {
    title: message,
    color: "0x00FF00"
  }})
}

function errorMessage(channel, message) {
  channel.send({embed: {
    title: message,
    color: "0xFF0000"
  }}) .catch(err => {
    checkError(err.message, channel);
  })
}

function checkError(errMsg, channel) {
  if(errMsg === 'Missing Permissions') {
    if(channel.type === 'text') console.log(`\x1b[31m[Error] \x1b[0mGuild \x1b[31m${channel.guild.name} \x1b[0mChannel \x1b[31m\#${channel.name}\x1b[0m: Missing Text Permissions.`);
    else if(channel.type === 'voice') if(channel.type === 'text') console.log(`\x1b[31m[Error] \x1b[0mGuild \x1b[31m${channel.guild.name} \x1b[0mChannel \x1b[31m[VC] ${channel.name}\x1b[0m: Missing Voice Permissions.`);
  }
}

if (BOT_CHANNEL == 0) {
    client.login(JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).betaToken);
} else if (BOT_CHANNEL == 1) {
    client.login(JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).token);
}
