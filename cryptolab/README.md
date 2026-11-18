# 🔐 CryptoLab — Diffie-Hellman Key Exchange & Secret Messaging Simulator

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success?style=for-the-badge)](package.json)
[![BigInt Mathematics](https://img.shields.io/badge/Math-BigInt_Modular_Exponentiation-blueviolet?style=for-the-badge)](exchange.html)

**CryptoLab** is an interactive, browser-based educational simulator designed for undergraduate **Cryptography and Information Security** students. It visually and mathematically demonstrates how two parties (Alice and Bob) establish a shared secret key over an untrusted public communication channel using the **Diffie-Hellman Key Exchange (DHKE)** algorithm, how they use that secret to exchange encrypted messages, and how an adversary (Eve) attempts to eavesdrop or execute active Man-in-the-Middle (MITM) attacks.

---

## 🌟 Key Features

### 1. ⚡ Interactive Algorithm Simulator (`exchange.html`)
* **Real BigInt Mathematical Calculations:** Computes modular exponentiations using native JavaScript `BigInt` ($A \equiv g^a \pmod p$, $B \equiv g^b \pmod p$, $K \equiv B^a \pmod p$, $K \equiv A^b \pmod p$). No mocked or random results.
* **4 Synchronized Algorithm Stages:**
  * **Stage 1 (Initialize):** Configure domain prime modulus $p$ and generator $g$; generate or enter private exponents $a$ and $b$.
  * **Stage 2 (Generate Public Keys):** Real-time calculation of public values $A$ and $B$.
  * **Stage 3 (Public Wire Exchange):** Animated packet transmission along dual communication lanes with Eve intercepting public values in real time. Private keys never leave the participants' local devices.
  * **Stage 4 (Shared Secret Calculation):** Independent computation and comparison of shared key $K$. Displays identity proof: $(g^b)^a \equiv g^{ab} \equiv (g^a)^b \pmod p$.
* **Full Playback Controls:** Start Simulation, Pause, Resume, Auto-Play, Step-by-Step Forward/Backward, and Reset.

### 2. 💬 End-to-End Secret Messaging Lab (`messaging.html`)
* **Symmetric Session Encryption:** Demonstrates why key exchange is crucial in modern communications. Alice and Bob use their negotiated Diffie-Hellman secret key $K$ to exchange encrypted text in real time.
* **Eve's Wire Tap & Packet Sniffer:** Eve intercepts ciphertext packets traveling on the wire. Shows that without key $K$, intercepted ciphertext bytes cannot be read.
* **Live Cryptographic Transmission Inspector:** 4-step breakdown of every message:
  1. Plaintext on sender device
  2. Symmetric keystream derived from $K$
  3. Raw hex ciphertext traversing the public wire
  4. Decrypted plaintext at destination device
* **Interactive Tamper & Mismatch Sandbox:** Toggle options to simulate what happens when Bob holds an incorrect key or when Eve tampers with ciphertext in flight.

### 3. 🛡️ Adversary & Attack Simulation (`attack.html`)
* **Passive Eavesdropping & Discrete Log Problem (DLP):** Demonstrates why holding public values $p$, $g$, $A$, and $B$ does not reveal $K$. Features a live brute-force search demonstration for small educational parameters ($5^x \equiv 8 \pmod{23}$).
* **Active Man-in-the-Middle (MITM) Attack:** Demonstrates DH's vulnerability to unauthenticated key replacement. Eve intercepts $A$ and $B$, replaces them with her own forged key $E$, establishing two distinct encrypted tunnels ($K_{AE} = 12$ and $K_{EB} = 15$) and tampering with in-flight messages undetected.
* **Toy vs. Production Parameter Comparison:** Explains the security difference between academic 5-bit numbers ($p = 23$) and production cryptographic standards (2048-bit MODP Group 14, RFC 3526, and Curve25519 in TLS 1.3).

### 4. 🎨 Titanium Obsidian Colorway & High-Legibility UI
* Specially crafted to move away from generic dark navy/blue student themes.
* Built on a **Deep Carbon Obsidian** background (`#090a0f`) with color-coded participant identities:
  * 🟢 **Alice (Client A):** Cyber Emerald / Neo-Mint (`#10b981`)
  * 🟣 **Bob (Client B):** Royal Amethyst / Electric Orchid (`#a855f7`)
  * 🔴 **Eve (Adversary):** Crimson Flame (`#f43f5e`)
  * 🟡 **Public Parameters & Shared Key $K$:** Solar Gold (`#f59e0b` / `#fbbf24`)
* High-contrast typography scaled for accessibility, glassmorphic HUD cards, responsive mobile support, and zero external dependencies (pure inline SVGs).

---

## 📐 Mathematical Formulation

### The Diffie-Hellman Key Agreement

Given public domain parameters:
- $p$: A large prime number
- $g$: A primitive root modulo $p$ (generator)

$$\begin{array}{rcccl}
\textbf{Alice} & & \textbf{Public Channel (Eve)} & & \textbf{Bob} \\
\hline
\text{Chooses private exponent } a & & & & \text{Chooses private exponent } b \\
\text{Calculates } A = g^a \bmod p & \xrightarrow{\quad A \quad} & \text{Eve captures } p, g, A, B & \xleftarrow{\quad B \quad} & \text{Calculates } B = g^b \bmod p \\
\text{Computes } K = B^a \bmod p & & & & \text{Computes } K = A^b \bmod p \\
\end{array}$$

### Identity Proof
$$K_{\text{Alice}} = B^a \bmod p = (g^b)^a \bmod p = g^{ab} \bmod p$$
$$K_{\text{Bob}} = A^b \bmod p = (g^a)^b \bmod p = g^{ab} \bmod p$$
$$\therefore K_{\text{Alice}} \equiv K_{\text{Bob}} \pmod p$$

### Test Vector Example (Built into Simulator)
- Prime modulus: $p = 23$
- Generator base: $g = 5$
- Alice's private key: $a = 6 \implies A = 5^6 \bmod 23 = 8$
- Bob's private key: $b = 15 \implies B = 5^{15} \bmod 23 = 19$
- Alice computes shared secret: $K = 19^6 \bmod 23 = \mathbf{2}$
- Bob computes shared secret: $K = 8^{15} \bmod 23 = \mathbf{2}$

---

## 📂 Project Structure

```text
Diffie-Hellman-Key-Exchange/
├── index.html            # Homepage: Hero section, role architecture, feature overview
├── exchange.html         # Key Exchange Lab: 4-stage animated simulator with controls
├── messaging.html        # Secret Messaging Lab: End-to-end symmetric chat & Eve sniffer
├── attack.html           # Attack Simulation: Discrete Log challenge & Active MITM
├── css/
│   ├── style.css         # Design system: Titanium Obsidian theme, badges, navigation
│   ├── exchange.css      # Stepper tracker, flying packet animations, channel wires
│   ├── messaging.css     # Chat bubbles, packet sniffer HUD, keystream inspector
│   └── attack.css        # Adversary console, dual-tunnel diagrams, attack terminal
├── js/
│   ├── main.js           # Shared navigation highlighting & mobile drawer
│   ├── exchange.js       # BigInt modular math, animation timeline, step controllers
│   ├── messaging.js      # Symmetric session cipher, flying packets, inspector engine
│   └── attack.js         # DLP brute-force engine, dual MITM tunnel simulation
├── assets/               # Project icons and static assets
├── .gitignore            # Git ignore file
├── LICENSE               # MIT License
└── README.md             # Project documentation
```

---

## 🚀 Getting Started

No compilers, package managers, or backend servers are required. CryptoLab runs directly in any modern web browser.

### Option 1: VS Code Live Server (Recommended)
1. Open this repository folder in **Visual Studio Code**.
2. Install the **Live Server** extension (`ritwickdey.LiveServer`).
3. Right-click on `index.html` and select **"Open with Live Server"**.
4. The application will launch at `http://127.0.0.1:5500/`.

### Option 2: Python Static Server
Open a terminal in the project directory and run:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

### Option 3: Node.js (npx serve)
```bash
npx serve .
```

---

## 🛠️ Technology Stack

* **HTML5:** Semantic markup, accessible forms, SVG graphics.
* **CSS3:** Custom properties (CSS variables), glassmorphism, responsive grid & flexbox, keyframe packet animations.
* **Vanilla JavaScript (ES6+):** Native `BigInt` arithmetic, modular exponentiation, event-driven timeline architecture.
* **No Frameworks:** 0 React, 0 Vue, 0 Angular, 0 external runtime dependencies.
* **Zero External CDNs:** All icons are embedded SVGs for complete offline support and zero network tracking.

---

## 📜 Academic Integrity & License

This project was developed for academic study in **Cryptography and Information Security**. It is distributed under the [MIT License](LICENSE) — you are free to use, modify, and learn from this codebase for educational and research purposes.
