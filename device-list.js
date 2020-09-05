const DEVICES = {
  "linz-1": {
    label: "LINZ 1",
    room: "linz-1-test",
    network: "sfu",
    key: "1143d56c-70c8-4ec7-86f7-2686add63e3e",
    cid: "52c30248-e069-11ea-87d0-0242ac130003",
  },
  "linz-2": {
    label: "LINZ 2",
    room: "linz-2-test",
    network: "sfu",
    key: "1143d56c-70c8-4ec7-86f7-2686add63e3e",
    cid: "52c3048c-e069-11ea-87d0-0242ac130003",
  },
  "linz-3": {
    label: "LINZ 3",
    room: "linz-3-test",
    network: "sfu",
    key: "1143d56c-70c8-4ec7-86f7-2686add63e3e",
    cid: "52c305e0-e069-11ea-87d0-0242ac130003",
  },
  "tokyo-1": {
    label: "TOKYO 1",
    room: "tokyo-1-test",
    network: "sfu",
    key: "1143d56c-70c8-4ec7-86f7-2686add63e3e",
    cid: "9f7ea436-e6a7-11ea-adc1-0242ac120002",
  },
  "tokyo-2": {
    label: "TOKYO 2",
    room: "tokyo-2-test",
    network: "sfu",
    key: "1143d56c-70c8-4ec7-86f7-2686add63e3e",
    cid: "9f7ea68e-e6a7-11ea-adc1-0242ac120002",
  },
  "tokyo-3": {
    label: "TOKYO 3",
    room: "tokyo-3-test",
    network: "sfu",
    key: "1143d56c-70c8-4ec7-86f7-2686add63e3e",
    cid: "9f7ea8aa-e6a7-11ea-adc1-0242ac120002",
  },
};

class DeviceList {
  constructor() {
    this.init();
  }

  init() {
    for (const { label, room, key, network } of Object.values(DEVICES)) {
      const link = document.createElement("a");
      link.classList.add("disabled");
      link.id = room;
      link.href = `play.html?roomId=${room}&key=${key}&network=${network}`;

      const nameLabel = document.createElement("p");
      nameLabel.textContent = label;
      link.appendChild(nameLabel);
      const statusLabel = document.createElement("p");
      statusLabel.classList.add("status");
      statusLabel.textContent = "CLOSED";
      link.appendChild(statusLabel);

      const li = document.createElement("li");
      li.appendChild(link);

      $("#device-list").appendChild(li);
    }

    this.start();
  }

  async start() {
    let statuses = {};
    try {
      const response = await fetch("device-statuses.json");
      statuses = await response.json();
    } catch (e) {
      console.error(e);
    }

    for (const [id, { room, key, network }] of Object.entries(DEVICES)) {
      if (statuses[id] === false) {
        // unavailable.
        continue;
      }

      this.observe(room, key, network);
    }
  }

  async observe(roomId, key, network) {
    const peer = await this.connectPeer(key);
    const room = peer.joinRoom(roomId, { mode: network });
    room.on("data", ({ data }) => {
      if (typeof data.currentUser === "undefined") {
        return;
      }

      const link = document.getElementById(roomId);
      const statusLabel = link.querySelector(".status");
      const { currentUser } = data;

      if (currentUser === null) {
        link.classList.remove("disabled");
        statusLabel.textContent = "PLAY";
      } else {
        link.classList.add("disabled");
        statusLabel.textContent = "BUSY";
      }
    });
  }

  connectPeer(key) {
    return new Promise(r => {
      const peer = new Peer({ key: key });
      peer.on("open", () => r(peer));
    });
  }
}

function $(selector) {
  return document.querySelector(selector);
}

document.addEventListener("DOMContentLoaded", () => new DeviceList());
