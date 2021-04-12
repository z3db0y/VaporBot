'use strict';

const updateAPI = require('./updateAPI');
let botChannels = { "BETA":0, "STABLE":1 };
let musicBotTmeouts = {};

const BOT_CHANNEL = botChannels.STABLE;

require('dotenv').config();
const Discord = require('discord.js');
const intents = require('discord.js').Intents;
const client = new Discord.Client({intents:
  [ intents.FLAGS.DIRECT_MESSAGES,
    intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    intents.FLAGS.DIRECT_MESSAGE_TYPING,
    intents.FLAGS.GUILDS,
    intents.FLAGS.GUILD_BANS,
    intents.FLAGS.GUILD_EMOJIS,
    intents.FLAGS.GUILD_INTEGRATIONS,
    intents.FLAGS.GUILD_INVITES,
    intents.FLAGS.GUILD_MEMBERS,
    intents.FLAGS.GUILD_MESSAGES,
    intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    intents.FLAGS.GUILD_MESSAGE_TYPING,
    intents.FLAGS.GUILD_VOICE_STATES,
    intents.FLAGS.GUILD_WEBHOOKS
  ]});
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
const az = require('azlyrics-scraper');
const roundToNearest5 = x => Math.round(x/5)*5

function getGuildSettings(guildID) {
  return JSON.parse(fs.readFileSync(`${guildID}.json`));
}

function setGuildSettings(guildID, settings) {
  fs.writeFileSync(`${guildID}.json`, JSON.stringify(settings, null, 2));
  return true;
}

class MusicBot {

  play(c, query, reset) {
    let guildsettings = getGuildSettings(c.guild.id);
    if(reset) this.resetQueue(c.guild.id);
    if(query.includes('youtube.com')) {
      let url;
      try {
        url = new URL(query);
      }
      catch (_) {
        try {
          url = new URL(`https://${query}`);
        } catch (_) {}
      }
      if(url) {
        if(url.searchParams.has('v')) {
          let ytURL = 'https://youtube.com/watch?v=' + url.searchParams.get('v');
          ytdl.getInfo(ytURL).then(video => {
            this.add(c, ytURL, video.videoDetails.title);
            if(guildsettings.nowPlaying === null) this.recursivePlay(c);
          }) .catch(err => {
            return errorMessage(c, 'Unable to play song.');
          });
        } else return errorMessage(c, 'Invalid YouTube URL!');
      }
      else return errorMessage(c, 'Invalid YouTube URL!');
    } else {
      this.searchYoutube(query).then(res => {
        this.add(c, res.url, res.title);
        if(guildsettings.nowPlaying === null) this.recursivePlay(c);
      }) .catch(err => {
        return errorMessage(c, 'Nothing found.');
      });
    }
  }

  stop(c) {
    if(c.guild.me.voice.connection.dispatcher) {
      let guildSettings = getGuildSettings(c.guild.id);
      guildSettings.musicQueue = [];
      guildSettings.nowPlaying = null;
      guildSettings.loopType = null;
      setGuildSettings(c.guild.id, guildSettings);
      c.guild.me.voice.connection.dispatcher.end()
      return true;
    }
    else return false;
  }

  pause(c) {
    if(c.dispatcher) {
      if(c.dispatcher.paused) c.dispatcher.resume()
      else c.dispatcher.pause()
      return true;
    } else return false;
  }

  add(c, url, title) {
    let guildsettings = getGuildSettings(c.guild.id);
    if(guildsettings.musicQueue) guildsettings.musicQueue.push({"url": url, "title": title});
    else errorMessage(c, 'Failed to add to queue.');
    setGuildSettings(c.guild.id, guildsettings);
    return successMessage(c, `Added **${title}** to the queue!`);
  }

  async searchYoutube(query) {
    let results = await ytsearch({query: query});
    return results.videos[0];
  }

