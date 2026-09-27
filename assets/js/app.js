(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const header = $('[data-header]');
  const nav = $('[data-nav]');
  const menuToggle = $('[data-menu-toggle]');
  const modal = $('[data-modal]');
  const modalDialog = $('.modal__dialog', modal || document);
  const calcSummaryInput = $('[data-calculator-summary]');
  let lastFocusedElement = null;

  const setHeaderState = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 18);
  };
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  const closeMenu = () => {
    if (!nav || !menuToggle) return;
    nav.classList.remove('is-open');
    menuToggle.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const willOpen = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', willOpen);
      menuToggle.classList.toggle('is-open', willOpen);
      menuToggle.setAttribute('aria-expanded', String(willOpen));
    });

    $$('a', nav).forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
      closeMenu();
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // FAQ
  $$('[data-faq] .faq-item button').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      const faq = button.closest('[data-faq]');
      const isOpen = item.classList.contains('is-open');

      $$('.faq-item', faq).forEach((otherItem) => {
        otherItem.classList.remove('is-open');
        const otherButton = $('button', otherItem);
        if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Calculator
  const calculator = $('[data-calculator]');
  let calcState = {
    type: 'house',
    value: 72,
    relief: 1,
    access: 1
  };

  const calcLabels = {
    house: { title: 'Дом', unit: 'м²', min: 20, max: 220, step: 4, base: 3.0, density: 3.0 },
    bath: { title: 'Баня', unit: 'м²', min: 12, max: 120, step: 4, base: 2.8, density: 3.4 },
    terrace: { title: 'Терраса', unit: 'м²', min: 8, max: 120, step: 4, base: 2.5, density: 4.0 },
    fence: { title: 'Забор', unit: 'м', min: 10, max: 180, step: 5, base: 2.5, density: 2.5 }
  };

  function getPileEstimate() {
    const profile = calcLabels[calcState.type];
    let raw;

    if (calcState.type === 'fence') {
      raw = Math.ceil(calcState.value / profile.density) + 1;
    } else {
      raw = Math.ceil(calcState.value / profile.density);
      if (calcState.type === 'house') raw += 1;
    }

    raw = Math.max(calcState.type === 'fence' ? 6 : 8, raw);
    raw = Math.ceil(raw * Number(calcState.relief));
    return raw;
  }

  function calculatorSummaryText() {
    const profile = calcLabels[calcState.type];
    const piles = getPileEstimate();
    const accessText = calcState.access > 1 ? 'ограниченный доступ' : 'свободный доступ';
    const reliefText = calcState.relief > 1.12 ? 'выраженный уклон' : calcState.relief > 1 ? 'небольшой уклон' : 'ровный участок';
    return `${profile.title}: ${calcState.value} ${profile.unit}; ориентир ${piles} свай; ${reliefText}; ${accessText}.`;
  }

  function updateCalculator() {
    if (!calculator) return;
    const profile = calcLabels[calcState.type];
    const piles = getPileEstimate();
    const delta = Math.max(2, Math.ceil(piles * 0.08));

    const areaOutput = $('[data-area-output]', calculator);
    const pilesOutput = $('[data-piles]', calculator);
    const rangeOutput = $('[data-range]', calculator);
    const stepOutput = $('[data-step]', calculator);

    if (areaOutput) areaOutput.textContent = `${calcState.value} ${profile.unit}`;
    if (pilesOutput) pilesOutput.textContent = String(piles);
    if (rangeOutput) rangeOutput.textContent = `${Math.max(1, piles - delta)}–${piles + delta} шт.`;
    if (stepOutput) stepOutput.textContent = calcState.type === 'fence' ? '≈ 2,0–2,5 м' : `≈ ${profile.base.toFixed(1).replace('.', ',')}–${(profile.base + .5).toFixed(1).replace('.', ',')} м`;
    if (calcSummaryInput) calcSummaryInput.value = calculatorSummaryText();
  }

  if (calculator) {
    const areaInput = $('[data-area]', calculator);
    const reliefSelect = $('[data-relief]', calculator);
    const accessSelect = $('[data-access]', calculator);
    const typeButtons = $$('[data-type]', calculator);

    typeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        typeButtons.forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');
        calcState.type = button.dataset.type;
        const profile = calcLabels[calcState.type];
        areaInput.min = String(profile.min);
        areaInput.max = String(profile.max);
        areaInput.step = String(profile.step);
        const desired = Math.min(profile.max, Math.max(profile.min, calcState.value));
        calcState.value = desired;
        areaInput.value = String(desired);
        updateCalculator();
      });
    });

    areaInput.addEventListener('input', () => {
      calcState.value = Number(areaInput.value);
      updateCalculator();
    });

    reliefSelect.addEventListener('change', () => {
      calcState.relief = Number(reliefSelect.value);
      updateCalculator();
    });

    accessSelect.addEventListener('change', () => {
      calcState.access = Number(accessSelect.value);
      updateCalculator();
    });

    updateCalculator();
  }

  // Quick object selector syncs with calculator and scrolls on CTA only.
  $$('[data-quick-options] [data-object]').forEach((button, index) => {
    button.addEventListener('click', () => {
      $$('[data-quick-options] [data-object]').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      const mapping = ['house', 'bath', 'terrace', 'fence'];
      const type = mapping[index] || 'house';
      const calcButton = calculator ? $(`[data-type="${type}"]`, calculator) : null;
      if (calcButton) calcButton.click();
    });
  });

  // Modal
  function getFocusable(root) {
    return $$('button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter((element) => element.offsetParent !== null);
  }

  function openModal() {
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    if (calcSummaryInput) calcSummaryInput.value = calculatorSummaryText();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const firstField = $('input:not([type="hidden"])', modalDialog);
    window.setTimeout(() => firstField?.focus(), 80);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    lastFocusedElement?.focus?.();
  }

  $$('[data-open-modal]').forEach((button) => button.addEventListener('click', openModal));
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));

  document.addEventListener('keydown', (event) => {
    if (!modal?.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeModal();
    if (event.key !== 'Tab') return;

    const focusable = getFocusable(modalDialog);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Phone formatting. Keeps raw input flexible while helping Russian-format numbers.
  function formatPhone(value) {
    let digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (digits[0] === '8') digits = `7${digits.slice(1)}`;
    if (digits[0] !== '7') digits = `7${digits}`;
    digits = digits.slice(0, 11);

    const country = '+7';
    const a = digits.slice(1, 4);
    const b = digits.slice(4, 7);
    const c = digits.slice(7, 9);
    const d = digits.slice(9, 11);
    let result = country;
    if (a) result += ` (${a}`;
    if (a.length === 3) result += ')';
    if (b) result += ` ${b}`;
    if (c) result += `-${c}`;
    if (d) result += `-${d}`;
    return result;
  }

  $$('input[type="tel"]').forEach((input) => {
    input.addEventListener('input', () => {
      const formatted = formatPhone(input.value);
      input.value = formatted;
    });
  });

  function phoneIsValid(value) {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('7');
  }

  async function sendLeadForm(form) {
    const phone = $('input[name="phone"]', form);
    const status = $('[data-form-status]', form);
    const submit = $('button[type="submit"]', form);

    status.className = 'form-status';
    status.textContent = '';

    if (!phoneIsValid(phone.value)) {
      status.classList.add('is-error');
      status.textContent = 'Проверьте номер телефона: нужен полный номер из 11 цифр.';
      phone.focus();
      return;
    }

    const formData = new FormData(form);
    if (calcSummaryInput?.value && !formData.get('calculator')) {
      formData.set('calculator', calcSummaryInput.value);
    }

    submit.disabled = true;
    const originalText = submit.textContent;
    submit.textContent = 'Отправляем…';

    try {
      if (window.location.protocol === 'file:') {
        throw new Error('LOCAL_PREVIEW');
      }

      const response = await fetch(form.getAttribute('action') || 'api/contact.php', {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message || 'SEND_FAILED');
      }

      status.classList.add('is-success');
      status.textContent = payload.message || 'Заявка отправлена. Мы свяжемся с вами.';
      form.reset();
      updateCalculator();
      if (modal?.classList.contains('is-open')) {
        window.setTimeout(closeModal, 1300);
      }
    } catch (error) {
      status.classList.add('is-error');
      if (error.message === 'LOCAL_PREVIEW') {
        status.textContent = 'Локальный просмотр: отправка заработает после загрузки сайта на PHP-хостинг.';
      } else {
        status.textContent = 'Не удалось отправить заявку. Позвоните по номеру +7 (000) 000-00-00 или попробуйте позже.';
      }
    } finally {
      submit.disabled = false;
      submit.textContent = originalText;
    }
  }

  $$('[data-lead-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      sendLeadForm(form);
    });
  });

  // Current year
  $$('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });
})();
