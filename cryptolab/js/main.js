/**
 * CryptoLab - Diffie-Hellman Key Exchange Simulator
 * Main Script: Global UI, Navigation & Shared Utilities
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  highlightActiveNav();
  console.log('CryptoLab Core Engine initialized successfully.');
});

/**
 * Initializes mobile hamburger menu toggle
 */
function initNavigation() {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navLinks.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', isExpanded);
    });

    // Close mobile nav when clicking outside
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target) && navLinks.classList.contains('show')) {
        navLinks.classList.remove('show');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

/**
 * Highlights active navigation link based on current pathname
 */
function highlightActiveNav() {
  const rawPath = window.location.pathname.split('/').pop() || 'index.html';
  const currentPath = rawPath.split('?')[0].split('#')[0] || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Shared Cryptographic Math Utilities (Ready for Module Steps)
 */
const CryptoMath = {
  /**
   * Modular exponentiation: (base^exp) % mod
   * Uses BigInt to prevent integer overflow with larger numbers
   */
  modPow(base, exp, mod) {
    try {
      let b = BigInt(base);
      let e = BigInt(exp);
      let m = BigInt(mod);
      if (m === 1n) return 0n;
      let result = 1n;
      b = b % m;
      while (e > 0n) {
        if (e % 2n === 1n) {
          result = (result * b) % m;
        }
        e = e / 2n;
        b = (b * b) % m;
      }
      return Number(result);
    } catch (err) {
      console.error('Math error in modPow:', err);
      return 0;
    }
  },

  /**
   * Basic primality test
   */
  isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }
};

window.CryptoMath = CryptoMath;
