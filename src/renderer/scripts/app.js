/**
 * Renderer script for file transfer functionality
 * Uses Electron IPC for real file transfer operations
 */

// Check if electronAPI is available
if (!window.electronAPI) {
  console.error('Electron API not available!');
  alert('Application error: Electron API not loaded. Please restart the application.');
}

// Modal elements
const modals = {
  help: document.getElementById('help-modal'),
  mode: document.getElementById('mode-modal'),
  sender: document.getElementById('sender-modal'),
  receiver: document.getElementById('receiver-modal'),
};

// Button elements
const localTransferButton = document.getElementById('local-transfer-button');
const remoteTransferButton = document.getElementById('remote-transfer-button');
const secureTransferButton = document.getElementById('secure-transfer-button');
const helpButton = document.getElementById('help-button');
const senderModeBtn = document.getElementById('sender-mode');
const receiverModeBtn = document.getElementById('receiver-mode');
const connectBtn = document.getElementById('connect-btn');
const sendFilesBtn = document.getElementById('send-files-btn');
const fileDropZone = document.getElementById('file-drop-zone');
const browseFolderBtn = document.getElementById('browse-folder-btn');

// Global state
let selectedFilePaths = [];
let saveDirectory = '';
let currentMode = null; // 'sender' or 'receiver'
let isConnected = false;

// Load saved path from localStorage
try {
  const savedPath = localStorage.getItem('lastSavePath');
  if (savedPath) {
    saveDirectory = savedPath;
  }
} catch (e) {
  console.warn('Could not load saved path:', e);
}

// ============================================================================
// EVENT LISTENERS FROM MAIN PROCESS
// ============================================================================

window.electronAPI.onConnectionStatus((status) => {
  console.log('Connection status:', status);
  isConnected = status.connected;
  currentMode = status.mode;

  if (status.connected && status.mode === 'sender') {
    document.getElementById('sender-setup').style.display = 'none';
    document.getElementById('sender-transfer').style.display = 'block';
  } else if (!status.connected && status.mode === 'sender') {
    // Sender disconnected - reset UI
    document.getElementById('sender-setup').style.display = 'block';
    document.getElementById('sender-transfer').style.display = 'none';
  } else if (status.connected && status.mode === 'receiver') {
    // Receiver connected successfully - show transfer UI
    document.getElementById('receiver-setup').style.display = 'none';
    document.getElementById('receiver-code-entry').style.display = 'none';
    document.getElementById('receiver-transfer').style.display = 'block';

    // Update save path display
    const savePathDisplay = document.getElementById('save-path-display');
    if (savePathDisplay) {
      savePathDisplay.textContent = saveDirectory || 'Downloads folder';
    }

    console.log('Connected to sender, ready to receive files');
  } else if (!status.connected && status.mode === 'receiver') {
    // Receiver disconnected - reset UI
    document.getElementById('receiver-setup').style.display = 'block';
    document.getElementById('receiver-transfer').style.display = 'none';
  }
});

window.electronAPI.onConnectionLost((info) => {
  console.error('Connection lost:', info);
  isConnected = false;

  // Use setTimeout to ensure alert shows properly
  setTimeout(() => {
    // Show error message with mode-specific information
    let message = '';
    let action = '';

    if (info.mode === 'sender') {
      message = '❌ Connection Lost: ' + info.reason;
      action =
        'The receiver has disconnected. You can:\n\n' +
        '1. Wait for the receiver to reconnect\n' +
        '2. Close and start a new sender session';
    } else {
      message = '❌ Connection Lost: ' + info.reason;
      action =
        'The sender has disconnected. You need to:\n\n' +
        '1. Close this dialog\n' +
        '2. Start a new transfer and reconnect to the sender';
    }

    // Show alert with full message
    alert(message + '\n\n' + action);

    // Reset UI based on mode
    resetConnectionUI(info.mode);
  }, 100);
});

window.electronAPI.onFileProgress((progress) => {
  console.log('File progress:', progress);

  // On receiver side, create file item if it doesn't exist
  if (currentMode === 'receiver') {
    ensureReceiverFileItem(progress);
  }

  updateFileProgress(progress);
});

window.electronAPI.onFileReceived((file) => {
  console.log('File received:', file);

  // Update the file item to show completion
  updateReceivedFileComplete(file);
});

window.electronAPI.onTransferComplete(() => {
  console.log('Transfer complete!');
  if (sendFilesBtn) {
    sendFilesBtn.textContent = '✅ All Files Sent!';
    setTimeout(() => {
      sendFilesBtn.textContent = '🚀 Send Files';
      sendFilesBtn.disabled = false;
      selectedFilePaths = [];
    }, 2000);
  }
});

