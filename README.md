# WebRtc

A small WebRTC random video chat project — made just for learning how WebRTC works (signaling, offer/answer, ICE, peer-to-peer video).

## How it works

1. User opens the site → joins a waiting queue on the server.
2. When 2 users are waiting, server matches them and tells one to be the "initiator".
3. Both browsers create a `RTCPeerConnection` and exchange an **offer** and **answer** (connection details) through the server — this is called signaling.
4. They also exchange **ICE candidates** (network info) through the server, using a STUN server to find each other.
5. Once connected, video/audio flows **directly between the two browsers** (peer-to-peer) — the server is no longer involved.
6. Server just relays these messages (offer/answer/ICE) via Socket.IO, and tells the other peer if someone disconnects.

## Tech used

- Node.js + Express + Socket.IO (signaling server)
- React + Vite (frontend)

## How to run

### 1. Clone

```bash
git clone https://github.com/nitish100000100-found/WebRtc.git
cd WebRtc
```

### 2. Start server

```bash
npm install
npm start
```

Runs at `http://localhost:3000`

### 3. Start frontend

```bash
cd fro
npm install
npm run dev
```

Runs at `http://localhost:5173`

Open the frontend URL in two browser tabs to test the video call.
