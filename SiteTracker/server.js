const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') })
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const favicon = require('serve-favicon');
const config = require(path.resolve(__dirname, "config.json"));
const fs = require('fs')

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('express-session')(config.session))
app.use(favicon(path.join(__dirname, "icon", "favicon.ico")));
app.use(express.static(path.join(__dirname, "style_data")));

const portNumber = process.env.PORT || 3001;
const url = process.env.URL || `http://localhost:${portNumber}`
const auth_link = process.env.AUTH_REDIRECT
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET

const db = require(path.join(__dirname, "..", "StatTracker", "db.js"))
const serverData = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "storage", "serverData.json"), 'utf8'))
const serverQuery = `
  SELECT guild_id
  FROM users
  WHERE user_id = ?
`;
const msgQuery = `
  SELECT username, msgs
  FROM users
  WHERE guild_id = ?
  ORDER BY msgs DESC;
`
const bmsgQuery = `
  SELECT username, bi_msgs
  FROM users
  WHERE guild_id = ?
  ORDER BY msgs DESC;
`
const vcQuery = `
  SELECT username, total_voice
  FROM users
  WHERE guild_id = ?
  ORDER BY msgs DESC;
`
const bvcQuery = `
  SELECT username, bi_voice
  FROM users
  WHERE guild_id = ?
  ORDER BY msgs DESC;
`

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

function queryMaker(select, opts) {
  if (select == null ||select.length == 0) {
    return null;
  }
  queryString = `SELECT ` + select.join(", ");
  queryString += `
  FROM users
  WHERE guild_id = ?`;
  if (opts != null) {
    queryString += `
    ORDER BY msgs ${opts[0]}`;
  }
  return queryString;
}

function listMaker(data, pfp, active) {
  var list = `<div class="servers">`
  if (active == null) {
    list += `<a class="active" href="${url}" title="Home">
        <img src="${pfp}" alt="" width="75" height="75">
        </a>
        <hr>`
  } else {
    list += `<a href="${url}" title="Home">
        <img src="${pfp}" alt="" width="75" height="75">
        </a>
        <hr>`
  }
  for (var [key, value] of Object.entries(data)) {
    if (active == key) {
      list += `<a class="active" href="${url}/server/${key}" title="${value["name"]}">
        <img src="${value["icon"]}" alt="" width="75" height="75">
        </a>`
    } else {
      list += `<a href="${url}/server/${key}" title="${value["name"]}">
        <img src="${value["icon"]}" alt="" width="75" height="75">
        </a>`
    }
    
  }
  list += `</div>`
  return list
}

async function statMaker(rows, type) {
  var end;
  if (rows.length < 5) end = rows.length; else end = 5;
  switch (type) {
    case "msg":
      var stats = `<h2>Total Msg Rankings</h2>`
      stats += `<ol>`
      for (var i = 0; i < end; i++) {
        stats += `<li>${rows[i].username} - ${rows[i].msgs} messages</li>`
      }
      stats += `</ol>`
      return stats
    case "vc":
      var stats = `<h2>Total VC Rankings</h2>`
      stats += `<ol>`
      for (var i = 0; i < end; i++) {
        time = secondsToDHMS(rows[i].total_voice);
        stats += `<li>${rows[i].username} - ${time}</li>`
      }
      stats += `</ol>`
      return stats
    case "bmsg":
      var stats = `<h2>Bi-Weekly Msg Rankings</h2>`
      stats += `<ol>`
      for (var i = 0; i < end; i++) {
        stats += `<li>${rows[i].username} - ${rows[i].bi_msgs} messages</li>`
      }
      stats += `</ol>`
      return stats
    case "bvc":
      var stats = `<h2>Bi-Weekly VC Rankings</h2>`
      stats += `<ol>`
      for (var i = 0; i < end; i++) {
        time = secondsToDHMS(rows[i].bi_voice);
        stats += `<li>${rows[i].username} - ${time}</li>`
      }
      stats += `</ol>`
      return stats
  }
}

app.get("/", async (request, response) => {
    if (!request.session.bearer_token) return response.render("index", {home: url, url : auth_link});
    if (!request.session.user) {
      const info = await fetch('https://discord.com/api/users/@me', {
        headers: {
          authorization: `Bearer ${request.session.bearer_token}`,
        },
      });
      const json = await info.json();
      if (!json.username) return response.render("index", {url : auth_link});//add err
  
      request.session.user = json
      request.session.user.pfp = `https://cdn.discordapp.com/avatars/${request.session.user.id}/${request.session.user.avatar}`
    }
    if (!request.session.servers) {
      db.all(serverQuery, [request.session.user.id], (err, rows) => {
        var serverList = []
        if (err) {
            console.error(err.message);
        return;
        }
  
        if (rows) {
          rows.forEach((row) => {
            serverList.push(row.guild_id)
          });
        }
  
        var userServers = Object.keys(serverData).filter(key => serverList.includes(key)).reduce((object, key) => {object[key] = serverData[key]; return object}, {});
        request.session.servers = userServers
  
        var variables = {
          home: url,
          message: `Welcome to Stat Tracker Online, ${request.session.user.username}!`,
          servers: listMaker(request.session.servers, request.session.user.pfp, null) 
        }
    
        response.render("dash", variables)
  
      });
    } else {
      var variables = {
        home: url,
        message: `Welcome to Stat Tracker Online, ${request.session.user.username}!`,
        pfp: `<img id="pfp" src ="https://cdn.discordapp.com/avatars/${request.session.user.id}/${request.session.user.avatar}?size=512">`,
        servers: listMaker(request.session.servers, request.session.user.pfp, null) 
      }
  
      response.render("dash", variables)
    }
  });

