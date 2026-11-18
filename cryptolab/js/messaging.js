/**
 * CryptoLab - Diffie-Hellman Key Exchange Simulator
 * Secret Messaging Lab Controller (messaging.js)
 */

(function () {
  'use strict';

  // --- CRYPTO STATE ---
  const state = {
    sharedKey: 2, // Default DH shared secret K
    bobKey: 2,    // Bob's key (matches Alice by default, can be mismatched to test)
    isTampered: false,
    messageHistory: []
  };

  // --- SYMMETRIC STREAM CIPHER ENGINE (DERIVED FROM DH KEY K) ---
  /**
   * Generates a deterministic keystream byte for position i using shared key K
   */
  function getKeyByte(key, index) {
    const k = Number(key);
    return (k * 37 + (index + 1) * 19 + 73) % 256;
  }

  /**
   * Encrypts plaintext string into hex ciphertext using key K
   */
  function encryptMessage(plaintext, key) {
    let hexResult = '';
    const bytes = [];
    for (let i = 0; i < plaintext.length; i++) {
      const charCode = plaintext.charCodeAt(i);
      const keyByte = getKeyByte(key, i);
      const cipherByte = charCode ^ keyByte;
      bytes.push(cipherByte);
      hexResult += cipherByte.toString(16).padStart(2, '0') + ' ';
    }
    return {
      hex: hexResult.trim().toUpperCase(),
      bytes: bytes
    };
  }

  /**
   * Decrypts ciphertext bytes into plaintext using key K
   */
  function decryptMessage(bytes, key) {
    let plain = '';
    for (let i = 0; i < bytes.length; i++) {
      const keyByte = getKeyByte(key, i);
      const decryptedCode = bytes[i] ^ keyByte;
      plain += String.fromCharCode(decryptedCode);
    }
    return plain;
  }

  // --- DOM CACHE ---
  let dom = {};

  function cacheDom() {
    dom = {
      // Key controls
      keyDisplay: document.getElementById('shared-key-num'),
      customKeyInput: document.getElementById('custom-key-input'),
      btnApplyKey: document.getElementById('btn-apply-key'),
      chkWrongKey: document.getElementById('chk-wrong-key'),
      chkTampereve: document.getElementById('chk-tamper-eve'),

      // Alice elements
      aliceFeed: document.getElementById('alice-chat-feed'),
      aliceInput: document.getElementById('alice-msg-input'),
      aliceSendBtn: document.getElementById('btn-alice-send'),

      // Bob elements
      bobFeed: document.getElementById('bob-chat-feed'),
      bobInput: document.getElementById('bob-msg-input'),
      bobSendBtn: document.getElementById('btn-bob-send'),

      // Wire & Eve elements
      flyingPacket: document.getElementById('flying-cipher-packet'),
      eveInterceptLog: document.getElementById('eve-intercept-log'),
      btnEveCrack: document.getElementById('btn-eve-crack'),
      wireLiveStatus: document.getElementById('wire-live-status'),

      // Inspector Elements
      inspectorPlain: document.getElementById('inspect-plain'),
      inspectorKey: document.getElementById('inspect-key'),
      inspectorCipher: document.getElementById('inspect-cipher'),
      inspectorDecrypted: document.getElementById('inspect-decrypted')
    };
  }

  // Read URL query parameter if user navigated from exchange.html with ?key=...
  function loadKeyFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const keyParam = params.get('key');
    if (keyParam && /^\d+$/.test(keyParam)) {
      state.sharedKey = parseInt(keyParam, 10);
      state.bobKey = state.sharedKey;
      if (dom.keyDisplay) dom.keyDisplay.textContent = state.sharedKey;
      if (dom.customKeyInput) dom.customKeyInput.value = state.sharedKey;
    }
  }

  // --- TRANSMISSION LOGIC ---

  function sendFromAlice() {
    const text = dom.aliceInput.value.trim();
    if (!text) return;

    dom.aliceInput.value = '';
    dom.aliceSendBtn.disabled = true;

    // 1. Encrypt with Alice's Key
    const enc = encryptMessage(text, state.sharedKey);
    let cipherBytes = enc.bytes;

    // Check if tampering is simulated
    let isTamperedNow = dom.chkTampereve && dom.chkTampereve.checked;
    if (isTamperedNow && cipherBytes.length > 0) {
      cipherBytes = cipherBytes.map((b, idx) => (idx % 2 === 0 ? (b ^ 0xFF) : b));
    }

    // Add to Alice's sent feed
    appendMessage(dom.aliceFeed, text, 'sent', `Encrypted with Key K = ${state.sharedKey}`);

    // Update Inspector
    updateInspector(text, state.sharedKey, enc.hex);

    // 2. Animate Transit across the wire
    animateWireTransit('to-bob', enc.hex, () => {
      // 3. Eve intercepts
      logToEveSniffer(`[INTERCEPTED FROM ALICE]:\nCiphertext: ${enc.hex}\nStatus: Encrypted with symmetric key.`);

      // 4. Bob receives and decrypts
      const bobActiveKey = (dom.chkWrongKey && dom.chkWrongKey.checked) ? (state.sharedKey + 3) : state.sharedKey;
      const decryptedText = decryptMessage(cipherBytes, bobActiveKey);

      let metaLabel = `Decrypted with Bob's Key K = ${bobActiveKey}`;
      if (bobActiveKey !== state.sharedKey) {
        metaLabel = `⚠ ERROR: Mismatched Key K = ${bobActiveKey}! Text Corrupted.`;
      } else if (isTamperedNow) {
        metaLabel = `⚠ ALERT: Ciphertext was modified in transit! Corrupted.`;
      }

      appendMessage(dom.bobFeed, decryptedText, 'received', metaLabel);
      if (dom.inspectorDecrypted) dom.inspectorDecrypted.textContent = decryptedText;

      dom.aliceSendBtn.disabled = false;
    });
  }

  function sendFromBob() {
    const text = dom.bobInput.value.trim();
    if (!text) return;

    dom.bobInput.value = '';
    dom.bobSendBtn.disabled = true;

    const bobActiveKey = (dom.chkWrongKey && dom.chkWrongKey.checked) ? (state.sharedKey + 3) : state.sharedKey;
    const enc = encryptMessage(text, bobActiveKey);
    let cipherBytes = enc.bytes;

    let isTamperedNow = dom.chkTampereve && dom.chkTampereve.checked;
    if (isTamperedNow && cipherBytes.length > 0) {
      cipherBytes = cipherBytes.map((b, idx) => (idx % 2 === 0 ? (b ^ 0xFF) : b));
    }

    appendMessage(dom.bobFeed, text, 'sent bob-sent', `Encrypted with Key K = ${bobActiveKey}`);
    updateInspector(text, bobActiveKey, enc.hex);

    animateWireTransit('to-alice', enc.hex, () => {
      logToEveSniffer(`[INTERCEPTED FROM BOB]:\nCiphertext: ${enc.hex}\nStatus: Encrypted with symmetric key.`);

      const decryptedText = decryptMessage(cipherBytes, state.sharedKey);
      let metaLabel = `Decrypted with Alice's Key K = ${state.sharedKey}`;
      if (bobActiveKey !== state.sharedKey) {
        metaLabel = `⚠ ERROR: Mismatched Key! Text Corrupted.`;
      }

      appendMessage(dom.aliceFeed, decryptedText, 'received', metaLabel);
      if (dom.inspectorDecrypted) dom.inspectorDecrypted.textContent = decryptedText;

      dom.bobSendBtn.disabled = false;
    });
  }

  function animateWireTransit(direction, hexSnippet, callback) {
    if (!dom.flyingPacket) {
      if (callback) callback();
      return;
    }

    const shortHex = hexSnippet.split(' ').slice(0, 4).join('') + '...';
    dom.flyingPacket.textContent = `HEX: ${shortHex}`;
    dom.flyingPacket.className = 'flying-cipher-packet';
    dom.flyingPacket.style.opacity = '1';

    if (dom.wireLiveStatus) {
      dom.wireLiveStatus.innerHTML = `&gt; Packet in flight across wire (${direction})...<br>&gt; Ciphertext: ${shortHex}`;
    }

    // Force reflow
    void dom.flyingPacket.offsetWidth;

    if (direction === 'to-bob') {
      dom.flyingPacket.classList.add('flying-to-bob');
    } else {
      dom.flyingPacket.classList.add('flying-to-alice');
    }

    setTimeout(() => {
      dom.flyingPacket.style.opacity = '0';
      if (dom.wireLiveStatus) {
        dom.wireLiveStatus.innerHTML = `&gt; Packet delivered safely to destination terminal.`;
      }
      if (callback) callback();
    }, 2050);
  }

  function appendMessage(feedEl, text, typeClass, metaText) {
    if (!feedEl) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${typeClass}`;
    bubble.innerHTML = `
      <div>${escapeHtml(text)}</div>
      <div class="bubble-meta">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
        <span>${escapeHtml(metaText)}</span>
      </div>
    `;
    feedEl.appendChild(bubble);
    feedEl.scrollTop = feedEl.scrollHeight;
  }

  function logToEveSniffer(msg) {
    if (!dom.eveInterceptLog) return;
    dom.eveInterceptLog.innerHTML = escapeHtml(msg).replace(/\n/g, '<br>');
  }

  function attemptEveCrack() {
    if (!dom.eveInterceptLog) return;
    const currentText = dom.eveInterceptLog.textContent;
    if (!currentText || currentText.includes('No transmission')) {
      alert('Send a message first before Eve can intercept and attempt decryption!');
      return;
    }

    // Generate pseudo-random nonsense
    const junk = ['#$!&^%?', '@9~x*Q!', '??!0xff', '[DECRYPTION FAILED: KEY REQUIRED]'];
    const randomJunk = junk[Math.floor(Math.random() * junk.length)];

    dom.eveInterceptLog.innerHTML += `<br><span style="color:#fb7185; font-weight:700;">&gt; Attempting brute-force without Key K...</span><br>&gt; Result: "${randomJunk}" (Confidentiality intact!)`;
  }

  function updateInspector(plain, key, hex) {
    if (dom.inspectorPlain) dom.inspectorPlain.textContent = plain;
    if (dom.inspectorKey) dom.inspectorKey.textContent = `K = ${key} (Diffie-Hellman Secret)`;
    if (dom.inspectorCipher) dom.inspectorCipher.textContent = hex;
  }

  function applyCustomKey() {
    const val = parseInt(dom.customKeyInput.value, 10);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid positive integer key.');
      return;
    }
    state.sharedKey = val;
    state.bobKey = val;
    dom.keyDisplay.textContent = val;
    alert(`Shared key updated to K = ${val}. Future messages will be encrypted with this secret.`);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- BIND EVENTS ---
  function bindEvents() {
    if (dom.aliceSendBtn) dom.aliceSendBtn.addEventListener('click', sendFromAlice);
    if (dom.aliceInput) {
      dom.aliceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendFromAlice();
      });
    }

    if (dom.bobSendBtn) dom.bobSendBtn.addEventListener('click', sendFromBob);
    if (dom.bobInput) {
      dom.bobInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendFromBob();
      });
    }

    if (dom.btnApplyKey) dom.btnApplyKey.addEventListener('click', applyCustomKey);
    if (dom.btnEveCrack) dom.btnEveCrack.addEventListener('click', attemptEveCrack);
  }

  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    loadKeyFromUrl();
    console.log('CryptoLab: Secret Messaging Lab active with DH Key K =', state.sharedKey);
  });

})();
