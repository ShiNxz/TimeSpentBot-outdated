// Should it count commands as messages? (true = yes, false = no)
let CountCMDS = true
let CountAFK = true
let AFKChannel = '779523266280292392'

const guildID = '770819843573415977'
const roleID = '920426588875685888'
const timeToReset = 10*60*60 // in seconds
const maxMembers = 3 // max members to gain the role at a time

const workOnMsgs = true
const workOnVC = true

// ============================================================================================================== \\

const Discord = require('discord.js')
const { Client } = require('discord.js')
const client = new Client({ partials: ['MESSAGE', 'REACTION'] })
const mysql = require("mysql2")
const chalk = require("chalk")
const figlet = require("figlet")
require('dotenv').config()

// - Login -
const PREFIX = '!'
client.login(process.env.BOT_TOKEN)

// - Database -
var conn = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE
});

function Time() {
	// Get unix time
	return Math.floor(new Date().getTime() / 1000);
}

function SecToTime(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600*24));
	var h = Math.floor(seconds % (3600*24) / 3600);
	var m = Math.floor(seconds % 3600 / 60);
	var s = Math.floor(seconds % 60);
	
	var dDisplay = d > 0 ? d + (d == 1 ? " יום, " : " ימים, ") : "";
	var hDisplay = h > 0 ? h + (h == 1 ? " שעה, " : " שעות, ") : "";
	var mDisplay = m > 0 ? m + (m == 1 ? " דקה, " : " דקות, ") : "";
	var sDisplay = s > 0 ? s + (s == 1 ? " שנייה" : " שניות") : "";
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

