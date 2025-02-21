const { Client, Partials, Collection, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js')
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction
  ]
});
const path = require('path')
require("dotenv").config({ path: path.resolve(__dirname, '.env') })
const db = require(path.resolve(__dirname, 'db.js'));
const fs = require('fs')
const query = `
  SELECT msgs, bi_msgs
  FROM users
  WHERE id = ?
`;
const vquery = `
  SELECT total_voice, bi_voice
  FROM users
  WHERE id = ?
`;
const voiceSessions = new Map();
const serverDataPath = path.join(__dirname, "..", "storage", "serverData.json")
var serverData = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));

function addtolog(info) {
  fs.appendFile(currentlog, info + "\n", function (err) {
    if (err) throw err
  })
}

client.on('ready', async () => {
  if (!fs.existsSync(path.join(__dirname, "logs"))) {
    fs.mkdirSync(path.join(__dirname, "logs"));
  }
  //makes timestamp
  currentTime = new Date()
  timestamp = currentTime.getFullYear() + "-" + (currentTime.getMonth() + 1) +
    "-" + currentTime.getDate() + "-" + currentTime.getHours() + "-" +
    currentTime.getMinutes() + "-" + currentTime.getSeconds()
  console.log(timestamp)
  currentlog = path.join(__dirname, "logs", timestamp + '.txt')
  fs.writeFile(currentlog, "Logging:\n", function (err) {
    if (err) throw err
    console.log('Log file created sucessfully!')
  })

  //login
  console.log("Connected as " + client.user.tag)

  // List servers the bot is connected to
  console.log("Servers:")

  client.guilds.cache.forEach((guild) => {
    addtolog(" - " + guild.name)
    console.log(" - " + guild.name)
    serverData[guild.id] = {
      name: guild.name,
      icon: guild.iconURL()
    }

    // List all channels
    guild.channels.cache.forEach((channel) => {
      console.log(` -- ${channel.name} (${channel.type}) - ${channel.id}`)
      addtolog(` -- ${channel.name} (${channel.type}) - ${channel.id}`)
    })
  })

  fs.writeFile(serverDataPath, JSON.stringify(serverData), (err) => {
    if (err) console.log(err)
  });
  //sets avatar
  //client.user.setAvatar('')
  //client.user.setUsername("")
})


