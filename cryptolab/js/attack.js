/**
 * CryptoLab - Diffie-Hellman Key Exchange Simulator
 * Attacker Simulation Engine & Controller (attack.js)
 */

(function () {
  'use strict';

  // --- CRYPTOGRAPHIC UTILITIES (BigInt) ---
  function modPow(base, exp, mod) {
    try {
      let b = BigInt(base);
      let e = BigInt(exp);
      let m = BigInt(mod);
      if (m <= 0n) return null;
      if (m === 1n) return 0n;

      let result = 1n;
      b = ((b % m) + m) % m;

      while (e > 0n) {
        if (e % 2n === 1n) {
          result = (result * b) % m;
        }
        e = e / 2n;
        b = (b * b) % m;
      }
      return result;
    } catch (err) {
      console.error('modPow error:', err);
      return null;
    }
  }

  // --- STATE ---
  const state = {
    // Default demonstration parameters
    p: 23n,
    g: 5n,
    a: 6n,
    b: 15n,
    A: 8n,
    B: 19n,
    K: 2n,

    // Eve's MITM parameters
    eve_e: 7n,
    eve_E: 17n,
    K_AE: 12n, // Secret Alice <-> Eve
    K_EB: 15n, // Secret Eve <-> Bob

    activeMode: 'passive', // 'passive' | 'mitm'
    isBruteForcing: false,
    bruteForceDiscoveredKey: null
  };

  // --- DOM CACHE ---
  let dom = {};

  function cacheDom() {
    dom = {
      // Mode tabs
      tabPassive: document.getElementById('tab-passive'),
      tabMitm: document.getElementById('tab-mitm'),

      // Containers
      passiveSection: document.getElementById('passive-section'),
      mitmSection: document.getElementById('mitm-section'),

      // Buttons
      btnBruteForce: document.getElementById('btn-brute-force'),
      btnResetAttack: document.getElementById('btn-reset-attack'),
      btnExplainAttack: document.getElementById('btn-explain-attack'),
      btnTamperMsg: document.getElementById('btn-tamper-msg'),

      // Eve's Terminal
      terminalLog: document.getElementById('terminal-log'),

      // Intelligence fields
      capturedP: document.getElementById('intel-p'),
      capturedG: document.getElementById('intel-g'),
      capturedA: document.getElementById('intel-A'),
      capturedB: document.getElementById('intel-B'),

      hiddenA: document.getElementById('intel-priv-a'),
      hiddenB: document.getElementById('intel-priv-b'),
      hiddenK: document.getElementById('intel-secret-k'),

      // MITM live outputs
      mitmEveE: document.getElementById('mitm-eve-E'),
      mitmKeyAE: document.getElementById('mitm-key-ae'),
      mitmKeyEB: document.getElementById('mitm-key-eb'),
      mitmAliceKey: document.getElementById('mitm-alice-k'),
      mitmBobKey: document.getElementById('mitm-bob-k'),
      aliceComputedK: document.getElementById('alice-computed-k'),
      bobComputedK: document.getElementById('bob-computed-k'),

      // Tamper message elements
      aliceOriginalMsg: document.getElementById('alice-msg-text'),
      eveModifiedMsgInput: document.getElementById('eve-msg-input'),
      bobReceivedMsg: document.getElementById('bob-received-msg'),

      // Modal
      explainModal: document.getElementById('explain-modal'),
      modalCloseBtn: document.getElementById('modal-close-btn')
    };
  }

  // --- PASSIVE EAVESDROPPING / BRUTE-FORCE DLP ---

  /**
   * Simulates Eve attempting to discover Alice's secret 'a' by brute-forcing
   * the Discrete Logarithm Problem on p = 23.
   */
  async function startBruteForceDiscovery() {
    if (state.isBruteForcing) return;
    state.isBruteForcing = true;
    dom.btnBruteForce.disabled = true;

    logToTerminal('&gt; [EVE ANALYZER] Starting Discrete Logarithm Brute-Force...');
    logToTerminal(`&gt; Target: Solve 5^x ≡ ${state.A} (mod ${state.p})`);
    logToTerminal('&gt; Testing possible private exponents x in range [1, p-1]...');

    let foundExp = null;
    const maxTrials = Number(state.p) - 1;

    for (let x = 1; x <= maxTrials; x++) {
      const trialBig = BigInt(x);
      const computed = modPow(state.g, trialBig, state.p);

      await sleep(220); // Small pause for animation effect

      if (computed === state.A) {
        logToTerminal(`&gt; [SUCCESS] x = ${x}: 5^${x} mod 23 = ${computed} == A (${state.A}) &check;`, 'found');
        foundExp = trialBig;
        break;
      } else {
        logToTerminal(`&gt; [TRY] x = ${x}: 5^${x} mod 23 = ${computed} &ne; ${state.A}`);
      }
    }

    if (foundExp !== null) {
      state.bruteForceDiscoveredKey = foundExp;
      const crackedSecret = modPow(state.B, foundExp, state.p);

      await sleep(300);
      logToTerminal(`&gt; [COMPROMISE] Alice's private key cracked: a = ${foundExp}`);
      logToTerminal(`&gt; [COMPROMISE] Eve calculates shared key: K = B^a mod p = ${state.B}^${foundExp} mod ${state.p} = ${crackedSecret}`, 'found');

      // Update Eve's vault UI to show cracked secret
      dom.hiddenA.innerHTML = `<span style="color:#fb7185; text-decoration:line-through;">Confidential</span> &rarr; <strong style="color:#fb7185;">Cracked: ${foundExp}</strong>`;
      dom.hiddenK.innerHTML = `<span style="color:#fb7185; text-decoration:line-through;">Hidden</span> &rarr; <strong style="color:#fb7185;">Intercepted: ${crackedSecret}</strong>`;
    }

    state.isBruteForcing = false;
    dom.btnBruteForce.disabled = false;
  }

  function logToTerminal(message, className = '') {
    if (!dom.terminalLog) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.innerHTML = message;
    dom.terminalLog.appendChild(entry);
    dom.terminalLog.scrollTop = dom.terminalLog.scrollHeight;
  }

  function clearTerminal() {
    if (dom.terminalLog) {
      dom.terminalLog.innerHTML = `
        <div class="log-entry">&gt; System initialized. Eavesdropper listening on public channel...</div>
        <div class="log-entry">&gt; Modulus p = 23, Generator g = 5, Public A = 8, Public B = 19 captured.</div>
      `;
    }
  }

  // --- ACTIVE MAN-IN-THE-MIDDLE (MITM) DEMO ---

  function updateMitmDisplay() {
    // Eve parameters:
    state.eve_e = 7n;
    state.eve_E = modPow(state.g, state.eve_e, state.p); // 5^7 mod 23 = 17

    // Tunnel 1: Alice <-> Eve
    state.K_AE = modPow(state.A, state.eve_e, state.p); // 8^7 mod 23 = 12

    // Tunnel 2: Eve <-> Bob
    state.K_EB = modPow(state.B, state.eve_e, state.p); // 19^7 mod 23 = 15

    if (dom.mitmEveE) dom.mitmEveE.textContent = state.eve_E.toString();
    if (dom.mitmKeyAE) dom.mitmKeyAE.textContent = state.K_AE.toString();
    if (dom.mitmKeyEB) dom.mitmKeyEB.textContent = state.K_EB.toString();

    if (dom.mitmAliceKey) dom.mitmAliceKey.textContent = state.K_AE.toString();
    if (dom.mitmBobKey) dom.mitmBobKey.textContent = state.K_EB.toString();

    // Update Alice and Bob's cards to show the split keys in MITM mode
    if (dom.aliceComputedK) {
      dom.aliceComputedK.innerHTML = `K<sub>AE</sub> = ${state.K_AE} <span style="font-size:0.75rem; color:#fb7185;">(with Eve)</span>`;
    }
    if (dom.bobComputedK) {
      dom.bobComputedK.innerHTML = `K<sub>EB</sub> = ${state.K_EB} <span style="font-size:0.75rem; color:#fb7185;">(with Eve)</span>`;
    }
  }

  function simulateMessageTampering() {
    const originalText = dom.aliceOriginalMsg ? dom.aliceOriginalMsg.textContent : "Authorize payment of $50";
    const tamperedText = dom.eveModifiedMsgInput ? dom.eveModifiedMsgInput.value : "Authorize payment of $5,000 to Eve";

    if (dom.bobReceivedMsg) {
      dom.bobReceivedMsg.innerHTML = `
        <span style="color:#fb7185; font-weight:700;">[DECRYPTED WITH K_EB = 15]:</span><br>
        "${escapeHtml(tamperedText)}"
        <div style="font-size:0.75rem; color:#f87171; margin-top:0.4rem;">
          &times; Bob completely trusts this message because it was decrypted with his established key!
        </div>
      `;
    }
  }

  // --- MODE SWITCHER & RESETS ---

  function switchMode(mode) {
    state.activeMode = mode;
    if (mode === 'passive') {
      dom.tabPassive.classList.add('active');
      dom.tabMitm.classList.remove('active');
      dom.passiveSection.style.display = 'block';
      dom.mitmSection.style.display = 'none';

      // Restore Alice and Bob computed secret displays
      if (dom.aliceComputedK) dom.aliceComputedK.innerHTML = 'K = 2';
      if (dom.bobComputedK) dom.bobComputedK.innerHTML = 'K = 2';
    } else {
      dom.tabMitm.classList.add('active');
      dom.tabPassive.classList.remove('active');
      dom.passiveSection.style.display = 'none';
      dom.mitmSection.style.display = 'block';
      updateMitmDisplay();
    }
  }

  function resetSimulation() {
    state.isBruteForcing = false;
    state.bruteForceDiscoveredKey = null;

    clearTerminal();

    // Reset Hidden vault labels
    if (dom.hiddenA) dom.hiddenA.innerHTML = '<span class="privacy-badge private">a = 6 (Private)</span>';
    if (dom.hiddenB) dom.hiddenB.innerHTML = '<span class="privacy-badge private">b = 15 (Private)</span>';
    if (dom.hiddenK) dom.hiddenK.innerHTML = '<span class="privacy-badge private">K = 2 (Shared Secret)</span>';

    // Restore Alice and Bob cards
    if (dom.aliceComputedK) dom.aliceComputedK.innerHTML = 'K = 2';
    if (dom.bobComputedK) dom.bobComputedK.innerHTML = 'K = 2';

    // Reset tamper fields
    if (dom.eveModifiedMsgInput) dom.eveModifiedMsgInput.value = "Authorize payment of $5,000 to Eve";
    if (dom.bobReceivedMsg) {
      dom.bobReceivedMsg.innerHTML = '<span style="color:var(--text-dim);">(Waiting for transmission from Alice...)</span>';
    }

    if (dom.btnBruteForce) dom.btnBruteForce.disabled = false;
  }

  // --- MODAL CONTROLLER ---
  function openExplainModal() {
    if (dom.explainModal) dom.explainModal.classList.add('active');
  }

  function closeExplainModal() {
    if (dom.explainModal) dom.explainModal.classList.remove('active');
  }

  // Helpers
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- BIND EVENTS ---
  function bindEvents() {
    if (dom.tabPassive) dom.tabPassive.addEventListener('click', () => switchMode('passive'));
    if (dom.tabMitm) dom.tabMitm.addEventListener('click', () => switchMode('mitm'));

    if (dom.btnBruteForce) dom.btnBruteForce.addEventListener('click', startBruteForceDiscovery);
    if (dom.btnResetAttack) dom.btnResetAttack.addEventListener('click', resetSimulation);
    if (dom.btnExplainAttack) dom.btnExplainAttack.addEventListener('click', openExplainModal);

    if (dom.btnTamperMsg) dom.btnTamperMsg.addEventListener('click', simulateMessageTampering);

    if (dom.modalCloseBtn) dom.modalCloseBtn.addEventListener('click', closeExplainModal);
    if (dom.explainModal) {
      dom.explainModal.addEventListener('click', (e) => {
        if (e.target === dom.explainModal) closeExplainModal();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    clearTerminal();
    updateMitmDisplay();
    console.log('CryptoLab: Attacker Simulation Module fully initialized.');
  });

})();