window.electronAPI.onError((error) => {
  console.error('Transfer error:', error);

  // More user-friendly error message
  let userMessage = 'Error: ' + error;

  if (error.includes('ECONNREFUSED')) {
    userMessage =
      '❌ Connection Refused\n\n' +
      'Could not connect to the sender.\n\n' +
      'Please check:\n' +
      '1. The IP address and port are correct\n' +
      '2. The sender is running and waiting for connection\n' +
      '3. Both devices are on the same network\n' +
      '4. Firewall is not blocking the connection';
  } else if (error.includes('ETIMEDOUT')) {
    userMessage =
      '❌ Connection Timeout\n\n' +
      'The connection attempt timed out.\n\n' +
      'Please check:\n' +
      '1. The sender is still running\n' +
      '2. Network connection is stable\n' +
      '3. Both devices can reach each other';
  } else if (error.includes('ENOTFOUND')) {
    userMessage =
      '❌ Host Not Found\n\n' +
      'Could not find the sender at the specified IP address.\n\n' +
      'Please verify the IP address is correct.';
  }

  alert(userMessage);
});

// ============================================================================
// UI RESET FUNCTIONS
// ============================================================================

function resetConnectionUI(mode) {
  if (mode === 'sender') {
    // Reset sender UI
    document.getElementById('sender-setup').style.display = 'block';
    document.getElementById('sender-transfer').style.display = 'none';

    // Clear file list
    const fileList = document.getElementById('file-list');
    if (fileList) {
      fileList.innerHTML = '';
    }

    // Reset send button
    if (sendFilesBtn) {
      sendFilesBtn.style.display = 'none';
      sendFilesBtn.disabled = false;
      sendFilesBtn.textContent = '🚀 Send Files';
    }

    // Update status message
    const statusMsg = document.querySelector('#sender-modal .status-message span:last-child');
    if (statusMsg) {
      statusMsg.textContent = 'Connection lost. Please close and restart sender mode.';
    }

    // Clear selected files
    selectedFilePaths = [];
  } else if (mode === 'receiver') {
    // Reset receiver UI
    document.getElementById('receiver-setup').style.display = 'block';
    document.getElementById('receiver-transfer').style.display = 'none';

    // Clear received files list
    const receivedList = document.getElementById('received-files-list');
    if (receivedList) {
      receivedList.innerHTML = '';
    }

    // Reset connect button
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.textContent = '🔗 Connect to Sender';
    }

    // Clear save directory
    saveDirectory = '';
  }
}

async function cleanupConnection() {
  try {
    if (currentMode === 'sender') {
      await window.electronAPI.stopSender();
      console.log('Sender stopped');
    } else if (currentMode === 'receiver') {
      await window.electronAPI.disconnectReceiver();
      console.log('Receiver disconnected');
    }

    isConnected = false;
    currentMode = null;
    selectedFilePaths = [];
    saveDirectory = '';
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// ============================================================================
// MODAL CONTROLS
// ============================================================================

// Close buttons
document.querySelectorAll('.close-modal').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-modal');
    const modal = document.getElementById(modalId);

    // If closing sender or receiver modal while connected, warn user
    if ((modalId === 'sender-modal' || modalId === 'receiver-modal') && isConnected) {
      const shouldClose = confirm(
        '⚠️ Warning: You are still connected!\n\n' +
          'Closing this window will disconnect the transfer session.\n\n' +
          'Are you sure you want to close?'
      );

      if (!shouldClose) {
        return;
      }

      // Cleanup connection
      cleanupConnection();
    }

    modal.style.display = 'none';
  });
});

// Open modals
localTransferButton.addEventListener('click', () => {
  modals.mode.style.display = 'block';
});

remoteTransferButton.addEventListener('click', () => {
  modals.mode.style.display = 'block';
});

secureTransferButton.addEventListener('click', () => {
  modals.mode.style.display = 'block';
});

helpButton.addEventListener('click', () => {
  modals.help.style.display = 'block';
});

// ============================================================================
// SENDER MODE
// ============================================================================

