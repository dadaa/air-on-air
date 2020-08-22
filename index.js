class App {
  constructor() {
    this.onClickPlay = this.onClickPlay.bind(this);
    this.onClickAudioMuting = this.onClickAudioMuting.bind(this);

    this.onData = this.onData.bind(this);
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
    $("#play-button").addEventListener("click", this.onClickPlay);

    await this.connect();
  }

  async connect() {
    this.currentUser = null;

    const peer = await this.connectPeer(this.key);
    const room = peer.joinRoom(this.roomId, {
      mode: this.network,
    });

    room.on("data", this.onData);
    room.on("stream", this.onStream);
    room.on("peerLeave", this.onLeave);

    this.peer = peer;
    this.room = room;
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      return stream;
    } catch (e) {
      console.error(e);
      $("#play-form").classList.add("error");
      $("#play-form").textContent = `${ e.name }: please reload`;
      return null;
    }
  }

  async play() {
    const stream = await this.getAudioStream();

    if (!stream) {
      return;
    }

    $("#play-form").classList.add("hidden");
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
	  const processor = audioContext.createScriptProcessor(512);

    const tickEls = document.querySelectorAll(".indicator-tick");

    let previousTime = Date.now();
	  processor.onaudioprocess = e => {
      if (this.currentUser === null && this.isAlreadyPlayed) {
        processor.onaudioprocess = null;
        return;
      }

      if (this.currentUser && this.currentUser !== this.peer.id) {
        processor.onaudioprocess = null;
        return;
      }

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
      this.dispatchToRoom({ signal });

      const tickClassName = signal ? "active" : "inactive";
      for (let i = 0; i < tickEls.length; i++) {
        const tickEl = tickEls[i];
        tickEl.classList.remove("active");
        tickEl.classList.remove("inactive");

        if (rms * tickEls.length > i + 1) {
          tickEl.classList.add(tickClassName);
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

  async onClickPlay() {
    this.play();
  }

  async onData({ data }) {
    if (typeof data.currentUser === "undefined") {
      return;
    }

    if (this.peer.id === data.currentUser) {
      this.isAlreadyPlayed = true;
    }

    this.currentUser = data.currentUser;
    document.thisUser = this.peer.id;
    document.currentUser = data.currentUser;
    document.isAlreadyPlayed = this.isAlreadyPlayed;
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
