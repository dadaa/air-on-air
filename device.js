const SERVICE_UUID = "dedc07fa-e0b0-4aa3-b411-38c95242ebc7"
const MAX_PLAYING_TIME = 30 * 1000;

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
    this.cid = url.searchParams.get("cid");

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

    if (!this.cid) {
      $("#connect-form").textContent = "No cid found";
      $("#connect-form").classList.add("error");
      return;
    }

    $("#room-label").textContent = this.roomId;
    $("#camera-muting").addEventListener("click", this.onClickCameraMuting);
    $("#camera-switching").addEventListener("click", this.onClickCameraSwitching);
    $("#connect-button").addEventListener("click", this.onClickConnect);
  }

  async connect() {
    this.currentUser = null;
    this.startStatusDispatching();

    const peer = await this.connectPeer(this.key);
    const stream = await this.getNextVideoStream();
//    const ble = await this.getBLECharacteristic();

    const room = peer.joinRoom(this.roomId, {
      mode: this.network,
      stream: stream
    });

    room.on("data", this.onData);
    room.on("peerJoin", this.onJoin);
    room.on("peerLeave", this.onLeave);

    this.peer = peer;
    this.room = room;
//    this.ble = ble;

    const presenterVideo = $("#presenter-stream");
    presenterVideo.muted = true;
    presenterVideo.srcObject = stream;
    presenterVideo.playsInline = true;
    presenterVideo.play();
    this.doAnimation(presenterVideo);
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

  async getBLECharacteristic() {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: false,
      filters: [{ namePrefix: "aironair" }],
      optionalServices: [SERVICE_UUID]
    })
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(this.cid);
    return characteristic;
  }

  async getNextVideoStream() {
    if (!this.currentVideoDeviceId) {
      // Use first device.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            exact: "user"
          }
        },
      });
      this.currentVideoDeviceId = true;
      return stream;
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            exact: "environment"
          }
        },
      });
      this.currentVideoDeviceId = false;
      return stream;
    }
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
    this.doAnimation(presenterVideo);
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

  async onData({ src, data }) {
    if (this.currentUser === null) {
      this.startPlaying(src);
    } else if (this.currentUser !== src) {
      // Another user is playing now.
      return;
    }

    const { signal } = data;
    console.log("signal:"+data.signal);
    const encoder = new TextEncoder();
    const bleValue = encoder.encode(signal);
//    this.ble.writeValue(bleValue);
  }

  async onJoin(peerId) {
    console.log("onJoin:"+peerId);
  }

  async onLeave(peerId) {
    console.log("onLeave:"+peerId);
    if (this.currentUser === peerId) {
      this.stopPlaying();
    }
  }

  startPlaying(user) {
    this.currentUser = user;
    this.playingTimer = setTimeout(() => {
      this.stopPlaying();
    }, MAX_PLAYING_TIME);
  }

  stopPlaying() {
    clearTimeout(this.playingTimer);
    this.currentUser = null;
  }

  startStatusDispatching() {
    setInterval(() => {
      this.dispatchToRoom({ currentUser: this.currentUser });
      try {
        const encoder = new TextEncoder();
        const offValue = encoder.encode("0");
//        this.ble.writeValue(offValue);  
      } catch (e) {
        console.error(e);
      }
    }, 1000);
  }
  
  doAnimation(video) {
    video.animate(
      [
        {
          opacity: 1,
          offset: 0
        },       
        {
          opacity: 1,
          offset: 0.8
        },
        {
          opacity: 0,
          offset: 1
        },
      ],
      {
        duration: 5000,
        fill: "forwards",
      }
    );
  }
}

function $(selector) {
  return document.querySelector(selector);
}

document.addEventListener("DOMContentLoaded", () => new App());
