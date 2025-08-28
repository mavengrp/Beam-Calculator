    // --- Span Management ---
    let spanCount = 1;
    document.getElementById('addSpanBtn').addEventListener('click', addSpan);
    
    function addSpan() {
      spanCount++;
      const container = document.getElementById('spansContainer');
      const details = document.createElement('details');
      details.open = true;
      const summary = document.createElement('summary');
      summary.textContent = `Span ${spanCount} Details`;
    
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.style.marginLeft = '20px';
      removeBtn.style.background = '#c0392b';
      removeBtn.style.color = '#fff';
      removeBtn.style.border = 'none';
      removeBtn.style.borderRadius = '5px';
      removeBtn.style.padding = '5px 12px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.onclick = function () {
        details.remove();
        renumberSpans();
        drawFBDAllSpans();
      };
      summary.appendChild(removeBtn);
      details.appendChild(summary);
    
      // Fields
      const spanDiv = document.createElement('div');
      spanDiv.className = "span-fields";
      spanDiv.style.display = "flex";
      spanDiv.style.flexWrap = "wrap";
      spanDiv.style.gap = "20px";
      spanDiv.style.marginBottom = "10px";
      spanDiv.style.alignItems = "center";
      
    
      // Span Length
      const spanLengthLabel = document.createElement('label');
      spanLengthLabel.style.display = "flex";
      spanLengthLabel.style.justifyContent = "space-between";
      spanLengthLabel.style.alignItems = "center";
      spanLengthLabel.style.width = "320px";
      spanLengthLabel.innerHTML = `Span Length (mm): <input type="number" value="1000" style="width: 55%;">`;
      spanDiv.appendChild(spanLengthLabel);
    
      // Load Type radios
      const loadTypeDiv = document.createElement('div');
      loadTypeDiv.style.display = "flex";
      loadTypeDiv.style.alignItems = "center";
      loadTypeDiv.style.gap = "10px";
      loadTypeDiv.innerHTML = `
        <label style="font-weight:normal;"><input type="radio" name="loadType${spanCount}" value="udl" checked> UDL (kN/m)</label>
        <label style="font-weight:normal;"><input type="radio" name="loadType${spanCount}" value="point"> Point Load (kN)</label>
        <label style="font-weight:normal;"><input type="radio" name="loadType${spanCount}" value="moment"> Moment (kNm)</label>
      `;
      spanDiv.appendChild(loadTypeDiv);
    
      // Load Magnitude
      const loadMagLabel = document.createElement('label');
      loadMagLabel.style.display = "flex";
      loadMagLabel.style.justifyContent = "space-between";
      loadMagLabel.style.alignItems = "center";
      loadMagLabel.style.width = "320px";
      loadMagLabel.innerHTML = `Load Magnitude: <input type="number" value="10" style="width: 55%;">`;
      spanDiv.appendChild(loadMagLabel);
    
      // Load Position
      const loadPosLabel = document.createElement('label');
      loadPosLabel.style.display = "flex";
      loadPosLabel.style.justifyContent = "space-between";
      loadPosLabel.style.alignItems = "center";
      loadPosLabel.style.width = "320px";
      loadPosLabel.innerHTML = `Load Position (mm, for point/moment): <input type="number" value="2" style="width: 55%;">`;
      spanDiv.appendChild(loadPosLabel);
    
      // Loads container and Add Load button
      const loadsContainer = document.createElement('div');
      loadsContainer.className = 'loadsContainer';
      spanDiv.appendChild(loadsContainer);
    
      const addLoadBtn = document.createElement('button');
      addLoadBtn.type = 'button';
      addLoadBtn.textContent = '+ Add Load';
      addLoadBtn.className = 'addLoadBtn';
      addLoadBtn.style.marginLeft = '10px';
      spanDiv.appendChild(addLoadBtn);
    
      // Add event listener for Add Load button
      addLoadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        addDynamicLoad(loadsContainer, spanCount, details);
      });
    
      details.appendChild(spanDiv);
      container.appendChild(details);
      renumberSpans();
    }

    function renumberSpans() {
      const container = document.getElementById('spansContainer');
      const spans = container.querySelectorAll('details');
      spans.forEach((details, idx) => {
        const summary = details.querySelector('summary');
        if (summary) {
          summary.childNodes[0].textContent = `Span ${idx + 2} Details`; // +2 because Span 1 is static
        }
      });
    }