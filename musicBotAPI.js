const { emit, exit } = require('process');
const ytdl = require('ytdl-core');
const fs = require('fs');
const searchYT = require('yt-search');

let searchYouTube = async (query) => {
    const results = await searchYT(query);

    return (results.videos.length > 1) ? results.videos[0].url : null;
}

let getQueue = function (guildID) {
    let guildsettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
    if(guildsettings.musicQueue) return guildsettings.musicQueue;
    else return null;
}

let onSongFinish = function (connection, guildID) {
    let serverQueue = getQueue(guildID);
    if(serverQueue.length > 0) connection.play(ytdl(serverQueue[0])) .on('finish', onSongFinish(connection, guildID));
}
 
//ytdl('https://www.youtube.com/watch?v=4THFRpw68oQ', {format: 'mp3'}).pipe(fs.createWriteStream('temp.mp3'));

var MusicBot = {
    

    play (query, connection, guildID) {
        this.add(searchYouTube(query));
        connection.play(ytdl(getQueue(guildID)[0], {format: 'mp3'})) .on('finish', onSongFinish(connection, guildID));
    },

    pause (connection) {
        if(connection.dispatcher) {
            if(connection.dispatcher.paused) {
                connection.dispatcher.resume()
            } else connection.dispatcher.pause()
        }
    },

    stop (connection) {
        if(connection.dispatcher) {
            connection.dispatcher.end();
        }
    },

    skip (connection, guildID) {

    },

    queue (channelID) {

    },

    add (channelID) {

    },

    remove (channelID) {

    }
}

module.exports = MusicBot;