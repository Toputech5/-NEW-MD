import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"
import P from "pino"
import qrcode from "qrcode-terminal"

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("auth")

const sock = makeWASocket({
logger: P({ level: "silent" }),
auth: state
})

sock.ev.on("connection.update", ({ connection, qr }) => {

if (qr) {
qrcode.generate(qr, { small: true })
}

if (connection === "open") {
console.log("✅ Topu Bot Connected")
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()
