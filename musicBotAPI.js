
class MusicBotAPI {

    disconnectFromAllVCs(vcConnectionMap) {
      vcConnectionMap.forEach((connection, guildID) => {
          connection.disconnect();
      });
    }

}

module.exports = { MusicBotAPI }
