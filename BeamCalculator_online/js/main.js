    // --- Stiffness Calculation ---
    function computeStiffness() {
      // Beam
      const beamWidth = parseFloat(document.getElementById('beamWidth').value) / 1000; // mm to m
      const beamDepth = parseFloat(document.getElementById('beamDepth').value) / 1000; // mm to m
      const E = parseFloat(document.getElementById('modulusE').value) * 1e9; // GPa to Pa
      const I_beam = (beamWidth * Math.pow(beamDepth, 3)) / 12;
      const EI_beam = E * I_beam;
      document.getElementById('beamI').textContent = isFinite(I_beam) ? I_beam.toExponential(3) : '-';
      document.getElementById('beamEI').textContent = isFinite(EI_beam) ? EI_beam.toExponential(3) : '-';
    
      // Column
      const colWidth = parseFloat(document.getElementById('colWidth').value) / 1000; // mm to m
      const colBreadth = parseFloat(document.getElementById('colBreadth').value) / 1000; // mm to m
      const I_col = (colWidth * Math.pow(colBreadth, 3)) / 12;
      const EI_col = E * I_col;
      document.getElementById('colI').textContent = isFinite(I_col) ? I_col.toExponential(3) : '-';
      document.getElementById('colEI').textContent = isFinite(EI_col) ? EI_col.toExponential(3) : '-';
    }
    
    ["beamWidth", "beamDepth", "modulusE", "colWidth", "colBreadth"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', computeStiffness);
      }
    });
    computeStiffness();
    
    // --- Load Management ---
    function addDynamicLoad(loadsContainer, spanNum, details) {
      const loadDiv = document.createElement('div');
      loadDiv.style.display = "flex";
      loadDiv.style.flexWrap = "wrap";
      loadDiv.style.gap = "20px";
      loadDiv.style.marginBottom = "10px";
      loadDiv.style.alignItems = "center";
    
      // Load Type radios
      const loadTypeDiv = document.createElement('div');
      loadTypeDiv.style.display = "flex";
      loadTypeDiv.style.alignItems = "center";
      loadTypeDiv.style.gap = "10px";
      loadTypeDiv.innerHTML = `
        <label style="font-weight:normal;"><input type="radio" name="loadTypeExtra${Date.now()}" value="udl" checked> UDL (kN/m)</label>
        <label style="font-weight:normal;"><input type="radio" name="loadTypeExtra${Date.now()}" value="point"> Point Load (kN)</label>
        <label style="font-weight:normal;"><input type="radio" name="loadTypeExtra${Date.now()}" value="moment"> Moment (kNm)</label>
      `;
      loadDiv.appendChild(loadTypeDiv);
    
      // Load Magnitude
      const loadMagLabel = document.createElement('label');
      loadMagLabel.style.display = "flex";
      loadMagLabel.style.justifyContent = "space-between";
      loadMagLabel.style.alignItems = "center";
      loadMagLabel.style.width = "220px";
      loadMagLabel.innerHTML = `Load Magnitude: <input type="number" value="10" style="width: 55%;">`;
      loadDiv.appendChild(loadMagLabel);
    
      // Load Position (dynamic)
      const loadPosContainer = document.createElement('div');
      loadPosContainer.className = 'loadPosContainer';
    
      function updateLoadPosUI() {
        // Find the span length for this span
        let spanLength = 1000;
        let parentSpan = loadDiv.closest('.span-fields');
        if (parentSpan) {
          const spanInput = parentSpan.querySelector('label input[type="number"]');
          if (spanInput) spanLength = parseFloat(spanInput.value) || 1000;
        }
        const type = loadDiv.querySelector('input[type="radio"]:checked').value;
        if (type === "udl") {
          loadPosContainer.innerHTML = `
            <label style="display: flex; justify-content: space-between; align-items: center; width: 220px;">
              Where is it acting (mm): 
              <span style="display:flex;gap:5px;align-items:center;">
                from <input type="number" class="udlFrom" value="0" min="0" max="${spanLength}" style="width:60px;">
                to <input type="number" class="udlTo" value="${spanLength}" min="0" max="${spanLength}" style="width:60px;">
              </span>
            </label>
          `;
          const fromInput = loadPosContainer.querySelector('.udlFrom');
          const toInput = loadPosContainer.querySelector('.udlTo');
          fromInput.addEventListener('input', () => {
            if (parseFloat(fromInput.value) < 0) fromInput.value = 0;
            if (parseFloat(fromInput.value) > spanLength) fromInput.value = spanLength;
            if (parseFloat(fromInput.value) > parseFloat(toInput.value)) fromInput.value = toInput.value;
            drawFBDAllSpans();
          });
          toInput.addEventListener('input', () => {
            if (parseFloat(toInput.value) < 0) toInput.value = 0;
            if (parseFloat(toInput.value) > spanLength) toInput.value = spanLength;
            if (parseFloat(toInput.value) < parseFloat(fromInput.value)) toInput.value = fromInput.value;
            drawFBDAllSpans();
          });
        } else {
          loadPosContainer.innerHTML = `
            <label style="display: flex; justify-content: space-between; align-items: center; width: 220px;">
              Load Position (mm, for point/moment): <input type="number" class="loadPosition" value="2" style="width: 60px;">
            </label>
          `;
          loadPosContainer.querySelector('.loadPosition').addEventListener('input', drawFBDAllSpans);
        }
      }
      loadDiv.appendChild(loadPosContainer);
      updateLoadPosUI();
    
      // Listen for load type change
      loadTypeDiv.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', updateLoadPosUI);
      });
    
      // Remove button for this load
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove Load';
      removeBtn.style.marginLeft = '20px';
      removeBtn.style.background = '#c0392b';
      removeBtn.style.color = '#fff';
      removeBtn.style.border = 'none';
      removeBtn.style.borderRadius = '5px';
      removeBtn.style.padding = '5px 12px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.onclick = function () {
        loadDiv.remove();
        drawFBDAllSpans();
      };
    
      // Add listeners to update FBD when any input in this loadDiv changes
      loadDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', drawFBDAllSpans);
        input.addEventListener('change', drawFBDAllSpans);
      });
      loadsContainer.appendChild(loadDiv);
    
      // Attach listeners to all inputs in this loadDiv
      loadDiv.querySelectorAll('input,select').forEach(input => {
        input.addEventListener('input', drawFBDAllSpans);
        input.addEventListener('change', drawFBDAllSpans);
      });
    }
    
    // Add event listeners for "+ Add Load" on Span 1, etc.
    document.querySelector('.addLoadBtn').addEventListener('click', function(e) {
      e.preventDefault();
      const details = document.querySelector('details');
      const loadsContainer = details.querySelector('.loadsContainer');
      addDynamicLoad(loadsContainer, 1, details);
    });
    
    // --- Load Position UI ---
    function updateLoadPositionUI() {
      const spanLength = parseFloat(document.getElementById('spanLength').value) || 1000;
      const loadType = document.querySelector('input[name="loadType"]:checked').value;
      const container = document.getElementById('loadPositionContainer');
      if (loadType === "udl") {
        container.innerHTML = `
          <label id="loadPositionLabel" style="display: flex; justify-content: space-between; align-items: center; width: 320px;">
            Where is it acting (mm): 
            <span style="display:flex;gap:5px;align-items:center;">
              from <input type="number" id="udlFrom" value="0" min="0" max="${spanLength}" style="width:70px;">
              to <input type="number" id="udlTo" value="${spanLength}" min="0" max="${spanLength}" style="width:70px;">
            </span>
          </label>
        `;
        const fromInput = document.getElementById('udlFrom');
        const toInput = document.getElementById('udlTo');
        fromInput.addEventListener('input', () => {
          if (parseFloat(fromInput.value) < 0) fromInput.value = 0;
          if (parseFloat(fromInput.value) > spanLength) fromInput.value = spanLength;
          if (parseFloat(fromInput.value) > parseFloat(toInput.value)) fromInput.value = toInput.value;
          drawFBDAllSpans();
        });
        toInput.addEventListener('input', () => {
          if (parseFloat(toInput.value) < 0) toInput.value = 0;
          if (parseFloat(toInput.value) > spanLength) toInput.value = spanLength;
          if (parseFloat(toInput.value) < parseFloat(fromInput.value)) toInput.value = fromInput.value;
          drawFBDAllSpans();
        });
      } else {
        container.innerHTML = `
          <label id="loadPositionLabel" style="display: flex; justify-content: space-between; align-items: center; width: 320px;">
            Load Position (mm, for point/moment): <input type="number" id="loadPosition" value="2" style="width: 55%;">
          </label>
        `;
        document.getElementById('loadPosition').addEventListener('input', drawFBDAllSpans);
      }
    }
    
    document.querySelectorAll('input[name="loadType"]').forEach(radio => {
      radio.addEventListener('change', updateLoadPositionUI);
    });
    document.getElementById('spanLength').addEventListener('input', updateLoadPositionUI);
    
    // Call once on page load
    window.addEventListener('DOMContentLoaded', function() {
      updateLoadPositionUI();
      drawFBDAllSpans();
    });
    
    // Update FBD on any input or change
    ['input', 'change'].forEach(evt =>
      document.addEventListener(evt, drawFBDAllSpans)
    );