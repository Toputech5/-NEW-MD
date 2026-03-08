import makeWASocket, {
useMultiFileAuthState,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"
import fs from "fs"
import config from "./config.js"

const prefix = config.PREFIX

async function startBot() {

if (!fs.existsSync("./auth")) {
fs.mkdirSync("./auth")
}

/* SESSION LOADER */

if (config.SESSION_ID && !fs.existsSync("./auth/creds.json")) {

const session = config.SESSION_ID.split(";;;=>")[1]

const decoded = Buffer.from(session, "base64")

fs.writeFileSync("./auth/creds.json", decoded)

console.log("✅ Session loaded")

}

const { state, saveCreds } = await useMultiFileAuthState("./auth")

const sock = makeWASocket({
logger: pino({ level: "silent" }),
auth: state,
printQRInTerminal: false
})

/* CONNECTION STATUS */

sock.ev.on("connection.update", (update) => {

const { connection, lastDisconnect } = update

if (connection === "open") {

console.log("🤖 NEW-MD BOT CONNECTED")

}

if (connection === "close") {

const reason = lastDisconnect?.error?.output?.statusCode

if (reason !== DisconnectReason.loggedOut) {

startBot()

}

}

})

sock.ev.on("creds.update", saveCreds)

/* LOAD PLUGINS */

let plugins = []

fs.readdirSync("./plugins").forEach(file => {

if (file.endsWith(".js")) {

import(`./plugins/${file}`).then(plugin => {

plugins.push(plugin.default)

})

}

})

/* MESSAGE HANDLER */

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if (!msg.message) return

const from = msg.key.remoteJid

const sender = msg.key.participant || from

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

/* AUTO READ */

if (config.AUTO_READ) {

await sock.readMessages([msg.key])

}

/* MODE CONTROL */

if (config.MODE === "private") {

if (!sender.includes(config.OWNER_NUMBER)) return

}

/* COMMAND SYSTEM */

if (!text.startsWith(prefix)) return

const args = text.slice(prefix.length).trim().split(/ +/)

const command = args.shift().toLowerCase()

for (const plugin of plugins) {

if (plugin.name === command) {

try {

await plugin.run(sock, msg, args)

} catch (e) {

console.log(e)

}

}

}

})

}

startBot()