/*Time Converter for easier to read stats for users. */
function secondsToDHMS(seconds) {
  var days = Math.floor(seconds / 86400);
  var hours = Math.floor((seconds % 86400) / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  var remainingSeconds = seconds % 60;

  var resultArray = [];

  if (days > 0) {
    resultArray.push(`D: ${days}, `);
  }

  if (hours > 0 || days > 0) {
    resultArray.push(`H: ${hours}, `);
  }

  if (minutes > 0 || hours > 0 || days > 0) {
    resultArray.push(`M: ${minutes}, `);
  }

  resultArray.push(`S: ${remainingSeconds}`);

  var result = resultArray.join(' ');

  return result;
}

/* Now unused function that was originally planned to count
user messages that were sent before bot is added to server.
Removed due to fetch limiting on messages.
function countUserMessages(guild, userId, currentDate) {
  let messageCount = 0;
  let biCount = 0;

  return guild.channels
    .fetch()
    .then((channels) => {
      const promises = [];

      channels.forEach((channel) => {
        if (channel.type === 0 || channel.type === 11) {
          promises.push(
            channel.messages
              .fetch({ limit: 100 })
              .then((messages) => {
                messages.forEach((message) => {
                  if (message.author.id === userId) {
                    messageCount++;
                    if (currentDate - message.createdAt <= 1209600000) {
                      biCount++;
                    }
                  }
                });
              })
          );
        }
      });

      return Promise.all(promises);
    })
    .then(() => [messageCount, biCount])
    .catch((error) => {
      console.error('Error fetching channels or messages:', error.message);
      return [0, 0];
    });
}*/


client.on('messageCreate', async (receivedMessage) => {
  const updateQuery = `
    UPDATE users
    SET msgs = msgs + 1,
        bi_msgs = bi_msgs + 1
    WHERE id = ?;
    `;

  db.run(updateQuery, [receivedMessage.author.id.concat("+", receivedMessage.guild.id)], function (err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Rows updated: ${this.changes}`);
    }
  });

  if (receivedMessage.content.slice(0, 3) == "bot" || receivedMessage.content.slice(0, 2) == "b!") {
    if (receivedMessage.content.slice(0, 3) == "bot") {
      var fullCommand = receivedMessage.content.slice(4) // Remove the command starter
    } else {
      var fullCommand = receivedMessage.content.slice(2)
    }
    let splitCommand = fullCommand.split(" ") // Split the message up in to pieces for each space
    let primaryCommand = splitCommand[0] // The first word directly after the bot call or exclamation mark is the command
    let arguments = splitCommand.slice(1) // All other words are arguments/parameters/options for the command

    console.log("Command received: " + primaryCommand)
    console.log("Arguments: " + arguments) // There may not be any arguments
    var opts = receivedMessage;
    var currentTime = new Date()

    let person = receivedMessage.mentions.users.first();

    switch (primaryCommand) {
      case "msg":
        return userMessages(receivedMessage.guild.id, person, receivedMessage);
      case "vc":
        return userVC(receivedMessage.guild.id, person, receivedMessage);
      case "msgr":
        return rankMessages(receivedMessage.guild.id, person, receivedMessage);
      case "vcr":
        return rankVC(receivedMessage.guild.id, person, receivedMessage);
      case "bmsg":
        return userBMessages(receivedMessage.guild.id, person, receivedMessage);
      case "bvc":
        return userBVC(receivedMessage.guild.id, person, receivedMessage);
      case "bmsgr":
        return brankMessages(receivedMessage.guild.id, person, receivedMessage);
      case "bvcr":
        return brankVC(receivedMessage.guild.id, person, receivedMessage);
    }

    /*if (primaryCommand == "msg") {
      let person = receivedMessage.mentions.users.first();
      if (person) {
        db.get(query, [person.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`Messages for ${person.id} in ${receivedMessage.guild.id}: ${row.msgs}`);
            return receivedMessage.reply(`${person.username} has sent ${row.msgs} total msgs.`)
          } else {
            console.log(`No record found for ${person.id} in ${receivedMessage.guild.id}`);
          }
        });
      } else {
        db.get(query, [receivedMessage.author.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`Messages for ${receivedMessage.author.id} in ${receivedMessage.guild.id}: ${row.msgs}`);
            return receivedMessage.reply(`${receivedMessage.author.username} has sent ${row.msgs} total msgs.`)
          } else {
            console.log(`No record found for ${receivedMessage.author.id} in ${receivedMessage.guild.id}`);
          }
        });
      }
    } else if (primaryCommand == "vc") {
      let person = receivedMessage.mentions.users.first();
      if (person) {
        db.get(vquery, [person.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`VC for ${person.id} in ${receivedMessage.guild.id}: ${row.total_voice}`);
            time = secondsToDHMS(row.total_voice);
            return receivedMessage.reply(`${person.username} has spent ${time} in VC.`)
          } else {
            console.log(`No record found for ${person.id} in ${receivedMessage.guild.id}`);
          }
        });
      } else {
        db.get(vquery, [receivedMessage.author.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`VC for ${receivedMessage.author.id} in ${receivedMessage.guild.id}: ${row.total_voice}`);
            time = secondsToDHMS(row.total_voice);
            return receivedMessage.reply(`${receivedMessage.author.username} has spent ${time} in VC.`)
          } else {
            console.log(`No record found for ${receivedMessage.author.id} in ${receivedMessage.guild.id}`);
          }
        });
      }
    } else if (primaryCommand == "msgr") {
      let person = receivedMessage.mentions.users.first();
      return rankMessages(receivedMessage.guild.id, person, receivedMessage);
    } else if (primaryCommand == "vcr") {
      let person = receivedMessage.mentions.users.first();
      return rankVC(receivedMessage.guild.id, person, receivedMessage);
    } else if (primaryCommand == "bmsgr") {
      let person = receivedMessage.mentions.users.first();
      return brankMessages(receivedMessage.guild.id, person, receivedMessage)
    } else if (primaryCommand == "bvcr") {
      let person = receivedMessage.mentions.users.first();
      return brankVC(receivedMessage.guild.id, person, receivedMessage);
    } else if (primaryCommand == "bmsg") {
      let person = receivedMessage.mentions.users.first();
      if (person) {
        db.get(query, [person.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`Messages for ${person.id} in ${receivedMessage.guild.id}: ${row.bi_msgs}`);
            return receivedMessage.reply(`${person.username} has sent ${row.bi_msgs} msgs recently.`)
          } else {
            console.log(`No record found for ${person.id} in ${receivedMessage.guild.id}`);
          }
        });
      } else {
        db.get(query, [receivedMessage.author.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`Messages for ${receivedMessage.author.id} in ${receivedMessage.guild.id}: ${row.bi_msgs}`);
            return receivedMessage.reply(`${receivedMessage.author.username} has sent ${row.bi_msgs} msgs recently.`)
          } else {
            console.log(`No record found for ${receivedMessage.author.id} in ${receivedMessage.guild.id}`);
          }
        });
      }
    } else if (primaryCommand == "bvc") {
      let person = receivedMessage.mentions.users.first();
      if (person) {
        db.get(vquery, [person.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`VC for ${person.id} in ${receivedMessage.guild.id}: ${row.bi_voice}`);
            time = secondsToDHMS(row.bi_voice);
            return receivedMessage.reply(`${person.username} has spent ${time} in VC recently.`)
          } else {
            console.log(`No record found for ${person.id} in ${receivedMessage.guild.id}`);
          }
        });
      } else {
        db.get(vquery, [receivedMessage.author.id.concat("+", receivedMessage.guild.id)], (err, row) => {
          if (err) {
            console.error(err.message);
            return;
          }

          if (row) {
            console.log(`VC for ${receivedMessage.author.id} in ${receivedMessage.guild.id}: ${row.bi_voice}`);
            time = secondsToDHMS(row.bi_voice);
            return receivedMessage.reply(`${receivedMessage.author.username} has spent ${time} in VC recently.`)
          } else {
            console.log(`No record found for ${receivedMessage.author.id} in ${receivedMessage.guild.id}`);
          }
        });
      }
    }*/
  }
});

function truncateString(str, char, limit) {
  const parts = str.split(char);
  const truncated = parts.slice(0, limit).join(char);
  return truncated;
}

client.on('voiceStateUpdate', (oldState, newState) => {
  // Check if the user is joining or leaving a voice channel
  if (oldState.channelId !== newState.channelId) {
    const userId = newState.id;
    const guildId = newState.guild.id;

    // If the user is joining a voice channel
    if (newState.channel) {
      // Store the start time of the voice session
      voiceSessions.set(`${userId}-${guildId}`, Date.now());
    } else {
      // If the user is leaving a voice channel, calculate the duration
      const sessionKey = `${userId}-${guildId}`;
      const startTime = voiceSessions.get(sessionKey);

      if (startTime) {
        const endTime = Date.now();
        const durationInSeconds = Math.floor((endTime - startTime) / 1000);

        // Update the total voice time in the database
        updateVoiceTime(userId, guildId, durationInSeconds);

        // Remove the session from the map
        voiceSessions.delete(sessionKey);

        console.log(`User ${userId} spent ${durationInSeconds} seconds in voice channel.`);
      }
    }
  }
});

function updateVoiceTime(userId, guildId, durationInSeconds) {
  db.get(vquery, [userId.concat("+", guildId)], (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }
    const updateQuery = `
    UPDATE users
    SET total_voice = ?,
        bi_voice = ?
    WHERE id = ?;
    `;
    let t, bt;
    if (row.total_voice) {
      t = row.total_voice + durationInSeconds
    } else {
      t = durationInSeconds;
    }
    if (row.bi_voice) {
      bt = row.bi_voice + durationInSeconds
    } else {
      bt = durationInSeconds;
    }
    db.run(updateQuery, [t, bt, userId.concat("+", guildId)], function (err) {
      if (err) {
        console.error(err.message);
      } else {
        console.log(`Rows updated: ${this.changes}`);
      }
    });
  })
}

client.on('guildMemberAdd', (member) => {
  // This event is triggered when a new member joins the server

  // Adds a new entry to the users table for the new member
  const insertQuery = `
    INSERT INTO users (id, user_id, guild_id, username, msgs, bi_msgs, total_voice, bi_voice)
    VALUES (?, ?, ?, ?, 0, 0, 0.0, 0.0)
  `;

  db.run(insertQuery, [member.user.id.concat("+", member.guild.id), member.user.id, member.guild.id, member.user.username], (err) => {
    if (err) {
      console.error(`Error adding new user: ${err.message}`);
    } else {
      console.log(`New user ${member.user.username} joined the server. Entry added to the database.`);
    }
  });
});

client.on('guildCreate', (guild) => {
  // This event is triggered when the bot joins a new server
  // Fetch all members in the new server
  guild.members.fetch().then((members) => {
    members.forEach((member) => {
      // insert query for all members in new server
      const insertQuery = `
        INSERT INTO users (id, user_id, guild_id, username, msgs, bi_msgs, total_voice, bi_voice)
        VALUES (?, ?, ?, ?, 0, 0, 0.0, 0.0)
      `;

      // insertion
      db.run(insertQuery, [member.user.id.concat("+", member.guild.id), member.user.id, member.guild.id, member.user.username], (err) => {
        if (err) {
          console.error(`Error adding new user: ${err.message}`);
        } else {
          console.log(`New user ${member.user.username} added to the database.`);
        }
      });
    });
  });

  serverData[guild.id] = {
    name: guild.name,
    icon: guild.iconURL()
  }

  fs.writeFile(serverDataPath, JSON.stringify(serverData), (err) => {
    if (err) console.log(err)
  });

});

async function userMessages(guildId, person, receivedMessage) {
  if (person) {
    db.get(query, [person.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`Messages for ${person.id} in ${guildId}: ${row.msgs}`);
        return receivedMessage.reply(`${person.username} has sent ${row.msgs} total msgs.`)
      } else {
        console.log(`No record found for ${person.id} in ${guildId}`);
      }
    });
  } else {
    db.get(query, [receivedMessage.author.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`Messages for ${receivedMessage.author.id} in ${guildId}: ${row.msgs}`);
        return receivedMessage.reply(`${receivedMessage.author.username} has sent ${row.msgs} total msgs.`)
      } else {
        console.log(`No record found for ${receivedMessage.author.id} in ${guildId}`);
      }
    });
  }
}

async function userVC(guildId, person, receivedMessage) {
  if (person) {
    db.get(vquery, [person.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`VC for ${person.id} in ${guildId}: ${row.total_voice}`);
        time = secondsToDHMS(row.total_voice);
        return receivedMessage.reply(`${person.username} has spent ${time} in VC.`)
      } else {
        console.log(`No record found for ${person.id} in ${guildId}`);
      }
    });
  } else {
    db.get(vquery, [receivedMessage.author.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`VC for ${receivedMessage.author.id} in ${guildId}: ${row.total_voice}`);
        time = secondsToDHMS(row.total_voice);
        return receivedMessage.reply(`${receivedMessage.author.username} has spent ${time} in VC.`)
      } else {
        console.log(`No record found for ${receivedMessage.author.id} in ${guildId}`);
      }
    });
  }
}

async function userBMessages(guildId, person, receivedMessage) {
  if (person) {
    db.get(query, [person.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`Messages for ${person.id} in ${guildId}: ${row.bi_msgs}`);
        return receivedMessage.reply(`${person.username} has sent ${row.bi_msgs} msgs recently.`)
      } else {
        console.log(`No record found for ${person.id} in ${guildId}`);
      }
    });
  } else {
    db.get(query, [receivedMessage.author.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`Messages for ${receivedMessage.author.id} in ${guildId}: ${row.bi_msgs}`);
        return receivedMessage.reply(`${receivedMessage.author.username} has sent ${row.bi_msgs} msgs recently.`)
      } else {
        console.log(`No record found for ${receivedMessage.author.id} in ${guildId}`);
      }
    });
  }
}

async function userBVC(guildId, person, receivedMessage) {
  if (person) {
    db.get(vquery, [person.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`VC for ${person.id} in ${guildId}: ${row.bi_voice}`);
        time = secondsToDHMS(row.bi_voice);
        return receivedMessage.reply(`${person.username} has spent ${time} in VC recently.`)
      } else {
        console.log(`No record found for ${person.id} in ${guildId}`);
      }
    });
  } else {
    db.get(vquery, [receivedMessage.author.id.concat("+", guildId)], (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        console.log(`VC for ${receivedMessage.author.id} in ${guildId}: ${row.bi_voice}`);
        time = secondsToDHMS(row.bi_voice);
        return receivedMessage.reply(`${receivedMessage.author.username} has spent ${time} in VC recently.`)
      } else {
        console.log(`No record found for ${receivedMessage.author.id} in ${guildId}`);
      }
    });
  }
}

async function rankMessages(guildId, person, receivedMessage) {
  try {
    const selectQuery = `
      SELECT username, msgs, user_id
      FROM users
      WHERE guild_id = ?
      ORDER BY msgs DESC;
    `;

    await db.all(selectQuery, [guildId], (err, rows) => {
      if (rows.length > 0) {
        console.log(`Ranking for Guild ${guildId}:`);
        var response = ""
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.username} - ${row.msgs} messages`);
          if (person && person.id == row.user_id) {
            return receivedMessage.reply(`${person.username} is #${index + 1} in message rankings.`);
          } else if (person == undefined) {
            response += "`" + (index + 1) + ".` " + `${row.username} - ${row.msgs} messages` + "\n"
          }
        });
        if (response == "") {
          return
        } else {
          tresponse = truncateString(response, '\n', 10);
          const rankList = new EmbedBuilder()
            .setColor('#FF2400')
            .setAuthor({
              name: receivedMessage.guild.name + " Message Rankings:",
              iconURL: receivedMessage.author.avatarURL()
            })
            .addFields(
              { name: 'Top 10:', value: tresponse },
            )
            .setTimestamp()
            .setFooter({
              text: client.user.username + ' Bot',
              iconURL: client.user.avatarURL()
            });
          console.log(`Ranks was shown!`)
          return receivedMessage.reply({ embeds: [rankList] });
        }
      } else {
        console.log(`No data found for Guild ${guildId}.`);
      }
    })

  } catch (error) {
    console.error(`Error ranking messages: ${error.message}`);
  }
}

