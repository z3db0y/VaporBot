'use strict';

const updateAPI = require('./updateAPI');
let botChannels = { "BETA":0, "STABLE":1 };
let conMap = new Map();
const process = require('process');

const BOT_CHANNEL = (process.argv.includes('--beta') || process.argv.includes('-b') ? botChannels.BETA : botChannels.STABLE);

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
//const client = new Discord.Client({ws: {intents: ['DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS', 'DIRECT_MESSAGE_TYPING', 'GUILDS', 'GUILD_BANS', 'GUILD_EMOJIS', 'GUILD_INTEGRATIONS', 'GUILD_INVITES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING', 'GUILD_VOICE_STATES', 'GUILD_WEBHOOKS']}});
const fs = require('fs');
const ytsr = require('ytsr');
//const GuildAPI = require('./guildAPI');
//const guildAPI = new GuildAPI.GuildAPI();
const premiumAPI = require('./premiumAPI');
const ytdl = require('ytdl-core');
const ytsearch = require('yt-search');
const ytpl = require('ytpl');
const az = require('azlyrics-scraper');
const roundToNearest5 = x => Math.round(x/5)*5;
// if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m ');
const debugging = process.argv.includes('--debug') || process.argv.includes('--dbg');

let musicBotAPI = new class MusicBot {

  sa(connection, query, reset, moi) {
    if(reset) this.resetQ(connection);
    let guildsettings = guildAPI.getGuildSettings(connection.channel.guild.id);
    let srYt = this.srYT;
    let aQ = this.add;
    let rP = this.recursivePlay;
    async function doQuery() {
      await srYt(query).then(video => {
        aQ({ url: video.url, title: video.title }, connection);
        if(!guildsettings.nowPlaying) rP(connection);
        if(moi.token) client.editInteraction( successMessage('Now playing: ' + video.title, connection.channel.guild.me.displayColor), moi.id, moi.token );
        else moi.reply({ embed: successMessage('Now playing: ' + video.title, msg.guild.me.displayColor) });
      }) .catch(err => {
        if(moi.token) client.editInteraction( errorMessage('Nothing found.'), moi.id, moi.token );
        else moi.reply({ embed: errorMessage('Nothing found.') });
      });
    }
    async function doURL(u) {
      await ytdl.getInfo(u).then(info => {
        aQ({ url: u, title: info.videoDetails.title}, connection);
        if(!guildsettings.nowPlaying) rP(connection);
        if(moi.token) client.editInteraction( successMessage('Now playing: ' + info.videoDetails.title, connection.channel.guild.me.displayColor), moi.id, moi.token );
        else moi.reply({ embed: successMessage('Now playing: ' + info.videoDetails.title, msg.guild.me.displayColor) });
      }) .catch(err => {
        if(moi.token) client.editInteraction( errorMessage('Unable to play song.'), moi.id, moi.token );
        else moi.reply({ embed: errorMessage('Unable to play song.') });
      });
    }
    try {
      let url = new URL(query);
      if(!url.hostname.includes('youtube.com')) return doQuery();
      if(!url.searchParams.has('v')) return doQuery();
      return doURL('https://youtube.com/watch?v=' + url.searchParams.get('v'));
    }
    catch(err) {
      try{
        let url = new URL('https://' + query);
        if(!url.hostname.includes('youtube.com')) return doQuery();
        if(!url.searchParams.has('v')) return doQuery();
        return doURL('https://youtube.com/watch?v=' + url.searchParams.get('v'));
      }
      catch(e) {
        return doQuery();
      }
    }
  }

  recursivePlay(c) {
    let guildsettings = guildAPI.getGuildSettings(c.channel.guild.id);
    if(guildsettings.lastPlayed) guildsettings.nowPlaying = guildsettings.lastPlayed+1;
    else guildsettings.nowPlaying = 0
    c.play(ytdl(guildsettings.musicQueue[guildsettings.nowPlaying].url, { filter: 'audioonly' })) .on('finish', () => {
      guildsettings = guildAPI.getGuildSettings(c.channel.guild.id);

      if(true) { // If the only user in VC is Vapor, Set inactivity.
        // Inactivity Timeout Logic Here.
      }

      if(guildsettings.loopType == 'song') {
        guildsettings.lastPlayed = guildsettings.nowPlaying-1;
        guildAPI.setGuildSettings(c.channel.guild.id, guildsettings);
        this.recursivePlay(c);
      }
      if(guildsettings.nowPlaying == guildsettings.musicQueue.length-1) {
        if(guildsettings.loopType == 'queue') {
          guildsettings.lastPlayed = -1;
          guildAPI.setGuildSettings(c.channel.guild.id, guildsettings);
          this.recursivePlay(c);
        } else {
          // Inactivity Timeout Logic Here.
        }
      }
    });
  }

  resetQ(c) {
    let guildsettings = guildAPI.getGuildSettings(c.channel.guild.id);
    guildsettings.musicQueue = [];
    guildsettings.nowPlaying = null;
    guildsettings.lastPlayed = null;
    guildAPI.setGuildSettings(c.channel.guild.id, guildsettings);
    if(c.dispatcher) c.dispatcher.end();
  }

  add(obj, c) {
    let guildsettings = guildAPI.getGuildSettings(c.channel.guild.id);
    if(!guildsettings.musicQueue) guildsettings.musicQueue = [obj];
    else guildsettings.musicQueue[guildsettings.musicQueue.length] = obj;
    guildAPI.setGuildSettings(c.channel.guild.id, guildsettings);
  }

  rem(i, c) {
    let guildsettings = guildAPI.getGuildSettings(c.channel.guild.id);
    if(!guildsettings.musicQueue) return;
    if(!guildsettings.musicQueue[i]) return;
    guildsettings.splice(i, 1);
    guildAPI.setGuildSettings(c.channel.guild.id, guildsettings);
  }

  async srYT(q) {
    //let res = await ytsr(q);
    //return res.items.filter(x => x.type === 'video')[0];
    let res = await ytsearch({ query: q });
    return res.videos[0];
  }

  /*async rPl(id) {
    let res = await ytpl(id);
    
  }*/

  terminateAll() {
    for(let i in conMap) {
      let con = conMap[i];
      con.channel.leave();
    }
  }

  handleDisconnect(c) {
    this.resetQ(c);
  }
}

let guildAPI = new class GuildAPI {

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
    let defaultSettings = JSON.stringify(fs.readFileSync(process.env.CONFIG_PATH).defaultSettings);
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
} ('guilds/');

client.on('ready', () => {
    console.log(`\x1b[35m[Discord] \x1b[32m${client.user.tag}\x1b[0m is ready to use the \x1b[32mVapor\x1b[0m script!`);
    if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m ready event.');
    client.users.fetch('740167253491843094') .then(owner => client.owner = owner);
    client.sendInteractionEmbed = (embed, interaction_id, interaction_token) => {
      client.api.interactions(interaction_id, interaction_token).callback.post({
        data: {
          type: 4,
          data: {
            embeds: [embed]
          }
        }
      });
    };
    client.editInteraction = (embed, interaction_id, interaction_token) => {
      client.api.webhooks(client.application.id)(interaction_token).messages['@original'].patch({      
        type: 4,
        data: {
          embeds: [embed]
        }
      });
    };
    client.sendDefer = (interaction_id, interaction_token) => {
      client.api.interactions(interaction_id, interaction_token).callback.post({
        data: {
          type: 5
        }
      });
    };
    if(BOT_CHANNEL == 0) {
      client.user.setPresence({ status: 'idle' });
      client.user.setActivity({ name: 'the vapor release race. | Buggy and mostly offline.', type: 'COMPETING' });
        console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mBETA\x1b[0m)!');
    }
    else if (BOT_CHANNEL == 1) {
      client.user.setPresence({ status: 'dnd' });
      client.user.setActivity({ name: 'v!help', type: 'STREAMING', url: 'https://twitch.tv/z3db0y' });
      console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mSTABLE\x1b[0m)!');
    }
    updateAPI.init(client);
    let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
    client.guilds.cache.forEach((guild) => {
        initSlashCommands(guild);
        let guildsettings = JSON.parse(fs.readFileSync(`${guild.id}.json`));
        guildAPI.initGuild(guild);
        botDevelopers.forEach(dev => {
          guild.members.fetch(dev) .then(user => {
            if(guildsettings.devRole) user.roles.add(guildsettings.devRole, "Vapor Developer automatical grant.") .catch(err => {});
          }) .catch(err => {});
        });
    });
});

