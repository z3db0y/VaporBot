const { emit, exit } = require('process');
const ytdl = require('ytdl-core');
const fs = require('fs');
const searchYT = require('yt-search');

let searchYouTube = async (query) => {
    const results = await searchYT(query);

    return (results.videos.length > 1) ? results.videos[0] : null;
}

/*let getQueue = function (guildID) {
    let guildsettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
    if(guildsettings.musicQueue) return guildsettings.musicQueue;
    else return null;
}

let onSongFinish = function (connection, guildID) {
    let serverQueue = getQueue(guildID);
    serverQueue.shift();
    if(serverQueue.length > 0) connection.play(ytdl(serverQueue[0])) .on('finish', onSongFinish(connection, guildID));
}
 
function successMessage(ch, msg) {
    ch.send({embed: {
        title: msg,
        color: "0x00FF00"
    }}) .catch(err => {});
}

function recursivePlay(con, guildID) {
    con.play(getQueue(guildID)[0]) .on('finish', () => {
        let guildsettings = JSON.parse(fs.readFileSync(`${guildID}.json`));
        guildsettings.musicQueue.shift();
        fs.writeFileSync(`${guildID}.json`, JSON.stringify(guildsettings, null, 2));
        recursivePlay(con, guildID);
    });
}*/

var MusicBot = {
    play: function (query, con) {
        searchYouTube(query) .then(result => {
            con.play(ytdl(result.url));
        });
    }
}

module.exports = MusicBot;