app.get('/auth/discord', async (request, response) => {
  var token_request = new URLSearchParams({
    'client_id': client_id,
    'client_secret': client_secret,
    'code': request.query.code,
    'grant_type': 'authorization_code',
    'redirect_uri': url + '/auth/discord',
    'scope': 'identify',
  });

  var tok_post = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: token_request,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  });

  var tok_response = await tok_post.json()
  request.session.bearer_token = tok_response['access_token']

	return response.redirect("/");
});

app.get('/server/:id', async (request, response) => {
  if (!request.session.bearer_token || !request.session.user || !request.session.servers) return response.render("index", {home: url, url : auth_link});
  guild_id = request.params["id"]
  if (!Object.keys(request.session.servers).includes(guild_id)) return response.send("ERROR: INVALID GUILD ID")

  const menu = `
  <a href=${url}/server/${guild_id}/msg>Server Message Rankings</a>
  <a href=${url}/server/${guild_id}/vc>Server Voice Rankings</a>
  <a href=${url}/server/${guild_id}/bmsg>Server Bi-Weekly Message Rankings</a>
  <a href=${url}/server/${guild_id}/bvc>Server Bi-Weekly Voice Rankings</a>`

  var variables = {
    home: url,
    servers: listMaker(request.session.servers, request.session.user.pfp, guild_id),
    menu: menu
  }
  response.render("server", variables)
});

app.get('/server/:id/:stat', async (request, response) => {
  if (!request.session.bearer_token || !request.session.user || !request.session.servers) return response.render("index", {home: url, url : auth_link});
  guild_id = request.params["id"]
  stat_type = request.params["stat"]
  if (!Object.keys(request.session.servers).includes(guild_id)) return response.send("ERROR: INVALID GUILD ID")  
  if (stat_type == "msg") {
    await db.all(msgQuery, [guild_id], async (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }
      index = rows.map(function (row) {return row.username}).indexOf(request.session.user.username)
      var variables = {
        home: url,
        servers: listMaker(request.session.servers, request.session.user.pfp, guild_id),
        rank: await statMaker(rows, stat_type),
        indstats: `You are ranked ${index + 1}
        in messages with ${rows[index].msgs}.`
      }
      response.render("stats", variables)
    });
  } else if (stat_type == "vc") {
    await db.all(vcQuery, [guild_id], async (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }
      index = rows.map(function (row) {return row.username}).indexOf(request.session.user.username)
      var variables = {
        home: url,
        servers: listMaker(request.session.servers, request.session.user.pfp, guild_id),
        rank: await statMaker(rows, stat_type),
        indstats: `You are ranked ${index + 1}
        in VC time with ${secondsToDHMS(rows[index].total_voice)}.`
      }
      response.render("stats", variables)
    });
  } else if (stat_type == "bmsg") {
    await db.all(bmsgQuery, [guild_id], async (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }
      index = rows.map(function (row) {return row.username}).indexOf(request.session.user.username)
      var variables = {
        home: url,
        servers: listMaker(request.session.servers, request.session.user.pfp, guild_id),
        rank: await statMaker(rows, stat_type),
        indstats: `You are ranked ${index + 1}
        in messages in the last two weeks with ${rows[index].bi_msgs}.`
      }
      response.render("stats", variables)
    });
  } else if (stat_type == "bvc") {
    await db.all(bvcQuery, [guild_id], async (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }
      index = rows.map(function (row) {return row.username}).indexOf(request.session.user.username)
      var variables = {
        home: url,
        servers: listMaker(request.session.servers, request.session.user.pfp, guild_id),
        rank: await statMaker(rows, stat_type),
        indstats: `You are ranked ${index + 1}
        in VC in the last two weeks with ${rows[index].bi_voice}.`
      }
      response.render("stats", variables)
    });
  } else {
    response.send("ERROR: INVALID PARAMETER")
  }
});

app.listen(portNumber, (err) => {
    if (err) {
      console.log("Starting server failed.");
    } else {
      console.log(
        `Web server started and running at http://localhost:${portNumber}`
      );
      process.stdout.write("Type stop to shutdown the server: ");
    }
  });

  process.stdin.setEncoding("utf8"); /* encoding */
  process.stdin.on("readable", () => {
    /* on equivalent to addEventListener */
    const dataInput = process.stdin.read();
    while (process.stdin.read() !== null) {}
    if (dataInput !== null) {
      const command = dataInput.trim();
      if (command === "stop") {
        console.log("Shutting down the server");
        process.exit(0); /* exiting */
      } else {
        /* After invalid command, we cannot type anything else */
        console.log(`Invalid command: ${command}`);
        process.stdout.write("Type stop to shutdown the server: ");
      }
    }
  });