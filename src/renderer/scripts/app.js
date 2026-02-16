/**
 * Renderer script for file transfer functionality
 * Uses Electron IPC for real file transfer operations
 * Refactored version with no duplicate code
 */

// ============================================================================
// INITIALIZATION & DOM ELEMENTS
// ============================================================================

// Check if electronAPI is available
if (!window.electronAPI) {
  console.error('Electron API not available!');
  showAlert({
    title: 'Application Error',
    message: 'Electron API not loaded. Please restart the application.',
    confirm: false,
  });
}

// Modal elements
const modals = {
  help: document.getElementById('help-modal'),
  mode: document.getElementById('mode-modal'),
  sender: document.getElementById('sender-modal'),
  receiver: document.getElementById('receiver-modal'),
};

// Button elements
const buttons = {
  localTransfer: document.getElementById('local-transfer-button'),
  remoteTransfer: document.getElementById('remote-transfer-button'),
  secureTransfer: document.getElementById('secure-transfer-button'),
  help: document.getElementById('help-button'),
  senderMode: document.getElementById('sender-mode'),
  receiverMode: document.getElementById('receiver-mode'),
  connect: document.getElementById('connect-btn'),
  sendFiles: document.getElementById('send-files-btn'),
  browseFolder: document.getElementById('browse-folder-btn'),
  refreshSenders: document.getElementById('refresh-senders-btn'),
  backToList: document.getElementById('back-to-list-btn'),
  autoDiscover: document.getElementById('auto-discover-btn'),
  manualConnect: document.getElementById('manual-connect-btn'),
  manualProceed: document.getElementById('manual-proceed-btn'),
  toggleManualDetails: document.getElementById('toggle-manual-details'),
};

