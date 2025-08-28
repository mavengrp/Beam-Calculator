    // --- Utility Functions ---
    function getInputValue(id, fallback = 0) {
      const el = document.getElementById(id);
      return el ? parseFloat(el.value) || fallback : fallback;
    }

    function getSelectedRadio(name) {
      const radio = document.querySelector(`input[name="${name}"]:checked`);
      return radio ? radio.value : null;
    }