/* JavaScript for the Sardaarji Fitness trust‑first intake app */

// Grab key elements and templates
const formRoot = document.getElementById('formRoot');
const btnBack = document.getElementById('btnBack');
const btnNext = document.getElementById('btnNext');
const btnSave = document.getElementById('btnSave');
const tplStep = document.getElementById('tplStep');
const tplField = document.getElementById('tplField');
const tplReview = document.getElementById('tplReview');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// Persistent state key and restore previous answers
const STORAGE_KEY = 'fitness_intake_trust_v1';
const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

let stepIndex = 0;
let steps = [];

// Save state to localStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Toast helper
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 1800);
}

// Create a control for a field definition
function fieldControl(field) {
  const wrap = tplField.content.firstElementChild.cloneNode(true);
  const labelEl = wrap.querySelector('.label');
  const control = wrap.querySelector('.control');
  const hint = wrap.querySelector('.hint');
  const error = wrap.querySelector('.error');
  const whyTag = wrap.querySelector('.why-tag');
  const skipBtn = wrap.querySelector('.skip');

  // Set label text and required marker
  labelEl.textContent = field.label + (field.required ? ' *' : '');
  if (field.hint) {
    hint.textContent = field.hint;
  } else {
    hint.remove();
  }

  // Show "Why this?" tag if provided
  if (field.why) {
    whyTag.textContent = 'Why this?';
    whyTag.hidden = false;
    whyTag.title = field.why;
  }

  // Skip button for optional fields
  if (field.skippable) {
    skipBtn.hidden = false;
    skipBtn.addEventListener('click', () => {
      delete state[field.name];
      saveState();
      toast('Skipped');
    });
  }

  let input;
  const name = field.name;
  function setVal(v) {
    state[name] = v;
    saveState();
  }

  // Create appropriate input based on type
  switch (field.type) {
    case 'text':
    case 'number': {
      input = document.createElement('input');
      input.type = field.type;
      input.placeholder = field.placeholder || '';
      if (state[name] != null) input.value = state[name];
      input.addEventListener('input', () => setVal(input.value));
      control.appendChild(input);
      break;
    }
    case 'select': {
      input = document.createElement('select');
      for (const opt of field.options) {
        const option = document.createElement('option');
        option.value = opt.value ?? opt;
        option.textContent = opt.label ?? opt;
        input.appendChild(option);
      }
      if (state[name] != null) {
        input.value = state[name];
      } else if (field.options && field.options.length > 0) {
        // If no previous value, default to first option to avoid validation errors
        const first = field.options[0];
        const firstVal = first.value ?? first;
        input.value = firstVal;
        setVal(firstVal);
      }
      input.addEventListener('change', () => setVal(input.value));
      control.appendChild(input);
      break;
    }
    case 'multi-select': {
      // Create a multi-select element allowing multiple choices
      input = document.createElement('select');
      input.multiple = true;
      // Show at least 5 options at a time for ease of selection
      input.size = field.size || 5;
      for (const opt of field.options) {
        const option = document.createElement('option');
        option.value = opt.value ?? opt;
        option.textContent = opt.label ?? opt;
        input.appendChild(option);
      }
      if (state[name]) {
        // Restore previously selected options
        const selected = Array.isArray(state[name]) ? state[name] : [state[name]];
        input.querySelectorAll('option').forEach(opt => {
          if (selected.includes(opt.value)) opt.selected = true;
        });
      }
      input.addEventListener('change', () => {
        const values = Array.from(input.selectedOptions).map(o => o.value);
        setVal(values);
      });
      control.appendChild(input);
      break;
    }
    case 'radio-pill': {
      input = document.createElement('div');
      input.className = 'radio-row';
      for (const opt of field.options) {
        const id = `${name}_${String(opt.value ?? opt).replace(/\W+/g, '')}`;
        const pill = document.createElement('label');
        pill.className = 'pill';
        pill.innerHTML = `<input type="radio" name="${name}" id="${id}" value="${opt.value ?? opt}"><span>${opt.label ?? opt}</span>`;
        input.appendChild(pill);
      }
      input.addEventListener('click', (e) => {
        const targetPill = e.target.closest('.pill');
        if (!targetPill) return;
        input.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        targetPill.classList.add('active');
        setVal(targetPill.querySelector('input').value);
      });
      control.appendChild(input);
      // Restore previous selection
      if (state[name]) {
        input.querySelectorAll('input').forEach(inp => {
          if (inp.value === state[name]) {
            inp.checked = true;
            inp.closest('.pill').classList.add('active');
          }
        });
      }
      break;
    }
    case 'textarea': {
      input = document.createElement('textarea');
      input.rows = field.rows || 3;
      input.placeholder = field.placeholder || '';
      if (state[name] != null) input.value = state[name];
      input.addEventListener('input', () => setVal(input.value));
      control.appendChild(input);
      break;
    }
    case 'range': {
      input = document.createElement('div');
      input.className = 'inline';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = field.min ?? 0;
      slider.max = field.max ?? 10;
      slider.step = field.step ?? 1;
      const out = document.createElement('input');
      out.type = 'number';
      out.readOnly = true;
      out.value = state[name] ?? field.default ?? slider.min;
      slider.value = out.value;
      slider.addEventListener('input', () => {
        out.value = slider.value;
        setVal(Number(slider.value));
      });
      input.append(slider, out);
      control.appendChild(input);
      break;
    }
    default:
      console.warn('Unknown field type', field.type);
  }

  // Validation function for this field
  function validate() {
    if (!field.required) return true;
    const v = state[name];
    const ok = v !== undefined && v !== null && String(v).trim() !== '';
    if (!ok) {
      error.textContent = field.requiredMessage || 'Please fill this in.';
      error.hidden = false;
    } else {
      error.hidden = true;
    }
    return ok;
  }
  return { wrap, validate };
}