async function brankMessages(guildId, person, receivedMessage) {
  try {
    const selectQuery = `
      SELECT username, bi_msgs, user_id
      FROM users
      WHERE guild_id = ?
      ORDER BY bi_msgs DESC;
    `;

    await db.all(selectQuery, [guildId], (err, rows) => {
      if (rows.length > 0) {
        console.log(`Ranking for Guild ${guildId}:`);
        var response = ""
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.username} - ${row.bi_msgs} messages`);
          if (person && person.id == row.user_id) {
            return receivedMessage.reply(`${person.username} is #${index + 1} in message rankings.`);
          } else if (person == undefined) {
            response += "`" + (index + 1) + ".` " + `${row.username} - ${row.bi_msgs} messages` + "\n"
          }
        });
        if (response == "") {
          return
        } else {
          tresponse = truncateString(response, '\n', 10);
          const rankList = new EmbedBuilder()
            .setColor('#FF2400')
            .setAuthor({
              name: receivedMessage.guild.name + " Biweekly Message Rankings:",
              iconURL: receivedMessage.author.avatarURL()
            })
            .addFields(
              { name: 'Top 10:', value: tresponse },
            )
            .setTimestamp()
            .setFooter({
              text: client.user.username + ' Bot',
              iconURL: client.user.avatarURL()
            });
          console.log(`Ranks was shown!`)
          return receivedMessage.reply({ embeds: [rankList] });
        }
      } else {
        console.log(`No data found for Guild ${guildId}.`);
      }
    })

  } catch (error) {
    console.error(`Error ranking messages: ${error.message}`);
  }
}