senderModeBtn.addEventListener('click', async () => {
  try {
    modals.mode.style.display = 'none';
    modals.sender.style.display = 'block';
    currentMode = 'sender';

    // Reset UI to initial state
    document.getElementById('sender-setup').style.display = 'block';
    document.getElementById('sender-transfer').style.display = 'none';
    document.getElementById('file-list').innerHTML = '';
    selectedFilePaths = [];
    if (sendFilesBtn) {
      sendFilesBtn.style.display = 'none';
    }

    // Show loading state
    document.querySelector('#sender-modal .status-message span:last-child').textContent =
      'Starting server...';

    // Start sender mode - REAL IMPLEMENTATION
    const result = await window.electronAPI.startSender();

    // Display hostname and connection code
    const hostname = result.hostname || 'Unknown Device';
    document.getElementById('service-name').textContent = hostname;
    document.getElementById('connection-code').textContent = result.code;

    // Also display traditional IP/Port for debugging (if elements exist)
    const senderIpEl = document.getElementById('sender-ip');
    const senderPortEl = document.getElementById('sender-port');
    if (senderIpEl) senderIpEl.textContent = result.ip;
    if (senderPortEl) senderPortEl.textContent = result.port;

    document.querySelector('#sender-modal .status-message span:last-child').textContent =
      'Waiting for receiver to connect...';

    console.log('Sender started:', result);
  } catch (error) {
    console.error('Failed to start sender:', error);
    alert('Failed to start sender mode: ' + error.message);
    modals.sender.style.display = 'none';
    currentMode = null;
  }
});

// ============================================================================
// RECEIVER MODE
// ============================================================================

// Global variable to store discovered senders and selected sender
let discoveredSenders = [];
let selectedSender = null;

receiverModeBtn.addEventListener('click', async () => {
  modals.mode.style.display = 'none';
  modals.receiver.style.display = 'block';
  currentMode = 'receiver';

  // Reset UI to initial state
  document.getElementById('receiver-transfer').style.display = 'none';
  document.getElementById('received-files-list').innerHTML = '';

  // Load cached save path if available
  const savedPath = localStorage.getItem('lastSavePath');
  if (savedPath) {
    document.getElementById('save-location').value = savedPath;
    saveDirectory = savedPath;
  } else {
    document.getElementById('save-location').value = '';
    saveDirectory = '';
  }

  // Start discovery process
  await discoverAvailableSenders();
});