client.on('guildDelete', (guild) => {
    if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m guildDelete event.');
    guildAPI.removeGuild(guild);
});

client.on('guildCreate', (guild) => {
    if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m guildCreate event.');
    console.log(`\x1b[35m[GuildManager]\x1b[0m I have been added to \x1b[32m${guild.name}\x1b[0m!`);
    guildAPI.initGuild(guild);
});

client.on('guildMemberAdd', (member) => {
  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m guildMemberAdd event.');
  let guildsettings = JSON.parse(fs.readFileSync(`${member.guild.id}.json`));
  let botDevelopers = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).botDevelopers;
  if(botDevelopers.includes(member.id) && guildsettings.devRole) {
    member.roles.add(guildsettings.devRole, "Vapor Developer automatical grant.");
  }
});

client.on('guildMemberRemove', (u) => {
  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m guildMemberRemove event.');
});

//-------------
// HANDLE EXIT
//-------------

process.on('SIGINT', () => process.exit(2));
process.on('uncaughtException', console.log);
process.on('exit', () => {
  // Handle exit here.
  musicBotAPI.terminateAll();
  client.destroy();
});

//------------------
// IMPORTANT EVENT
//------------------

client.on('message', async (msg) => {
    if(!msg.member.user.bot && msg.guild) execute(msg);
});

function permissionDeniedMsg(permission) {
  return {
    title: `You need ${permission} to do this!`,
    color: 16711680 // Red but converted to decimal
  }
}

function successMessage(message, color) {
  return {
    title: message,
    color: color
  }
}