// Input elements
const inputs = {
  fileDropZone: document.getElementById('file-drop-zone'),
  saveLocation: document.getElementById('save-location'),
  receiverCode: document.getElementById('receiver-code-input'),
  manualIp: document.getElementById('manual-ip-input'),
  manualPort: document.getElementById('manual-port-input'),
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

const state = {
  selectedFilePaths: [],
  saveDirectory: '',
  currentMode: null, // 'sender' or 'receiver'
  isConnected: false,
  transferType: null, // 'local', 'remote', or 'secure'
  isTransferring: false,
  remotePeer: null,
  remoteConnection: null,
  discoveredSenders: [],
  selectedSender: null,
};

// Load saved path from localStorage
try {
  const savedPath = localStorage.getItem('lastSavePath');
  if (savedPath) {
    state.saveDirectory = savedPath;
  }
} catch (e) {
  console.warn('Could not load saved path:', e);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function savePath(path) {
  try {
    localStorage.setItem('lastSavePath', path);
    state.saveDirectory = path;
  } catch (e) {
    console.warn('Could not save path to localStorage:', e);
  }
}

function updateUIElement(id, property, value) {
  const element = document.getElementById(id);
  if (element) {
    if (property === 'text') {
      element.textContent = value;
    } else if (property === 'display') {
      element.style.display = value;
    } else if (property === 'value') {
      element.value = value;
    } else {
      element[property] = value;
    }
  }
}

function isValidIP(ip) {
  const ipRegex =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  return ipRegex.test(ip);
}

function isValidPort(port) {
  const num = Number(port);
  return Number.isInteger(num) && num >= 0 && num <= 65535;
}

// ============================================================================
// CLEANUP & RESET FUNCTIONS
// ============================================================================

async function cleanupConnection() {
  try {
    console.log(
      'Cleaning up connection for mode:',
      state.currentMode,
      'transferType:',
      state.transferType
    );

    // Cleanup remote peer connections (renderer-side PeerJS)
    if (state.remoteConnection) {
      state.remoteConnection.close();
      state.remoteConnection = null;
      console.log('Remote connection closed');
    }
    if (state.remotePeer) {
      state.remotePeer.destroy();
      state.remotePeer = null;
      console.log('Remote peer destroyed');
    }

    // Cleanup backend connections
    if (state.currentMode === 'sender') {
      await window.electronAPI.stopSender(state.transferType);
      console.log('Sender stopped');
    } else if (state.currentMode === 'receiver') {
      await window.electronAPI.disconnectReceiver();
      console.log('Receiver disconnected');
    }

    // Reset state (but keep cached save path)
    state.isConnected = false;
    state.currentMode = null;
    state.selectedFilePaths = [];
    state.transferType = null;
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

function resetConnectionUI(mode) {
  console.log('Resetting UI for mode:', mode);
  state.isTransferring = false;

  if (mode === 'sender') {
    resetSenderUI();
  } else if (mode === 'receiver') {
    resetReceiverUI();
  }
}

function resetSenderUI() {
  updateUIElement('sender-setup', 'display', 'block');
  updateUIElement('sender-transfer', 'display', 'none');

  const fileList = document.getElementById('file-list');
  if (fileList) fileList.innerHTML = '';

  document.querySelectorAll('.file-remove').forEach((el) => (el.style.display = 'inline'));

  if (buttons.sendFiles) {
    buttons.sendFiles.style.display = 'none';
    buttons.sendFiles.disabled = false;
    buttons.sendFiles.textContent = '🚀 Send Files';
  }

  const statusMsg = document.querySelector('#sender-modal .status-message span:last-child');
  if (statusMsg) {
    statusMsg.textContent = 'Connection lost. Please close and restart sender mode.';
  }

  state.selectedFilePaths = [];
}

function resetReceiverUI() {
  updateUIElement('receiver-setup', 'display', 'block');
  updateUIElement('receiver-transfer', 'display', 'none');
  updateUIElement('receiver-code-entry', 'display', 'none');
  updateUIElement('receiver-scanning', 'display', 'none');

  const receivedList = document.getElementById('received-files-list');
  if (receivedList) receivedList.innerHTML = '';

  const senderList = document.getElementById('sender-list');
  if (senderList) senderList.innerHTML = '';

  if (buttons.connect) {
    buttons.connect.disabled = false;
    buttons.connect.textContent = '🔗 Connect to Sender';
  }

  if (inputs.receiverCode) {
    inputs.receiverCode.value = '';
  }

  if (buttons.backToList) {
    buttons.backToList.style.display = 'block'; // Show back button for local mode
  }

  state.selectedSender = null;

  // Restore cached path
  const cachedPath = localStorage.getItem('lastSavePath');
  if (cachedPath && inputs.saveLocation) {
    state.saveDirectory = cachedPath;
    inputs.saveLocation.value = cachedPath;
  }
}

// ============================================================================
// PEER JS UTILITIES
// ============================================================================

function initializePeerJS() {
  if (typeof Peer === 'undefined') {
    throw new Error('PeerJS library not loaded');
  }

  return new Peer({
    host: '0.peerjs.com',
    secure: true,
    port: 443,
    debug: 2,
  });
}

function setupPeerEventHandlers(peer, { onOpen, onError, onDisconnected }) {
  peer.on('open', onOpen);
  peer.on('error', onError);
  peer.on('disconnected', onDisconnected);
}

// ============================================================================
// EVENT LISTENERS FROM MAIN PROCESS
// ============================================================================

window.electronAPI.onConnectionStatus((status) => {
  console.log('Connection status:', status);
  state.isConnected = status.connected;
  state.currentMode = status.mode;

  if (status.connected && status.mode === 'sender') {
    updateUIElement('sender-setup', 'display', 'none');
    updateUIElement('sender-transfer', 'display', 'block');
  } else if (!status.connected && status.mode === 'sender') {
    updateUIElement('sender-setup', 'display', 'block');
    updateUIElement('sender-transfer', 'display', 'none');
  } else if (status.connected && status.mode === 'receiver') {
    updateUIElement('receiver-setup', 'display', 'none');
    updateUIElement('receiver-code-entry', 'display', 'none');
    updateUIElement('receiver-transfer', 'display', 'block');

    const savePathDisplay = document.getElementById('save-path-display');
    if (savePathDisplay) {
      savePathDisplay.textContent = state.saveDirectory || 'Downloads folder';
    }

    console.log('Connected to sender, ready to receive files');
  } else if (!status.connected && status.mode === 'receiver') {
    updateUIElement('receiver-setup', 'display', 'block');
    updateUIElement('receiver-transfer', 'display', 'none');
  }
});

window.electronAPI.onConnectionLost((info) => {
  console.error('Connection lost:', info);
  state.isConnected = false;

  setTimeout(() => {
    const messages = {
      sender: {
        title: '🔌 Receiver Disconnected',
        message: 'The receiver has disconnected from your transfer session.',
        action:
          'What you can do:\n\n' +
          '• Wait for the receiver to reconnect (if they return soon)\n' +
          '• Close this window and start a new sender session',
      },
      receiver: {
        title: '🔌 Sender Disconnected',
        message: 'The sender has closed the connection or stopped the transfer.',
        action:
          'What you need to do:\n\n' +
          '• Close this dialog\n' +
          '• Start a new transfer session\n' +
          '• Reconnect to the sender',
      },
    };

    const msg = messages[info.mode];
    if (msg) {
      appuiToast.error(`Connection lost: ${info.reason}`, 5000);
      appuiAlert.show({
        title: msg.title,
        message: `${msg.message}\n\n${msg.action}\n\nReason: ${info.reason || 'Unknown'}`,
        confirm: false,
      });
    }

    resetConnectionUI(info.mode);
  }, 100);
});

window.electronAPI.onFileProgress((progress) => {
  console.log('File progress:', progress);
  if (state.currentMode === 'receiver') {
    ensureReceiverFileItem(progress);
  }
  updateFileProgress(progress);
});

window.electronAPI.onFileReceived((file) => {
  console.log('File received:', file);
  updateReceivedFileComplete(file);
});

window.electronAPI.onTransferComplete(() => {
  console.log('Transfer complete!');
  state.isTransferring = false;

  if (buttons.sendFiles) {
    buttons.sendFiles.textContent = '✅ All Files Sent!';
    setTimeout(() => {
      buttons.sendFiles.textContent = '🚀 Send Files';
      buttons.sendFiles.disabled = false;
      state.selectedFilePaths = [];
    }, 2000);
  }
});

window.electronAPI.onError((error) => {
  console.error('Transfer error:', error);

  const errorMessages = {
    ECONNREFUSED:
      '❌ Connection Refused\n\nCould not connect to the sender.\n\nPlease check:\n1. The IP address and port are correct\n2. The sender is running and waiting for connection\n3. Both devices are on the same network\n4. Firewall is not blocking the connection',
    ETIMEDOUT:
      '❌ Connection Timeout\n\nThe connection attempt timed out.\n\nPlease check:\n1. The sender is still running\n2. Network connection is stable\n3. Both devices can reach each other',
    ENOTFOUND:
      '❌ Host Not Found\n\nCould not find the sender at the specified IP address.\n\nPlease verify the IP address is correct.',
  };

  let userMessage = 'Error: ' + error;
  for (const [code, msg] of Object.entries(errorMessages)) {
    if (error.includes(code)) {
      userMessage = msg;
      break;
    }
  }

  appuiAlert.show({
    title: 'Transfer Error',
    message: userMessage,
    confirm: false,
  });
});

// ============================================================================
// MODAL CONTROLS
// ============================================================================

async function handleModalClose(modalId) {
  const modal = document.getElementById(modalId);

  if ((modalId === 'sender-modal' || modalId === 'receiver-modal') && state.isConnected) {
    const shouldClose = await appuiAlert.show({
      title: '⚠️ Warning: You are still connected!',
      message:
        'Closing this window will disconnect the transfer session.\n\nAre you sure you want to close?',
      confirm: true,
    });

    if (!shouldClose) return;

    await cleanupConnection();
  }

  modal.style.display = 'none';

  if (modalId === 'sender-modal' || modalId === 'receiver-modal') {
    await cleanupConnection();
    state.transferType = null;
  }
}

document.querySelectorAll('.close-modal').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-modal');
    handleModalClose(modalId);
  });
});