// Function to discover available senders
async function discoverAvailableSenders() {
  try {
    // Show scanning state
    document.getElementById('receiver-scanning').style.display = 'block';
    document.getElementById('receiver-setup').style.display = 'none';
    document.getElementById('receiver-code-entry').style.display = 'none';

    console.log('Scanning for senders...');

    // Call discovery API
    const services = await window.electronAPI.discoverServices();
    discoveredSenders = services;

    console.log('Found senders:', services);

    // Hide scanning, show sender list
    document.getElementById('receiver-scanning').style.display = 'none';
    document.getElementById('receiver-setup').style.display = 'block';

    // Populate sender list
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

        // Add click handler to select sender
        senderItem.addEventListener('click', () => selectSender(index));

        senderListContainer.appendChild(senderItem);
      });
    }
  } catch (error) {
    console.error('Failed to discover senders:', error);

    // Hide scanning
    document.getElementById('receiver-scanning').style.display = 'none';
    document.getElementById('receiver-setup').style.display = 'block';

    // Show error with details
    const senderListContainer = document.getElementById('sender-list');
    const errorMessage = error.message || 'Unknown error occurred';
    senderListContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p style="color: #e53e3e; margin-bottom: 10px;">⚠️ Failed to scan for senders</p>
        <p style="color: #999; font-size: 0.9em; margin-bottom: 15px;">${errorMessage}</p>
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

// Function to select a sender
function selectSender(index) {
  selectedSender = discoveredSenders[index];
  console.log('Selected sender:', selectedSender);

  // Hide sender list, show code entry
  document.getElementById('receiver-setup').style.display = 'none';
  document.getElementById('receiver-code-entry').style.display = 'block';

  // Display selected sender name
  document.getElementById('selected-sender-name').textContent = selectedSender.name;

  // Clear and focus code input
  const codeInput = document.getElementById('receiver-code-input');
  codeInput.value = '';
  setTimeout(() => codeInput.focus(), 100);
}

// Receiver connection - REAL IMPLEMENTATION
connectBtn.addEventListener('click', async () => {
  const code = document.getElementById('receiver-code-input').value.trim().toUpperCase();
  const currentSavePath = document.getElementById('save-location').value.trim();

  if (!code || code.length < 7) {
    alert('Please enter the complete connection code (format: XXX-XXX)');
    return;
  }

  if (!selectedSender) {
    alert('No sender selected. Please go back and select a sender.');
    return;
  }

  try {
    connectBtn.textContent = '⏳ Connecting...';
    connectBtn.disabled = true;

    // Real connection to sender using discovered IP/port
    const result = await window.electronAPI.connectToSender(
      selectedSender.host,
      selectedSender.port,
      code,
      currentSavePath || undefined
    );

    // Connection successful - save the directory
    if (result && result.saveDir) {
      saveDirectory = result.saveDir;

      // Cache the save path for future use
      try {
        localStorage.setItem('lastSavePath', result.saveDir);
      } catch (e) {
        console.warn('Could not save path to localStorage:', e);
      }
    }

    console.log('Authentication successful, waiting for files...');
    // UI will be updated by CONNECTION_STATUS event
  } catch (error) {
    console.error('Connection failed:', error);

    // Show user-friendly error message
    let errorMsg = error.message;
    if (errorMsg.includes('Invalid connection code')) {
      errorMsg =
        '❌ Invalid Connection Code\n\nThe code you entered does not match.\nPlease check the code and try again.';
    }

    alert(errorMsg);
    connectBtn.textContent = '🔗 Connect';
    connectBtn.disabled = false;
  }
});

// Refresh senders button
const refreshSendersBtn = document.getElementById('refresh-senders-btn');
if (refreshSendersBtn) {
  refreshSendersBtn.addEventListener('click', async () => {
    console.log('Refreshing sender list...');
    await discoverAvailableSenders();
  });
}

// Back to sender list button
const backToListBtn = document.getElementById('back-to-list-btn');
if (backToListBtn) {
  backToListBtn.addEventListener('click', () => {
    console.log('Going back to sender list...');
    selectedSender = null;
    document.getElementById('receiver-code-entry').style.display = 'none';
    document.getElementById('receiver-setup').style.display = 'block';
  });
}

// Auto-format connection code input (convert to uppercase and add hyphen)
const codeInput = document.getElementById('receiver-code-input');
if (codeInput) {
  codeInput.addEventListener('input', (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Auto-add hyphen after 3 characters (format: XXX-XXX)
    if (value.length > 3) {
      value = value.slice(0, 3) + '-' + value.slice(3, 6);
    }

    e.target.value = value;
  });

  // Limit to 7 characters (XXX-XXX)
  codeInput.setAttribute('maxlength', '7');
  codeInput.setAttribute('placeholder', 'XXX-XXX');
}

// Browse folder - REAL IMPLEMENTATION
browseFolderBtn.addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled && result.folderPath) {
      document.getElementById('save-location').value = result.folderPath;
      saveDirectory = result.folderPath;

      // Cache the selected path
      try {
        localStorage.setItem('lastSavePath', result.folderPath);
      } catch (e) {
        console.warn('Could not save path to localStorage:', e);
      }
    }
  } catch (error) {
    console.error('Failed to select folder:', error);
    alert('Failed to select folder: ' + error.message);
  }
});

// ============================================================================
// FILE SELECTION AND SENDING
// ============================================================================

// File drop zone - click to select files
fileDropZone.addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.selectFiles();
    if (!result.canceled && result.filePaths.length > 0) {
      selectedFilePaths = result.filePaths;
      displaySelectedFiles(result.filePaths);
    }
  } catch (error) {
    console.error('Failed to select files:', error);
    alert('Failed to select files: ' + error.message);
  }
});

// Drag and drop support
fileDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  fileDropZone.classList.add('drag-over');
});

fileDropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  fileDropZone.classList.remove('drag-over');
});

fileDropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  fileDropZone.classList.remove('drag-over');

  try {
    // Get file paths from dropped files using Electron's webUtils
    const files = Array.from(e.dataTransfer.files);
    const filePaths = [];

    // Use the electronAPI to get file paths securely
    for (const file of files) {
      const filePath = window.electronAPI.getFilePathFromFile(file);
      if (filePath) {
        filePaths.push(filePath);
      }
    }

    if (filePaths.length > 0) {
      selectedFilePaths = filePaths;
      displaySelectedFiles(selectedFilePaths);
      console.log(`Dropped ${filePaths.length} file(s):`, filePaths);
    } else {
      console.warn('No valid file paths found in dropped files');
      alert('Could not get file paths. Please use the "Browse" button instead.');
    }
  } catch (error) {
    console.error('Error handling dropped files:', error);
    alert('Failed to process dropped files: ' + error.message);
  }
});