function errorMessage(message) {
  return {
    title: message,
    color: 16711680 // Red but converted to decimal
  }
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

let execute = async (msg, args, interaction) => {
  let guildsettings;
  let settings = JSON.parse(fs.readFileSync(process.env.CONFIG_PATH));
  let cmd = msg;
  args = args || null;
  interaction = interaction || null;
  if(!interaction) {
    guildsettings = guildAPI.getGuildSettings(msg.guild.id);
    if(!guildsettings) {
      guildAPI.repairGuild(msg.guild);
      guildsettings = guildAPI.getGuildSettings(msg.guild.id);
    }
    args = msg.content.toLowerCase().split(' ');
    if(!args[0].startsWith(guildsettings.prefix)) return;
    cmd = args[0].substring(guildsettings.prefix.length);
    args.shift();
    if(args.length == 0) args = null;
  } else {
    guildsettings = guildAPI.getGuildSettings(interaction.guild_id);
    if(!guildsettings) {
      guildAPI.repairGuild(client.guilds.resolve(interaction.guild_id));
      guildsettings = guildAPI.getGuildSettings(interaction.guild_id);
    }
  }
  switch(cmd) {
    case 'help':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m help command.');
      if(args) {
        if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m args exist.');
        switch((interaction ? args[0].value : args[0])) {
          case 'moderation':
          case 'mod':
            if(interaction) client.sendInteractionEmbed({
              title: "Vapor Help (Moderation)",
              color: client.guilds.resolve(interaction.guild_id).me.displayColor,
              fields: [
                {
                  name: "/ban",
                  value: "Ban a user."
                },
                {
                  name: "/unban",
                  value: "Unban a user."
                },
                {
                  name: "/kick",
                  value: "Kick a user."
                },
                {
                  name: "/autoban",
                  value: "Set amount of warnings until a user gets banned."
                },
                {
                  name: "/autokick",
                  value: "Set amount of warnings until a user gets kicked."
                },
                {
                  name: "/warn",
                  value: "Warn a user."
                },
                {
                  name: "/delwarn",
                  value: "Remove a warning from a user."
                },
                {
                  name: "/warnings | /warns",
                  value: "View warnings of a user."
                },
                {
                  name: "/purge",
                  value: "Remove amount of messages specified."
                },
                {
                  name: "/setstore",
                  value: "Set server donation link."
                },
                {
                  name: "/setprefix",
                  value: "Set bot's prefix."
                }
              ]
            }, interaction.id, interaction.token);
            else msg.reply({ embed: {
              title: "Vapor Help (Moderation)",
              color: msg.guild.me.displayColor,
              fields: [
                {
                  name: guildsettings.prefix + "ban",
                  value: "Ban a user."
                },
                {
                  name: guildsettings.prefix + "unban",
                  value: "Unban a user."
                },
                {
                  name: guildsettings.prefix + "kick",
                  value: "Kick a user."
                },
                {
                  name: guildsettings.prefix + "autoban",
                  value: "Set amount of warnings until a user gets banned."
                },
                {
                  name: guildsettings.prefix + "autokick",
                  value: "Set amount of warnings until a user gets kicked."
                },
                {
                  name: guildsettings.prefix + "warn",
                  value: "Warn a user."
                },
                {
                  name: guildsettings.prefix + "delwarn",
                  value: "Remove a warning from a user."
                },
                {
                  name: guildsettings.prefix + "warnings | " + guildsettings.prefix + "warns",
                  value: "View warnings of a user."
                },
                {
                  name: guildsettings.prefix + "purge",
                  value: "Remove amount of messages specified."
                },
                {
                  name: guildsettings.prefix + "setstore",
                  value: "Set server donation link."
                },
                {
                  name: guildsettings.prefix + "setprefix",
                  value: "Set bot's prefix."
                }
              ]
            } });
            break;
          case 'music':
          case 'mus':
            if(interaction) client.sendInteractionEmbed({
              title: "Vapor Help (Music)",
              color: client.guilds.resolve(interaction.guild_id).me.displayColor,
              fields: [
                {
                  name: "/play",
                  value: "Play a song."
                },
                {
                  name: "/pause",
                  value: "Pause the current song."
                },
                {
                  name: "/add",
                  value: "Add to the queue."
                },
                {
                  name: "/remove",
                  value: "Remove from the queue."
                },
                {
                  name: "/stop",
                  value: "Stop the playback."
                },
                {
                  name: "/queue",
                  value: "View the queue."
                },
                {
                  name: "/loop",
                  value: "Change the loop type."
                },
                {
                  name: "/24_7",
                  value: "Make bot stay in voice without an inactivity timer."
                },
                {
                  name: "/join",
                  value: "Make the bot join your voice channel."
                },
                {
                  name: "/disconnect",
                  value: "Make the bot leave your voice channel."
                }
              ]
            }, interaction.id, interaction.token);
            else msg.reply({ embed: {
              title: "Vapor Help (Music)",
              color: msg.guild.me.displayColor,
              fields: [
                {
                  name: guildsettings.prefix + "play | " + guildsettings.prefix + "p",
                  value: "Play a song."
                },
                {
                  name: guildsettings.prefix + "pause",
                  value: "Pause the current song."
                },
                {
                  name: guildsettings.prefix + "add",
                  value: "Add to the queue."
                },
                {
                  name: guildsettings.prefix + "remove",
                  value: "Remove from the queue."
                },
                {
                  name: guildsettings.prefix + "stop",
                  value: "Stop the playback."
                },
                {
                  name: guildsettings.prefix + "queue | " + guildsettings.prefix + "q",
                  value: "View the queue."
                },
                {
                  name: guildsettings.prefix + "loop",
                  value: "Change the loop type."
                },
                {
                  name: guildsettings.prefix + "24/7",
                  value: "Make bot stay in voice without an inactivity timer."
                },
                {
                  name: guildsettings.prefix + "join",
                  value: "Make the bot join your voice channel."
                },
                {
                  name: guildsettings.prefix + "disconnect | " + guildsettings.prefix + "dc",
                  value: "Make the bot leave your voice channel."
                }
              ]
            } });
            break;
          case 'miscellaneous':
          case 'misc':
            if(interaction) client.sendInteractionEmbed({
              title: "Vapor Help (Misc)",
              color: client.guilds.resolve(interaction.guild_id).me.displayColor,
              fields: [
                {
                  name: "/store",
                  value: "Go to the server's donation link."
                },
                {
                  name: "/invite",
                  value: "Invite the bot to your server."
                },
                {
                  name: "/info",
                  value: "Get Vapor's statistics."
                },
                {
                  name: "/ping",
                  value: "View Vapor's latency."
                },
                {
                  name: "/dev",
                  value: "Developer options."
                }
              ]
            }, interaction.id, interaction.token);
            else msg.reply({ embed: {
              title: "Vapor Help (Misc)",
              color: msg.guild.me.displayColor,
              fields: [
                {
                  name: guildsettings.prefix + "store",
                  value: "Go to the server's donation link."
                },
                {
                  name: guildsettings.prefix + "invite",
                  value: "Invite the bot to your server."
                },
                {
                  name: guildsettings.prefix + "info",
                  value: "Get Vapor's statistics."
                },
                {
                  name: guildsettings.prefix + "ping",
                  value: "View Vapor's latency."
                },
                {
                  name: guildsettings.prefix + "dev",
                  value: "Developer options."
                }
              ]
            } });
            break;
        }
      } else {
        if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m no args.');
        if(interaction != undefined) {
          client.sendInteractionEmbed({
            title: "Vapor Help",
            color: client.guilds.resolve(interaction.guild_id).me.displayColor,
            fields: [
              {
                  name: "/help moderation",
                  value: "Shows moderation commands."
              },
              {
                  name: "/help music",
                  value: "Shows music commands."
              },
              {
                  name: "/help miscellaneous",
                  value: "Shows other commands not listed in any category."
              }
            ]
          }, interaction.id, interaction.token);
        } else msg.reply({ embed: {
          title: "Vapor Help",
          color: msg.guild.me.displayColor,
          fields: [
            {
                name: guildsettings.prefix + "help moderation",
                value: "Shows moderation commands."
            },
            {
                name: guildsettings.prefix + "help music",
                value: "Shows music commands."
            },
            {
                name: guildsettings.prefix + "help miscellaneous",
                value: "Shows other commands not listed in any category."
            }
          ]
        } }) .catch(err => {});
      }
      break;
    case 'setprefix':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m setprefix command.');
      if(interaction) {
        let member = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(member.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
        let newPrefix = args[0].value;
        if(newPrefix.startsWith('/')) return client.sendInteractionEmbed(errorMessage('Prefix cannot start with **"/"**!', client.guilds.resolve(interaction.guild_id).me.displayColor), interaction.id, interaction.token);
        guildsettings.prefix = newPrefix;
        guildAPI.setGuildSettings(interaction.guild_id, guildsettings);
        if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m prefix updated: ' + newPrefix);
        client.sendInteractionEmbed(successMessage('Prefix set to ' + newPrefix, client.guilds.resolve(interaction.guild_id).me.displayColor), interaction.id, interaction.token);
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.member.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(!args) return msg.reply({ embed: errorMessage('Usage: ' + guildsettings.prefix + 'setprefix <prefix>') });
        if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m args exist.');
        let newPrefix = args[0];
        if(newPrefix.startsWith('/')) return msg.reply({ embed: errorMessage('Prefix cannot start with **"/"**!') });
        guildsettings.prefix = newPrefix;
        guildAPI.setGuildSettings(msg.guild.id, guildsettings);
        if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m prefix updated: ' + newPrefix);
        msg.reply({ embed: successMessage('Prefix set to ' + newPrefix, msg.guild.me.displayColor) });
      }
      break;
    case 'ban':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m ban command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        let reason;
        if(args[1]) reason = args[1].value;
        else reason = `Banned by ${author.user.tag}`;
        client.guilds.resolve(interaction.guild_id).members.fetch(args[0].value) .then (userToBan => {
          if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
          if(userToBan.user.tag == author.user.tag) return client.sendInteractionEmbed(errorMessage('You cannot ban yourself!'), interaction.id, interaction.token);
          if(userToBan.user.tag == client.user.tag) return client.sendInteractionEmbed(errorMessage('I cannot ban myself!'), interaction.id, interaction.token);

          if(author.roles.highest.position > userToBan.roles.highest.position || settings.botDevelopers.includes(msg.author.id)) {
            userToBan.ban({ reason: reason }) .then(() => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed ban 1.');
              client.sendInteractionEmbed(successMessage(`Banned **${userToBan.user.username}** (${userToBan.user.id}) with reason **${reason}**!`, author.guild.me.displayColor), interaction.id, interaction.token);
            }) .catch(err => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 1.');
              client.sendInteractionEmbed(errorMessage(`Couldn't ban user:\n${err.message}`), interaction.id, interaction.token);
            });
          } else client.sendInteractionEmbed(errorMessage('You do not have permission to ban this user!'), interaction.id, interaction.token);
        }) .catch(err => {
          if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 1.');
          author.guild.members.ban(args[0].value, { reason: reason }) .then(bannedUser => {
            if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed ban 2.');
            client.sendInteractionEmbed(successMessage(`Banned **${bannedUser.username}** (${bannedUser.id}) with reason **${reason}**!`, author.guild.me.displayColor), interaction.id, interaction.token);
          }) .catch(e => {
            if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 2.');
            client.sendInteractionEmbed(errorMessage(`Couldn't ban user:\n${e.message}`), interaction.id, interaction.token);
          });
        });
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          let reason;
          if(args.length > 1) {
            reason = args.slice(0).join(' ');
          } else reason = `Banned by ${msg.author.tag}`;

          if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m args[0]: "' + args[0] + '"');
          if(/^<@/.test(args[0])) {
            let userID = args[0].substring(2, args[0].length-1);
            if(userID.startsWith('!')) userID = userID.substring(1);
            msg.guild.members.fetch(userID) .then(userToBan => {
              if(msg.author.roles.highest.position > userToBan.roles.highest.position || settings.botDevelopers.includes(msg.author.id)) {
                userToBan.ban({ reason: reason }) .then(() => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed ban 1.');
                  msg.reply({ embed: successMessage(`Banned **${userToBan.user.username}** (${userToBan.user.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
                }) .catch(err => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 1.');
                  msg.reply({ embed: errorMessage(`Couldn't ban user:\n${err.message}`) });
                });
              } else return msg.reply('You do not have permission to ban this user!');
            }) .catch(err => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 1.');
              msg.guild.members.ban(userID, { reason: reason }) .then(bannedUser => {
                if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed ban 2.');
                msg.reply({ embed: successMessage(`Banned **${bannedUser.username}** (${bannedUser.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
              }) .catch(err => {
                if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 2.');
                msg.reply({ embed: errorMessage(`Couldn't ban user:\n${err.message}`) });
              });
            });
          } else if(/^[0-9]*$/.test(args[0])) {
            let userID = args[0];
            msg.guild.members.fetch(userID) .then(userToBan => {
              if(msg.author.roles.highest.position > userToBan.roles.highest.position || settings.botDevelopers.includes(msg.author.id)) {
                userToBan.ban({ reason: reason }) .then(() => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed ban 1.');
                  msg.reply({ embed: successMessage(`Banned **${userToBan.user.username}** (${userToBan.user.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
                }) .catch(err => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 1.');
                  msg.reply({ embed: errorMessage(`Couldn't ban user:\n${err.message}`) });
                });
              } else return msg.reply('You do not have permission to ban this user!');
            }) .catch(err => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 1.');
              msg.guild.members.ban(userID, { reason: reason }) .then(bannedUser => {
                if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed ban 2.');
                msg.reply({ embed: successMessage(`Banned **${bannedUser.username}** (${bannedUser.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
              }) .catch(e => {
                if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed ban 2.');
                msg.reply({ embed: errorMessage(`Couldn't ban user:\n${e.message}`) });
              });
            });
          } else {
            if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m all ban regexps failed.');
            msg.reply({ embed: errorMessage('Please specify a user to ban!') });
          }
        } else return msg.reply({ embed: errorMessage('Please specify a user to ban!') });
      }
      break;
    case 'unban':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m unban command.');
      if(interaction) {
        if(!client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id).permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(interaction.member.user.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
        let reason;
        if(args[1]) reason = args[1].value;
        else reason = `Unbanned by ${interaction.member.user.username}#${interaction.member.user.discriminator}`;
        client.guilds.resolve(interaction.guild_id).fetchBans().then(bans => {
          if(bans.get(args[0].value)) {
            client.guilds.resolve(interaction.guild_id).members.unban(args[0].value, reason) .then(un => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed unban.');
              client.sendInteractionEmbed(successMessage(`Unbanned **${un.username}** (${un.id}) with reason **${reason}**!`, client.guilds.resolve(interaction.guild_id).me.displayColor), interaction.id, interaction.token);
            }) .catch(e => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed unban.');
              client.sendInteractionEmbed(errorMessage(`Failed to unban user:\n${e.message}`), interaction.id, interaction.token);
            });
          } else {
            client.sendInteractionEmbed(errorMessage('User is not banned!'), interaction.id, interaction.token);
          }
        });
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          let reason;
          if(args[1]) {
            reason = args.slice(1).join(' ');
          } else reason = `Unbanned by ${msg.author.tag}`;

          if(/^<@/.test(args[0])) {
            let userID = args[0].substring(2, args[0].length-1);
            if(userID.startsWith('!')) userID = userID.substring(1);

            msg.guild.fetchBans() .then(bans => {
              if(bans.get(userID)) {
                msg.guild.members.unban(userID, reason) .then(un => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed unban.');
                  msg.reply({ embed: successMessage(`Unbanned **${un.username}** (${un.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
                }) .catch(e => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed unban.');
                  msg.reply(errorMessage(`Failed to unban user:\n${e.message}`));
                });
              } else {
                msg.reply({ embed: errorMessage('User is not banned!') });
              }
            });
          } else if(/^[0-9]*$/.test(args[0])) {
            let userID = args[0];

            msg.guild.fetchBans() .then(bans => {
              if(bans.get(userID)) {
                msg.guild.members.unban(userID, reason) .then(un => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed unban.');
                  msg.reply({ embed: successMessage(`Unbanned **${un.username}** (${un.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
                }) .catch(e => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed unban.');
                  msg.reply(errorMessage(`Failed to unban user:\n${e.message}`));
                });
              } else {
                msg.reply({ embed: errorMessage('User is not banned!') });
              }
            });
          } else {
            return msg.reply({ embed: errorMessage('Please specify a user to unban!') });
          }

        } else return msg.reply({ embed: errorMessage('Please specify a user to unban!') });
      }
      break;
    case 'kick':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m kick command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
        let reason;
        if(args[1]) reason = args[1].value
        else reason = `Kicked by ${author.user.tag}`;
        author.guild.members.fetch(args[0].value) .then(userToKick => {
          if(author.roles.highest.position > userToKick.roles.highest.position || settings.botDevelopers.includes(author.id)) {
            userToKick.kick(reason) .then(() => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed kick.');
              client.sendInteractionEmbed(successMessage(`Kicked **${userToKick.user.username}** (${userToKick.user.id}) with reason **${reason}**!`, author.guild.me.displayColor), interaction.id, interaction.token);
            }) .catch(err => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed kick.');
              client.sendInteractionEmbed(successMessage(`Failed to kick user:\n${err.message}`));
            });
          } else return msg.reply({ embed: errorMessage('You do not have permission to kick this user!') });
        });
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          let reason;
          if(args[1]) reason = args.slice(1).join(' ');
          else reason = `Kicked by ${msg.author.tag}`;

          if(/^<@/.test(args[0])) {
            let userID = args[0].substring(2, args[0].length-1);
            if(userID.startsWith('!')) userID = userID.substring(1);

            msg.guild.members.fetch(userID) .then(userToKick => {
              if(msg.member.roles.highest.position > userToKick.roles.highest.position || settings.botDevelopers.includes(msg.author.id)) {
                userToKick.kick(reason) .then(() => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed kick.');
                  msg.reply({ embed: successMessage(`Kicked **${userToKick.user.username}** (${userToKick.user.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
                }) .catch(err => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed kick.');
                  msg.reply({ embed: errorMessage(`Failed to kick user:\n${err.messsage}`) });
                });
              } else return msg.reply({ embed: errorMessage('You do not have permission to kick this user!') });
            }) .catch(err => {
              client.sendInteractionEmbed(errorMessage('User is not in this server'), interaction.id, interaction.token)
            });
          } else if(/^[0-9]*$/.test(args[0])) {
            let userID = args[0];

            msg.guild.members.fetch(userID) .then(userToKick => {
              if(msg.member.roles.highest.position > userToKick.roles.highest.position || settings.botDevelopers.includes(msg.author.id)) {
                userToKick.kick(reason) .then(() => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m executed kick.');
                  msg.reply({ embed: successMessage(`Kicked **${userToKick.user.username}** (${userToKick.user.id}) with reason **${reason}**!`, msg.guild.me.displayColor) });
                }) .catch(err => {
                  if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m failed kick.');
                  msg.reply({ embed: errorMessage(`Failed to kick user:\n${err.messsage}`) });
                });
              } else return msg.reply({ embed: errorMessage('You do not have permission to kick this user!') });
            }) .catch(e => {
              if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m err: '+ e.message);
              msg.reply({ embed: errorMessage('User is not in this server!') });
            });
          } else {
            return msg.reply({ embed: errorMessage('Please specify a user to kick!') });
          }
        } else return msg.reply({ embed: errorMessage('Please specify a user to kick!') });
      }
      break;
    case 'warnings':
    case 'warns':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m warnings command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
        let warningsFields = [];
        if(guildsettings.warnings[args[0].value]) {
          let userWarnings = guildsettings.warnings[args[0].value];
          if(userWarnings.length == 0) return client.sendInteractionEmbed(errorMessage('This user has no warnings!'), interaction.id, interaction.token);
          for(let index=0; index<userWarnings.length; index++) {
            warningsFields[warningsFields.length] = {
              name: "ID " + userWarnings[index].id + " | " + userWarnings[index].text,
              value: "Moderator: " + (userWarnings[index].modID ? "<@" + userWarnings[index].modID + ">" : "N/A")
            };
          }
          author.guild.members.fetch(args[0].value) .then(mem => {
            client.sendInteractionEmbed({
              title: `Warnings for ${mem.user.username}:`,
              color: author.guild.me.displayColor,
              fields: warningsFields
            }, interaction.id, interaction.token);
          }) .catch(err => {
            client.sendInteractionEmbed({
              title: `Warnings for ${args[0].value}`,
              color: author.guild.me.displayColor,
              fields: warningsFields
            }, interaction.id, interaction.token);
          });
        } else return client.sendInteractionEmbed(errorMessage('This user has no warnings!'), interaction.id, interaction.token);
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          let userID;
          if(/^<@/.test(args[0])) {
            userID = args[0].substring(2, args[0].length-1);
            if(userID.startsWith('!')) userID = userID.substring(1);
          }
          else if(/^[0-9]*$/.test(args[0])) {
            userID = args[0];
          }
          else return msg.reply({ embed: errorMessage('Please specify a user!') });

          let warningsFields = [];
          if(guildsettings.warnings[userID]) {
            let userWarnings = guildsettings.warnings[userID];
            if(userWarnings.length == 0) return msg.reply({ embed: errorMessage('This user has no warnings!') });
            for(let index=0; index<userWarnings.length; index++) {
              warningsFields[warningsFields.length] = {
                name: "ID " + userWarnings[index].id + " | " + userWarnings[index].text,
                value: "Moderator: <@" + userWarnings[index].modID + ">"
              };
            }
            msg.guild.members.fetch(userID) .then(mem => {
              msg.reply({ embed: {
                title: `Warnings for ${mem.user.username}:`,
                color: msg.guild.me.displayColor,
                fields: warningsFields
              } });
            }) .catch(err => {
              msg.reply({ embed: {
                title: `Warnings for ${userID}:`,
                color: msg.guild.me.displayColor,
                fields: warningsFields
              } });
            });
          } else return msg.reply({ embed: errorMessage('This user has no warnings!') });

        } else return msg.reply({ embed: errorMessage('Please specify a user!') });
      }
      break;
    case 'warn':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m warn command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);

        author.guild.members.fetch(args[0].value) .then(userToWarn => {
          if(author.roles.highest.position > userToWarn.roles.highest.position || settings.botDevelopers.includes(author.id)) {
            let reason;
            if(args[1]) reason = args[1].value
            else reason = "No reason provided."

            if(!guildsettings.warnings[userToWarn.id]) {
              guildsettings.warnings[userToWarn.id] = [
                {
                  id: 0,
                  text: reason,
                  modID: author.id
                }
              ];
            } else {
              guildsettings.warnings[userToWarn.id][guildsettings.warnings[userToWarn.id].length] = {
                "id": guildsettings.warnings[userToWarn.id][guildsettings.warnings[userToWarn.id].length-1] ? guildsettings.warnings[userToWarn.id][guildsettings.warnings[userToWarn.id].length-1].id+1 : 0,
                "text": reason,
                "modID": author.id
              };
            }
            guildAPI.setGuildSettings(author.guild.id, guildsettings);
            client.sendInteractionEmbed(successMessage(`Warned ${userToWarn.user.username} (${userToWarn.id}) with reason **${reason}**!`, author.guild.me.displayColor), interaction.id, interaction.token);
          } else client.sendInteractionEmbed(errorMessage('You do not have permission to warn this user!'), interaction.id, interaction.token);
        }) .catch(err => {
          if(err.message.toLowerCase() === 'unknown member') client.sendInteractionEmbed(errorMessage('User is not in this server!'), interaction.id, interaction.token);
          else client.sendInteractionEmbed(errorMessage(`Failed to warn user:\n${err.message}`), interaction.id, interaction.token);
        });
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });

        if(args) {
          let userID;
          if(/^<@/.test(args[0])) {
            userID = args[0].substring(2, args[0].length-1);
            if(userID.startsWith("!")) userID = userID.substring(1);
          } else if(/^[0-9]*$/.test(args[0])) {
            userID = args[0];
          } else return msg.reply({ embed: errorMessage('Please specify a user to warn.') });

          msg.guild.members.fetch(userID) .then(mem => {
            if(msg.member.roles.highest.position > mem.roles.highest.position || settings.botDevelopers.includes(msg.author.id)) {
              let reason;
              if(args[1]) reason = args.slice(1).join(' ');
              else reason = "No reason provided."

              if(!guildsettings.warnings[mem.id]) {
                guildsettings.warnings[mem.id] = [
                  {
                    id: 0,
                    text: reason,
                    modID: msg.author.id
                  }
                ];
              } else {
                guildsettings.warnings[mem.id][guildsettings.warnings[mem.id].length] = {
                  "id": guildsettings.warnings[mem.id][guildsettings.warnings[mem.id].length-1] ? guildsettings.warnings[mem.id][guildsettings.warnings[mem.id].length-1].id+1 : 0,
                  "text": reason,
                  "modID": msg.author.id
                };
              }
              guildAPI.setGuildSettings(msg.guild.id, guildsettings);
              msg.reply({ embed: successMessage(`Warned ${mem.user.username} (${mem.id}) with reason ${reason}!`, msg.guild.me.displayColor) });
            } else msg.reply({ embed: errorMessage('You do not have permission to warn this user!') });
          }) .catch(err => {
            if(err.message.toLowerCase() === 'unknown member') msg.reply({ embed: errorMessage('User is not in this server!') });
            else msg.reply({ embed: errorMessage(`Failed to warn user:\n${err.message}`) });
          });
        } else return msg.reply({ embed: errorMessage('Please specify a user to warn.') });
      }
      break;
    case 'delwarn':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m delwarn command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);

        if(isNaN(parseInt(args[1].value))) return client.sendInteractionEmbed(errorMessage('Please specify a valid warning ID!'), interaction.id, interaction.token);
        let warnID = parseInt(args[1].value);
        let userID = args[0].value;

        author.guild.members.fetch(userID) .then(mem => {
          if(author.roles.highest.position > mem.roles.highest.position || settings.botDevelopers.includes(author.id)) {
            if(!guildsettings.warnings[mem.id]) return client.sendInteractionEmbed(errorMessage('Invalid warning ID!'), interaction.id, interaction.token);
            if(!guildsettings.warnings[mem.id].find(warn => warn.id === warnID)) return client.sendInteractionEmbed(errorMessage('Invalid warning ID!'), interaction.id, interaction.token);
            let warnIndex = guildsettings.warnings[mem.id].findIndex(warn => warn.id === warnID);
            guildsettings.warnings[mem.id].splice(warnIndex, 1);
            guildAPI.setGuildSettings(author.guild.id, guildsettings);
            client.sendInteractionEmbed(successMessage(`Removed warning ID ${warnID} from ${mem.user.username}!`, author.guild.me.displayColor), interaction.id, interaction.token);
          } else client.sendInteractionEmbed(errorMessage('You do not have permission to remove warnings from this user!'), interaction.id, interaction.token);
        }) .catch(err => {
          if(err.message.toLowerCase() === 'unknown member') client.sendInteractionEmbed(errorMessage('User is not in this server!'), interaction.id, interaction.token);
          else client.sendInteractionEmbed(errorMessage(`Failed to remove warning:\n${err.message}`), interaction.id, interaction.token);
        });
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.member.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          if(!args[1]) return msg.reply({ embed: errorMessage('Please specify a warning ID!') });
          if(isNaN(parseInt(args[1]))) return msg.reply({ embed: errorMessage('Please specify a warning ID!') });
          let warnID = parseInt(args[1]);
          let userID;
          if(/^<@/.test(args[0])) {
            userID = args[0].substring(2, args[0].length-1);
            if(userID.startsWith("!")) userID = userID.substring(1);
          } else if(/^[0-9]*$/.test(args[0])) {
            userID = args[0];
          } else return msg.reply({ embed: errorMessage('Please specify a user!') });

          msg.guild.members.fetch(userID) .then(mem => {
            if(msg.member.roles.highest.position > mem.roles.highest.position || settings.botDevelopers.includes(msg.author.id)) {
              if(!guildsettings.warnings[mem.id]) return msg.reply({ embed: errorMessage('Invalid warning ID!') });
              if(!guildsettings.warnings[mem.id].find(warn => warn.id === warnID)) return msg.reply({ embed: errorMessage('Invalid warning ID!') });
              let warnIndex = guildsettings.warnings[mem.id].findIndex(warn => warn.id === warnID);
              guildsettings.warnings[mem.id].splice(warnIndex, 1);
              guildAPI.setGuildSettings(msg.guild.id, guildsettings);
              msg.reply({ embed: successMessage(`Removed warning ID ${warnID} from ${mem.user.username}!`, msg.guild.me.displayColor) });
            } else msg.reply({ embed: errorMessage('You do not have permission to remove warnings from this user!') });
          }) .catch(err => {
            if(err.message.toLowerCase() === 'unknown member') msg.reply({ embed: errorMessage('User is not in this server!') });
            else msg.reply({ embed: errorMessage(`Failed to remove warning:\n${err.message}`) });
          });
        } else return msg.reply({ embed: errorMessage('Please specify a user!') });
      }
      break;
    case 'autokick':
      console.log('\x1b[31m[DEBUG]\x1b[0m autokick command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
        let amount = parseInt(args[0].value);
        if(amount > 100) amount = 100
        else if (amount < 0) amount = 0
        guildsettings.autokick = amount;
        guildAPI.setGuildSettings(author.guild.id, guildsettings);
        client.sendInteractionEmbed(successMessage('Set warnings until kick to ' + amount + '!' + (amount == 0 ? ' (none)' : ''), author.guild.me.displayColor), interaction.id, interaction.token);
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          if(isNaN(parseInt(args[0]))) return msg.reply({ embed: errorMessage('Please specify amount of warnings!') });
          let amount = parseInt(args[0]);
          if(amount > 100) amount = 100
          else if(amount < 0) amount = 0
          guildsettings.autokick = amount;
          guildAPI.setGuildSettings(msg.guild.id, guildsettings);
          msg.reply({ embed: successMessage('Set warnings until kick to ' + amount + '!' + (amount == 0 ? ' (none)' : ''), msg.guild.me.displayColor) });
        } else msg.reply({ embed: errorMessage('Please specify amount of warnings!') });
      }
      break;
    case 'autoban':
      console.log('\x1b[31m[DEBUG]\x1b[0m autoban command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
        let amount = parseInt(args[0].value);
        if(amount > 100) amount = 100
        else if (amount < 0) amount = 0
        guildsettings.autokick = amount;
        guildAPI.setGuildSettings(author.guild.id, guildsettings);
        client.sendInteractionEmbed(successMessage('Set warnings until ban to ' + amount + '!' + (amount == 0 ? ' (none)' : ''), author.guild.me.displayColor), interaction.id, interaction.token);
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          if(isNaN(parseInt(args[0]))) return msg.reply({ embed: errorMessage('Please specify amount of warnings!') });
          let amount = parseInt(args[0]);
          if(amount > 100) amount = 100
          else if(amount < 0) amount = 0
          guildsettings.autokick = amount;
          guildAPI.setGuildSettings(msg.guild.id, guildsettings);
          msg.reply({ embed: successMessage('Set warnings until ban to ' + amount + '!' + (amount == 0 ? ' (none)' : ''), msg.guild.me.displayColor) });
        } else msg.reply({ embed: errorMessage('Please specify amount of warnings!') });
      }
      break;
    case 'store':
      break;
    case 'setstore':
      break;
    case 'purge':
      console.log('\x1b[31m[DEBUG]\x1b[0m purge command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        if(!author.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(author.id)) return client.sendInteractionEmbed(permissionDeniedMsg('ADMINISTRATOR'), interaction.id, interaction.token);
        let amount = parseInt(args[0].value);
        if(amount > 100) return client.sendInteractionEmbed(errorMessage('You cannot delete more than 100 messages at once!'), interaction.id, interaction.token);
        else if(amount < 2) return client.sendInteractionEmbed(errorMessage('You cannot delete less than 2 messages with this command!'), interaction.id, interaction.token);

        author.guild.channels.resolve(interaction.channel_id).bulkDelete(amount) .then(() => client.sendInteractionEmbed(successMessage('Successfully deleted ' + amount + ' messages!', author.guild.me.displayColor), interaction.id, interaction.token)) .catch(err => client.sendInteractionEmbed(errorMessage('Failed to delete messages!\nThe bot cannot delete messages more than two weeks old.'), interaction.id, interaction.token))
      } else {
        if(!msg.member.permissions.has('ADMINISTRATOR') && !settings.botDevelopers.includes(msg.author.id)) return msg.reply({ embed: permissionDeniedMsg('ADMINISTRATOR') });
        if(args) {
          if(isNaN(parseInt(args[0]))) return msg.reply({ embed: errorMessage('Please specify how many messages to remove!') });
          let amount = parseInt(args[0]);
          if(amount > 100) return msg.reply({ embed: errorMessage('You cannot delete more than 100 messages at once!')});
          else if(amount < 2) return msg.reply({ embed: errorMessage('You cannot delete less than 2 messages with this command!')});
          msg.channel.bulkDelete(amount) .then(() => msg.reply({ embed: successMessage('Successfully deleted ' + amount + ' messages!', msg.guild.me.displayColor) })) .catch(err => msg.reply({ embed: errorMessage('Failed to delete messages!\nThe bot cannot delete messages more than two weeks old.') }));
        } else msg.reply({ embed: errorMessage('Please specify how many messages to remove!') });
      }
      break;
    case 'info':
      console.log('\x1b[31m[DEBUG]\x1b[0m info command.');
      if(interaction) {
        client.sendInteractionEmbed({
          title: ":information_source: | Vapor Info",
          color: client.guilds.resolve(interaction.guild_id).me.displayColor,
          fields: [
            {
              name: "Server Count",
              value: client.guilds.cache.size
            },
            {
              name: "Bot Developers",
              value: settings.botDevelopers.length
            },
            {
              name: "This Guild's Subscription",
              value: premiumAPI.getGuildType(interaction.guild_id, client) == "Bronze" ? "Bronze (Free)" : premiumAPI.getGuildType(interaction.guild_id, client)
            }
          ]
        }, interaction.id, interaction.token);
      } else {
        msg.reply({ embed: {
          title: ":information_source: | Vapor Info",
          color: msg.guild.me.displayColor,
          fields: [
            {
              name: "Server Count",
              value: client.guilds.cache.size
            },
            {
              name: "Bot Developers",
              value: settings.botDevelopers.length
            },
            {
              name: "This Guild's Subscription",
              value: premiumAPI.getGuildType(msg.guild.id, client) == "Bronze" ? "Bronze (Free)" : premiumAPI.getGuildType(msg.guild.id, client)
            }
          ]
        } });
      }
      break;
    case 'ping':
      if(interaction) {
        client.sendInteractionEmbed({
          title: ":ping_pong: | Vapor Latency",
          description: "\n" + client.ws.ping + " ms",
          color: client.guilds.resolve(interaction.guild_id).me.displayColor
        }, interaction.id, interaction.token);
      } else {
        msg.reply({ embed: {
          title: ":ping_pong: | Vapor Latency",
          description: "\n" + client.ws.ping + " ms",
          color: msg.guild.me.displayColor
        } });
      }
      break;
    case 'dev':
      if(interaction) {
        if(!settings.botDevelopers.includes(interaction.member.user.id)) return;
        if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m dev command.');
        switch (args[0].name) {
          case 'help':
            client.sendInteractionEmbed({
              title: "Developer Options",
              color: client.guilds.resolve(interaction.guild_id).me.displayColor,
              fields: [
                {
                  name: "/dev help",
                  value: "Show this message."
                },
                {
                  name: "/dev list",
                  value: "List developer accounts."
                },
                {
                  name: "/dev add",
                  value: "Add a Vapor developer."
                },
                {
                  name: "/dev remove",
                  value: "Remove a Vapor developer."
                },
                {
                  name: "/dev guildsettings",
                  value: "Display the settings of the current guild."
                },
                {
                  name: "/dev grantme",
                  value: "Grant yourself a role in the guild."
                }
              ]
            }, interaction.id, interaction.token);
            break;
            case 'list':
              let devList = '';
              for(let i=0; i<settings.botDevelopers.length; i++) {
                devList += `<@${settings.botDevelopers[i]}>${settings.botDevelopers[i] == client.owner.id ? " Owner" : ""}\n`
              }
              client.sendInteractionEmbed({
                title: "Vapor Developers",
                description: devList,
                color: client.guilds.resolve(interaction.guild_id).me.displayColor
              }, interaction.id, interaction.token);
              break;
            case 'add':
              if(interaction.member.user.id !== client.owner.id) return client.sendInteractionEmbed(errorMessage('This is an owner-only command!'), interaction.id, interaction.token);
              client.users.fetch(args[0].options[0].value) .then(user => {
                if(settings.botDevelopers.includes(user.id)) return client.sendInteractionEmbed(errorMessage('User is already a developer!'), interaction.id, interaction.token);
                settings.botDevelopers[settings.botDevelopers.length] = user.id;
                fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(settings, null, 2));
                client.sendInteractionEmbed(successMessage(`Added ${user.username} as a bot developer!`, client.guilds.resolve(interaction.guild_id).me.displayColor), interaction.id, interaction.token);
              }) .catch(console.log);
              break;
            case 'remove':
              if(interaction.member.user.id !== client.owner.id) return client.sendInteractionEmbed(errorMessage('This is an owner-only command!'), interaction.id, interaction.token);
              client.users.fetch(args[0].options[0].value) .then(user => {
                if(!settings.botDevelopers.includes(user.id)) return client.sendInteractionEmbed(errorMessage('User is not a developer!'), interaction.id, interaction.token);
                if(user.id == client.owner.id) return client.sendInteractionEmbed(errorMessage('You cannot remove yourself!'), interaction.id, interaction.token);
                settings.botDevelopers.splice(settings.botDevelopers.indexOf(user.id), 1);
                fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(settings, null, 2));
                client.sendInteractionEmbed(successMessage(`Removed ${user.username} from bot developers!`, client.guilds.resolve(interaction.guild_id).me.displayColor), interaction.id, interaction.token);
              }) .catch(console.log);
              break;
            case 'guildsettings':
              client.sendInteractionEmbed({
                title: "Guild Settings JSON",
                description: "```json\n" + JSON.stringify(guildsettings, null, 2) + "```",
                color: client.guilds.resolve(interaction.guild_id).me.displayColor
              }, interaction.id, interaction.token);
              break;
              case 'grantme':
                let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
                let roleToGrant = client.guilds.resolve(interaction.guild_id).roles.resolve(args[0].options[0].value);

                if(roleToGrant) {
                  if(author.roles.cache.has(roleToGrant.id)) return client.sendInteractionEmbed(errorMessage('You already have that role!'), interaction.id, interaction.token);
                  author.roles.add(roleToGrant.id) .then(() => {
                    client.sendInteractionEmbed(successMessage(`Granted ${roleToGrant.name}!`, author.guild.me.displayColor), interaction.id, interaction.token);
                  }) .catch(err => client.sendInteractionEmbed(errorMessage('Failed to grant role!'), interaction.id, interaction.token));
                }
                break;
        }
      } else {
        if(!settings.botDevelopers.includes(msg.author.id)) return;
        if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m dev command.');
        if(args) {
          switch (args[0]) {
            case 'help':
              msg.reply({ embed: {
                title: "Developer Options",
                color: msg.guild.me.displayColor,
                fields: [
                  {
                    name: guildsettings.prefix + "dev help",
                    value: "Show this message."
                  },
                  {
                    name: guildsettings.prefix + "dev list",
                    value: "List developer accounts."
                  },
                  {
                    name: guildsettings.prefix + "dev add",
                    value: "Add a Vapor developer."
                  },
                  {
                    name: guildsettings.prefix + "dev remove",
                    value: "Remove a Vapor developer."
                  },
                  {
                    name: guildsettings.prefix + "dev guildsettings",
                    value: "Display the settings of the current guild."
                  },
                  {
                    name: guildsettings.prefix + "dev grantme",
                    value: "Grant yourself a role in the guild."
                  }
                ]
              } });
              break;
            case 'list':
              let devList = '';
              for(let i=0; i<settings.botDevelopers.length; i++) {
                devList += `<@${settings.botDevelopers[i]}>${settings.botDevelopers[i] == client.owner.id ? " Owner" : ""}\n`
              }
              msg.reply({ embed: {
                title: "Vapor Developers",
                description: devList,
                color: msg.guild.me.displayColor
              } });
              break;
            case 'add':
                if(msg.member.user.id !== client.owner.id) return msg.reply({ embed: errorMessage('This is an owner-only command!') });
                if(!args[1]) return msg.reply({ embed: errorMessage('Please specify a user!') });
                if(/^<@/.test(args[1])) {
                  args[1] = args[1].substring(2, args[1].length-1);
                  if(args[1].startsWith('!')) args[1] = args[1].substring(1);
                } else if(/^[0-9]*$/.test(args[1])) args[1] = args[1];
                else return msg.reply({ embed: errorMessage('Please specify a user!') });
                client.users.fetch(args[1]) .then(user => {
                  if(settings.botDevelopers.includes(user.id)) return msg.reply({ embed: errorMessage('User is already a developer!') });
                  settings.botDevelopers[settings.botDevelopers.length] = user.id;
                  fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(settings, null, 2));
                  msg.reply({ embed: successMessage(`Added ${user.username} as a bot developer!`, msg.guild.me.displayColor) });
                }) .catch(err => {
                  msg.reply({ embed: errorMessage('Invalid user!')});
                });
                break;
            case 'remove':
              if(msg.member.user.id !== client.owner.id) return msg.reply({ embed: errorMessage('This is an owner-only command!') });
                if(!args[1]) return msg.reply({ embed: errorMessage('Please specify a user!') });
                if(/^<@/.test(args[1])) {
                  args[1] = args[1].substring(2, args[1].length-1);
                  if(args[1].startsWith('!')) args[1] = args[1].substring(1);
                } else if(/^[0-9]*$/.test(args[1])) args[1] = args[1];
                else return msg.reply({ embed: errorMessage('Please specify a user!') });
                client.users.fetch(args[1]) .then(user => {
                  if(!settings.botDevelopers.includes(user.id)) return msg.reply({ embed: errorMessage('User is not a developer!') });
                  if(user.id == client.owner.id) return msg.reply({ embed: errorMessage('You cannot remove yourself!') });
                  settings.botDevelopers.splice(settings.botDevelopers.indexOf(user.id), 1);
                  fs.writeFileSync(process.env.CONFIG_PATH, JSON.stringify(settings, null, 2));
                  msg.reply({ embed: successMessage(`Removed ${user.username} from bot developers!`, msg.guild.me.displayColor) });
                }) .catch(err => {
                  msg.reply({ embed: errorMessage('Invalid user!')});
                });
                break;
            case 'guildsettings':
              msg.reply({ embed: {
                title: "Guild Settings JSON",
                description: "```json\n" + JSON.stringify(guildsettings, null, 2) + "```",
                color: msg.guild.me.displayColor
              } });
              break;
            case 'grantme':
              if(!args[1]) return msg.reply({ embed: errorMessage('Please specify a role!') });
              if(/^<&/.test(args[1])) {
                args[1] = args[1].substring(2, args[1].length-1);
                if(args[1].startsWith('!')) args[1] = args[1].substring(1)
              } else if(/^[0-9]*$/.test(args[1])) args[1] = args[1]
              else return msg.reply({ embed: errorMessage('Please specify a role!') });
              let roleToGrant = msg.guild.roles.resolve(args[1]);

              if(roleToGrant) {
                if(msg.member.roles.cache.has(roleToGrant.id)) return msg.reply({ embed: errorMessage('You already have that role!') });
                msg.member.roles.add(roleToGrant.id) .then(() => {
                  msg.reply({ embed: successMessage(`Granted ${roleToGrant.name}!`, msg.guild.me.displayColor) });
                }) .catch(err => msg.reply({ embed: errorMessage('Failed to grant role!') }));
              } else return msg.reply({ embed: errorMessage('Please specify a role!') });
              break;
            default:
              msg.reply({ embed: errorMessage('Please specify a subcommand!') });
              break;
          }
        } else msg.reply({ embed: errorMessage('Please specify a subcommand!') });
      }
      break;
    case 'passwordprotect':
      break;
    case 'play':
    case 'p':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m play command.');
      if(interaction) {
        let author = client.guilds.resolve(interaction.guild_id).members.resolve(interaction.member.user.id);
        let guildsettings = guildAPI.getGuildSettings(author.guild.id);
        if(!author.guild.me.voice.channelID) {
          if(!author.voice.channelID) return client.sendInteractionEmbed(errorMessage('You are not in a voice channel!'), interaction.id, interaction.token);
          await author.voice.channel.join() .then(con => {
            conMap[author.guild.id] = con;
            con.on('disconnect', () => musicBotAPI.handleDisconnect(con));
          })
        }
        if(author.voice.channelID !== author.guild.me.voice.channelID) return client.sendInteractionEmbed(errorMessage('You are not in my voice channel!'), interaction.id, interaction.token);
        if(author.voice.selfDeaf || author.voice.deaf) return client.sendInteractionEmbed(errorMessage('You cannot do this while deafened!'), interaction.id, interaction.token);
        // Play music logic.
        client.sendDefer(interaction.id, interaction.token);
        musicBotAPI.sa(conMap[author.guild.id], args[0].value, true, interaction);
      } else {

      }
      break;
    case 'queue':
    case 'q':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m queue command.');
      if(interaction) {

      } else {

      }
      break;
    case 'stop':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m stop command.');
      if(interaction) {

      } else {

      }
      break;
    case 'pause':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m pause command.');
      if(interaction) {

      } else {

      }
      break;
    case 'disconnect':
    case 'dc':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m disconnect command.');
      if(interaction) {

      } else {

      }
      break;
    case 'join':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m join command.');
      if(interaction) {

      } else {

      }
      break;
    case 'nowplaying':
    case 'np':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m nowplaying command.');
      if(interaction) {

      } else {

      }
      break;
    case '24/7':
    case '24_7':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m 24_7 command.');
      if(interaction) {

      } else {

      }
      break;
    case 'lyrics':
      console.log(musicBotAPI.getLyrics(args.slice(1).join(' ')));
      break;
    case 'invite':
      if(debugging) console.log('\x1b[31m[DEBUG]\x1b[0m invite command.');
      if(interaction) {
        client.sendInteractionEmbed({
          title: "Invite Vapor",
          color: client.guilds.resolve(interaction.guild_id).me.displayColor,
          thumbnail: {
            url: client.user.avatarURL()
          },
          description: `[Click Here](https://discord.com/oauth2/authorize?scope=bot+applications.commands&permissions=8&client_id=${client.user.id}) to invite ${client.user.username} to your server.`
        }, interaction.id, interaction.token);
      } else {
        msg.reply({ embed: {
          title: "Invite Vapor",
          color: msg.guild.me.displayColor,
          thumbnail: {
            url: client.user.avatarURL()
          },
          description: `[Click Here](https://discord.com/oauth2/authorize?scope=bot+applications.commands&permissions=8&client_id=${client.user.id}) to invite ${client.user.username} to your server.`
        } });
      }
      break;
  }
};

function initSlashCommands(guild) {
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "help",
      description: "Show Vapor help.",
      options: [
        {
          type: 3,
          name: "module",
          choices: [{name: "moderation", value: "mod"}, {name: "music", value: "mus"}, {name: "miscellaneous", value: "misc"}],
          required: false,
          description: "What help module you would like to view."
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "unban",
      description: "Unban a user.",
      options: [
        {
          type: 6,
          name: "user",
          description: "User to unban.",
          required: true
        },
        {
          type: 3,
          name: "reason",
          description: "Reason for unban.",
          required: false
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "warn",
      description: "Warn a user.",
      options: [
        {
          type: 6,
          name: "user",
          description: "User to warn.",
          required: true
        },
        {
          type: 3,
          name: "reason",
          description: "Reason for warning.",
          required: false
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "ban",
      description: "Ban a user.",
      options: [
        {
          type: 6,
          name: "user",
          description: "User to ban.",
          required: true
        },
        {
          type: 3,
          name: "reason",
          description: "Reason for ban.",
          required: false
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "setprefix",
      description: "Set Vapor's prefix.",
      options: [
        {
          type: 3,
          name: "prefix",
          description: "New prefix.",
          required: true
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "kick",
      description: "Kick a user.",
      options: [
        {
          type: 6,
          name: "user",
          description: "User to kick.",
          required: true
        },
        {
          type: 3,
          name: "reason",
          description: "Reason for kick.",
          required: false
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "warnings",
      description: "View warnings of a user.",
      options: [
        {
          type: 6,
          name: "user",
          description: "User to list the warnings of.",
          required: true
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "delwarn",
      description: "Remove a warning from a user.",
      options: [
        {
          type: 6,
          name: "user",
          description: "User to remove the warning from.",
          required: true
        },
        {
          type: 4,
          name: "id",
          description: "ID of warning to remove.",
          required: true
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "autokick",
      description: "Set amount of warnings until a user gets kicked.",
      options: [
        {
          type: 4,
          name: "amount",
          description: "Amount of warnings.",
          required: true
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "autoban",
      description: "Set amount of warnings until a user gets banned.",
      options: [
        {
          type: 4,
          name: "amount",
          description: "Amount of warnings.",
          required: true
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "purge",
      description: "Remove an amount of messages.",
      options: [
        {
          type: 4,
          name: "amount",
          description: "Amount of messages to remove.",
          required: true
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "store",
      description: "Go to the server's donation link."
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "setstore",
      description: "Set server donation link.",
      options: [
        {
          type: 3,
          name: "url",
          description: "New donation link.",
          required: true
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "info",
      description: "Get Vapor's statistics."
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "ping",
      description: "View Vapor's latency."
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "dev",
      description: "Developer options.",
      options: [
        {
          type: 1,
          name: "help",
          description: "Developer help."
        },
        {
          type: 1,
          name: "list",
          description: "Developer list."
        },
        {
          type: 1,
          name: "add",
          description: "Developer add.",
          options: [
            {
              type: 6,
              name: "user",
              description: "Developer to add.",
              required: true
            }
          ]
        },
        {
          type: 1,
          name: "remove",
          description: "Developer remove.",
          options: [
            {
              type: 6,
              name: "user",
              description: "Developer to remove.",
              required: true
            }
          ]
        },
        {
          type: 1,
          name: "guildsettings",
          description: "Developer guildsettings."
        },
        {
          type: 1,
          name: "grantme",
          description: "Developer grantme.",
          options: [
            {
              type: 8,
              name: "role",
              description: "Role to grant yourself.",
              required: true
            }
          ]
        }
      ]
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "invite",
      description: "Invite Vapor to your server."
    }
  });
  client.api.applications(client.user.id).guilds(guild.id).commands.post({
    data: {
      name: "play",
      description: "Play a song.",
      options: [
        {
          type: 3,
          name: "query",
          description: "Song to play.",
          required: true
        }
      ]
    }
  });
}

client.ws.on('INTERACTION_CREATE', i => {
  if(i.data.options) execute(i.data.name, i.data.options, i);
  else execute(i.data.name, undefined, i);
});