async function rankVC(guildId, person, receivedMessage) {
  try {
    const selectQuery = `
      SELECT username, total_voice, user_id
      FROM users
      WHERE guild_id = ?
      ORDER BY total_voice DESC;
    `;

    await db.all(selectQuery, [guildId], (err, rows) => {
      if (rows.length > 0) {
        console.log(`Ranking for Guild ${guildId}:`);
        var response = ""
        rows.forEach((row, index) => {
          if (person && person.id == row.user_id) {
            return receivedMessage.reply(`${person.username} is #${index + 1} in VC rankings.`);
          } else if (person == undefined) {
            time = secondsToDHMS(row.total_voice);
            response += "`" + (index + 1) + ".` " + `${row.username} - ${time}` + "\n"
          }
        });
        if (response == "") {
          return
        } else {
          tresponse = truncateString(response, '\n', 10);
          const rankList = new EmbedBuilder()
            .setColor('#FF2400')
            .setAuthor({
              name: receivedMessage.guild.name + " VC Rankings:",
              iconURL: receivedMessage.author.avatarURL()
            })
            .addFields(
              { name: 'Top 10:', value: tresponse },
            )
            .setTimestamp()
            .setFooter({
              text: client.user.username + ' Bot',
              iconURL: client.user.avatarURL()
            });
          console.log(`Ranks was shown!`)
          return receivedMessage.reply({ embeds: [rankList] });
        }
      } else {
        console.log(`No data found for Guild ${guildId}.`);
      }
    })

  } catch (error) {
    console.error(`Error ranking messages: ${error.message}`);
  }
}

