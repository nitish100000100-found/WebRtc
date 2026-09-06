import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
  const [status, setStatus] = useState("Waiting...");

  // My video
  const myVideoRef = useRef(null);

  // Other user's video
  const otherVideoRef = useRef(null);

  // My camera + mic
  const myStream = useRef(null);

  // WebRTC connection
  const peerConnection = useRef(null);

  // Other user's socket ID
  const peerId = useRef(null);

  // =========================
  // CLEANUP CALL
  // =========================

  const cleanupCall = () => {
    try {
      // =========================
      // CLOSE WEBRTC CONNECTION
      // =========================

      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      // =========================
      // STOP CAMERA + MICROPHONE
      // =========================

      if (myStream.current) {
        myStream.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (error) {
            console.error("TRACK STOP ERROR:", error);
          }
        });

        myStream.current = null;
      }

      // =========================
      // CLEAR MY VIDEO
      // =========================

      if (myVideoRef.current) {
        myVideoRef.current.srcObject = null;
      }

      // =========================
      // CLEAR OTHER VIDEO
      // =========================

      if (otherVideoRef.current) {
        otherVideoRef.current.srcObject = null;
      }

      // =========================
      // CLEAR PEER ID
      // =========================

      peerId.current = null;

    } catch (error) {
      console.error("CLEANUP ERROR:", error);
    } finally {
      // =========================
      // REFRESH PAGE
      // =========================

      window.location.reload();
    }
  };

  useEffect(() => {
    // =========================
    // MATCH
    // =========================

    const handleMatched = async ({ peerId: id, initiator }) => {
      try {
        peerId.current = id;

        setStatus("User found");

        // =========================
        // CREATE WEBRTC CONNECTION
        // =========================

        const pc = new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
          ],
        });

        peerConnection.current = pc;

        // =========================
        // GET CAMERA + MIC
        // =========================

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

        myStream.current = stream;

        // =========================
        // SHOW MY VIDEO
        // =========================

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        // =========================
        // ADD CAMERA + MIC TO WEBRTC
        // =========================

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // =========================
        // RECEIVE OTHER USER
        // =========================

        pc.ontrack = (event) => {
          try {
            if (otherVideoRef.current) {
              otherVideoRef.current.srcObject =
                event.streams[0];
            }

            setStatus("Connected");
          } catch (error) {
            console.error("ONTRACK ERROR:", error);

            cleanupCall();
          }
        };

        // =========================
        // SEND ICE CANDIDATE
        // =========================

        pc.onicecandidate = (event) => {
          try {
            if (event.candidate && peerId.current) {
              socket.emit("ice-candidate", {
                candidate: event.candidate,
                peerId: peerId.current,
              });
            }
          } catch (error) {
            console.error("ICE SEND ERROR:", error);

            cleanupCall();
          }
        };

        // =========================
        // CREATE OFFER
        // =========================

        if (initiator) {
          const offer = await pc.createOffer();

          await pc.setLocalDescription(offer);

          socket.emit("offer", {
            offer,
            peerId: peerId.current,
          });
        }
      } catch (error) {
        console.error("MATCH ERROR:", error);

        cleanupCall();
      }
    };

    // =========================
    // RECEIVE OFFER
    // =========================

    const handleOffer = async ({ offer, peerId: id }) => {
      try {
        peerId.current = id;

        const pc = peerConnection.current;

        if (!pc) {
          throw new Error("No PeerConnection available");
        }

        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        socket.emit("answer", {
          answer,
          peerId: peerId.current,
        });
      } catch (error) {
        console.error("OFFER ERROR:", error);

        cleanupCall();
      }
    };

    // =========================
    // RECEIVE ANSWER
    // =========================

    const handleAnswer = async ({ answer }) => {
      try {
        const pc = peerConnection.current;

        if (!pc) {
          throw new Error("No PeerConnection available");
        }

        await pc.setRemoteDescription(answer);
      } catch (error) {
        console.error("ANSWER ERROR:", error);

        cleanupCall();
      }
    };

    // =========================
    // RECEIVE ICE
    // =========================

    const handleIceCandidate = async ({ candidate }) => {
      try {
        const pc = peerConnection.current;

        if (!pc) {
          throw new Error("No PeerConnection available");
        }

        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("ICE ERROR:", error);

        cleanupCall();
      }
    };

    // =========================
    // OTHER USER LEFT
    // =========================

    const handlePeerDisconnected = () => {
      console.log("PEER DISCONNECTED");

      setStatus("User left");

      // cleanupCall()
      // will also refresh the page
      cleanupCall();
    };

    // =========================
    // REGISTER EVENTS
    // =========================

    socket.on("matched", handleMatched);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on(
      "peer-disconnected",
      handlePeerDisconnected
    );

    // =========================
    // COMPONENT CLEANUP
    // =========================

    return () => {
      socket.off("matched", handleMatched);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off(
        "ice-candidate",
        handleIceCandidate
      );
      socket.off(
        "peer-disconnected",
        handlePeerDisconnected
      );
    };
  }, []);

  // =========================
  // END CALL
  // =========================

  const endCall = () => {
    try {
      console.log("ENDING CALL");

      // Tell server first
      socket.emit("end-call");

      // cleanupCall()
      // will close WebRTC,
      // stop camera/mic,
      // clear refs,
      // and refresh page
      cleanupCall();

    } catch (error) {
      console.error("END CALL ERROR:", error);

      // cleanupCall also refreshes
      cleanupCall();
    }
  };

  // =========================
  // MY AUDIO ON / OFF
  // =========================

  const toggleMyAudio = () => {
    try {
      const audioTrack =
        myStream.current?.getAudioTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    } catch (error) {
      console.error("AUDIO TOGGLE ERROR:", error);

      cleanupCall();
    }
  };

  // =========================
  // MY VIDEO ON / OFF
  // =========================

  const toggleMyVideo = () => {
    try {
      const videoTrack =
        myStream.current?.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    } catch (error) {
      console.error("VIDEO TOGGLE ERROR:", error);

      cleanupCall();
    }
  };

  // =========================
  // OTHER AUDIO MUTE
  // =========================

  const muteOther = () => {
    try {
      if (otherVideoRef.current) {
        otherVideoRef.current.muted =
          !otherVideoRef.current.muted;
      }
    } catch (error) {
      console.error("MUTE OTHER ERROR:", error);

      cleanupCall();
    }
  };

  // =========================
  // OTHER VIDEO SHOW / HIDE
  // =========================

  const hideOtherVideo = () => {
    try {
      if (otherVideoRef.current) {
        otherVideoRef.current.hidden =
          !otherVideoRef.current.hidden;
      }
    } catch (error) {
      console.error("HIDE OTHER VIDEO ERROR:", error);

      cleanupCall();
    }
  };

  return (
    <div>
      <h1>WebRTC Chat</h1>

      <h3>{status}</h3>

      {/* =========================
          MY VIDEO
      ========================= */}

      <div>
        <h3>My Video</h3>

        <video
          ref={myVideoRef}
          autoPlay
          playsInline
          muted
          width="400"
        />

        <div>
          <button onClick={toggleMyAudio}>
            Mute / Unmute My Audio
          </button>

          <button onClick={toggleMyVideo}>
            Stop / Start My Video
          </button>
        </div>
      </div>

      {/* =========================
          OTHER VIDEO
      ========================= */}

      <div>
        <h3>Other User</h3>

        <video
          ref={otherVideoRef}
          autoPlay
          playsInline
          width="400"
        />

        <div>
          <button onClick={muteOther}>
            Mute / Unmute Other
          </button>

          <button onClick={hideOtherVideo}>
            Hide / Show Other Video
          </button>
        </div>
      </div>

      {/* =========================
          END CALL
      ========================= */}

      <div>
        <button onClick={endCall}>
          End Call
        </button>
      </div>
    </div>
  );
}

export default App;