class App {
  constructor() {
    this.onClickConnect = this.onClickConnect.bind(this);
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
    $("#connect-button").addEventListener("click", this.onClickConnect);
  }

  async connect() {
    const peer = await this.connectPeer(this.key);
    const stream = await this.getAudioStream();
    const room = peer.joinRoom(this.roomId, {
      mode: this.network,
    });

    room.on("data", this.onData);
    room.on("stream", this.onStream);
    room.on("peerLeave", this.onLeave);

    this.peer = peer;
    this.room = room;
    this.stream = stream;
  }

  connectPeer(key) {
    return new Promise(r => {
      const peer = new Peer({ key: key });
      peer.on("open", () => r(peer));
    });
  }

  dispatchToRoom(data) {
    this.onData({ src: this.peer.id, data: data });
  }

  async getAudioStream() {
    const devices = await this.getVideoInputDevices();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    return stream;
  }

  async getVideoInputDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === "videoinput");
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

  async onData({ data }) {
    console.log(data.command);
  }

  async onLeave(peerId) {
    $(`#${ this.getAudienceId(peerId) }`).remove();
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