// - Ready -
client.on('ready', () =>
{
	// Start
	console.log('─────────────────────────────────────────────');
	console.log(chalk.green(figlet.textSync('TimeSpent', { horizontalLayout: 'full' })+'ShiNxz#0001'));
	console.log('─────────────────────────────────────────────');
	console.log(chalk.red(`Bot started!\n---\n`
	+ `> Users: ${client.users.cache.size}\n`
	+ `> Channels: ${client.channels.cache.size}\n`
	+ `> Servers: ${client.guilds.cache.size}`));
	console.log('─────────────────────────────────────────────');
	client.user.setActivity(`${PREFIX}shop`, {type: 'WATCHING'});

	// Check Databases
	conn.query(`SHOW TABLES LIKE 'Msgs'`, (err, rows) => {
		if(err) throw err;
		if(rows.length < 1) {
			conn.query(`CREATE TABLE Msgs (UserID varchar(30) NOT NULL,Msgs int(11) DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=latin1;`);
			console.log("- Msgs Database Built.");
			console.log("- Msgs database will be where the user messages count will be stored.");
		} else {
			console.log("- Msgs Database Exists.");
		}
	});
	console.log('─────────────────────────────────────────────');
	conn.query(`SHOW TABLES LIKE 'Activity'`, (err, rows) => {
		if(err) throw err;
		if(rows.length < 1) {
			conn.query(`CREATE TABLE Activity (ID int(11) NOT NULL,UserID varchar(30) NOT NULL,ChannelID varchar(25) NOT NULL,JoinTime int(11) NOT NULL,LeftTime int(11) DEFAULT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
			conn.query(`ALTER TABLE Activity ADD PRIMARY KEY (ID);`);
			conn.query(`ALTER TABLE Activity MODIFY ID int(11) NOT NULL AUTO_INCREMENT;`);
			console.log("- Activity Database Built.");
			console.log("- Activity database will be where the voice chat time for each user will be stored.");
		} else {
			console.log("- Activity Database Exists.");
		}
	});
	console.log('─────────────────────────────────────────────');

	ActivityCheck()
});

const ActivityCheck = () => {
	// check if it should update the roles
	conn.query(`SELECT LastUpdate FROM Top10 ORDER BY ID DESC LIMIT 1`, (err, rows) => {
		if(err) throw err;

		const time = Time() // current time
		const lastUpdate = rows[0].LastUpdate // last db record update

		if(time-lastUpdate < timeToReset) return;

		conn.query(`SELECT * FROM Msgs WHERE Msgs <>0 ORDER BY Msgs`, [Math.floor(maxMembers)], (err, rows) => {
			if(err) throw err;

			client.channels.cache.get('779721531907506197').send(`resseting...`)
			let vcArray = []

			let msgs = rows;
			console.log(msgs)

			conn.query(`
			SELECT UserID,
				SUM(JoinTime) As JVal,
				SUM(LeftTime) AS LVal
			FROM Activity_Reset
			WHERE JoinTime <>0 AND LeftTime <>0
			GROUP BY UserID
			`, (err, rows) => {
				if(err) throw err;
				rows.forEach(r => {
					try {
						if(client.guilds.cache.get(guildID).members.cache.find(user => user.id == r.UserID).roles.cache.has('824867292952657920') || client.guilds.cache.get(guildID).members.cache.find(user => user.id == r.UserID).roles.cache.has('824867721594142740') || client.guilds.cache.get(guildID).members.cache.find(user => user.id == r.UserID).roles.cache.has('824867511564107816')) return;
						vcArray.push({
							user: r.UserID,
							total: r.LVal-r.JVal
						})
					} catch(e) {}
				})
				
				vcArray = vcArray.sort((a, b) => a.total - b.total).slice(Math.floor(vcArray.length-maxMembers))
				
				// check who has the role
				client.guilds.cache.get(guildID).roles.cache.get(roleID).members.forEach(u => {
					// and remove it
					u.roles.remove(client.guilds.cache.get(guildID).roles.cache.get(roleID))
				})
				
				let members = '';

				// check who are the most active members and give them the role
				if(msgs >= 1) {
					msgs = msgs.slice(Math.floor(rows.length-maxMembers))
					console.log('msgs:', msgs)
					msgs.forEach(u => {
						if(u.Msgs == 0) return;					
						client.guilds.cache.get(guildID).members.cache.find(user => user.id == u.UserID).roles.add(client.guilds.cache.get(guildID).roles.cache.get(roleID))
						members += `- ${client.guilds.cache.get(guildID).members.cache.find(user => user.id == u.UserID).user.username}\n`
					})
				}

				console.log('vcArray:', vcArray)
				vcArray.forEach(u => {
					client.guilds.cache.get(guildID).members.cache.find(user => user.id == u.user).roles.add(client.guilds.cache.get(guildID).roles.cache.get(roleID))
					members += `- ${client.guilds.cache.get(guildID).members.cache.find(user => user.id == u.user).user.username}\n`
				})

				client.channels.cache.get('779721531907506197').send(members)

				// update the db's
				conn.query(`INSERT INTO Top10 (LastUpdate) VALUES (?)`, [time], (err) => {
					if(err) throw err;
				})
				conn.query(`UPDATE Msgs SET Msgs = 0`, [time], (err) => {
					if(err) throw err;
				})
				conn.query(`TRUNCATE Activity_Reset`, (err) => {
					if(err) throw err;
				})
			})

		})

	})

	setTimeout(ActivityCheck, 10*60*1000)
}

// User Commands
client.on('message', async message => {
	if (!message.content.startsWith(PREFIX) || message.author.bot) return;
	let args = message.content.substring(PREFIX.length).split(" ");

	switch(args[0]) {
		case 'time': case 'Time':  // Aliasses
			let person;
			if(!args[1]) {
				person = message.author;
			} else {
				person = message.guild.member(message.mentions.users.first());
			}

			conn.query(`SELECT * FROM Activity WHERE UserID = '${person.id}' AND LeftTime > 1`, (err, rows) => {
				if(err) throw err;
				if(rows.length > 0) {
					let total = 0;
					rows.forEach(row => {
						total = total + (row.LeftTime - row.JoinTime);
					});
					total = SecToTime(total);

					return message.channel.send(total);
				} else {
					return message.channel.send(`00:00:00`);
				}
			});
		break;

		// case 'Check': case 'check':
		// 	conn.query(`SELECT * FROM Activity WHERE UserID = '${message.author.id}' AND LeftTime > 1`, (err, rows) => {
		// 		if(err) throw err;
		// 		if(rows.length > 0) {
		// 			let total = 0;
		// 			rows.forEach(row => {
		// 				total = total + (row.LeftTime - row.JoinTime);
		// 			});

		// 			let VIPRole = message.guild.roles.cache.get('894655121768742982');
		// 			let PremiumRole = message.guild.roles.cache.get('894655132673929306');
		// 			let BOOST = message.guild.roles.cache.get('779709424540450857');

		// 			if(message.member.roles.cache.has(BOOST.id))
		// 			{
		// 				message.member.roles.add(PremiumRole);
		// 				return message.channel.send(
		// 					new Discord.MessageEmbed()
		// 						.setColor('GREEN')
		// 						.setTitle('✅')
		// 						.setDescription(`${message.author} | קיבלת את הרול Premium!`)
		// 				);
		// 			}
		// 			// check if the user talked for 7 days = 1296000
		// 			if( total >= 1296000 ) {
		// 				// check if he has the role => if not give him, if yes return "you already have the role"
		// 				if(message.member.roles.cache.has(PremiumRole.id))
		// 				return message.channel.send(
		// 					new Discord.MessageEmbed()
		// 						.setColor('RED')
		// 						.setTitle('שגיאה!')
		// 						.setDescription(`${message.author} יש ברשותך את הרול Premium`)
		// 				);

		// 				message.member.roles.add(PremiumRole);
		// 				return message.channel.send(
		// 					new Discord.MessageEmbed()
		// 						.setColor('GREEN')
		// 						.setTitle('✅')
		// 						.setDescription(`${message.author} | קיבלת את הרול Premium!`)
		// 				);

		// 			} else if( total >= 432000 ) { // 15 days = 432000
		// 				// check if he has the role => if not give him, if yes return "you already have the role"
		// 				if(message.member.roles.cache.has(VIPRole))
		// 				return message.channel.send(
		// 					new Discord.MessageEmbed()
		// 					.setColor('RED')
		// 					.setTitle('שגיאה!')
		// 					.setDescription(`${message.author} | יש ברשותך את הרול VIP`)
		// 				);

		// 				message.member.roles.add(VIPRole);
		// 				return message.channel.send(
		// 					new Discord.MessageEmbed()
		// 					.setColor('GREEN')
		// 					.setTitle('✅')
		// 					.setDescription(`${message.author} | קיבלת את הרול VIP!`)
		// 				);
		// 			} else { // less than
		// 				return message.channel.send(
		// 					new Discord.MessageEmbed()
		// 					.setColor('RED')
		// 					.setTitle('שגיאה!')
		// 					.setDescription(`${message.author} | אין ברשותך רמת פעילות אשר מספיקה על מנת לקבל את אחד הרולים`)
		// 				);
		// 			}

		// 		} else {
		// 			return message.channel.send(`שגיאה`);
		// 		}
		// 	});
		// break;

		case 'Messages': case 'messages': case 'msgs': case 'Msgs': // Aliasses
			let per;
			if(!args[1]) {
				per = message.author;
			} else {
				per = message.guild.member(message.mentions.users.first());
			}
			conn.query(`SELECT Msgs FROM Msgs WHERE UserID = '${per.id}'`, (err, rows) => {
				if(err) throw err;
				if(rows.length > 0) {
					return message.channel.send(`\`${rows[0].Msgs}\` Messages.`);
				} else {
					return message.channel.send('`0` Messages.')
				}
			});
		break;
	}
});