// Open modals
buttons.localTransfer.addEventListener('click', () => {
  modals.mode.style.display = 'block';
  state.transferType = 'local';
});

buttons.remoteTransfer.addEventListener('click', () => {
  modals.mode.style.display = 'block';
  state.transferType = 'remote';
});

buttons.secureTransfer.addEventListener('click', () => {
  modals.mode.style.display = 'block';
  state.transferType = 'secure';
});

buttons.help.addEventListener('click', () => {
  modals.help.style.display = 'block';
});

// ============================================================================
// SENDER MODE
// ============================================================================

buttons.senderMode.addEventListener('click', async () => {
  try {
    modals.mode.style.display = 'none';
    state.currentMode = 'sender';
    console.log('Selected transfer type:', state.transferType);

    const senderFunctions = {
      local: localSender,
      remote: remoteSender,
      secure: secureSender,
    };

    const senderFn = senderFunctions[state.transferType];
    if (senderFn) {
      await senderFn();
    }
  } catch (error) {
    console.error('Failed to start sender:', error);
    appuiToast.error('Failed to start sender mode: ' + error.message, 5000);
    modals.sender.style.display = 'none';
    state.currentMode = null;
  }
});

async function localSender() {
  console.log('Starting LOCAL sender mode');
  modals.sender.style.display = 'block';

  if (buttons.toggleManualDetails) buttons.toggleManualDetails.style.display = 'block';
  updateUIElement('manual-connection-details', 'display', 'none');
  updateUIElement('sender-setup', 'display', 'block');
  updateUIElement('sender-transfer', 'display', 'none');
  document.getElementById('file-list').innerHTML = '';
  state.selectedFilePaths = [];
  if (buttons.sendFiles) buttons.sendFiles.style.display = 'none';

  updateUIElement('service-name', 'text', 'Starting...');
  const statusMsg = document.querySelector('#sender-modal .status-message span:last-child');
  if (statusMsg) statusMsg.textContent = 'Starting local server...';

  const result = await window.electronAPI.startSender(state.transferType);

  const hostname = result.hostname || 'Unknown Device';
  updateUIElement('service-name', 'text', `${hostname} (Local)`);
  updateUIElement('connection-code', 'text', result.code);
  updateUIElement('sender-ip', 'text', result.ip);
  updateUIElement('sender-port', 'text', result.port);

  if (statusMsg) statusMsg.textContent = 'Waiting for receiver to connect (Local Network)...';
}

async function remoteSender() {
  console.log('Starting REMOTE sender mode');

  try {
    state.remotePeer = initializePeerJS();

    modals.sender.style.display = 'block';
    updateUIElement('service-name', 'text', 'Loading...');
    updateUIElement('connection-code', 'text', 'Loading...');
    const statusMsg = document.querySelector('#sender-modal .status-message span:last-child');
    if (statusMsg) statusMsg.textContent = 'Connecting to PeerJS server...';

    setupPeerEventHandlers(state.remotePeer, {
      onOpen: (id) => {
        console.log('PeerJS connected! Peer ID:', id);
        updateUIElement('service-name', 'text', 'Remote Transfer (Internet)');
        updateUIElement('connection-code', 'text', id);
        updateUIElement('sender-ip', 'text', 'N/A (P2P)');
        updateUIElement('sender-port', 'text', 'N/A (P2P)');
        if (statusMsg) statusMsg.textContent = 'Waiting for receiver to connect (via Internet)...';
        appuiToast.success('Remote sender ready! Share the code with receiver.', 3000);
      },
      onError: (err) => {
        console.error('PeerJS error:', err);
        appuiToast.error('PeerJS error: ' + err.message, 5000);
        modals.sender.style.display = 'none';
        state.currentMode = null;
        if (state.remotePeer) {
          state.remotePeer.destroy();
          state.remotePeer = null;
        }
      },
      onDisconnected: () => {
        console.warn('Disconnected from PeerJS server, attempting to reconnect...');
        appuiToast.warn('Connection lost, reconnecting...', 3000);
        state.remotePeer.reconnect();
      },
    });

    state.remotePeer.on('connection', async (conn) => {
      console.log('Receiver connected via PeerJS:', conn.peer);
      state.remoteConnection = conn;
      state.isConnected = true;

      if (statusMsg) statusMsg.textContent = 'Receiver connected! Ready to send files.';
      appuiToast.success('Receiver connected via internet!', 3000);

      if (buttons.sendFiles) buttons.sendFiles.style.display = 'block';

      conn.on('data', (data) => console.log('Received data from receiver:', data));
      conn.on('close', () => {
        console.log('Receiver disconnected');
        state.isConnected = false;
        appuiToast.warn('Receiver disconnected', 3000);
      });
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        appuiToast.error('Connection error: ' + err.message, 5000);
      });

      await window.electronAPI.startSender(state.transferType);
    });
  } catch (error) {
    console.error('Failed to start remote sender:', error);
    appuiToast.error('Failed to start remote sender: ' + error.message, 5000);
    modals.sender.style.display = 'none';
    state.currentMode = null;
  }
}