// Display selected files
function displaySelectedFiles(filePaths) {
  const fileList = document.getElementById('file-list');
  fileList.innerHTML = '';

  filePaths.forEach((filePath) => {
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
            <span class="file-status">⏳</span>
        `;
    fileList.appendChild(fileItem);
  });

  if (filePaths.length > 0) {
    sendFilesBtn.style.display = 'block';
    sendFilesBtn.disabled = false;
  }
}

// Send files - REAL IMPLEMENTATION
sendFilesBtn.addEventListener('click', async () => {
  if (selectedFilePaths.length === 0) {
    alert('No files selected');
    return;
  }

  try {
    sendFilesBtn.disabled = true;
    sendFilesBtn.textContent = '⏳ Sending...';

    // Send files using real IPC
    await window.electronAPI.sendFiles(selectedFilePaths);

    console.log('Files sent successfully!');
  } catch (error) {
    console.error('Failed to send files:', error);
    alert('Failed to send files: ' + error.message);
    sendFilesBtn.textContent = '🚀 Send Files';
    sendFilesBtn.disabled = false;
  }
});

// ============================================================================
// PROGRESS AND STATUS UPDATES
// ============================================================================

// Update file progress
function updateFileProgress(progress) {
  let fileItems;

  if (currentMode === 'receiver') {
    fileItems = document.querySelectorAll('#received-files-list .file-item');
  } else {
    fileItems = document.querySelectorAll('#file-list .file-item');
  }

  const currentItem = fileItems[progress.currentFile - 1];

  if (currentItem) {
    const fileNameElement = currentItem.querySelector('.file-name');
    const sizeElement = currentItem.querySelector('.file-size');
    const statusElement = currentItem.querySelector('.file-status');

    // Update filename if provided (ensures correct name is always shown)
    if (fileNameElement && progress.fileName && fileNameElement.textContent !== progress.fileName) {
      fileNameElement.textContent = progress.fileName;
      currentItem.dataset.fileName = progress.fileName;
    }

    const bytes = progress.sentBytes || progress.receivedBytes || 0;
    sizeElement.textContent = `${formatFileSize(bytes)} / ${formatFileSize(progress.totalBytes)} (${progress.progress}%)`;

    if (progress.progress === 100) {
      statusElement.textContent = '⏳'; // Still waiting for save confirmation
    } else {
      statusElement.textContent = '⬇️';
    }
  }
}

// Ensure file item exists on receiver side
function ensureReceiverFileItem(progress) {
  const fileList = document.getElementById('received-files-list');
  const existingItems = fileList.querySelectorAll('.file-item');

  // Check if file item for this position already exists
  if (existingItems.length < progress.currentFile) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
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
  } else {
    // Update filename if it already exists (in case it was wrong)
    const existingItem = existingItems[progress.currentFile - 1];
    if (existingItem) {
      const fileNameElement = existingItem.querySelector('.file-name');
      if (fileNameElement && fileNameElement.textContent !== progress.fileName) {
        fileNameElement.textContent = progress.fileName;
        existingItem.dataset.fileName = progress.fileName;
      }
    }
  }
}

// Update received file to show completion
function updateReceivedFileComplete(file) {
  const fileList = document.getElementById('received-files-list');
  const fileItems = fileList.querySelectorAll('.file-item');
  const fileItem = fileItems[file.currentFile - 1];

  if (fileItem) {
    const sizeElement = fileItem.querySelector('.file-size');
    const statusElement = fileItem.querySelector('.file-status');

    sizeElement.textContent = `${formatFileSize(file.fileSize)} - Saved to ${file.savePath}`;
    statusElement.textContent = '✅';
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
// UTILITY FUNCTIONS
// ============================================================================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Close modals on outside click
window.addEventListener('click', (event) => {
  Object.entries(modals).forEach(([key, modal]) => {
    if (event.target === modal) {
      // If closing sender or receiver modal while connected, warn user
      if ((key === 'sender' || key === 'receiver') && isConnected) {
        const shouldClose = confirm(
          '⚠️ Warning: You are still connected!\n\n' +
            'Closing this window will disconnect the transfer session.\n\n' +
            'Are you sure you want to close?'
        );

        if (!shouldClose) {
          return;
        }

        // Cleanup connection
        cleanupConnection();
      }

      modal.style.display = 'none';
    }
  });
});

// Close on Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    Object.entries(modals).forEach(([key, modal]) => {
      if (modal.style.display === 'block') {
        // If closing sender or receiver modal while connected, warn user
        if ((key === 'sender' || key === 'receiver') && isConnected) {
          const shouldClose = confirm(
            '⚠️ Warning: You are still connected!\n\n' +
              'Closing this window will disconnect the transfer session.\n\n' +
              'Are you sure you want to close?'
          );

          if (!shouldClose) {
            return;
          }

          // Cleanup connection
          cleanupConnection();
        }

        modal.style.display = 'none';
      }
    });
  }
});

console.log('File Transfer App initialized with real Electron IPC');