async function brankVC(guildId, person, receivedMessage) {
  try {
    const selectQuery = `
      SELECT username, bi_voice, user_id
      FROM users
      WHERE guild_id = ?
      ORDER BY bi_voice DESC;
    `;

    await db.all(selectQuery, [guildId], (err, rows) => {
      if (rows.length > 0) {
        console.log(`Ranking for Guild ${guildId}:`);
        var response = ""
        rows.forEach((row, index) => {
          if (person && person.id == row.user_id) {
            return receivedMessage.reply(`${person.username} is #${index + 1} in VC rankings.`);
          } else if (person == undefined) {
            time = secondsToDHMS(row.bi_voice);
            response += "`" + (index + 1) + ".` " + `${row.username} - ${time}` + "\n"
          }
        });
        if (response == "") {
          return
        } else {
          tresponse = truncateString(response, '\n', 10);
          const rankList = new EmbedBuilder()
            .setColor('#FF2400')
            .setAuthor({
              name: receivedMessage.guild.name + " Biweekly VC Rankings:",
              iconURL: receivedMessage.author.avatarURL()
            })
            .addFields(
              { name: 'Top 10:', value: tresponse },
            )
            .setTimestamp()
            .setFooter({
              text: client.user.username + ' Bot',
              iconURL: client.user.avatarURL()
            });
          console.log(`Ranks was shown!`)
          return receivedMessage.reply({ embeds: [rankList] });
        }
      } else {
        console.log(`No data found for Guild ${guildId}.`);
      }
    })

  } catch (error) {
    console.error(`Error ranking messages: ${error.message}`);
  }
}

