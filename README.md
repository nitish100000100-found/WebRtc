# WebRTC Random Video Chat

A minimal **Omegle-style random video chat app** built for learning how WebRTC works end-to-end — random 1-on-1 video/audio matching between strangers, powered by a Node.js signaling server and a React frontend.

## What this project does

1. A user opens the site and their camera/mic access is requested.
2. The backend puts them in a **waiting queue**.
3. As soon as two people are waiting, the server **matches** them together.
4. The two browsers exchange WebRTC connection info (offer/answer/ICE candidates) *through* the server (this is called **signaling**) — but once connected, the actual video/audio streams flow directly between the two browsers, peer-to-peer.
5. Either user can end the call, mute/unmute, turn their camera on/off, or click "Change Person" to get matched with someone new.

## How WebRTC works (in this project)

WebRTC lets two browsers send audio/video directly to each other, but they first need a way to "introduce" themselves — that's what the Node.js server here is for. It **never touches the actual video/audio data**; it only relays small text messages so the two browsers can find each other.

The flow looks like this:

```
Browser A                      Server (Socket.IO)                     Browser B
    |                                  |                                   |
    |--- connects, joins queue ------->|                                   |
    |                                  |<---- connects, joins queue -------|
    |                                  |                                   |
    |<----------- "matched" (initiator: true) ---- "matched" (initiator: false) --->|
    |                                  |                                   |
    |--- creates RTCPeerConnection --- |                                   |
    |--- getUserMedia() (camera/mic) --|                                   |
    |--- creates SDP "offer" -------->|-------- forwards "offer" -------->|
    |                                  |                                   |--- creates SDP "answer"
    |<------- forwards "answer" ------|<------- sends "answer" -----------|
    |                                  |                                   |
    |<==== ICE candidates exchanged both ways through the server ====>    |
    |                                  |                                   |
    |======== once ICE succeeds, video/audio flows DIRECTLY peer-to-peer =======|
```

Step by step, using the terms you'll see in the code:

- **Signaling** — Browsers can't discover each other on their own, so they use the server as a middleman to exchange connection info. This project uses **Socket.IO** for that.
- **Offer / Answer (SDP)** — The initiating browser creates an "offer" describing what media it wants to send/receive (`RTCPeerConnection.createOffer()`), sends it to the other browser via the server. The other browser replies with an "answer" (`createAnswer()`).
- **ICE candidates** — Each browser also has to figure out *how* to actually reach the other one over the network (its IP/port combinations). These are called ICE candidates, discovered with the help of a public **STUN server** (`stun.l.google.com:19302` here), and are also exchanged through the signaling server.
- **Peer connection** — Once both sides have exchanged an offer/answer and enough ICE candidates, `RTCPeerConnection` opens a **direct peer-to-peer** connection between the two browsers. From this point on, video/audio no longer passes through the server at all.
- **Matching queue** — The server keeps a simple in-memory list (`waitingUsers`) of people waiting for a partner. As soon as two are waiting, it pairs them up and tells one of them to be the "initiator" (the one who creates the offer).
- **Disconnect handling** — If either user disconnects or clicks "End Call"/"Change Person", the server notifies the other peer (`peer-disconnected`) so their side can clean up too.

## Tech stack

**Backend** (`/` root)
- [Express](https://expressjs.com/) — minimal HTTP server
- [Socket.IO](https://socket.io/) — WebSocket-based signaling between browsers and the server
- [cors](https://www.npmjs.com/package/cors) — allows the frontend (different port) to connect
- [nodemon](https://www.npmjs.com/package/nodemon) — auto-restarts the server during development

**Frontend** (`/fro`)
- [React 19](https://react.dev/) — UI
- [Vite](https://vitejs.dev/) — dev server & build tool
- [socket.io-client](https://www.npmjs.com/package/socket.io-client) — connects to the signaling server
- Native browser **WebRTC APIs** (`RTCPeerConnection`, `getUserMedia`) — no external WebRTC library needed

## Project structure

```
WebRtc/
├── server.js           # Signaling server (matching, offer/answer/ICE relay)
├── package.json         # Backend dependencies
└── fro/                 # Frontend (React + Vite)
    ├── src/
    │   ├── App.jsx       # All the WebRTC + call UI logic lives here
    │   └── main.jsx
    ├── index.html
    └── package.json      # Frontend dependencies
```

## Getting started

You need two terminals running at the same time — one for the server, one for the frontend.

### 1. Clone the repo

```bash
git clone https://github.com/nitish100000100-found/WebRtc.git
cd WebRtc
```

### 2. Start the signaling server

```bash
# from the project root
npm install
npm start
```

This runs `nodemon server.js`, which starts the server at **http://localhost:3000**.

### 3. Start the frontend

```bash
cd fro
npm install
npm run dev
```

This starts the Vite dev server, by default at **http://localhost:5173**.

### 4. Try it out

Open **http://localhost:5173** in two separate browser tabs/windows (or two different browsers) and allow camera/mic access in both. The two tabs will be matched together automatically and the video call should start.

> The server is currently hardcoded to only accept connections from `http://localhost:5173` (see the `cors` config in `server.js`), and the frontend is hardcoded to connect to `http://localhost:3000` (see `App.jsx`). Update both if you change ports or want to deploy this somewhere other than your local machine.

## Features

- 🔀 Random 1-on-1 matching (Omegle-style queue)
- 🎥 Live peer-to-peer video and audio
- 🎙️ Mute / unmute your own audio
- 📷 Turn your own camera on / off
- 🔇 Mute the other person's audio (locally)
- 🙈 Hide / show the other person's video (locally)
- 🔁 "Change Person" — end the current call and get matched with someone new
- ❌ Automatic cleanup and reconnect handling when the other person disconnects

## Known limitations (things to explore next)

Since this was built for learning, there's plenty of room to extend it:

- No TURN server — calls between users on restrictive/symmetric NATs may fail to connect (only a STUN server is configured). Adding a TURN server would fix this.
- Hardcoded localhost URLs — needs environment variables to work outside local development.
- No text chat alongside video.
- No reconnection/retry logic if the signaling socket itself drops mid-call.