// Create a step DOM element from definition
function makeStep(def) {
  const s = tplStep.content.firstElementChild.cloneNode(true);
  s.querySelector('.step-title').textContent = def.title;
  s.querySelector('.step-desc').textContent = def.desc || '';
  const why = s.querySelector('.why');
  if (def.why) {
    why.hidden = false;
    why.textContent = def.why;
  }
  const fieldsWrap = s.querySelector('.fields');
  const validators = [];
  for (const f of def.fields) {
    const fc = fieldControl(f);
    fieldsWrap.appendChild(fc.wrap);
    validators.push(fc.validate);
  }
  s.validate = () => {
    if (def.skipValidate) return true;
    return validators.every(v => v());
  };
  s.relevant = def.relevant || (() => true);
  return s;
}

// Create the review step
function makeReviewStep() {
  const s = tplReview.content.firstElementChild.cloneNode(true);
  s.validate = () => true;
  s.relevant = () => true;
  s.onShow = () => {
    const container = s.querySelector('#reviewContainer');
    container.innerHTML = '';
    const dl = document.createElement('dl');
    Object.entries(state).forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = prettify(k);
      const dd = document.createElement('dd');
      dd.textContent = Array.isArray(v) ? v.join(', ') : String(v);
      dl.append(dt, dd);
    });
    container.appendChild(dl);
    // Build WhatsApp share link with encoded JSON
    const shareText = encodeURIComponent(`Sardaarji Fitness Intake\n\n` + JSON.stringify(state, null, 2));
    const waBtn = s.querySelector('#btnWhatsApp');
    waBtn.href = `https://wa.me/?text=${shareText}`;
  };
  // Copy action
  s.querySelector('#btnCopy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    toast('Copied');
  });
  // Download action
  s.querySelector('#btnDownload').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `intake-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  // Reset action
  s.querySelector('#btnReset').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(state).forEach(k => delete state[k]);
    stepIndex = 0;
    render();
    toast('Cleared');
  });
  return s;
}

// Convert camelCase/snake to nice label
function prettify(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Step definitions with caring microcopy
const stepDefs = [
  {
    title: 'Welcome 👋',
    desc: 'Thanks for trusting us with your goals.',
    why: 'Our promise: we keep it simple, respect your culture and preferences, and adjust weekly.',
    skipValidate: true,
    fields: [
      { name: 'contact_preference', label: 'How should we send your plan?', type: 'radio-pill', required: true, options: ['WhatsApp', 'Email'], why: 'So we deliver your plan where you’ll see it.' },
      { name: 'full_name', label: 'Your name', type: 'text', required: true, placeholder: 'e.g., Jaspreet Singh', why: 'We’ll personalize your plan and check-ins.' },
      // Added phone number for easier client contact
      { name: 'phone', label: 'Phone number', type: 'text', required: true, placeholder: 'e.g., +1 650‑555‑1234', why: 'So we can contact you via WhatsApp or text' },
    ]
  },
  {
    title: 'About You',
    desc: 'A few basics to tailor portions.',
    why: 'Age/height/weight help estimate healthy starting calories.',
    fields: [
      { name: 'age', label: 'How old are you?', type: 'number', required: true, hint: 'Years' },
      { name: 'gender', label: 'How do you identify?', type: 'radio-pill', required: true, options: ['Male', 'Female', 'Prefer not to say'] },
      { name: 'height', label: 'How tall are you?', type: 'text', required: true, placeholder: 'e.g., 5\'9" or 175 cm' },
      { name: 'weight', label: 'What do you weigh right now?', type: 'text', required: true, placeholder: 'e.g., 165 lb or 75 kg' },
      { name: 'goal_weight', label: 'Goal weight (optional)', type: 'text', placeholder: 'Skip if you don’t track weight', skippable: true },
    ]
  },
  {
    title: 'Your Day & Workouts',
    desc: 'We match meals to your routine.',
    why: 'Activity level changes your energy needs.',
    fields: [
      { name: 'workday', label: 'Most days you are…', type: 'select', required: true, options: [
        { label: 'Mostly Sitting', value: 'sedentary' },
        { label: 'On Your Feet a Bit', value: 'light' },
        { label: 'On Your Feet Most of the Day', value: 'active' },
        { label: 'Moving/Lifting a Lot', value: 'very_active' },
      ] },
      { name: 'workouts_per_week', label: 'Workouts per week', type: 'select', required: true, options: ['0','1–2','3–4','5–6','7+'] },
      { name: 'workout_notes', label: 'What do your workouts look like?', type: 'textarea', rows: 3, placeholder: 'e.g., legs 2x/wk, push/pull, or walking 30 min', skippable: true },
    ]
  },
  {
    title: 'Goals',
    desc: 'Choose one main goal.',
    why: 'One clear goal = faster progress. We can rotate goals later.',
    fields: [
      { name: 'main_goal', label: 'Main goal', type: 'radio-pill', required: true, options: [
        { label: 'Lose Fat', value: 'fat_loss' },
        { label: 'Build Muscle', value: 'muscle_gain' },
        { label: 'Look Toned / Recomp', value: 'recomp' },
        { label: 'Feel Healthy & Energetic', value: 'general' },
      ] },
      { name: 'timeline', label: 'When do you want to see changes?', type: 'select', required: true, options: ['4 weeks','8 weeks','12 weeks','No rush'] },
    ]
  },
  {
    title: 'Food Preferences',
    desc: 'We’ll fit the plan to your taste.',
    why: 'Plans work when food feels familiar and enjoyable.',
    fields: [
      { name: 'diet_pref', label: 'What do you eat?', type: 'radio-pill', required: true, options: ['Vegetarian','Vegan','Eggetarian','Non‑veg'] },
      // Multi-select for favourite meals/snacks so clients can pick several
      { name: 'faves', label: 'Favourite meals/snacks', type: 'multi-select', options: [
        { label: 'Roti + Dal', value: 'roti_dal' },
        { label: 'Paneer Tikka', value: 'paneer_tikka' },
        { label: 'Veggie Wrap', value: 'veggie_wrap' },
        { label: 'Greek Yogurt', value: 'greek_yogurt' },
        { label: 'Fruit Chaat', value: 'fruit_chaat' },
        { label: 'Smoothie', value: 'smoothie' },
        { label: 'Oatmeal with Fruit', value: 'oatmeal_fruit' },
        { label: 'Egg Bhurji / Scramble', value: 'egg_bhurji' },
        { label: 'Other', value: 'other' },
      ], size: 6, hint: 'Hold Ctrl (Cmd on Mac) to pick multiple' },
      { name: 'avoid_foods', label: 'Foods you don’t eat', type: 'textarea', rows: 2, placeholder: 'e.g., beef, pork, shellfish, very spicy, dairy' },
      { name: 'allergies', label: 'Allergies?', type: 'textarea', rows: 2, placeholder: 'e.g., peanut, lactose, gluten' },
    ]
  },
  {
    title: 'Daily Habits',
    desc: 'Helps with portions and timing.',
    why: 'Meal timing and drinks can stall or speed progress.',
    fields: [
      { name: 'meals_per_day', label: 'Meals most days', type: 'select', required: true, options: ['1','2','3','4','5+'] },
      { name: 'snack_often', label: 'Do you snack most days?', type: 'radio-pill', required: true, options: ['Yes','No'] },
      { name: 'drinks', label: 'Sugary drinks or alcohol? How often?', type: 'text', placeholder: 'e.g., soda 2x/week; alcohol on weekends' },
      { name: 'water', label: 'About how much water per day?', type: 'text', placeholder: 'e.g., 8–10 glasses' },
    ]
  },
  {
    title: 'Health Notes',
    desc: 'We coach safely and smart.',
    why: 'Some conditions change foods or timing we recommend.',
    fields: [
      { name: 'health_yesno', label: 'Any health conditions or meds?', type: 'radio-pill', required: true, options: [ { label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' } ] },
      { name: 'health_details', label: 'If yes, share details (or type “None”)', type: 'textarea', rows: 3, required: true, requiredMessage: 'Please add details or type “None”.' },
    ]
  },
];

// Apply conditional rules (health notes)
function applyConditionalRules() {
  // Health step is before review: index = stepDefs.length
  const has = state['health_yesno'];
  // Determine the health step index: last element of stepDefs is health, but we can check length
  const healthIdx = stepDefs.length - 1;
  const healthStep = steps[healthIdx];
  if (!healthStep) return;
  const fieldWraps = healthStep.querySelectorAll('.field');
  const detailsWrap = fieldWraps[1];
  const err = detailsWrap.querySelector('.error');
  // If not yes, hide error always
  if (has !== 'yes') {
    err.hidden = true;
  }
  // Override validate on health step
  healthStep.validate = () => {
    if (has === 'yes') {
      const v = (state['health_details'] || '').trim();
      const ok = v.length > 0;
      err.hidden = ok;
      if (!ok) {
        err.textContent = 'Please add details.';
      }
      return ok;
    }
    return true;
  };
}

// Render steps and update view
function render() {
  formRoot.innerHTML = '';
  // Build step elements fresh
  steps = stepDefs.map(def => makeStep(def));
  const review = makeReviewStep();
  steps.push(review);
  // Append all steps to DOM
  steps.forEach(step => formRoot.appendChild(step));
  // Show only the current step
  steps.forEach((step, idx) => {
    step.style.display = idx === stepIndex ? 'block' : 'none';
  });
  // Update progress bar and text
  const pct = Math.round((stepIndex) / (steps.length - 1) * 100);
  progressBar.style.width = pct + '%';
  progressText.textContent = pct + '%';
  // Back button state
  btnBack.disabled = stepIndex === 0;
  // Next button text
  btnNext.textContent = stepIndex === steps.length - 1 ? 'Finish' : 'Next';
  // When on review, call onShow
  if (stepIndex === steps.length - 1 && steps[stepIndex].onShow) {
    steps[stepIndex].onShow();
  }
  // Apply conditional validation for health
  applyConditionalRules();
}

// Navigation handlers
btnBack.addEventListener('click', () => {
  if (stepIndex > 0) {
    stepIndex--;
    render();
  }
});

btnNext.addEventListener('click', () => {
  const current = steps[stepIndex];
  if (current.validate && !current.validate()) {
    toast('Please complete required fields');
    return;
  }
  if (stepIndex < steps.length - 1) {
    stepIndex++;
    render();
  } else {
    toast('All set — export or WhatsApp your answers.');
  }
});

btnSave.addEventListener('click', () => {
  saveState();
  toast('Saved locally');
});

// Initialize form
render();