  recursivePlay(c) {
    clearTimeout(musicBotTmeouts[c.guild.id]);
    musicBotTmeouts[c.guild.id] = null;
    let guildsettings = getGuildSettings(c.guild.id);
    if(guildsettings.musicQueue != null) {
      if(guildsettings.nowPlaying == null) {
        if(guildsettings.lastPlayed == null) guildsettings.nowPlaying = 0;
        else guildsettings.nowPlaying = guildsettings.lastPlayed + 1;
        setGuildSettings(c.guild.id, guildsettings);
      }
      if(guildsettings.musicQueue.length > guildsettings.nowPlaying) c.guild.me.voice.connection.play(ytdl(guildsettings.musicQueue[guildsettings.nowPlaying].url, {filter: 'audioonly'})) .on('finish', () => {
        guildsettings = getGuildSettings(c.guild.id);
        if(!guildsettings.twentyFourSeven && c.guild.me.voice.channel.members.size < 2) {
          try { c.guild.me.voice.connection.disconnect(); }
          catch (err) {}
          return errorMessage(c, 'I have left your channel because of inactivity! Type ' + guildsettings.prefix + '24/7 to get rid of this.');
        }
        if(guildsettings.loopType == 'song') {
          guildsettings.lastPlayed = guildsettings.nowPlaying -1;
        }
        else guildsettings.lastPlayed = guildsettings.nowPlaying;
        guildsettings.nowPlaying = null;
        setGuildSettings(c.guild.id, guildsettings);
        this.recursivePlay(c);
      });
      else {
        guildsettings = getGuildSettings(c.guild.id);
        if(guildsettings.loopType === 'queue') {
          guildsettings.lastPlayed = null;
          guildsettings.nowPlaying = 0;
          setGuildSettings(c.guild.id, guildsettings);
          if(guildsettings.musicQueue) this.recursivePlay(c);
        } else {
          guildsettings.lastPlayed = guildsettings.musicQueue.length-1
          guildsettings.nowPlaying = null;
          musicBotTmeouts[c.guild.id] = setTimeout(() => {
            if(getGuildSettings(c.guild.id).twentyFourSeven) return musicBotTmeouts[c.guild.id] = null;
            try { c.guild.me.voice.connection.disconnect(); }
            catch (err) {}
            errorMessage(c, 'I have left your channel because of inactivity! Type ' + guildsettings.prefix + '24/7 to get rid of this.');
          }, 10 * 60 * 1000);
        }
        setGuildSettings(c.guild.id, guildsettings);
      }
    }
  }

  remove(c, i) {
    let guildsettings = getGuildSettings(c.channel.guild.id);
    if(guildsettings.musicQueue) {
      if(guildsettings.musicQueue.length > i) {
        guildsettings.musicQueue.splice(i, 1);
        setGuildSettings(c.channel.guild.id, guildsettings);
        return true;
      } else return false
    } else return false
  }

  resetQueue(guildID) {
    let guildsettings = getGuildSettings(guildID);
    guildsettings.musicQueue = [];
    guildsettings.nowPlaying = null;
    guildsettings.lastPlayed = null;
    setGuildSettings(guildID, guildsettings);
  }

