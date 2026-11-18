/**
 * CryptoLab - Diffie-Hellman Key Exchange Simulator
 * Fully Interactive Animated Algorithm Simulator (exchange.js)
 */

(function () {
  'use strict';

  // --- CRYPTOGRAPHIC MATHEMATICAL UTILITIES (BigInt) ---
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
      console.error('modPow calculation error:', err);
      return null;
    }
  }

  function isPrime(n) {
    if (typeof n === 'bigint') n = Number(n);
    if (!Number.isInteger(n) || n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // --- SIMULATION STATE ---
  const state = {
    // Current stage: 1 = Initialize, 2 = Public Keys, 3 = Transit Wire, 4 = Shared Secret
    currentStage: 1,
    totalStages: 4,

    // Mathematical parameters
    p: 23n,
    g: 5n,
    a: 6n,
    b: 15n,
    A: 8n,
    B: 19n,
    secretA: 2n,
    secretB: 2n,

    // Control States
    isAutoPlaying: false,
    isPaused: false,
    autoTimer: null,
    autoDelay: 3200 // ms per stage in Auto Play
  };

  // Educational Explanations per Stage
  const STAGE_METADATA = {
    1: {
      title: "Stage 1: Initialization & Private Key Generation",
      description: "Alice and Bob openly select public prime modulus <strong>p = {p}</strong> and generator <strong>g = {g}</strong>. Then, each party independently chooses a random private key (Alice: <strong>a = {a}</strong>, Bob: <strong>b = {b}</strong>). These private exponents remain strictly confidential and never leave their local devices.",
      highlight: ["alice-card", "bob-card"]
    },
    2: {
      title: "Stage 2: Public Key Computation",
      description: "Alice computes her public key <strong>A = g<sup>a</sup> mod p = {g}<sup>{a}</sup> mod {p} = {A}</strong>. Simultaneously, Bob computes his public key <strong>B = g<sup>b</sup> mod p = {g}<sup>{b}</sup> mod {p} = {B}</strong>. Both calculations are executed locally using fast modular exponentiation.",
      highlight: ["alice-pub-tile", "bob-pub-tile"]
    },
    3: {
      title: "Stage 3: Public Key Exchange Over Insecure Wire",
      description: "Alice transmits public token <strong>A = {A}</strong> across the channel to Bob. Bob transmits <strong>B = {B}</strong> across the channel to Alice. In the center, <strong>Eve intercepts and logs both public numbers</strong>, but she cannot deduce the private keys <strong>a</strong> or <strong>b</strong> due to the Discrete Logarithm barrier.",
      highlight: ["channel-card", "wire-stage"]
    },
    4: {
      title: "Stage 4: Shared Secret Derivation & Verification",
      description: "Alice calculates <strong>K = B<sup>a</sup> mod p = {B}<sup>{a}</sup> mod {p} = {secretA}</strong>. Bob calculates <strong>K = A<sup>b</sup> mod p = {A}<sup>{b}</sup> mod {p} = {secretB}</strong>. Because (g<sup>b</sup>)<sup>a</sup> ≡ (g<sup>a</sup>)<sup>b</sup> ≡ g<sup>ab</sup> (mod p), both parties arrive at the identical shared secret key <strong>K = {secretA}</strong> without ever transmitting it!",
      highlight: ["alice-secret-tile", "bob-secret-tile", "verify-banner"]
    }
  };

  // DOM Elements Cache
  let dom = {};

  function cacheDom() {
    dom = {
      // Inputs
      inputP: document.getElementById('input-p'),
      inputG: document.getElementById('input-g'),
      inputA: document.getElementById('input-a'),
      inputB: document.getElementById('input-b'),

      // Validation Msg
      msgP: document.getElementById('msg-p'),
      msgG: document.getElementById('msg-g'),
      msgA: document.getElementById('msg-a'),
      msgB: document.getElementById('msg-b'),

      // Control Buttons
      btnStartSim: document.getElementById('btn-start-sim'),
      btnPauseSim: document.getElementById('btn-pause-sim'),
      btnResumeSim: document.getElementById('btn-resume-sim'),
      btnAutoPlay: document.getElementById('btn-auto-play'),
      btnPrevStep: document.getElementById('btn-prev-step'),
      btnNextStep: document.getElementById('btn-next-step'),
      btnResetSim: document.getElementById('btn-reset-sim'),

      // Param Generator Buttons
      btnGenParams: document.getElementById('btn-gen-params'),
      btnGenAliceA: document.getElementById('btn-gen-alice-a'),
      btnGenBobB: document.getElementById('btn-gen-bob-b'),

      // Stage Tabs
      stageTabs: document.querySelectorAll('.stage-tab'),
      stageExplTitle: document.getElementById('stage-expl-title'),
      stageExplDesc: document.getElementById('stage-expl-desc'),

      // Participant Cards & Displays
      aliceCard: document.getElementById('alice-card'),
      bobCard: document.getElementById('bob-card'),
      channelCard: document.getElementById('channel-card'),

      // Alice Displays
      alicePrivDisplay: document.getElementById('alice-priv-val'),
      alicePubFormula: document.getElementById('alice-pub-formula'),
      alicePubVal: document.getElementById('alice-pub-val'),
      aliceSecretFormula: document.getElementById('alice-secret-formula'),
      aliceSecretVal: document.getElementById('alice-secret-val'),
      alicePubTile: document.getElementById('alice-pub-tile'),
      aliceSecretTile: document.getElementById('alice-secret-tile'),

      // Bob Displays
      bobPrivDisplay: document.getElementById('bob-priv-val'),
      bobPubFormula: document.getElementById('bob-pub-formula'),
      bobPubVal: document.getElementById('bob-pub-val'),
      bobSecretFormula: document.getElementById('bob-secret-formula'),
      bobSecretVal: document.getElementById('bob-secret-val'),
      bobPubTile: document.getElementById('bob-pub-tile'),
      bobSecretTile: document.getElementById('bob-secret-tile'),

      // Eve Monitor Displays
      eveModP: document.getElementById('eve-intel-p'),
      eveGenG: document.getElementById('eve-intel-g'),
      evePubA: document.getElementById('eve-intel-a'),
      evePubB: document.getElementById('eve-intel-b'),

      // Flying Wire Packets & Log
      packetAliceToBob: document.getElementById('packet-a-to-b'),
      packetBobToAlice: document.getElementById('packet-b-to-a'),
      channelTerminal: document.getElementById('channel-terminal'),

      // Verification Card
      verifyBanner: document.getElementById('verify-banner'),
      verifySecretVal: document.getElementById('verify-secret-val')
    };
  }

  // --- RECALCULATE SIMULATION VALUES ---
  function recomputeMath() {
    // Read and validate P
    const pNum = parseInt(dom.inputP.value, 10);
    const gNum = parseInt(dom.inputG.value, 10);
    const aNum = parseInt(dom.inputA.value, 10);
    const bNum = parseInt(dom.inputB.value, 10);

    let valid = true;

    if (!isPrime(pNum) || pNum < 3) {
      dom.msgP.className = 'validation-msg error';
      dom.msgP.textContent = 'p must be a prime integer ≥ 3';
      valid = false;
    } else {
      dom.msgP.className = 'validation-msg success';
      dom.msgP.textContent = '✓ Valid Prime';
      state.p = BigInt(pNum);
    }

    if (isNaN(gNum) || gNum <= 1 || (state.p && gNum >= state.p)) {
      dom.msgG.className = 'validation-msg error';
      dom.msgG.textContent = `g must be > 1 and < ${state.p}`;
      valid = false;
    } else {
      dom.msgG.className = 'validation-msg success';
      dom.msgG.textContent = '✓ Valid Generator';
      state.g = BigInt(gNum);
    }

    if (isNaN(aNum) || aNum <= 1 || (state.p && aNum >= state.p)) {
      dom.msgA.className = 'validation-msg error';
      dom.msgA.textContent = `a must be between 2 and ${state.p - 1n}`;
      valid = false;
    } else {
      dom.msgA.className = 'validation-msg success';
      dom.msgA.textContent = '✓ Valid Private Key';
      state.a = BigInt(aNum);
    }

    if (isNaN(bNum) || bNum <= 1 || (state.p && bNum >= state.p)) {
      dom.msgB.className = 'validation-msg error';
      dom.msgB.textContent = `b must be between 2 and ${state.p - 1n}`;
      valid = false;
    } else {
      dom.msgB.className = 'validation-msg success';
      dom.msgB.textContent = '✓ Valid Private Key';
      state.b = BigInt(bNum);
    }

    if (!valid) return false;

    // Actual Modular Exponentiation using BigInt
    state.A = modPow(state.g, state.a, state.p);
    state.B = modPow(state.g, state.b, state.p);
    state.secretA = modPow(state.B, state.a, state.p);
    state.secretB = modPow(state.A, state.b, state.p);

    // Update displays
    dom.alicePrivDisplay.textContent = state.a.toString();
    dom.bobPrivDisplay.textContent = state.b.toString();

    dom.alicePubFormula.textContent = `${state.g}^${state.a} mod ${state.p}`;
    dom.bobPubFormula.textContent = `${state.g}^${state.b} mod ${state.p}`;

    dom.alicePubVal.textContent = state.A.toString();
    dom.bobPubVal.textContent = state.B.toString();

    dom.aliceSecretFormula.textContent = `B^a = ${state.B}^${state.a} mod ${state.p}`;
    dom.bobSecretFormula.textContent = `A^b = ${state.A}^${state.b} mod ${state.p}`;

    dom.aliceSecretVal.textContent = state.secretA.toString();
    dom.bobSecretVal.textContent = state.secretB.toString();

    dom.packetAliceToBob.textContent = `A = ${state.A}`;
    dom.packetBobToAlice.textContent = `B = ${state.B}`;

    dom.eveModP.textContent = `p = ${state.p}`;
    dom.eveGenG.textContent = `g = ${state.g}`;
    dom.evePubA.textContent = `A = ${state.A}`;
    dom.evePubB.textContent = `B = ${state.B}`;

    if (dom.verifySecretVal) dom.verifySecretVal.textContent = state.secretA.toString();

    return true;
  }

  // --- STAGE RENDERER & ANIMATOR ---
  function renderStage(stageNum) {
    state.currentStage = stageNum;
    recomputeMath();

    // 1. Update Stepper Tabs
    dom.stageTabs.forEach((tab, idx) => {
      const step = idx + 1;
      tab.classList.remove('active', 'completed');
      if (step === stageNum) {
        tab.classList.add('active');
      } else if (step < stageNum) {
        tab.classList.add('completed');
      }
    });

    // 2. Update Educational Explanation
    const meta = STAGE_METADATA[stageNum];
    dom.stageExplTitle.textContent = meta.title;

    let desc = meta.description
      .replace(/{p}/g, state.p.toString())
      .replace(/{g}/g, state.g.toString())
      .replace(/{a}/g, state.a.toString())
      .replace(/{b}/g, state.b.toString())
      .replace(/{A}/g, state.A.toString())
      .replace(/{B}/g, state.B.toString())
      .replace(/{secretA}/g, state.secretA.toString())
      .replace(/{secretB}/g, state.secretB.toString());
    dom.stageExplDesc.innerHTML = desc;

    // 3. Clear Highlights and Active States
    document.querySelectorAll('.active-participant, .computing').forEach(el => {
      el.classList.remove('active-participant', 'computing');
    });

    // 4. Reset or Trigger Flying Packets
    if (stageNum < 3) {
      dom.packetAliceToBob.classList.remove('transit-active');
      dom.packetBobToAlice.classList.remove('transit-active');
    }

    // 5. Stage Specific Visual States & Animations
    if (stageNum === 1) {
      // Stage 1: Initialize
      dom.aliceCard.classList.add('active-participant');
      dom.bobCard.classList.add('active-participant');
      dom.channelTerminal.innerHTML = `&gt; [STAGE 1 INITIALIZE]<br>&gt; Public Domain: Prime p = ${state.p}, Generator g = ${state.g}<br>&gt; Alice private key a = ${state.a} (Secured). Bob private key b = ${state.b} (Secured).`;
      dom.verifyBanner.style.display = 'none';
    } else if (stageNum === 2) {
      // Stage 2: Generate Public Keys
      dom.alicePubTile.classList.add('computing');
      dom.bobPubTile.classList.add('computing');
      dom.aliceCard.classList.add('active-participant');
      dom.bobCard.classList.add('active-participant');
      dom.channelTerminal.innerHTML = `&gt; [STAGE 2 COMPUTATION]<br>&gt; Alice computed Public A = ${state.g}^${state.a} mod ${state.p} = ${state.A}<br>&gt; Bob computed Public B = ${state.g}^${state.b} mod ${state.p} = ${state.B}<br>&gt; Ready for public wire exchange...`;
      dom.verifyBanner.style.display = 'none';
    } else if (stageNum === 3) {
      // Stage 3: Public Key Exchange Across Wire
      dom.channelCard.classList.add('active-participant');
      dom.channelTerminal.innerHTML = `&gt; [STAGE 3 TRANSMISSION IN PROGRESS...]<br>&gt; Alice sending Public A = ${state.A} &rarr; Bob<br>&gt; Bob sending Public B = ${state.B} &rarr; Alice<br>&gt; [EVE RADAR] Intercepted unencrypted public values A and B!`;

      // Trigger smooth packet transition across the wire
      setTimeout(() => {
        dom.packetAliceToBob.classList.add('transit-active');
        dom.packetBobToAlice.classList.add('transit-active');

        setTimeout(() => {
          dom.channelTerminal.innerHTML += `<br>&gt; [SUCCESS] Delivery confirmed: Alice received B = ${state.B}. Bob received A = ${state.A}.`;
        }, 2200);
      }, 100);

      dom.verifyBanner.style.display = 'none';
    } else if (stageNum === 4) {
      // Stage 4: Shared Secret Calculation & Verification
      dom.packetAliceToBob.classList.add('transit-active');
      dom.packetBobToAlice.classList.add('transit-active');

      dom.aliceSecretTile.classList.add('computing');
      dom.bobSecretTile.classList.add('computing');
      dom.aliceCard.classList.add('active-participant');
      dom.bobCard.classList.add('active-participant');

      dom.channelTerminal.innerHTML = `&gt; [STAGE 4 DERIVATION]<br>&gt; Alice computed K = B^a mod p = ${state.B}^${state.a} mod ${state.p} = ${state.secretA}<br>&gt; Bob computed K = A^b mod p = ${state.A}^${state.b} mod ${state.p} = ${state.secretB}<br>&gt; Verification: Secret keys match exactly (K = ${state.secretA})!`;

      dom.verifyBanner.style.display = 'flex';
    }

    // 6. Update Button States
    dom.btnPrevStep.disabled = (stageNum === 1);
    dom.btnNextStep.disabled = (stageNum === state.totalStages);
  }

  // --- CONTROLS IMPLEMENTATION ---

  function startSimulation() {
    stopAutoPlay();
    state.isPaused = false;
    renderStage(1);
    startAutoPlay();
  }

  function pauseSimulation() {
    if (!state.isAutoPlaying) return;
    state.isPaused = true;
    clearInterval(state.autoTimer);
    dom.btnPauseSim.style.display = 'none';
    dom.btnResumeSim.style.display = 'inline-flex';
    dom.channelTerminal.innerHTML += '<br>&gt; [PAUSED] Simulation paused by user.';
  }

  function resumeSimulation() {
    if (!state.isPaused) return;
    state.isPaused = false;
    dom.btnResumeSim.style.display = 'none';
    dom.btnPauseSim.style.display = 'inline-flex';
    dom.channelTerminal.innerHTML += '<br>&gt; [RESUMED] Simulation continuing...';
    startAutoPlay();
  }

  function nextStep() {
    stopAutoPlay();
    if (state.currentStage < state.totalStages) {
      renderStage(state.currentStage + 1);
    }
  }

  function prevStep() {
    stopAutoPlay();
    if (state.currentStage > 1) {
      renderStage(state.currentStage - 1);
    }
  }

  function resetSimulation() {
    stopAutoPlay();
    state.isPaused = false;
    dom.btnPauseSim.style.display = 'inline-flex';
    dom.btnResumeSim.style.display = 'none';

    // Reset default parameters
    dom.inputP.value = 23;
    dom.inputG.value = 5;
    dom.inputA.value = 6;
    dom.inputB.value = 15;

    renderStage(1);
  }

  function toggleAutoPlay() {
    if (state.isAutoPlaying) {
      stopAutoPlay();
    } else {
      state.isPaused = false;
      startAutoPlay();
    }
  }

  function startAutoPlay() {
    state.isAutoPlaying = true;
    dom.btnAutoPlay.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      Stop Auto
    `;

    clearInterval(state.autoTimer);
    state.autoTimer = setInterval(() => {
      if (state.isPaused) return;
      if (state.currentStage < state.totalStages) {
        renderStage(state.currentStage + 1);
      } else {
        stopAutoPlay();
      }
    }, state.autoDelay);
  }

  function stopAutoPlay() {
    state.isAutoPlaying = false;
    clearInterval(state.autoTimer);
    dom.btnAutoPlay.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Auto Play
    `;
    dom.btnPauseSim.style.display = 'inline-flex';
    dom.btnResumeSim.style.display = 'none';
  }

  // --- PARAMETER GENERATORS ---
  function generateRandomParams() {
    const primes = [23, 47, 59, 83, 101, 107, 167];
    const chosenP = primes[getRandomInt(0, primes.length - 1)];
    const chosenG = 2; // Common safe generator

    dom.inputP.value = chosenP;
    dom.inputG.value = chosenG;

    dom.inputA.value = getRandomInt(2, Math.min(chosenP - 2, 40));
    dom.inputB.value = getRandomInt(2, Math.min(chosenP - 2, 40));

    renderStage(state.currentStage);
  }

  function generateRandomAlice() {
    const p = parseInt(dom.inputP.value, 10) || 23;
    dom.inputA.value = getRandomInt(2, Math.min(p - 2, 50));
    renderStage(state.currentStage);
  }

  function generateRandomBob() {
    const p = parseInt(dom.inputP.value, 10) || 23;
    dom.inputB.value = getRandomInt(2, Math.min(p - 2, 50));
    renderStage(state.currentStage);
  }

  // --- BIND EVENT LISTENERS ---
  function bindEvents() {
    // Stage Tabs Click
    dom.stageTabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        stopAutoPlay();
        renderStage(idx + 1);
      });
    });

    // Control Buttons
    dom.btnStartSim.addEventListener('click', startSimulation);
    dom.btnPauseSim.addEventListener('click', pauseSimulation);
    dom.btnResumeSim.addEventListener('click', resumeSimulation);
    dom.btnAutoPlay.addEventListener('click', toggleAutoPlay);
    dom.btnNextStep.addEventListener('click', nextStep);
    dom.btnPrevStep.addEventListener('click', prevStep);
    dom.btnResetSim.addEventListener('click', resetSimulation);

    // Param Generation
    dom.btnGenParams.addEventListener('click', generateRandomParams);
    dom.btnGenAliceA.addEventListener('click', generateRandomAlice);
    dom.btnGenBobB.addEventListener('click', generateRandomBob);

    // Inputs live synchronization
    [dom.inputP, dom.inputG, dom.inputA, dom.inputB].forEach(input => {
      input.addEventListener('input', () => {
        recomputeMath();
        renderStage(state.currentStage);
      });
    });
  }

  // --- INITIALIZE ---
  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    renderStage(1);
    console.log('CryptoLab: Interactive Animated Algorithm Simulator initialized.');
  });

})();
