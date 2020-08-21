class App {
  constructor() {
    this.onClickConnect = this.onClickConnect.bind(this);
    this.onClickAudioMuting = this.onClickAudioMuting.bind(this);

    this.onLeave = this.onLeave.bind(this);
    this.onStream = this.onStream.bind(this);

    this.init();
  }

  async init() {
    const url = new URL(document.URL);
    this.key = url.searchParams.get("key");
    this.roomId = url.searchParams.get("roomId");
    this.network = url.searchParams.get("network");

    if (!this.key || !this.roomId || !this.network) {
      $("#connect-form").textContent = "No key, room id or network";
      $("#connect-form").classList.add("error");
      return;
    }

    if (this.network !== "sfu" && this.network !== "mesh") {
      $("#connect-form").textContent = "network should be 'sfu' or 'mesh'";
      $("#connect-form").classList.add("error");
      return;
    }

    $("#room-label").textContent = this.roomId;
    $("#audio-muting").addEventListener("click", this.onClickAudioMuting);
    $("#connect-button").addEventListener("click", this.onClickConnect);
  }

  async connect() {
    const peer = await this.connectPeer(this.key);
    const stream = await this.getAudioStream();
    const room = peer.joinRoom(this.roomId, {
      mode: this.network,
    });

    room.on("stream", this.onStream);
    room.on("peerLeave", this.onLeave);

    this.peer = peer;
    this.room = room;
    this.stream = stream;

    this.play();
  }

  connectPeer(key) {
    return new Promise(r => {
      const peer = new Peer({ key: key });
      peer.on("open", () => r(peer));
    });
  }

  dispatchToRoom(data) {
    this.room.send(data);
  }

  async getAudioStream() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    return stream;
  }

  play() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const mediaStreamSource = audioContext.createMediaStreamSource(this.stream);
	  const processor = audioContext.createScriptProcessor(512);

    const indicatorAmountEls = document.querySelectorAll(".indicator-amount");

    let previousTime = Date.now();
	  processor.onaudioprocess = e => {
      const currentTime = Date.now();
      if (currentTime - previousTime < 100) {
        return;
      }
      previousTime = currentTime;

      const buffer = e.inputBuffer.getChannelData(0)

      let total = 0;
      for (let i = 0; i < buffer.length; i++) {
        total += Math.abs(buffer[i]);
      }

      const rms = Math.sqrt(total / buffer.length);
      const signal = rms > 0.1 ? 1 : 0;
      this.dispatchToRoom(signal);

      const indicateClassName = signal ? "active" : "inactive";
      for (let i = 0; i < indicatorAmountEls.length; i++) {
        const element = indicatorAmountEls[i];
        element.classList.remove("active");
        element.classList.remove("inactive");

        if (rms * indicatorAmountEls.length > i + 1) {
          element.classList.add(indicateClassName);
        }
      }
    };
    mediaStreamSource.connect(processor);
	  processor.connect(audioContext.destination);
  }

  onClickAudioMuting({ target }) {
    target.classList.toggle("disabled");
    const track = this.stream.getAudioTracks()[0];
    track.enabled = !target.classList.contains("disabled");
  }

  async onClickConnect() {
    $("#connect-button").disabled = true;

    try {
      await this.connect();
    } catch (e) {
      console.log(e);
    }

    $("#connect-form").remove();
  }

  async onLeave(peerId) {
    console.log("onLeave:"+peerId);
  }

  async onStream(stream) {
    const presenterVideo = $("#presenter-stream");
    presenterVideo.muted = true;
    presenterVideo.srcObject = stream;
    presenterVideo.playsInline = true;
    presenterVideo.play();
  }
}

function $(selector) {
  return document.querySelector(selector);
}

document.addEventListener("DOMContentLoaded", () => new App());