async function secureSender() {
  console.log('Starting SECURE sender mode');
  appuiAlert.show({
    title: '🔐 Secure Transfer',
    message:
      'This feature adds end-to-end encryption to file transfers.\n\nComing soon! Current transfers use basic TCP without encryption.',
    confirm: false,
  });
}

// Toggle Manual Connection Details
if (buttons.toggleManualDetails) {
  const manualConnectionDetails = document.getElementById('manual-connection-details');
  buttons.toggleManualDetails.addEventListener('click', () => {
    const isHidden = manualConnectionDetails.style.display === 'none';
    manualConnectionDetails.style.display = isHidden ? 'block' : 'none';
    buttons.toggleManualDetails.innerHTML = isHidden
      ? '🔧 Hide Manual Connection Details'
      : '🔧 Show Manual Connection Details';
  });
}

// ============================================================================
// RECEIVER MODE
// ============================================================================

buttons.receiverMode.addEventListener('click', async () => {
  try {
    modals.mode.style.display = 'none';
    state.currentMode = 'receiver';

    const receiverFunctions = {
      local: localReceiver,
      remote: remoteReceiver,
      secure: secureReceiver,
    };

    const receiverFn = receiverFunctions[state.transferType];
    if (receiverFn) {
      await receiverFn();
    }
  } catch (error) {
    state.currentMode = null;
    console.error('Failed to start receiver:', error);
    appuiToast.error('Failed to start receiver mode: ' + error.message, 5000);
  }
});

async function localReceiver() {
  console.log('Starting LOCAL receiver mode');
  modals.receiver.style.display = 'block';

  if (buttons.toggleManualDetails) buttons.toggleManualDetails.style.display = 'block';
  updateUIElement('manual-connection-details', 'display', 'none');
  updateUIElement('receiver-transfer', 'display', 'none');
  document.getElementById('received-files-list').innerHTML = '';

  const savedPath = localStorage.getItem('lastSavePath');
  if (savedPath && inputs.saveLocation) {
    inputs.saveLocation.value = savedPath;
    state.saveDirectory = savedPath;
  } else if (inputs.saveLocation) {
    inputs.saveLocation.value = '';
    state.saveDirectory = '';
  }

  await discoverAvailableSenders();
}

async function remoteReceiver() {
  console.log('Starting REMOTE receiver mode');

  try {
    state.remotePeer = initializePeerJS();

    modals.receiver.style.display = 'block';
    updateUIElement('auto-discovery-section', 'display', 'none');
    updateUIElement('manual-connection-section', 'display', 'none');
    updateUIElement('receiver-setup', 'display', 'none');
    updateUIElement('receiver-code-entry', 'display', 'block');
    updateUIElement('receiver-transfer', 'display', 'none');

    if (inputs.receiverCode) {
      inputs.receiverCode.value = '';
      inputs.receiverCode.placeholder = 'Enter sender peer ID';
      inputs.receiverCode.setAttribute('maxlength', '100');
      setTimeout(() => inputs.receiverCode.focus(), 100);
    }

    if (buttons.backToList) buttons.backToList.style.display = 'none';
    updateUIElement('selected-sender-name', 'text', 'Remote Sender (Internet)');

    appuiToast.info('Connecting to PeerJS server...', 3000);

    setupPeerEventHandlers(state.remotePeer, {
      onOpen: (id) => {
        console.log('PeerJS receiver ready! Peer ID:', id);
        appuiToast.success('Ready to connect to sender!', 3000);
      },
      onError: (err) => {
        console.error('PeerJS error:', err);
        appuiToast.error('PeerJS error: ' + err.message, 5000);
        modals.receiver.style.display = 'none';
        state.currentMode = null;
        if (state.remotePeer) {
          state.remotePeer.destroy();
          state.remotePeer = null;
        }
        if (buttons.connect) {
          buttons.connect.disabled = false;
          buttons.connect.textContent = '🔗 Connect to Sender';
        }
      },
      onDisconnected: () => {
        console.warn('Disconnected from PeerJS server, attempting to reconnect...');
        appuiToast.warn('Connection lost, reconnecting...', 3000);
        state.remotePeer.reconnect();
      },
    });
  } catch (error) {
    console.error('Failed to start remote receiver:', error);
    appuiToast.error('Failed to start remote receiver: ' + error.message, 5000);
    modals.receiver.style.display = 'none';
    state.currentMode = null;
  }
}

async function secureReceiver() {
  console.log('Starting SECURE receiver mode');
  appuiAlert.show({
    title: '🔐 Secure Transfer',
    message:
      'This feature adds end-to-end encryption to file transfers.\n\nComing soon! Current transfers use basic TCP without encryption.',
    confirm: false,
  });
}

// ============================================================================
// SENDER DISCOVERY & CONNECTION
// ============================================================================

