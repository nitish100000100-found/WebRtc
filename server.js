import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

// Waiting users
let waitingUsers = [];

// Matched users
// userA -> userB
// userB -> userA
const peers = new Map();

io.on("connection", (socket) => {
  console.log("USER CONNECTED:", socket.id);

  // =========================
  // ADD TO WAITING QUEUE
  // =========================

  waitingUsers.push(socket.id);

  console.log("WAITING USERS:", waitingUsers);

  // =========================
  // MATCH TWO USERS
  // =========================

  if (waitingUsers.length >= 2) {
    const userA = waitingUsers.shift();
    const userB = waitingUsers.shift();

    console.log("MATCH FOUND");
    console.log("User A:", userA);
    console.log("User B:", userB);

    // Save peer relationship
    peers.set(userA, userB);
    peers.set(userB, userA);

    // User A = initiator
    io.to(userA).emit("matched", {
      peerId: userB,
      initiator: true,
    });

    // User B = receiver
    io.to(userB).emit("matched", {
      peerId: userA,
      initiator: false,
    });
  }

  // =========================
  // OFFER
  // =========================

  socket.on("offer", ({ offer, peerId }) => {
    console.log("OFFER:", socket.id, "→", peerId);

    io.to(peerId).emit("offer", {
      offer,
      peerId: socket.id,
    });
  });

  // =========================
  // ANSWER
  // =========================

  socket.on("answer", ({ answer, peerId }) => {
    console.log("ANSWER:", socket.id, "→", peerId);

    io.to(peerId).emit("answer", {
      answer,
      peerId: socket.id,
    });
  });

  // =========================
  // ICE CANDIDATE
  // =========================

  socket.on("ice-candidate", ({ candidate, peerId }) => {
    console.log("ICE:", socket.id, "→", peerId);

    io.to(peerId).emit("ice-candidate", {
      candidate,
      peerId: socket.id,
    });
  });

  // =========================
  // END CALL
  // =========================

  socket.on("end-call", () => {
    console.log("CALL ENDED BY:", socket.id);

    const peerId = peers.get(socket.id);

    if (!peerId) {
      console.log("NO PEER FOUND");
      return;
    }

    // Tell the other user that the call ended
    io.to(peerId).emit("peer-disconnected");

    // Remove peer relationship
    peers.delete(socket.id);
    peers.delete(peerId);

    console.log("CALL ENDED:", socket.id, "↔", peerId);
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log("USER DISCONNECTED:", socket.id);

    // Remove from waiting queue
    waitingUsers = waitingUsers.filter(
      (id) => id !== socket.id
    );

    // Find peer
    const peerId = peers.get(socket.id);

    if (peerId) {
      console.log("PEER ALSO NOTIFIED:", peerId);

      io.to(peerId).emit("peer-disconnected");

      peers.delete(socket.id);
      peers.delete(peerId);
    }

    console.log("WAITING USERS:", waitingUsers);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});