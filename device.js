class App {
  constructor() {
    this.onClickConnect = this.onClickConnect.bind(this);

    this.onClickCameraMuting = this.onClickCameraMuting.bind(this);
    this.onClickCameraSwitching = this.onClickCameraSwitching.bind(this);

    this.onData = this.onData.bind(this);
    this.onJoin = this.onJoin.bind(this);
    this.onLeave = this.onLeave.bind(this);

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
    $("#camera-muting").addEventListener("click", this.onClickCameraMuting);
    $("#camera-switching").addEventListener("click", this.onClickCameraSwitching);
    $("#connect-button").addEventListener("click", this.onClickConnect);
  }

  async connect() {
    const peer = await this.connectPeer(this.key);
    const stream = await this.getNextVideoStream();
    const room = peer.joinRoom(this.roomId, {
      mode: this.network,
      stream: stream
    });

    room.on("data", this.onData);
    room.on("peerJoin", this.onJoin);
    room.on("peerLeave", this.onLeave);

    this.peer = peer;
    this.room = room;

    const presenterVideo = $("#presenter-stream");
    presenterVideo.muted = true;
    presenterVideo.srcObject = stream;
    presenterVideo.playsInline = true;
    presenterVideo.play();
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

  async getNextVideoStream() {
    const devices = await this.getVideoInputDevices();

    let nextDevice = null;
    if (!this.currentVideoDeviceId) {
      // Use first device.
      nextDevice = devices[0];
    } else {
      const index = devices.findIndex(device => device.deviceId === this.currentVideoDeviceId);
      nextDevice = index === devices.length - 1 ? devices[0] : devices[index + 1];
    }

    const deviceId = nextDevice.deviceId;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { deviceId: deviceId },
    });

    this.currentVideoDeviceId = deviceId;
    return stream;
  }

  async getVideoInputDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === "videoinput");
  }

  async onClickCameraSwitching() {
    const stream = await this.getNextVideoStream();

    // Request to replace remote stream.
    this.room.replaceStream(stream);

    const presenterVideo = $("#presenter-stream");
    presenterVideo.srcObject = stream;
    presenterVideo.play();
  }

  onClickCameraMuting({ target }) {
    target.classList.toggle("disabled");
    const presenterVideo = $("#presenter-stream");
    const track = presenterVideo.srcObject.getVideoTracks()[0];
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
    console.log("onData:"+data.command);
  }

  async onJoin(peerId) {
    console.log("onJoin:"+peerId);
  }

  async onLeave(peerId) {
    console.log("onLeave:"+peerId);
  }
}

function $(selector) {
  return document.querySelector(selector);
}

document.addEventListener("DOMContentLoaded", () => new App());