// User Commands
client.on('message', message => {
	if(message.author.bot) return;
	if(CountCMDS == false) if (message.content.startsWith(PREFIX)) return;

	// Check if the user exist, if no insert new row
	conn.query(`SELECT * FROM Msgs WHERE UserID = '${message.author.id}'`, (err, rows) => {
		if(err) throw err;
		if(rows.length > 0) {
			// exists
			conn.query(`UPDATE Msgs SET Msgs = Msgs + 1 WHERE UserID = ${message.author.id}`, (err, rows) => {
				if(err) throw err;
			});
		} else {
			// not exist
			conn.query(`INSERT INTO Msgs (UserID) VALUES ('${message.author.id}');`, (err) => {
				if(err) throw err;
			});
		}
	});

});


client.on('voiceStateUpdate', async (oldMember, newMember) => {

	const newUserChannel = newMember.channelID;
	const oldUserChannel = oldMember.channelID;

	let User = await client.users.fetch(newMember.id, { cache: true });
	let user = await newMember.guild.members.fetch(newMember.id, { cache: true });

	if(newUserChannel === oldUserChannel) return;

	if (oldUserChannel != newUserChannel) {
		if (oldUserChannel == null) {
			conn.query(`INSERT INTO Activity (UserID, ChannelID, JoinTime) VALUES ('${newMember.id}', ${newUserChannel}, '${Time()}');`, (err, rows) => {
				if(err) throw err;
			});
		} else if (newUserChannel == null) {
			conn.query(`SELECT ID FROM Activity WHERE UserID = '${oldMember.id}' AND ChannelID = ${oldUserChannel} ORDER BY ID DESC`, (err, rows) => {
				if(err) throw err;
				if(rows.length > 0) {
					conn.query(`UPDATE Activity SET LeftTime = ${Time()} WHERE ID = ${rows[0].ID}`, (err, rows) => {
						if(err) throw err;
					});
				}
			});
		} else {
			conn.query(`INSERT INTO Activity (UserID, ChannelID, JoinTime) VALUES ('${newMember.id}', ${newUserChannel}, '${Time()}');`, (err, rows) => {
				if(err) throw err;
			});
			conn.query(`SELECT ID FROM Activity WHERE UserID = '${oldMember.id}' AND ChannelID = ${oldUserChannel} ORDER BY ID DESC`, (err, rows) => {
				if(err) throw err;
				if(rows.length > 0) {
					conn.query(`UPDATE Activity SET LeftTime = ${Time()} WHERE ID = ${rows[0].ID}`, (err, rows) => {
						if(err) throw err;
					});
				}
			});
		}
	}
	if (oldUserChannel != newUserChannel) {
		if (oldUserChannel == null) {
			conn.query(`INSERT INTO Activity_Reset (UserID, ChannelID, JoinTime) VALUES ('${newMember.id}', ${newUserChannel}, '${Time()}');`, (err, rows) => {
				if(err) throw err;
			});
		} else if (newUserChannel == null) {
			conn.query(`SELECT ID FROM Activity_Reset WHERE UserID = '${oldMember.id}' AND ChannelID = ${oldUserChannel} ORDER BY ID DESC`, (err, rows) => {
				if(err) throw err;
				if(rows.length > 0) {
					conn.query(`UPDATE Activity_Reset SET LeftTime = ${Time()} WHERE ID = ${rows[0].ID}`, (err, rows) => {
						if(err) throw err;
					});
				}
			});
		} else {
			conn.query(`INSERT INTO Activity_Reset (UserID, ChannelID, JoinTime) VALUES ('${newMember.id}', ${newUserChannel}, '${Time()}');`, (err, rows) => {
				if(err) throw err;
			});
			conn.query(`SELECT ID FROM Activity_Reset WHERE UserID = '${oldMember.id}' AND ChannelID = ${oldUserChannel} ORDER BY ID DESC`, (err, rows) => {
				if(err) throw err;
				if(rows.length > 0) {
					conn.query(`UPDATE Activity_Reset SET LeftTime = ${Time()} WHERE ID = ${rows[0].ID}`, (err, rows) => {
						if(err) throw err;
					});
				}
			});
		}
	}
});