process.on('beforeExit', () => {
  console.log('Closing the database connection...');

  // Close the SQLite database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing the database connection:', err.message);
    } else {
      console.log('Database connection closed successfully.');
    }
  });
});

process.on('exit', (code) => {
  console.log(`Process is exiting with code: ${code}`);

  // Close the SQLite database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing the database connection:', err.message);
    } else {
      console.log('Database connection closed successfully.');
    }
  });
});

process.stdin.setEncoding("utf8"); /* encoding */
process.stdin.on("readable", () => {
  /* on equivalent to addEventListener */
  const dataInput = process.stdin.read();
  while (process.stdin.read() !== null) { }
  if (dataInput !== null) {
    const command = dataInput.trim();
    if (command == "init") {//populates database with users in currently joined servers
      client.guilds.cache.forEach((guild) => {
        guild.members.fetch().then((members) => {
          members.forEach((member) => {
            db.run(
              'INSERT OR REPLACE INTO users (id, user_id, guild_id, username, msgs, bi_msgs, total_voice, bi_voice) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                member.id.concat("+", guild.id),
                member.id,
                guild.id,
                member.user.username,
                0,
                0,
                0.0,
                0.0
              ],
              (err) => {
                if (err) {
                  console.error(err.message);
                } else {
                  console.log('User registered successfully.');
                }
              })
          })
        })
      })
    } else if (command === "stop") {
      console.log("Shutting down bot");
      process.exit(0); /* exiting */
    } else {
      /* After invalid command, we cannot type anything else */
      console.log(`Invalid command: ${command}`);
      process.stdout.write("Type stop or init: ");
    }
  }
});


client.login(process.env.BOT_SECRET_TOKEN)