  fetchQueue(guildID) {
    let guildsettings = getGuildSettings(guildID);
    return guildsettings.musicQueue;
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
      client.user.setPresence({activity: {type: "PLAYING", name: "Vapor Beta | Buggy and mostly offline"}, status: 'idle', afk: false});
      console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mBETA\x1b[0m)!');
    }
    else if (BOT_CHANNEL == 1) {
      client.user.setPresence({activity: {type: "STREAMING", name: "Vapor | v!help", url: "https://twitch.tv/z3db0y"}, status: "online", afk: false});
      console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mSTABLE\x1b[0m)!');
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

client.on('guildMemberRemove', (u) => {

});

client.on('message', async (msg) => {
    if(!msg.guild) return;
    let filename = msg.guild.id.toString() + ".json";
    let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
    if(!fs.existsSync(filename)) {
        guildAPI.repairFiles(msg.guild);
    }
    let prefix = JSON.parse(fs.readFileSync(filename)).prefix.toLowerCase();
    if(!msg.content.toLowerCase().startsWith(prefix)) {
        return;
    }
    if(msg.content.toLowerCase().startsWith(prefix + 'help')) {
        console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}help\x1b[0m.`);
        let args = msg.content.toLowerCase().split(' ');
        if(args.length < 2) {
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
                    name: prefix + "help moderation",
                    value: "Shows moderation commands."
                },
                {
                    name: prefix + "help music",
                    value: "Shows music commands."
                },
                {
                    name: prefix + "help misc",
                    value: "Shows other commands not listed in any category."
                }
            ],
            timestamp: new Date()
        } }) .catch(err => checkError(err.message, msg.channel));
        } else {
          switch(args[1]) {
            case 'moderation':
              msg.channel.send({ embed: {
                title: "Vapor Help (Moderation)",
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
                      value: "Ban a user."
                  },
                  {
                      name: prefix + "kick",
                      value: "Kick a user."
                  },
                  {
                      name: prefix + "warns | " + prefix + "warnings",
                      value: "Shows a user's warnings."
                  },
                  {
                      name: prefix + "warn",
                      value: "Warn a user."
                  },
                  {
                      name: prefix + "autokick",
                      value: "Set the warnings until a user is kicked."
                  },
                  {
                      name: prefix + "autoban",
                      value: "Set the warnings until a user is banned."
                  },
                  {
                      name: prefix + "purge",
                      value: "Delete amout of messages specified."
                  },
                  {
                      name: prefix + "setstore",
                      value: "Sets the store of the server. It can be viewed by executing the store command."
                  },
                  {
                      name: prefix + "setprefix",
                      value: "Update the bot's prefix."
                  }
                ],
                timestamp: new Date()
              } }) .catch(err => checkError(err.message, msg.channel));
              break;
            case 'music':
              msg.channel.send({ embed: {
                title: "Vapor Help (Music)",
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
                      name: prefix + "play | " + prefix + "p",
                      value: "Play a song in your voice channel."
                  },
                  {
                      name: prefix + "nowplaying | " + prefix + "np",
                      value: "Display currently playing song."
                  },
                  {
                      name: prefix + "loop",
                      value: "Change loop type."
                  },
                  {
                      name: prefix + "pause",
                      value: "Pause current song."
                  },
                  {
                      name: prefix + "stop",
                      value: "Stop current song."
                  },
                  {
                      name: prefix + "queue | " + prefix + "q",
                      value: "Display song queue."
                  },
                  {
                      name: prefix + "add",
                      value: "Add a song to the queue."
                  },
                  {
                      name: prefix + "remove",
                      value: "Remove a song from the queue."
                  },
                  {
                      name: prefix + "join",
                      value: "Make bot join your voice channel."
                  },
                  {
                      name: prefix + "24/7",
                      value: "Make bot stay in voice channel without inactivity timeout."
                  },
                  {
                      name: prefix + "lyrics",
                      value: "Show lyrics of a song."
                  }
                ],
                timestamp: new Date()
              } }) .catch(err => checkError(err.message, msg.channel));
              break;
            case 'misc':
              msg.channel.send({ embed: {
                title: "Vapor Help (Misc)",
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
                      name: prefix + "store",
                      value: "Go to the server's store. (See setstore command.)"
                  },
                  {
                      name: prefix + "invite",
                      value: "Invite the bot to your server."
                  }
                ],
                timestamp: new Date()
              } }) .catch(err => checkError(err.message, msg.channel));
              break;
            default:
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
                        name: prefix + "help moderation",
                        value: "Shows moderation commands."
                    },
                    {
                        name: prefix + "help music",
                        value: "Shows music commands."
                    },
                    {
                        name: prefix + "help misc",
                        value: "Shows other commands not listed in any category."
                    }
                ],
                timestamp: new Date()
              } }) .catch(err => checkError(err.message, msg.channel));
              break;
          }
        }
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
      let formattedMessage = "";
      if(msg.author.id == "740167253491843094") {
          client.guilds.cache.forEach((guild) => {
              guildAPI.updateConfig(guild);
              formattedMessage += '- ' + guild.name + '\n';
          });
          successMessage(msg.channel, 'You have updated: \n```' + formattedMessage + '```');
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'setprefix')) {
        if(msg.member.hasPermission('ADMINISTRATOR') || botDevelopers.includes(msg.member.id)) {
            console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}setprefix\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}ban\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}unban\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}kick\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}warnings\x1b[0m.`);
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
        let userTag;
        msg.guild.members.fetch(userID) .then(user => {
          userTag = user.user.tag;
        }) .catch(err => {});
        msg.channel.send({ embed: {
          title: `${userTag ? userTag : userID}'s Warnings`,
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}warn\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}delwarn\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}autokick\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}autoban\x1b[0m.`);
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
            console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}store\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}setstore\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}rainbowrole\x1b[0m.`);
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
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}purge\x1b[0m.`);
      let args = msg.content.toLowerCase().split(' ');
      if(isNaN(parseInt(args[1]))) return errorMessage(msg.channel, 'Invalid number specified.');
      if(parseInt(args[1]) > 100) return errorMessage(msg.channel, 'Number must be less than or equal to 100.');
      
      msg.channel.bulkDelete(parseInt(args[1])) .then(m => {
        successMessage(msg.channel, `Successfully deleted ${args[1]} messages!`);
      }) .catch(err => errorMessage(msg.channel, 'ERROR: ' + err));
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'info')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}info\x1b[0m.`);
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
      // console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}passwordprotect\x1b[0m.`);
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
    else if(msg.content.toLowerCase().startsWith(prefix + 'stop')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}stop\x1b[0m.`);
      //errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
      if(msg.guild.me.voice.channel) if(msg.member.voice.channel.id == msg.guild.me.voice.channel.id) {
        if(msg.guild.me.voice.connection) {
          let stopSong = musicBotAPI.stop(msg.channel);
          if(stopSong) successMessage(msg.channel, 'Successfully stopped the playback!');
        }
        else errorMessage(msg.channel, 'Nothing to stop!');
      } else errorMessage(msg.channel, 'You are not in the bot\'s voice channel!');
      else errorMessage(msg.channel, 'You are not in the bot\'s voice channel!');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'pause')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}pause\x1b[0m.`);
      if(!msg.guild.me.voice.channel) return errorMessage(msg.channel, 'I am not in a voice channel!');
      if(!msg.guild.me.voice.connection.dispatcher) return errorMessage(msg.channel, 'Nothing playing!');
      if(msg.guild.me.voice.channel) if(msg.member.voice.channel.id == msg.guild.me.voice.channel.id) {
        if(msg.guild.me.voice.connection.dispatcher) musicBotAPI.pause(msg.guild.me.voice.connection);
        else errorMessage(msg.channel, 'Nothing to pause!');
        if(msg.guild.me.voice.connection.dispatcher.paused) successMessage(msg.channel, 'Paused playback.');
        else successMessage(msg.channel, 'Resumed playback.');
      } else errorMessage(msg.channel, 'You are not in the my voice channel!');
      else errorMessage(msg.channel, 'You are not in the my voice channel!');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'skip')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}skip\x1b[0m.`);
      if(!msg.guild.me.voice.channelID) {
        return errorMessage(msg.channel, 'I am not in a voice channel!');
      }
      if(!msg.member.voice.channelID) {
        return errorMessage(msg.channel, 'You are not in my voice channel!');
      }
      if(msg.member.voice.channelID !== msg.guild.me.voice.channelID) {
        return errorMessage(msg.channel, 'You are not in my voice channel!');
      }
      if(!msg.guild.me.voice.connection.dispatcher) return errorMessage(msg.channel, 'I am not playing anything!');
      msg.guild.me.voice.connection.dispatcher.end();
      successMessage(msg.channel, 'Skipped track!');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'add')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}add\x1b[0m.`);
      //errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
      var guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      let args = msg.content.split(' ');
      let query;
      if(args.length < 2) {
        if(!msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'Usage: ' + prefix + 'add <Query>');
        if(!msg.member.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
        if(msg.member.voice.channelID !== msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
        if(!msg.guild.me.voice.connection) return errorMessage(msg.channel, 'An unknown error occured. If the bot is in a voice channel, please disconnect it using admin and try again.');
      }
      let newArgs = args;
      newArgs.splice(0, 1);
      query = newArgs.join(' ');
      if(!msg.guild.me.voice.connection) {
        if(!msg.member.voice.channel) return errorMessage('You are not in a voice channel!');
        msg.member.voice.channel.join() .then(c => {
          c.voice.setSelfDeaf(true);
          let guildsettings = getGuildSettings(msg.guild.id);
          guildsettings.loopType = null;
          setGuildSettings(msg.guild.id, guildsettings);
          c.on('disconnect', () => {
            musicBotAPI.resetQueue(msg.guild.id);
          })
        }) .catch(err => errorMessage(msg.channel, "ERROR: " + err));
      } else {
        if(msg.member.voice.channelID !== msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
      }
      musicBotAPI.play(msg.channel, query, false);
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'remove')) {
      //errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}remove\x1b[0m.`);
      if(!msg.guild.me.voice.channel) return errorMessage(msg.channel, 'I am not in a voice channel!');
      if(!msg.member.voice.channel) return errorMessage(msg.channel, 'You are not in my voice channel!');
      if(msg.member.voice.channelID !== msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
      let args = msg.content.split(' ');
      if(args.length < 2) return errorMessage(msg.channel, 'Invalid song ID!');
      if(isNaN(parseInt(args[1]-1))) return errorMessage(msg.channel, 'Invalid song ID!');
      if(parseInt(args[1]-1) <= -1) return errorMessage(msg.channel, 'Invalid song ID!');
      let remove = musicBotAPI.remove(msg.guild.me.voice.connection, parseInt(args[1]-1));
      if(remove) successMessage(msg.channel, 'Removed song **' + args[1] + '** from the queue!');
      else errorMessage(msg.channel, 'Invalid song ID!');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'disconnect') || msg.content.toLowerCase().startsWith(prefix + 'dc')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}disconnect\x1b[0m.`);
      //errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
      if(!msg.guild.me.voice.channel) return errorMessage(msg.channel, 'I am not in a voice channel!');
      if(!msg.member.voice.channel) return errorMessage(msg.channel, 'You are not in a voice channel!');
      if(msg.member.voice.channelID !== msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'I am not in your voice channel!');
      musicBotAPI.resetQueue(msg.guild.id);
      msg.guild.voice.channel.leave();
      successMessage(msg.channel, 'I left your voice channel!');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'join')) {
      //errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}join\x1b[0m.`);
      if(msg.guild.me.voice.channel) return errorMessage(msg.channel, 'I\'m already in a voice channel!');
      if(!msg.member.voice.channel) return errorMessage(msg.channel, 'You are not in a voice channel!');
      msg.member.voice.channel.join() .then(c => {
        
        let guildsettings = getGuildSettings(msg.guild.id);
        guildsettings.loopType = null;
        setGuildSettings(msg.guild.id, guildsettings);
        c.on('disconnect', () => {
          c.voice.setSelfDeaf(true);
          musicBotAPI.resetQueue(msg.guild.id);
        });
      }) .catch(err => errorMessage(msg.channel, "ERROR: " + err));
      successMessage(msg.channel, 'Joined your voice channel!');
      musicBotTmeouts[msg.guild.id] = setTimeout(() => {
        if(getGuildSettings(msg.guild.id).twentyFourSeven) return musicBotTmeouts[msg.guild.id] = null;
        try { msg.guild.me.voice.connection.disconnect(); }
        catch (err) {}
        errorMessage(c, 'I have left your channel because of inactivity! Type ' + prefix + '24/7 to get rid of this.');
      }, 10 * 60 * 1000);
    }
    else if(msg.content.toLowerCase().startsWith(prefix + '24/7')) {
      let allowedTypes = ['Silver', 'Gold', 'Developer'];
      if(!allowedTypes.includes(premiumAPI.getGuildType(msg.guild.id, client))) return errorMessage(msg.channel, 'You need *Vapor Silver* or *Vapor Gold* to use this feature!');
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}24/7\x1b[0m.`);
      if(msg.guild.me.voice.channelID !== msg.member.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
      let args = msg.content.toLowerCase().split(' ');
      var guildsettings = getGuildSettings(msg.guild.id);
      if(args.length == 1) {
        if(guildsettings.twentyFourSeven) {
          guildsettings.twentyFourSeven = 0;
          setGuildSettings(msg.guild.id, guildsettings);
          successMessage(msg.channel, '24/7 is now OFF.');
        } else {
          guildsettings.twentyFourSeven = 1;
          setGuildSettings(msg.guild.id, guildsettings);
          successMessage(msg.channel, '24/7 is now ON.');
        }
      } else {
        switch(args[1]) {
          case 'on':
          case 'yes':
            guildsettings.twentyFourSeven = 1;
            setGuildSettings(msg.guild.id, guildsettings);
            successMessage(msg.channel, '24/7 is now ON.');
            break;
          case 'off':
          case 'no':
            guildsettings.twentyFourSeven = 0;
            setGuildSettings(msg.guild.id, guildsettings);
            successMessage(msg.channel, '24/7 is now OFF.');
            break;
          default:
            if(guildsettings.twentyFourSeven) {
              guildsettings.twentyFourSeven = 0;
              setGuildSettings(msg.guild.id, guildsettings);
              successMessage(msg.channel, '24/7 is now OFF.');
            } else {
              guildsettings.twentyFourSeven = 1;
              setGuildSettings(msg.guild.id, guildsettings);
              successMessage(msg.channel, '24/7 is now ON.');
            }
            break
        }
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'loop')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}loop\x1b[0m.`);
      if(msg.guild.me.voice.channelID !== msg.member.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
      let args = msg.content.toLowerCase().split(' ');
      let guildsettings = getGuildSettings(msg.guild.id);
      if(args.length == 1) {
        switch(guildsettings.loopType) {
          case null:
            guildsettings.loopType = 'song';
            break;
          case 'song':
            guildsettings.loopType = 'queue';
            break;
          case 'queue':
            guildsettings.loopType = null;
            break;
        }
        setGuildSettings(msg.guild.id, guildsettings);
        successMessage(msg.channel, `Set loop to ${guildsettings.loopType ? guildsettings.loopType.toUpperCase() : 'NONE'}.`);
      } else {
        switch(args[1]) {
          case 'none':
            guildsettings.loopType = null;
            break;
          case 'song':
            guildsettings.loopType = 'song';
            break;
          case 'queue':
            guildsettings.loopType = 'queue';
            break;
        }
        setGuildSettings(msg.guild.id, guildsettings);
        successMessage(msg.channel, `Set loop to ${guildsettings.loopType ? guildsettings.loopType.toUpperCase() : 'NONE'}.`);
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'invite')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}invite\x1b[0m.`);
      msg.channel.send( { embed: {
        title: "Invite Vapor",
        color: "0x" + msg.guild.me.displayHexColor.substring(1),
        author: {
            name: msg.author.tag,
            icon_url: msg.author.avatarURL()
        },
        thumbnail: {
            url: client.user.avatarURL()
        },
        description: "[Click Here](http://discord.com/oauth2/authorize?client_id=" + client.user.id + "&scope=bot&permissions=8) to invite Vapor to your server."
      } } );
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'lyrics')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix + 'lyrics'}\x1b[0m.`);
      let args = msg.content.split(' ');
      if(args.length < 2) return errorMessage(msg.channel, 'Usage: ' + prefix + 'lyrics <Query>');
      else {
        args.shift();
        let query = args.join(' ');
        az.getLyric(query.charAt(0).toUpperCase() + query.substring(1)).then(ly => {
          if(ly.join(' ').length < 2048) {
            msg.channel.send({ embed: {
              title: "Lyrics:",
              color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
              author: {
                name: msg.author.tag,
                icon_url: msg.author.avatarURL()
              },
              thumbnail: {
                url: client.user.avatarURL()
              },
              description: ly.join('\n')
            } });
          } else {
            let lyrics = splitText(ly.join('\n'), 2048);
            msg.channel.send({ embed: {
              title: "Lyrics:",
              color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
              author: {
                  name: msg.author.tag,
                  icon_url: msg.author.avatarURL()
              },
              thumbnail: {
                  url: client.user.avatarURL()
              },
              description: lyrics[0]
            } });
            lyrics.shift();
            for(var i=0; i < lyrics.length; i++) {
              if(lyrics.length -1 == i) {
                msg.channel.send({ embed: {
                  color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
                  footer: {
                    icon_url: msg.author.avatarURL(),
                    text: "Requested by " + msg.author.tag
                  },
                  description: lyrics[i]
                } });
              } else {
                msg.channel.send({ embed: {
                  color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
                  description: lyrics[i]
                } });
              }
            }
          }
        }) .catch(err => { errorMessage(msg.channel, 'Nothing found.'); });
      } 
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'ping')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix + 'ping'}\x1b[0m.`);
      msg.channel.send({ embed: {
        title: ":ping_pong: Bot Latency",
        color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
        description: `${Date.now() - msg.createdTimestamp} ms`,
        fields: [
          {
              name: "API Latency:",
              value: Math.round(client.ws.ping) + " ms"
          }
        ]
      } })
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'nowplaying') || msg.content.toLowerCase().startsWith(prefix + 'np')) {
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix + 'nowplaying'}\x1b[0m.`);
      if(!msg.guild.me.voice.connection) return errorMessage(msg.channel, 'I am not playing anything!');
      if(!msg.guild.me.voice.connection.dispatcher) return errorMessage(msg.channel, 'I am not playing anything!');
      let guildsettings = getGuildSettings(msg.guild.id);
      let playTime = Math.round(msg.guild.me.voice.connection.dispatcher.totalStreamTime /1000);
      ytdl.getInfo(guildsettings.musicQueue[guildsettings.nowPlaying].url) .then(vid => {
        let videoLength = vid.videoDetails.lengthSeconds;
        let guiMsg = "";
        let percent = roundToNearest5(playTime/videoLength*100);
        for(let i=0; i < 20; i++) {
          let frag = percent/100*20;
          if(frag == i) {
            guiMsg += ":small_blue_diamond:";
          } else {
            guiMsg += "=";
          }
        }
        let timings = [
          {
            s: Math.floor(playTime/60/60 % 1 *60 % 1 *60),
            m: Math.floor(playTime/60/60 % 1 * 60),
            h: Math.floor(playTime/60/60)
          },
          {
            s: Math.floor(videoLength/60/60 % 1 *60 % 1 *60),
            m: Math.floor(videoLength/60/60 % 1 *60),
            h: Math.floor(videoLength/60/60)
          }
        ];
        msg.channel.send({ embed: {
          title: "Now Playing:",
          description: "[" + guildsettings.musicQueue[guildsettings.nowPlaying].title + "](" + guildsettings.musicQueue[guildsettings.nowPlaying].url + ")",
          fields: [
            {
                name: `${timings[0].h ? timings[0].h + ":" : ""}${timings[0].h && timings[0].m < 10 ? "0"+timings[0].m : timings[0].m}:${timings[0].s < 10 ? "0"+timings[0].s : timings[0].s} | ${timings[1].h ? timings[1].h + ":" : ""}${timings[1].h && timings[1].m < 10 ? "0"+timings[1].m : timings[1].m}:${timings[1].s}`,
                value: guiMsg
            }
          ],
          color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
          footer: {
            text: "Requested by " + msg.author.tag,
            icon_url: msg.author.avatarURL()
          }
        } });
      }) .catch(e => console.log(e));
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'play') || msg.content.toLowerCase().startsWith(prefix + 'p')) {
      var guildsettings = JSON.parse(fs.readFileSync(`${msg.guild.id}.json`));
      let args = msg.content.split(' ');
      let query;
      if(args[0] !== prefix+'play' && args[0] !== prefix+'p') return;
      if(args.length < 2) {
        if(!msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'Usage: ' + prefix + 'play <Query>');
        if(!msg.member.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
        if(msg.member.voice.channelID !== msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
        if(!msg.guild.me.voice.connection) return errorMessage(msg.channel, 'An unknown error occured. If the bot is in a voice channel, please disconnect it using admin and try again.');
        if(!msg.guild.me.voice.connection.dispatcher) return errorMessage(msg.channel, 'Usage: ' + prefix + 'play <Query>');
        if(msg.guild.me.voice.connection.dispatcher.paused) {
          msg.guild.me.voice.connection.dispatcher.resume();
          successMessage(msg.channel, 'Resumed playback.');
        }
      }
      let newArgs = args;
      newArgs.splice(0, 1);
      query = newArgs.join(' ');
      if(!msg.guild.me.voice.connection) {
        if(!msg.member.voice.channel) return errorMessage(msg.channel, 'You are not in a voice channel!');
        msg.member.voice.channel.join() .then(c => {
          c.voice.setSelfDeaf(true);
          let guildsettings = getGuildSettings(msg.guild.id);
          guildsettings.loopType = null;
          setGuildSettings(msg.guild.id, guildsettings);
          c.on('disconnect', () => {
            musicBotAPI.resetQueue(msg.guild.id);
          })
        }) .catch(err => errorMessage(msg.channel, "ERROR: " + err));
      } else {
        if(msg.member.voice.channelID !== msg.guild.me.voice.channelID) return errorMessage(msg.channel, 'You are not in my voice channel!');
      }
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}play\x1b[0m.`);
      musicBotAPI.play(msg.channel, query, true);
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'queue') || msg.content.toLowerCase().startsWith(prefix + 'q')) {
      //errorMessage(msg.channel, 'Command is still in early development! Please check back later.');
      let queue = musicBotAPI.fetchQueue(msg.guild.id);
      let args = msg.content.toLowerCase().split(' ');
      if(args[0] !== prefix+'queue' && args[0] !== prefix+'q') return;
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}queue\x1b[0m.`);
      if(args.length > 1) {
        if(args[1] == 'clear') {
          let guildsettings = getGuildSettings(msg.guild.id);
          if(!guildsettings.musicQueue) return;
          guildsettings.musicQueue = [];
          guildsettings.nowPlaying = null;
          guildsettings.lastPlayed = null;
          setGuildSettings(msg.guild.id, guildsettings);
          return successMessage(msg.channel, 'Cleared the queue!');
        }
      }
      if(queue) {
        if(queue.length > 0) {
          let queueFields = [];
          for(var i=0; i<queue.length; i++) {
            queueFields[queueFields.length] = {
              name: "Position in queue: " + (i+1),
              value: `${getGuildSettings(msg.guild.id).nowPlaying == i ? ":arrow_forward: " : ""}` + "[" + queue[i].title + "](" + queue[i].url + ")"
            }
          }
          msg.channel.send({ embed: {
            title: "Current Queue:",
            color: `0x${msg.guild.me.displayHexColor.substring(1)}`,
            fields: queueFields,
            footer: {
              text: "Requested by " + msg.author.tag + " | Loop: " + (getGuildSettings(msg.guild.id).loopType ? getGuildSettings(msg.guild.id).loopType : "none"),
              icon_url: msg.author.avatarURL()
            }
          } });
        } else errorMessage(msg.channel, 'There is nothing in the queue!');
      } else errorMessage(msg.channel, 'There is nothing in the queue!');
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'giveaway') || msg.content.toLowerCase().startsWith(prefix + 'g')) {
      let args = msg.content.toLowerCase().split(' ');
      if(args[0] !== prefix+'giveaway' && args[0] !== prefix+'g') return;
      console.log(`\x1b[35m[Commands] \x1b[36m${msg.author.tag} \x1b[0mexecuted \x1b[36m${prefix}giveaway\x1b[0m.`);
      let giveawayhelp = { embed: {
        title: "Giveaway Help",
        color: "0x" + msg.guild.me.displayHexColor.substring(1),
        author: {
            name: msg.author.tag,
            icon_url: msg.author.avatarURL()
        },
        thumbnail: {
            url: client.user.avatarURL()
        },
        fields: [
            {
                name: prefix + "g help",
                value: "Displays this menu."
            },
            {
                name: prefix + "g create",
                value: "Create a giveaway."
            },
            {
                name: prefix + "g list",
                value: "List all giveaways."
            },
            {
                name: prefix + "g reroll",
                value: "Reroll giveaway."
            },
            {
                name: prefix + "g remove",
                value: "Remove giveaway."
            }
        ]
      } };
      if(args.length == 1) {
        
      } else {

      }
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
    color: `0x${channel.guild.me.displayHexColor.substring(1)}`
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


function splitText(str, size) {

  // Maximum allowed chunk size
  let MAX_CHUNK_SIZE = size;
  let chunks = new Array();
  let current_chunk_position = 0;

  while(current_chunk_position < str.length){

      let current_substring = str.substr(current_chunk_position, MAX_CHUNK_SIZE);

      let last_index = current_substring.lastIndexOf("\n") > 0 ? current_substring.lastIndexOf("\n") : MAX_CHUNK_SIZE;

      let chunk = str.substr(current_chunk_position, last_index);
      chunks.push(chunk);

      current_chunk_position += last_index;
  }

  return chunks;
}
