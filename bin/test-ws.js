#!/usr/bin/env node

/** Here is a simple local client for testing that the websock server is running correctly */

import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config()

const port = process.env.BACKEND_SERVER_PORT || 3001
// const testPath = process.env.BACKEND_SERVER_PATH || `ws://localhost:${port}/chatbot`;
const testPath = 'wss://wss.plasticeducator.com/chatbot'

console.info(`Opening websocket using path:\n${testPath}`)

const ws = new WebSocket(testPath)

ws.on("open", () => {
	ws.send(
		JSON.stringify({
			type: "request",
			payload: {
				genre: "scifi",
				prompt: "A happy dinosaur in a pizza shop eating a pepperoni pizza with a party hat on its head.",
			},
		}),
	)
})

let text = ""
let imageUrls = []
let streaming = false
ws.on("message", (data) => {
	const buf = Buffer.from(data)
	const json = JSON.parse(buf.toString("utf8"))
	function showImages() {
		imageUrls.forEach((url, i) => {
			console.log(`* Image ${i + 1}: ${url}`)
		})
		console.log("* All expected payloads received. Everything works!")
		ws.close()
	}
	if (json.type === "text") {
		process.stdout.write(json.payload.delta)
		text += json.payload.delta
	} else {
		if (json.type === "state") {
			if (text === "") {
				console.log("* Beginning text stream...")
				console.log("==========================")
			} else if (json.payload.streaming_text === false) {
				streaming = false
				console.log("\r\n")
				console.log("==========================")
				console.log("* End of text stream.")
				if (!imageUrls.length) {
					console.log("* Waiting for images from Livepeer AI...")
				} else {
					showImages()
				}
			}
		}
		// This may seem convoluted but occasionally the images are sent before the text stream is finished so we need to wait for the text stream to finish before displaying the images!
		if (json.type === "image") {
			imageUrls.push(...json.payload.urls)
			if (!streaming) {
				showImages()
			}
		}
	}
})

ws.on("error", (err) => {
	console.log("Error: ", err)
})

ws.on("close", () => {
	console.log("Connection closed")
	process.exit(0)
})
