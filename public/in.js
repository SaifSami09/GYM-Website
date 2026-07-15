// ── Sticky nav ──
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    });

    // ── Hamburger menu ──
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // ── Scroll animations ──
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), 80 * i);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    document.querySelectorAll('.programs-grid, .trainers-grid, .pricing-grid, .testimonials-grid').forEach(grid => {
      Array.from(grid.children).forEach((child, i) => {
        child.style.transitionDelay = `${i * 80}ms`;
      });
    });

    // ── JOIN MODAL ──
    const modal        = document.getElementById('joinModal');
    const modalClose   = document.getElementById('modalClose');
    const submitBtn    = document.getElementById('submitBtn');
    const planBadge    = document.getElementById('selectedPlanBadge');
    const planRadios   = document.querySelectorAll('input[name="plan"]');

    // Map plan values to badge text
    const planLabels = {
      'Starter – $39/mo':      '🔥 Starter Plan Selected',
      'Performance – $79/mo':  '⚡ Performance Plan Selected',
      'Elite – $149/mo':       '👑 Elite Plan Selected',
    };

    // Pre-select plan from pricing cards
    function openModal(planValue) {
      // Reset form & success state
      document.getElementById('modalForm').style.display = '';
      document.getElementById('modalSuccess').classList.remove('show');
      submitBtn.classList.remove('loading');
      clearErrors();

      // Set plan radio
      if (planValue) {
        const match = [...planRadios].find(r => r.value === planValue);
        if (match) match.checked = true;
      }
      updatePlanBadge();

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('firstName').focus(), 350);
    }

    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    function updatePlanBadge() {
      const checked = document.querySelector('input[name="plan"]:checked');
      planBadge.textContent = checked ? (planLabels[checked.value] || checked.value) : '⚡ Performance Plan Selected';
    }

    planRadios.forEach(r => r.addEventListener('change', updatePlanBadge));

    // Wire ALL join/cta buttons
    document.querySelectorAll('.nav-cta, .btn-primary, .btn-white, .plan-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Detect plan from pricing card context
        const card = btn.closest('.plan-card');
        let planValue = null;
        if (card) {
          const label = card.querySelector('.plan-label')?.textContent?.trim();
          const price = card.querySelector('.plan-price')?.textContent?.replace(/[^0-9]/g,'');
          const map = { 'Starter': 'Starter – $39/mo', 'Performance': 'Performance – $79/mo', 'Elite': 'Elite – $149/mo' };
          planValue = map[label] || null;
        }
        openModal(planValue);
      });
    });

    // Mobile menu join link
    document.querySelectorAll('.mobile-link').forEach(link => {
      if (link.textContent.trim() === 'Join Now') {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          hamburger.classList.remove('open');
          mobileMenu.classList.remove('open');
          document.body.style.overflow = '';
          setTimeout(() => openModal(null), 100);
        });
      }
    });

    // Close triggers
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // ── Validation ──
    function showError(inputId, errId) {
      document.getElementById(inputId).classList.add('error');
      document.getElementById(errId).classList.add('show');
    }
    function clearErrors() {
      document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      document.querySelectorAll('.field-error').forEach(el => el.classList.remove('show'));
      document.getElementById('errTerms').style.display = 'none';
    }
    function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
    function validatePhone(v) { return /^[\d\s\+\-\(\)]{7,}$/.test(v); }

    submitBtn.addEventListener('click', async () => {
      clearErrors();
      let valid = true;

      const first = document.getElementById('firstName').value.trim();
      const last  = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const goal  = document.getElementById('goal').value;
      const exp   = document.getElementById('experience').value;
      const terms = document.getElementById('agreeTerms').checked;

      if (!first)           { showError('firstName', 'errFirst'); valid = false; }
      if (!last)            { showError('lastName',  'errLast');  valid = false; }
      if (!validateEmail(email)) { showError('email', 'errEmail'); valid = false; }
      if (phone && !validatePhone(phone)) { showError('phone', 'errPhone'); valid = false; }
      if (!goal)            { showError('goal', 'errGoal'); valid = false; }
      if (!exp)             { showError('experience', 'errExp'); valid = false; }
      if (!terms) {
        const errTerms = document.getElementById('errTerms');
        errTerms.classList.add('show');
        errTerms.style.display = 'block';
        valid = false;
      }

      if (!valid) return;

      // ── Real API call ──────────────────────────────────────────────────────
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      const payload = {
        firstName:   first,
        lastName:    last,
        email,
        phone:       document.getElementById('phone').value.trim() || null,
        plan:        document.querySelector('input[name="plan"]:checked')?.value || '',
        goal,
        experience:  document.getElementById('experience').value,
        message:     document.getElementById('message').value.trim() || null,
        agreeTerms:  true,
      };

      // Helper: show a message below the submit button
      function showSubmitError(msg) {
        let errEl = document.getElementById('submitGenericError');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.id = 'submitGenericError';
          errEl.style.cssText = 'color:#ff6b6b;font-size:0.82rem;margin-top:12px;text-align:center;line-height:1.5';
          submitBtn.after(errEl);
        }
        errEl.textContent = msg;
        errEl.style.display = 'block';
      }

      // Always use the same host:port the page was served from so it works
      // whether the server is on port 3000, 3001, or anything else.
      const API_BASE = window.location.origin;

      // Guard: if opened as a file:// — remind user to use the server
      if (window.location.protocol === 'file:') {
        showSubmitError('⚠ Open this page via the Node server (http://localhost:3000), not as a local file.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
      }

      try {
        let res, data;
        try {
          res  = await fetch(API_BASE + '/api/signups', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          });
        } catch (networkErr) {
          // fetch() itself threw — server unreachable or CORS preflight failed
          console.error('Fetch error:', networkErr);
          showSubmitError('Cannot reach the server. Make sure node server.js is running on ' + API_BASE);
          return;
        }

        try {
          data = await res.json();
        } catch {
          showSubmitError('Unexpected response from server. Please try again.');
          return;
        }

        if (!res.ok) {
          // Show server-side field errors if present
          if (data.errors) {
            if (data.errors.firstName)  showError('firstName', 'errFirst');
            if (data.errors.lastName)   showError('lastName',  'errLast');
            if (data.errors.email) {
              document.getElementById('email').classList.add('error');
              document.getElementById('errEmail').textContent = data.errors.email;
              document.getElementById('errEmail').classList.add('show');
            }
          }
          showSubmitError(data.message || 'Something went wrong. Please try again.');
          return;
        }

        // ── Success ─────────────────────────────────────────────────────────
        document.getElementById('modalForm').style.display = 'none';
        const successEl = document.getElementById('modalSuccess');
        successEl.classList.add('show');
        document.getElementById('successName').textContent = first;

      } catch (err) {
        console.error('Unexpected error during signup:', err);
        showSubmitError('Unexpected error: ' + err.message);
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });