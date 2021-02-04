'use strict';

let botChannels = { "BETA":0, "STABLE":1 };

const BOT_CHANNEL = botChannels.STABLE;

require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const GuildAPI = require('./guildAPI');
const guildAPI = new GuildAPI.GuildAPI();
const activeVCs = new Map();
const vcConnectionMap = new Map();
const { exit } = require('process');
const RainbowRoleAPI = require('./rainbowRoleAPI');
const rainbowRoleAPI = new RainbowRoleAPI.RainbowRole();

client.on('ready', () => {
    console.log(`\x1b[35m[Discord] \x1b[32m${client.user.tag}\x1b[0m is ready to use the \x1b[32mVapor\x1b[0m script!`);
    if(BOT_CHANNEL == 0) {
      client.user.setPresence({activity: {type: "PLAYING", name: "Vapor Beta | Buggy and mostly offline"}, status: 'idle', afk: false})
      .then(() => {
        console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mBETA\x1b[0m)!');
      });
    }
    else if (BOT_CHANNEL == 1) {
      client.user.setPresence({activity: {type: "PLAYING", name: "Vapor | v!help"}, status: "online", afk: false})
      .then(() => {
        console.log('\x1b[35m[Discord] \x1b[0mSet custom status (\x1b[32mSTABLE\x1b[0m)!');
      });
    }
    client.guilds.cache.forEach((guild) => {
        guildAPI.initialiseGuild(guild);
        rainbowRoleAPI.runRainbowRole(client, guild.id);
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
                },
                {
                    name: prefix + "purge",
                    value: "Removes amount of messages specified."
                }
            ],
            timestamp: new Date()
        } });
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
            msg.channel.send('Prefix set to **' + newPrefix + '**');
        }
        else {
            msg.channel.send('You need administrator to use this command!');
        }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'ban')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          msg.channel.send('You have to be an administator to do this!');
          return;
        }
      }
      let args = msg.content.split(' ');
      let user = args[1];
      let reason;
      if(args.length > 2) args.splice(0, 2).join(' ');
      if(/^<@/.test(user)) {
        let userId = user.substring(2, user.length-1);
        if (userId.startsWith('!')) userId = userId.substring(1);
        if(reason) {
          msg.guild.members.ban(userId, {reason: reason});
        } else msg.guild.members.ban(userId, {reason: `Banned by ${msg.author.tag}`});
      } else {
        msg.channel.send('Invalid user provided!');
      }
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'store')) {
        if(JSON.parse(fs.readFileSync(filename)).store == null) {
            msg.channel.send('This server has no store');
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
      /*if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          msg.channel.send('You have to be an administator to do this!');
          return;
        }
      }*/
      msg.channel.send('Command re-work is under way! Please check back later');
      // TODO: Re-work setstore command
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'rainbowrole')) {
      if(!botDevelopers.includes(msg.member.id)) {
        msg.channel.send('Sorry, but you need to be a bot developer to use this feature!');
        return;
      }
      if(msg.content.length < prefix.length+33) {
        msg.channel.send('Invalid usage! Use: ' + prefix + 'rainbowrole <ROLE>');
        return;
      }
      let guildData = JSON.parse(fs.readFileSync(filename));
      msg.guild.roles.cache.find(role => role.id === msg.content.substring(prefix.length+15, prefix.length+33)).setColor(msg.guild.roles.cache.find(role => role.id === msg.content.substring(prefix.length+15, prefix.length+33)).color)
      .then( () => {
          for( var i = 0; i < guildData.rainbowRoles; i++) {
              if(guildData.rainbowRoles[i] === msg.content.substring(prefix.length+15, prefix.length+33)) {
                  guildData.rainbowRoles.splice(i, 1);
                  fs.writeFileSync(filename, JSON.stringify(guildData, null, 2));
                  msg.channel.send('Rainbow role disabled!');
                  return;
              }
          }
          guildData.rainbowRoles.push(msg.content.substring(prefix.length+15, prefix.length+33));
          msg.channel.send('Enabled rainbow role for ' + msg.content.substring(prefix.length+12, prefix.length+33) + '>!');
          fs.writeFileSync(filename, JSON.stringify(guildData, null, 2));
      })
      .catch((err) => {
          if(err.message === "Missing Permissions") {
            msg.channel.send('Sorry, I don\'t have permission to do that!');
          } else {
            msg.channel.send('An error has occurred! Please try again later.');
          }
      });
    }
    else if(msg.content.toLowerCase().startsWith(prefix + 'purge')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          msg.channel.send('You have to be an administator to do this!');
          return;
        }
      }
      if(msg.content.length < prefix.length+7) {
        msg.channel.send('Usage: ' + prefix + 'purge <number>');
        return;
      }
      let args = msg.content.substring(prefix.length+6).split(' ');
      if(!/^[0-9]*$/.test(args[0])) {
        msg.channel.send('Amount must be a number!');
        return;
      }
      var purgeAmount = parseInt(args[0]);
      try {
        msg.channel.messages.fetch({limit: purgeAmount}) .then((messages) => {
          messages.forEach(m => m.delete());
        });
        msg.channel.send('Successfully deleted ' + purgeAmount + ' messages!');
      } catch (err) {
        msg.channel.send('An error has occurred! Please try again.');
      };
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'info')) {
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
                  name: "Vapor Silver Guild Count: **0**",
                  value: "*.*"
              },
              {
                  name: "Vapor Gold Guild Count: **0**",
                  value: "*.*"
              },
              {
                  name: "Developer Accounts: **" + botDevelopers.length + "**",
                  value: "*.*"
              },
              {
                  name: "This Guild's Type: **Bronze**",
                  value: "*.*"
              }
          ],
          timestamp: new Date()
      }});
    }
    else if (msg.content.toLowerCase().startsWith(prefix + 'passwordprotect')) {
      if(!msg.member.hasPermission('ADMINISTRATOR')) {
        if(!botDevelopers.includes(msg.member.id)) {
          msg.channel.send('You have to be an administator to do this!');
          return;
        }
      }
      msg.channel.send('Please enter the channel where you want to accept passwords:');
      msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 60000}) .then(collected => {
        msg.channel.send(collected.first().content);
      }) .catch(() => {
        msg.channel.send('Operation timed out.');
      });
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
          msg.channel.send('```' + fs.readFileSync(filename) + '```');
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
        case 'shutdown':
          client.destroy();
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
});




if (BOT_CHANNEL == 0) {
    client.login(JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).betaToken);
} else if (BOT_CHANNEL == 1) {
    client.login(JSON.parse(fs.readFileSync(process.env.CONFIG_PATH)).token);
}
