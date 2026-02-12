(function () {
  const video = document.getElementById("video");
  const container = document.getElementById("videoContainer");
  const statusEl = document.getElementById("status");

  function setStatus(text, className) {
    statusEl.textContent = text;
    statusEl.className = "status" + (className ? " " + className : "");
  }

  function setError(msg) {
    container.classList.remove("waiting");
    container.classList.add("error");
    container.dataset.error = msg || "연결 실패";
    setStatus("오류", "error");
  }

  let pc = null;

  function createPeerConnection() {
    if (pc) return pc;
    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (stream && video) {
        video.srcObject = stream;
        container.classList.remove("waiting", "error");
        setStatus("연결됨", "connected");
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && window.screenSharePopup) {
        window.screenSharePopup.sendIce(e.candidate);
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setError("연결이 끊어졌습니다.");
      }
    };
    return pc;
  }

  if (!window.screenSharePopup) {
    setError("API 없음");
    return;
  }

  window.screenSharePopup.ready();

  window.screenSharePopup.onOffer(async (sdp) => {
    try {
      setStatus("연결 중...", "");
      const pc = createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      window.screenSharePopup.sendAnswer(pc.localDescription);
    } catch (err) {
      setError(err && err.message ? err.message : "Offer 처리 실패");
    }
  });

  window.screenSharePopup.onIce(async (candidate) => {
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (_) {
      // ignore
    }
  });
})();