async function discoverAvailableSenders() {
  try {
    updateUIElement('receiver-scanning', 'display', 'block');
    updateUIElement('receiver-setup', 'display', 'none');
    updateUIElement('receiver-code-entry', 'display', 'none');
    updateUIElement('auto-discovery-section', 'display', 'block');

    console.log('Scanning for senders...');

    const services = await window.electronAPI.discoverServices();
    state.discoveredSenders = services;

    console.log('Found senders:', services);

    updateUIElement('receiver-scanning', 'display', 'none');
    updateUIElement('receiver-setup', 'display', 'block');

    const senderListContainer = document.getElementById('sender-list');
    senderListContainer.innerHTML = '';

    if (services.length === 0) {
      senderListContainer.innerHTML =
        '<p style="text-align: center; color: #999; padding: 20px;">No senders found nearby. Make sure sender is running.</p>';
    } else {
      services.forEach((service, index) => {
        const senderItem = document.createElement('div');
        senderItem.className = 'sender-item';
        senderItem.dataset.index = index;
        senderItem.innerHTML = `
          <div class="sender-info">
            <strong>${service.name}</strong>
            <small>${service.host}:${service.port}</small>
          </div>
          <div class="sender-action">→</div>
        `;
        senderItem.addEventListener('click', () => selectSender(index));
        senderListContainer.appendChild(senderItem);
      });
    }
  } catch (error) {
    console.error('Failed to discover senders:', error);
    updateUIElement('receiver-scanning', 'display', 'none');
    updateUIElement('receiver-setup', 'display', 'block');

    const senderListContainer = document.getElementById('sender-list');
    senderListContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p style="color: #e53e3e; margin-bottom: 10px;">⚠️ Failed to scan for senders</p>
        <p style="color: #999; font-size: 0.9em; margin-bottom: 15px;">${error.message || 'Unknown error'}</p>
        <p style="color: #666; font-size: 0.85em;">Make sure:</p>
        <ul style="color: #666; font-size: 0.85em; text-align: left; display: inline-block; margin: 10px 0;">
          <li>Sender is running on the same network</li>
          <li>Both devices are on the same Wi-Fi/network</li>
          <li>Firewall allows mDNS (port 5353 UDP)</li>
        </ul>
      </div>
    `;
  }
}

function selectSender(index) {
  state.selectedSender = state.discoveredSenders[index];
  console.log('Selected sender:', state.selectedSender);

  updateUIElement('receiver-setup', 'display', 'none');
  updateUIElement('receiver-code-entry', 'display', 'block');
  updateUIElement('selected-sender-name', 'text', state.selectedSender.name);

  if (inputs.receiverCode) {
    inputs.receiverCode.value = '';
    inputs.receiverCode.placeholder = 'XXX-XXX';
    inputs.receiverCode.setAttribute('maxlength', '7');
    setTimeout(() => inputs.receiverCode.focus(), 100);
  }
}

// ============================================================================
// CONNECTION HANDLERS
// ============================================================================

buttons.connect.addEventListener('click', async () => {
  if (state.transferType === 'remote') {
    await handleRemoteConnection();
  } else {
    await handleLocalConnection();
  }
});

async function handleRemoteConnection() {
  const peerID = inputs.receiverCode.value.trim();

  if (!peerID) {
    appuiToast.warn('Please enter the sender peer ID', 4000);
    return;
  }

  try {
    buttons.connect.textContent = '⏳ Connecting...';
    buttons.connect.disabled = true;

    console.log('Connecting to sender peer:', peerID);
    state.remoteConnection = state.remotePeer.connect(peerID, { reliable: true });

    state.remoteConnection.on('open', () => {
      console.log('Connected to sender via PeerJS!');
      state.isConnected = true;

      updateUIElement('receiver-code-entry', 'display', 'none');
      updateUIElement('receiver-transfer', 'display', 'block');

      const saveLoc = inputs.saveLocation.value.trim();
      state.saveDirectory = saveLoc || '';

      const savePathDisplay = document.getElementById('save-path-display');
      if (savePathDisplay) {
        savePathDisplay.textContent = state.saveDirectory || 'Downloads folder';
      }

      if (state.saveDirectory) savePath(state.saveDirectory);

      appuiToast.success('Connected to sender! Waiting for files...', 3000);
      buttons.connect.textContent = '🔗 Connect to Sender';
      buttons.connect.disabled = false;
    });

    state.remoteConnection.on('data', handleRemoteData);
    state.remoteConnection.on('close', () => {
      console.log('Sender disconnected');
      state.isConnected = false;
      appuiToast.warn('Sender disconnected', 3000);
      setTimeout(() => {
        appuiAlert.show({
          title: '🔌 Sender Disconnected',
          message:
            'The sender has closed the connection.\n\nPlease close this window and start a new transfer if needed.',
          confirm: false,
        });
      }, 100);
    });

    state.remoteConnection.on('error', (err) => {
      console.error('Connection error:', err);
      appuiToast.error('Connection error: ' + err.message, 5000);
      buttons.connect.textContent = '🔗 Connect to Sender';
      buttons.connect.disabled = false;
    });
  } catch (error) {
    console.error('Failed to connect:', error);
    appuiToast.error('Failed to connect: ' + error.message, 5000);
    buttons.connect.textContent = '🔗 Connect to Sender';
    buttons.connect.disabled = false;
  }
}

async function handleLocalConnection() {
  const code = inputs.receiverCode.value.trim().toUpperCase();
  const currentSavePath = inputs.saveLocation.value.trim();

  if (!code || code.length < 7) {
    appuiToast.warn('Please enter the complete connection code (format: XXX-XXX)', 4000);
    return;
  }

  if (!state.selectedSender) {
    appuiToast.warn('No sender selected. Please go back and select a sender.', 4000);
    return;
  }

  try {
    buttons.connect.textContent = '⏳ Connecting...';
    buttons.connect.disabled = true;

    const result = await window.electronAPI.connectToSender(
      state.selectedSender.host,
      state.selectedSender.port,
      code,
      currentSavePath || undefined
    );

    if (result && result.saveDir) {
      savePath(result.saveDir);
    }

    console.log('Authentication successful, waiting for files...');
  } catch (error) {
    console.error('Connection failed:', error);

    let errorMsg = error.message;
    if (errorMsg.includes('Invalid connection code')) {
      errorMsg =
        '❌ Invalid Connection Code\n\nThe code you entered does not match.\nPlease check the code and try again.';
    }

    appuiAlert.show({
      title: 'Connection Failed',
      message: errorMsg,
      confirm: false,
    });
    buttons.connect.textContent = '🔗 Connect';
    buttons.connect.disabled = false;
  }
}

function handleRemoteData(data) {
  console.log('Received data from sender:', data);

  if (data.type === 'file-start') {
    const fileList = document.getElementById('received-files-list');
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.fileNumber = data.currentFile;
    fileItem.dataset.fileName = data.fileName;
    fileItem.innerHTML = `
      <span class="file-icon">📄</span>
      <div class="file-info">
        <div class="file-name">${data.fileName}</div>
        <div class="file-size">Receiving...</div>
      </div>
      <span class="file-status">⬇️</span>
    `;
    fileList.appendChild(fileItem);
  } else if (data.type === 'file-chunk') {
    updateFileProgress({
      currentFile: data.currentFile,
      fileName: data.fileName,
      receivedBytes: data.bytesTransferred,
      totalBytes: data.fileSize,
      progress: data.progress,
    });
  } else if (data.type === 'file-complete') {
    updateReceivedFileComplete({
      currentFile: data.currentFile,
      fileName: data.fileName,
      fileSize: data.fileSize,
      savePath: state.saveDirectory || 'Downloads',
    });

    if (state.remoteConnection) {
      state.remoteConnection.send({ type: 'ack', fileName: data.fileName });
    }
  } else if (data.type === 'transfer-complete') {
    console.log('All files received!');
    appuiToast.success('All files received successfully!', 4000);
  }
}

// ============================================================================
// RECEIVER BUTTON HANDLERS
// ============================================================================

if (buttons.refreshSenders) {
  buttons.refreshSenders.addEventListener('click', async () => {
    console.log('Refreshing sender list...');
    await discoverAvailableSenders();
  });
}

if (buttons.backToList) {
  buttons.backToList.addEventListener('click', () => {
    console.log('Going back to sender list...');
    state.selectedSender = null;
    updateUIElement('receiver-code-entry', 'display', 'none');
    updateUIElement('receiver-setup', 'display', 'block');

    if (inputs.manualIp) inputs.manualIp.value = '';
    if (inputs.manualPort) inputs.manualPort.value = '';
  });
}

if (buttons.autoDiscover && buttons.manualConnect) {
  buttons.autoDiscover.addEventListener('click', () => {
    buttons.autoDiscover.style.background = '#4caf50';
    buttons.manualConnect.style.background = '#666';
    updateUIElement('auto-discovery-section', 'display', 'block');
    updateUIElement('manual-connection-section', 'display', 'none');
    discoverAvailableSenders();
  });

  buttons.manualConnect.addEventListener('click', () => {
    buttons.manualConnect.style.background = '#4caf50';
    buttons.autoDiscover.style.background = '#666';
    updateUIElement('auto-discovery-section', 'display', 'none');
    updateUIElement('manual-connection-section', 'display', 'block');
  });
}

// Manual IP input validation
if (inputs.manualIp) {
  inputs.manualIp.addEventListener('input', (e) => {
    const input = e.target;
    const cursorPosition = input.selectionStart;

    let value = input.value.replace(/[^0-9.]/g, '').replace(/\.{2,}/g, '.');
    const parts = value.split('.');
    if (parts.length > 4) {
      value = parts.slice(0, 4).join('.');
    }

    input.value = value;
    input.setSelectionRange(cursorPosition, cursorPosition);
    input.style.border = isValidIP(input.value) ? '2px solid green' : '2px solid red';
  });
}

// Manual port input validation
if (inputs.manualPort) {
  inputs.manualPort.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    e.target.style.border = isValidPort(e.target.value) ? '2px solid green' : '2px solid red';
  });
}

// Manual connection proceed
if (buttons.manualProceed) {
  buttons.manualProceed.addEventListener('click', () => {
    const ip = inputs.manualIp.value.trim();
    const port = parseInt(inputs.manualPort.value.trim(), 10);

    if (!ip) {
      appuiToast.warn('Please enter the sender IP address', 4000);
      inputs.manualIp.focus();
      return;
    }

    if (!isValidIP(ip)) {
      appuiToast.warn('Invalid IP address format. Example: 192.168.1.100', 4000);
      inputs.manualIp.focus();
      return;
    }

    const octets = ip.split('.');
    if (octets.some((octet) => parseInt(octet, 10) > 255)) {
      appuiToast.warn('Invalid IP address. Each number must be between 0-255', 4000);
      inputs.manualIp.focus();
      return;
    }

    if (!port || port < 1024 || port > 65535) {
      appuiToast.warn('Please enter a valid port number (1024-65535)', 4000);
      inputs.manualPort.focus();
      return;
    }

    state.selectedSender = {
      name: `Manual: ${ip}:${port}`,
      host: ip,
      port: port,
      addresses: [ip],
      manual: true,
    };

    console.log('Manual sender configured:', state.selectedSender);

    updateUIElement('receiver-setup', 'display', 'none');
    updateUIElement('receiver-code-entry', 'display', 'block');
    updateUIElement('selected-sender-name', 'text', state.selectedSender.name);

    if (inputs.receiverCode) {
      inputs.receiverCode.value = '';
      inputs.receiverCode.placeholder = 'XXX-XXX';
      inputs.receiverCode.setAttribute('maxlength', '7');
      setTimeout(() => inputs.receiverCode.focus(), 100);
    }
  });
}

// Auto-format connection code input
if (inputs.receiverCode) {
  inputs.receiverCode.addEventListener('input', (e) => {
    if (state.transferType === 'local') {
      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (value.length > 3) {
        value = value.slice(0, 3) + '-' + value.slice(3, 6);
      }
      e.target.value = value;
    }
  });
}

// Browse folder
if (buttons.browseFolder) {
  buttons.browseFolder.addEventListener('click', async () => {
    try {
      const result = await window.electronAPI.selectFolder();
      if (!result.canceled && result.folderPath) {
        inputs.saveLocation.value = result.folderPath;
        savePath(result.folderPath);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
      appuiToast.error('Failed to select folder: ' + error.message, 5000);
    }
  });
}

// ============================================================================
// FILE SELECTION AND SENDING
// ============================================================================

inputs.fileDropZone.addEventListener('click', async () => {
  if (state.isTransferring) {
    appuiToast.warn(
      '⚠️ Transfer in progress! Please wait for the current transfer to complete before selecting new files.',
      5000
    );
    return;
  }

  try {
    const result = await window.electronAPI.selectFiles();
    if (!result.canceled && result.filePaths.length > 0) {
      if (state.selectedFilePaths.length === 0) {
        state.selectedFilePaths = result.filePaths;
        document.getElementById('file-list').innerHTML = '';
      } else {
        state.selectedFilePaths.push(...result.filePaths);
      }

      displaySelectedFiles(state.selectedFilePaths);

      if (buttons.sendFiles) {
        buttons.sendFiles.disabled = false;
        buttons.sendFiles.textContent = '🚀 Send Files';
        buttons.sendFiles.style.display = 'block';
      }

      console.log(`Selected ${state.selectedFilePaths.length} file(s)`);
    }
  } catch (error) {
    console.error('Failed to select files:', error);
    appuiToast.error('Failed to select files: ' + error.message, 5000);
  }
});

// Drag and drop
inputs.fileDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  inputs.fileDropZone.classList.add('drag-over');
});

inputs.fileDropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  inputs.fileDropZone.classList.remove('drag-over');
});

inputs.fileDropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  inputs.fileDropZone.classList.remove('drag-over');

  if (state.isTransferring) {
    appuiToast.warn(
      '⚠️ Transfer in progress! Please wait for the current transfer to complete before adding new files.',
      5000
    );
    return;
  }

  try {
    const files = Array.from(e.dataTransfer.files);
    const filePaths = [];

    for (const file of files) {
      const filePath = window.electronAPI.getFilePathFromFile(file);
      if (filePath) filePaths.push(filePath);
    }

    if (filePaths.length > 0) {
      if (state.selectedFilePaths.length === 0) {
        state.selectedFilePaths = filePaths;
        document.getElementById('file-list').innerHTML = '';
      } else {
        state.selectedFilePaths.push(...filePaths);
      }

      displaySelectedFiles(state.selectedFilePaths);
      console.log(`Dropped ${filePaths.length} file(s)`);
    } else {
      appuiToast.error('Could not get file paths. Please use the "Browse" button instead.', 5000);
    }
  } catch (error) {
    console.error('Error handling dropped files:', error);
    appuiToast.error('Failed to process dropped files: ' + error.message, 5000);
  }
});

function displaySelectedFiles(filePaths) {
  const fileList = document.getElementById('file-list');
  fileList.innerHTML = '';

  filePaths.forEach((filePath, index) => {
    const fileName = filePath.split(/[/\\]/).pop();
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.filePath = filePath;
    fileItem.innerHTML = `
      <span class="file-icon">📄</span>
      <div class="file-info">
        <div class="file-name">${fileName}</div>
        <div class="file-size">Ready to send</div>
      </div>
      <span class="file-remove" data-file-index="${index}">🗑️</span>
      <span class="file-status">⏳</span>
    `;
    fileList.appendChild(fileItem);
  });

  if (filePaths.length > 0) {
    buttons.sendFiles.style.display = 'block';
    buttons.sendFiles.disabled = false;
  } else {
    buttons.sendFiles.style.display = 'none';
  }
}

// Remove file from list
document.getElementById('file-list').addEventListener('click', (e) => {
  if (e.target.classList.contains('file-remove')) {
    const fileIndex = parseInt(e.target.dataset.fileIndex, 10);
    state.selectedFilePaths.splice(fileIndex, 1);
    displaySelectedFiles(state.selectedFilePaths);
    console.log(
      `Removed file at index ${fileIndex}, ${state.selectedFilePaths.length} files remaining`
    );
  }
});

// Send files
if (buttons.sendFiles) {
  buttons.sendFiles.addEventListener('click', async () => {
    if (state.selectedFilePaths.length === 0) {
      appuiToast.warn('No files selected', 4000);
      return;
    }

    try {
      state.isTransferring = true;
      document.querySelectorAll('.file-remove').forEach((el) => (el.style.display = 'none'));
      buttons.sendFiles.disabled = true;
      buttons.sendFiles.textContent = '⏳ Sending...';

      await window.electronAPI.sendFiles(state.selectedFilePaths);
      console.log('Files sent successfully!');
    } catch (error) {
      console.error('Failed to send files:', error);
      appuiToast.error('Failed to send files: ' + error.message, 5000);
      buttons.sendFiles.textContent = '🚀 Send Files';
      buttons.sendFiles.disabled = false;
      state.isTransferring = false;
    }
  });
}

// ============================================================================
// PROGRESS AND STATUS UPDATES
// ============================================================================

function updateFileProgress(progress) {
  let currentItem;

  if (state.currentMode === 'receiver') {
    const fileList = document.getElementById('received-files-list');
    currentItem = fileList.querySelector(`.file-item[data-file-number="${progress.currentFile}"]`);
  } else {
    const fileItems = document.querySelectorAll('#file-list .file-item');
    currentItem = fileItems[progress.currentFile - 1];
  }

  if (currentItem) {
    const fileNameElement = currentItem.querySelector('.file-name');
    const sizeElement = currentItem.querySelector('.file-size');
    const statusElement = currentItem.querySelector('.file-status');

    if (fileNameElement && progress.fileName && fileNameElement.textContent !== progress.fileName) {
      fileNameElement.textContent = progress.fileName;
      currentItem.dataset.fileName = progress.fileName;
    }

    const bytes = progress.sentBytes || progress.receivedBytes || 0;
    sizeElement.textContent = `${formatFileSize(bytes)} / ${formatFileSize(progress.totalBytes)} (${progress.progress}%)`;

    if (progress.progress === 100) {
      statusElement.textContent = state.currentMode === 'sender' ? '✅' : '⏳';
    } else {
      statusElement.textContent = '⬇️';
    }
  } else {
    console.warn(`[UPDATE] Could not find file item for file ${progress.currentFile}`);
  }
}

function ensureReceiverFileItem(progress) {
  const fileList = document.getElementById('received-files-list');
  let existingItem = fileList.querySelector(
    `.file-item[data-file-number="${progress.currentFile}"]`
  );

  if (!existingItem) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.fileNumber = progress.currentFile;
    fileItem.dataset.fileName = progress.fileName;
    fileItem.innerHTML = `
      <span class="file-icon">📄</span>
      <div class="file-info">
        <div class="file-name">${progress.fileName}</div>
        <div class="file-size">Receiving...</div>
      </div>
      <span class="file-status">⬇️</span>
    `;
    fileList.appendChild(fileItem);
    console.log(
      `[RECEIVER] Created file item for file ${progress.currentFile}: ${progress.fileName}`
    );
  } else {
    const fileNameElement = existingItem.querySelector('.file-name');
    if (fileNameElement && fileNameElement.textContent !== progress.fileName) {
      fileNameElement.textContent = progress.fileName;
      existingItem.dataset.fileName = progress.fileName;
      console.log(`[RECEIVER] Updated file item ${progress.currentFile}: ${progress.fileName}`);
    }
  }
}

function updateReceivedFileComplete(file) {
  const fileList = document.getElementById('received-files-list');
  const fileItem = fileList.querySelector(`.file-item[data-file-number="${file.currentFile}"]`);

  if (fileItem) {
    const sizeElement = fileItem.querySelector('.file-size');
    const statusElement = fileItem.querySelector('.file-status');

    sizeElement.textContent = `${formatFileSize(file.fileSize)} - Saved to ${file.savePath}`;
    statusElement.textContent = '✅';
    console.log(`[RECEIVER] File ${file.currentFile} marked as complete: ${file.fileName}`);
  } else {
    console.warn(`[RECEIVER] Could not find file item ${file.currentFile} to mark complete`);
  }
}

// Copy to clipboard
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-copy');
    const text = document.getElementById(targetId).textContent;
    navigator.clipboard.writeText(text);
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy';
    }, 2000);
  });
});

// ============================================================================
// MODAL EVENT HANDLERS
// ============================================================================

window.addEventListener('click', async (event) => {
  for (const [key, modal] of Object.entries(modals)) {
    if (event.target === modal) {
      await handleModalClose(`${key}-modal`);
    }
  }
});

document.addEventListener('keydown', async (event) => {
  if (event.key === 'Escape') {
    for (const [key, modal] of Object.entries(modals)) {
      if (modal.style.display === 'block') {
        await handleModalClose(`${key}-modal`);
      }
    }
  }
});

// ============================================================================
// UI COMPONENTS (Alert & Toast)
// ============================================================================

const appuiAlert = (() => {
  const overlay = document.getElementById('appui-alert-overlay');
  const titleEl = document.getElementById('appui-alert-title');
  const messageEl = document.getElementById('appui-alert-message');
  const buttonsEl = document.getElementById('appui-alert-buttons');
  const closeBtn = document.getElementById('appui-alert-close');

  function show({ title = 'Alert', message = '', confirm = false }) {
    overlay.classList.remove('appui-hidden');
    titleEl.textContent = title;
    messageEl.textContent = message;
    buttonsEl.innerHTML = '';

    return new Promise((resolve) => {
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.className = 'appui-btn-primary';
      okBtn.onclick = () => {
        hide();
        resolve(true);
      };
      buttonsEl.appendChild(okBtn);

      if (confirm) {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'appui-btn-danger';
        cancelBtn.onclick = () => {
          hide();
          resolve(false);
        };
        buttonsEl.prepend(cancelBtn);
      }
    });
  }

  function hide() {
    overlay.classList.add('appui-hidden');
  }

  closeBtn.onclick = hide;
  overlay.onclick = (e) => {
    if (e.target === overlay) hide();
  };

  return { show };
})();

const appuiToast = (() => {
  const container = document.createElement('div');
  container.className = 'appui-toast-container';
  document.body.appendChild(container);

  function show(message, type = 'info', duration = 4000, options = {}) {
    const toast = document.createElement('div');
    toast.className = `appui-toast appui-toast-${type}`;

    let toastHTML = `<span class="appui-toast-message">${message}</span>`;
    if (options.actionText && options.onAction) {
      toastHTML += `<button class="appui-toast-action">${options.actionText}</button>`;
    }
    toastHTML += `<span class="appui-toast-close">&times;</span>`;
    toast.innerHTML = toastHTML;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    const timeout = setTimeout(() => remove(toast), duration);

    const actionBtn = toast.querySelector('.appui-toast-action');
    if (actionBtn && options.onAction) {
      actionBtn.onclick = () => {
        clearTimeout(timeout);
        options.onAction();
        remove(toast);
      };
    }

    toast.querySelector('.appui-toast-close').onclick = () => {
      clearTimeout(timeout);
      remove(toast);
    };
  }

  function remove(toast) {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }

  return {
    success: (msg, d, options) => show(msg, 'success', d, options),
    error: (msg, d, options) => show(msg, 'error', d, options),
    warn: (msg, d, options) => show(msg, 'warn', d, options),
    info: (msg, d, options) => show(msg, 'info', d, options),
  };
})();

console.log('File Transfer App initialized (Refactored version)');
