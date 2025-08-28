    //---Calculation Logic---
    let fullResult = "";
    let lastCalc = {};
    function calculate() {
      let result = "";
      const type = document.getElementById("beamType").value;
      const h = parseFloat(document.getElementById("beamDepth").value);
      const b = parseFloat(document.getElementById("beamWidth").value);
      const flangeDepth = parseFloat(document.getElementById("flangeDepth")?.value) || b;
      const fck = parseFloat(document.getElementById("fck").value);
      const fyk = parseFloat(document.getElementById("fyk").value);
      const dia = parseFloat(document.getElementById("barDiameter").value);
      const linkDia = parseFloat(document.getElementById("linkDiameter").value);
      const cover = parseFloat(document.getElementById("concreteCover").value);
    
      // --- Gather all spans (including Span 1 and dynamic spans) ---
      let spans = [];
    
      // Span 1
      const span1Length = parseFloat(document.getElementById('spanLength').value) || 1000;
      let span1Loads = [];
    
      // Self Weight for Span 1
      const density = parseFloat(document.getElementById("concreteDensity").value) || 25;
      const width = b / 1000; // m
      const depth = h / 1000; // m
      const selfWeight = density * width * depth; // kN/m
      span1Loads.push({ type: "udl", mag: selfWeight, from: 0, to: span1Length });
    
      // Main load for Span 1
      const span1LoadType = document.querySelector('input[name="loadType"]:checked').value;
      const span1LoadMag = parseFloat(document.getElementById('UltimateLoad').value) || 0;
      if (span1LoadType === "udl") {
        const udlFrom = parseFloat(document.getElementById('udlFrom')?.value) || 0;
        const udlTo = parseFloat(document.getElementById('udlTo')?.value) || span1Length;
        if (span1LoadMag > 0 && udlTo > udlFrom) {
          span1Loads.push({ type: "udl", mag: span1LoadMag, from: udlFrom, to: udlTo });
        }
      } else {
        const span1LoadPos = parseFloat(document.getElementById('loadPosition')?.value) || 0;
        if (span1LoadMag > 0) {
          span1Loads.push({ type: span1LoadType, mag: span1LoadMag, pos: span1LoadPos });
        }
      }
      // Extra loads for Span 1
      const span1LoadsContainer = document.querySelector('details .loadsContainer');
      if (span1LoadsContainer && span1LoadsContainer.children.length > 0) {
        Array.from(span1LoadsContainer.children).forEach(loadDiv => {
          const type = loadDiv.querySelector('input[type="radio"]:checked')?.value;
          let mag = 0, pos = 0;
          loadDiv.querySelectorAll('label').forEach(label => {
            if (label.textContent.trim().startsWith('Load Magnitude')) {
              mag = parseFloat(label.querySelector('input').value) || 0;
            }
          });
          if (type === "udl") {
            const from = parseFloat(loadDiv.querySelector('.udlFrom')?.value) || 0;
            const to = parseFloat(loadDiv.querySelector('.udlTo')?.value) || 0;
            if (mag > 0 && to > from) {
              span1Loads.push({ type, mag, from, to });
            }
          } else {
            pos = parseFloat(loadDiv.querySelector('.loadPosition')?.value) || 0;
            if (type && mag > 0) {
              span1Loads.push({ type, mag, pos });
            }
          }
        });
      }
      spans.push({ length: span1Length, loads: span1Loads });
    
      // Dynamic spans
      document.querySelectorAll('#spansContainer > details').forEach(details => {
        const spanDiv = details.querySelector('.span-fields');
        const length = parseFloat(spanDiv.querySelector('label input[type="number"]').value) || 1000;
        let loads = [];
        // Main load
        const mainType = spanDiv.querySelector('input[type="radio"]:checked').value;
        let mainMag = 0, mainPos = 0;
        spanDiv.querySelectorAll('label').forEach(label => {
          if (label.textContent.trim().startsWith('Load Magnitude')) {
            mainMag = parseFloat(label.querySelector('input').value) || 0;
          }
          if (label.textContent.trim().startsWith('Load Position')) {
            mainPos = parseFloat(label.querySelector('input').value) || 0;
          }
        });
        if (mainMag > 0) {
          loads.push({ type: mainType, mag: mainMag, pos: mainPos });
        }
        // Extra loads
        const loadsContainer = spanDiv.querySelector('.loadsContainer');
        if (loadsContainer && loadsContainer.children.length > 0) {
          Array.from(loadsContainer.children).forEach(loadDiv => {
            const type = loadDiv.querySelector('input[type="radio"]:checked')?.value;
            let mag = 0, pos = 0;
            loadDiv.querySelectorAll('label').forEach(label => {
              if (label.textContent.trim().startsWith('Load Magnitude')) {
                mag = parseFloat(label.querySelector('input').value) || 0;
              }
              if (label.textContent.trim().startsWith('Load Position')) {
                pos = parseFloat(label.querySelector('input').value) || 0;
              }
            });
            if (type && mag > 0) {
              loads.push({ type, mag, pos });
            }
          });
        }
        // Self weight for each dynamic span
        loads.push({ type: "udl", mag: selfWeight, from: 0, to: length });
        spans.push({ length, loads });
      });
    
      // --- Find global maximum moment and shear ---
      let globalMaxM = null, globalMaxV = null;
      let globalMspan = 0, globalMshear = 0;
    
      spans.forEach((span, spanIdx) => {
        const spanLength = span.length;
        const span_m = spanLength / 1000;
        const loads = span.loads;
    
        // Find critical positions for this span
        let criticalPositions = [spanLength / 2];
        loads.forEach(load => {
          if (load.type === "point" || load.type === "moment") {
            criticalPositions.push(load.pos);
          }
          if (load.type === "udl") {
            criticalPositions.push(load.from, load.to);
          }
        });
        criticalPositions = Array.from(new Set(criticalPositions)).filter(x => x >= 0 && x <= spanLength);
    
        criticalPositions.forEach(x_mm => {
          let x = x_mm / 1000; // m
          let M = 0; // kNm
          let V = 0; // kN
    
          loads.forEach(load => {
            if (load.type === "udl") {
              const a = (load.from || 0) / 1000;
              const b = (load.to || spanLength) / 1000;
              const w = load.mag; // kN/m
              if (x < a) {
                // No effect
              } else if (x >= a && x <= b) {
                M += w * Math.pow(x - a, 2) / 2;
                V += w * (b - x);
              } else if (x > b) {
                M += w * (b - a) * (x - (a + b) / 2);
                // V = 0
              }
            }
            if (load.type === "point") {
              const P = load.mag; // kN
              const a = (load.pos || 0) / 1000;
              const L = span_m;
              if (x < a) {
                M += P * (L - a) * x / L;
                V += P * (L - a) / L;
              } else {
                M += P * a * (L - x) / L;
                V += -P * a / L;
              }
            }
            if (load.type === "moment") {
              const M0 = load.mag; // kNm
              const a = (load.pos || 0) / 1000;
              const L = span_m;
              if (x < a) {
                M += M0 * (L - a) / L;
                V += -M0 / L;
              } else {
                M += -M0 * a / L;
                V += M0 / L;
              }
            }
          });
    
          if (globalMaxM === null || Math.abs(M) > Math.abs(globalMaxM)) {
            globalMaxM = M;
            globalMspan = M * 1e6; // Nmm
          }
          if (globalMaxV === null || Math.abs(V) > Math.abs(globalMaxV)) {
            globalMaxV = V;
            globalMshear = V;
          }
        });
      });
    
      // --- Section Design ---
      const d = (h - cover - linkDia - (dia / 2));
      let beff = b;
      let hf = 0;
      if (type === "tbeam" || type === "lbeam") {
        beff = parseFloat(document.getElementById("beffInput").value) || b;
        hf = parseFloat(document.getElementById("flangeDepth").value) || 0;
      } else {
        beff = b;
        hf = 0;
      }
    
      const k = globalMspan / (beff * Math.pow(d, 2) * fck);
      const Ztemp = d * (0.5 + Math.sqrt(0.25 - (k / 1.134)));
      Z = Ztemp > 0.95 * d ? 0.95 * d : Ztemp;
      const S = 2 * (d - Z);
    
      result += `<strong>Maximum Moment (Mspan):</strong> ${(globalMspan/1e6).toFixed(2)} kNm<br>`;
      result += `<strong>Maximum Shear (Mshear):</strong> ${globalMshear.toFixed(2)} kN<br>`;
      result += `<strong>K:</strong> ${k.toFixed(4)}<br>`;
      result += `<strong>Z:</strong> ${Z.toFixed(2)} mm<br>`;
      result += `<strong>S:</strong> ${S.toFixed(2)} mm<br>`;
    
      if ((type === "tbeam" || type === "lbeam") && S <= hf) {
        result += "The stress block is within the flange.<br>";
        As = globalMspan / (0.87 * fyk * Z);
        result += `<strong>Required Area of Steel As:</strong> ${As.toFixed(2)} mm²<br>`;
        result += `<label>Enter Provided Area of Steel (from table, mm²):</label>
          <input type='number' id='providedAs' />
          <button type="button" onclick="continueCalc()">Result</button>`;
        lastCalc = { As_req: As, b, d, fck, fyk, M: globalMspan, SpanLength: span1Length, beff, bw: b, globalMshear: globalMshear, w: selfWeight };
      }
      else if ((type === "tbeam" || type === "lbeam") && S > hf) {
        // Check K for singly/doubly reinforced
        const bw = b;
        const bf = beff;
        const d_dash = h - d;
        let xu = d / 2;
        let xu_prev = 0;
        let iter = 0;
        let Cf, Cw, C, Ast_lim, Mlim;
        const maxIter = 100;
        const tol = 1e-3;
        while (Math.abs(xu - xu_prev) > tol && iter < maxIter) {
          xu_prev = xu;
          Cf = 0.45 * fck * bf * hf;
          Cw = 0.36 * fck * bw * (xu - hf > 0 ? xu - hf : 0);
          C = Cf + Cw;
          Mlim = Cf * (d - 0.5 * hf) + Cw * (d - 0.42 * (xu - hf > 0 ? xu - hf : 0));
          if (Mlim < globalMspan) xu += 5;
          else xu -= 2;
          iter++;
          if (xu > d) xu = d;
          if (xu < hf) xu = hf + 1;
        }
        Ast_lim = C / (0.87 * fyk);
        result += `<strong>Neutral axis depth (xu):</strong> ${xu.toFixed(2)} mm<br>`;
        result += `<strong>Compression in flange (Cf):</strong> ${Cf.toFixed(2)} N<br>`;
        result += `<strong>Compression in web (Cw):</strong> ${Cw.toFixed(2)} N<br>`;
        result += `<strong>Total compression (C):</strong> ${C.toFixed(2)} N<br>`;
        result += `<strong>Moment of resistance (Mlim):</strong> ${(Mlim/1e6).toFixed(2)} kNm<br>`;
        result += `<strong>Required Area of Tension Steel (Ast):</strong> ${Ast_lim.toFixed(2)} mm²<br>`;
        // Calculate K for doubly/singly reinforced check
        const K = globalMspan / (beff * Math.pow(d, 2) * fck);
        // Only one reinforcement check block needed here
        if (K < 0.167) {
          // Singly reinforced
          result += `<strong>Section is Singly Reinforced (K = ${K.toFixed(4)} < 0.167)</strong><br>`;
          result += `<label>Enter Provided Area of Steel (from table, mm²):</label>
            <input type='number' id='providedAs' />
            <button type="button" onclick="continueCalc()">Result</button>`;
          lastCalc = { As_req: Ast_lim, b, d, fck, fyk, M: globalMspan, SpanLength: span1Length, beff, bw, globalMshear, w: selfWeight };
        } else {
          // Doubly reinforced
          result += `<strong>Section is Doubly Reinforced (K = ${K.toFixed(4)} > 0.167)</strong><br>`;
          const Asc = (globalMspan - Mlim) / (0.87 * fyk * (d - d_dash));
          result += `<strong>Required Compression Steel (Asc):</strong> ${Asc.toFixed(2)} mm²<br>`;
          result += `<label>Enter Provided Compression Steel (mm²):</label>
            <input type='number' id='providedAsPrime' /><br>`;
          result += `<label>Enter Provided Tension Steel (mm²):</label>
            <input type='number' id='providedAs' /><br>
            <button type="button" onclick="checkDoublySteel()">Check Steel</button>`;
          lastCalc = { As_req: Ast_lim + Asc, As_prime_req: Asc, b, d, fck, fyk, M: globalMspan, SpanLength: span1Length, beff, bw, globalMshear, w: selfWeight };
        }
      }
      else {
        // Rectangular or doubly reinforced
        const d_dash = h - d;
        Z = 0.82 * d;
        const K = globalMspan / (b * Math.pow(d, 2) * fck);
        let As_prime = 0;
        const As = (0.167 * fck * b * Math.pow(d, 2)) / (0.87 * fyk * Z);
        if (K > 0.167) {
          result += `<strong>Section is Doubly Reinforced (K = ${K.toFixed(4)} > 0.167)</strong><br>`;
          As_prime = ((K - 0.167) * fck * b * Math.pow(d, 2)) / (0.87 * fyk * (d - d_dash));
          result += `<strong>Required Compression Steel (As'): </strong>${As_prime.toFixed(2)} mm²<br>`;
          result += `<label>Enter Provided Compression Steel (mm²):</label>
            <input type='number' id='providedAsPrime' /><br>`;
        } else {
          result += `<strong>Section is Singly Reinforced (K = ${K.toFixed(4)} ≤ 0.167)</strong><br>`;
          result += `<strong>No compression steel required.</strong><br>`;
        }
        result += `<strong>Required Tension Steel (As): </strong>${As.toFixed(2)} mm²<br>`;
        result += `<label>Enter Provided Tension Steel (mm²):</label>
          <input type='number' id='providedAs' /><br>
          <button type="button" onclick="checkDoublySteel()">Check Steel</button>`;
        lastCalc = { As_req: As, As_prime_req: As_prime, b, d, fck, fyk, M: globalMspan, SpanLength: span1Length, beff, bw: b, globalMshear, w: selfWeight };
      }
    
      // Always update the results area at the end:
      document.getElementById("resultsContent").innerHTML = result + `<div id="steelCheckArea"></div>`;
      document.getElementById("resultArea").style.display = "block";
      document.getElementById("downloadBtn").style.display = "none"; // Hide until steel check
    
      // Now draw the diagrams on the new canvases
      drawFBDAllSpans();
      drawSFD();
      drawBMD();
    }
    showDiagrams();

    function checkDoublySteel() {
      const As_prov = parseFloat(document.getElementById("providedAs").value);
      let As_prime_prov = 0;
      const AsPrimeInput = document.getElementById("providedAsPrime");
      if (AsPrimeInput) {
        As_prime_prov = parseFloat(AsPrimeInput.value) || 0;
      }
    
      const { As_req, As_prime_req } = lastCalc;
      let result = "";
    
      if (AsPrimeInput) {
        result += `<br><strong>Provided Compression Steel:</strong> ${As_prime_prov.toFixed(2)} mm²<br>`;
        result += (As_prime_prov >= As_prime_req)
          ? "<strong>Compression steel is sufficient.</strong><br>"
          : "<strong>Compression steel is NOT sufficient.</strong><br>";
      }
    
      result += `<br><strong>Provided Tension Steel:</strong> ${As_prov.toFixed(2)} mm²<br>`;
      result += (As_prov >= As_req)
        ? "<strong>Tension steel is sufficient.</strong><br>"
        : "<strong>Tension steel is NOT sufficient.</strong><br>";
    
      const steelCheckArea = document.getElementById("steelCheckArea");
      // Remove previous tables and diagrams
      while (steelCheckArea.firstChild) steelCheckArea.removeChild(steelCheckArea.firstChild);
    
      // Add result summary
      const resultDiv = document.createElement('div');
      resultDiv.innerHTML = result;
      steelCheckArea.appendChild(resultDiv);
    
      // Add FEM table
      showFEMResults();
    
      // Add diagrams
      const diagramsDiv = document.createElement('div');
      diagramsDiv.id = "beamDiagrams";
      diagramsDiv.innerHTML = `
        <h2>Free Body Diagram</h2>
        <canvas id="resultFBDCanvas" width="600" height="300" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
        <h2>Shear Force Diagram</h2>
        <canvas id="resultSFDCanvas" width="600" height="120" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
        <h2>Bending Moment Diagram</h2>
        <canvas id="resultBMDCanvas" width="600" height="120" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
      `;
      steelCheckArea.appendChild(diagramsDiv);
    
      document.getElementById("downloadBtn").style.display = ""; // Show after steel check
    
      // Draw the diagrams now that canvases exist
      setTimeout(() => {
        drawFBDAllSpans('beamCanvas');
        drawFBDAllSpans('resultFBDCanvas');
        drawSFD('sfdCanvas');
        drawSFD('resultSFDCanvas');
        drawBMD('bmdCanvas');
        drawBMD('resultBMDCanvas');
      }, 50);
    }

    function continueCalc() {
      const As_prov = parseFloat(document.getElementById("providedAs").value);
      let result = "";
    
      // Use lastCalc values
      const { As_req, b, d, fck, fyk, M, SpanLength, beff, bw, globalMshear, w } = lastCalc;
    
      const As_min = (0.26 * 0.3 * Math.pow(fck, 2/3) * b * d) / fyk;
      result += `<br><strong>Minimum As required:</strong> ${As_min.toFixed(2)} mm²<br>`;
      result += (As_prov >= As_min) ? "Not under-reinforced<br>" : "Under-reinforced<br>";
    
      const Ac = b * d;
      const percent = (100 * As_prov) / Ac;
      result += `<strong>Steel %:</strong> ${percent.toFixed(2)}%<br>`;
    
      const p = As_req / (b * d);
      const p0 = Math.sqrt(fck) / 1000;
      result += `<strong>Deflection Check:</strong><br>p = ${p.toFixed(5)}, p0 = ${p0.toFixed(5)}<br>`;
      
      if (p > p0) {
        const l_d = 1.5 * (11 + 1.5 * Math.sqrt(fck) * (p0 / (p - p0)) + (1 / 12) * Math.sqrt(fck) * Math.sqrt(p0 / p));
        const qs = (310 * fyk * As_req) / (500 * As_prov)
        const Mod_1 = 310 / qs
        const Mod_2 = beff / bw
        const Mod_3 = 1
        const l_d_Actual = SpanLength / d
        const l_d_Allow = l_d * Mod_1 * Mod_2 * Mod_3
        result += `l/d Allowable= ${l_d_Allow.toFixed(2)}<br>`;
        result += `l/d Actual= ${l_d_Actual.toFixed(2)}<br>`;
    
        if (l_d_Actual < l_d_Allow){
          result += '<strong>It will not Deflect</strong><br>'
        }
        else {
          result += '<strong>It will Deflect</strong>'
        }
      }
      else {
        result += `p < p0: It will Deflect <br>`;
      }
      
      const Ved = globalMshear - ((w * (d/1000))/2);
      const Vrdmax = 0.124 * (bw * d / 1000) * (1 - (fck / 250)) * fck; 
      if (Vrdmax > Ved) {
        const angleInDegrees = 22;
        const angleInRadians = angleInDegrees * Math.PI / 180;
        const cotValue = 1 / Math.tan(angleInRadians);
        const Asw_S = (Ved * 1000) / (0.78 * d * fyk * 2.5)
        const Asw_Min_S = (0.08 * Math.pow(fck,0.5) * bw) / fyk
        result += `<strong>Shear Check:</strong><br>Ved = ${Ved.toFixed(2)} KN, Vrdmax = ${Vrdmax.toFixed(2)} KN<br>`;
        result += "<strong>It will not shear</strong><br>";
      }
      else {
        result += `<strong>Shear Check:</strong><br>Ved = ${Ved.toFixed(2)} KN, Vrdmax = ${Vrdmax.toFixed(2)} KN<br>`;
        result += '<strong>It will Shear</strong><br>';
      }
    
      // --- FIXED: Clear and append in order ---
      const steelCheckArea = document.getElementById("steelCheckArea");
      while (steelCheckArea.firstChild) steelCheckArea.removeChild(steelCheckArea.firstChild);
    
      // Add result summary
      const resultDiv = document.createElement('div');
      resultDiv.innerHTML = result;
      steelCheckArea.appendChild(resultDiv);
    
      // Add FEM table
      showFEMResults();
    
      // Add diagrams
      const diagramsDiv = document.createElement('div');
      diagramsDiv.id = "beamDiagrams";
      diagramsDiv.innerHTML = `
        <h2>Free Body Diagram</h2>
        <canvas id="resultFBDCanvas" width="600" height="300" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
        <h2>Shear Force Diagram</h2>
        <canvas id="resultSFDCanvas" width="600" height="120" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
        <h2>Bending Moment Diagram</h2>
        <canvas id="resultBMDCanvas" width="600" height="120" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
      `;
      steelCheckArea.appendChild(diagramsDiv);

      document.getElementById("downloadBtn").style.display = ""; // Show after steel check

      // Draw the diagrams after DOM update
      setTimeout(() => {
        drawFBDAllSpans('beamCanvas');
        drawFBDAllSpans('resultFBDCanvas');
        drawSFD('sfdCanvas');
        drawSFD('resultSFDCanvas');
        drawBMD('bmdCanvas');
        drawBMD('resultBMDCanvas');
      }, 50);
    }

    function tension() {
      const As_prov = parseFloat(document.getElementById("providedA_s").value);
      let result = "";
    
      // Use lastCalc values
      const { As_req, b, d, fck, fyk, M, SpanLength, beff, bw, globalMshear, w } = lastCalc;
    
      // Example: Check if provided tension steel is sufficient
      result += `<br><strong>Provided Tension Steel:</strong> ${As_prov.toFixed(2)} mm²<br>`;
      if (As_prov >= As_req) {
        result += "<strong>Tension steel is sufficient.</strong><br>";
      } else {
        result += "<strong>Tension steel is NOT sufficient.</strong><br>";
      }
    
      const steelCheckArea = document.getElementById("steelCheckArea");
      // Remove previous tables and diagrams
      while (steelCheckArea.firstChild) steelCheckArea.removeChild(steelCheckArea.firstChild);
    
      // Add result summary
      const resultDiv = document.createElement('div');
      resultDiv.innerHTML = result;
      steelCheckArea.appendChild(resultDiv);
    
      // Add FEM table
      showFEMResults();
    
      // Add Moment Distribution table
      MomentDistribution.updateTable();
    
      // Add diagrams
      const diagramsDiv = document.createElement('div');
      diagramsDiv.id = "beamDiagrams";
      diagramsDiv.innerHTML = `
        <h2>Free Body Diagram</h2>
        <canvas id="resultFBDCanvas" width="600" height="300" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
        <h2>Shear Force Diagram</h2>
        <canvas id="resultSFDCanvas" width="600" height="120" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
        <h2>Bending Moment Diagram</h2>
        <canvas id="resultBMDCanvas" width="600" height="120" style="border:1px solid #ccc; margin-bottom:20px;"></canvas>
      `;
      steelCheckArea.appendChild(diagramsDiv);
    
      document.getElementById("downloadBtn").style.display = ""; // Show after steel check
    
      // Draw the diagrams now that canvases exist
      setTimeout(() => {
        drawFBDAllSpans('beamCanvas');
        drawFBDAllSpans('resultFBDCanvas');
        drawSFD('sfdCanvas');
        drawSFD('resultSFDCanvas');
        drawBMD('bmdCanvas');
        drawBMD('resultBMDCanvas');
      }, 50);
    }

    function showFEMResults() {
      // Gather all spans and their loads (same logic as drawFBDAllSpans)
      let spans = [];
    
      // Span 1
      const span1Length = parseFloat(document.getElementById('spanLength').value) || 1000;
      let span1Loads = [];
    
      // Main load for Span 1
      const span1LoadType = document.querySelector('input[name="loadType"]:checked').value;
      const span1LoadMag = parseFloat(document.getElementById('UltimateLoad').value) || 0;
      if (span1LoadType === "udl") {
        const udlFrom = parseFloat(document.getElementById('udlFrom')?.value) || 0;
        const udlTo = parseFloat(document.getElementById('udlTo')?.value) || span1Length;
        if (span1LoadMag > 0 && udlTo > udlFrom) {
          span1Loads.push({ type: "udl", mag: span1LoadMag, from: udlFrom, to: udlTo });
        }
      } else {
        const span1LoadPos = parseFloat(document.getElementById('loadPosition')?.value) || 0;
        if (span1LoadMag > 0) {
          span1Loads.push({ type: span1LoadType, mag: span1LoadMag, pos: span1LoadPos });
        }
      }
      // Extra loads for Span 1
      const span1LoadsContainer = document.querySelector('details .loadsContainer');
      if (span1LoadsContainer && span1LoadsContainer.children.length > 0) {
        Array.from(span1LoadsContainer.children).forEach(loadDiv => {
          const type = loadDiv.querySelector('input[type="radio"]:checked')?.value;
          let mag = 0, pos = 0;
          loadDiv.querySelectorAll('label').forEach(label => {
            if (label.textContent.trim().startsWith('Load Magnitude')) {
              mag = parseFloat(label.querySelector('input').value) || 0;
            }
          });
          if (type === "udl") {
            const from = parseFloat(loadDiv.querySelector('.udlFrom')?.value) || 0;
            const to = parseFloat(loadDiv.querySelector('.udlTo')?.value) || 0;
            if (mag > 0 && to > from) {
              span1Loads.push({ type, mag, from, to });
            }
          } else {
            const pos = parseFloat(loadDiv.querySelector('.loadPosition')?.value) || 0;
            if (type && mag > 0) {
              span1Loads.push({ type, mag, pos });
            }
          }
        });
      }
      spans.push({ length: span1Length, loads: span1Loads });
    
      // Dynamic spans
      document.querySelectorAll('#spansContainer > details').forEach(details => {
        const spanDiv = details.querySelector('.span-fields');
        const length = parseFloat(spanDiv.querySelector('label input[type="number"]').value) || 1000;
        let loads = [];
        // Main load
        const mainType = spanDiv.querySelector('input[type="radio"]:checked').value;
        let mainMag = 0, mainPos = 0;
        spanDiv.querySelectorAll('label').forEach(label => {
          if (label.textContent.trim().startsWith('Load Magnitude')) {
            mainMag = parseFloat(label.querySelector('input').value) || 0;
          }
          if (label.textContent.trim().startsWith('Load Position')) {
            mainPos = parseFloat(label.querySelector('input').value) || 0;
          }
        });
        if (mainMag > 0) {
          loads.push({ type: mainType, mag: mainMag, pos: mainPos });
        }
        // Extra loads
        const loadsContainer = spanDiv.querySelector('.loadsContainer');
        if (loadsContainer && loadsContainer.children.length > 0) {
          Array.from(loadsContainer.children).forEach(loadDiv => {
            const type = loadDiv.querySelector('input[type="radio"]:checked')?.value;
            let mag = 0, pos = 0;
            loadDiv.querySelectorAll('label').forEach(label => {
              if (label.textContent.trim().startsWith('Load Magnitude')) {
                mag = parseFloat(label.querySelector('input').value) || 0;
              }
              if (label.textContent.trim().startsWith('Load Position')) {
                pos = parseFloat(label.querySelector('input').value) || 0;
              }
            });
            if (type && mag > 0) {
              loads.push({ type, mag, pos });
            }
          });
        }
        spans.push({ length, loads });
      });
    
      // Calculate FEMs for each span (sum all loads)
      let femResults = [];
      spans.forEach((span, idx) => {
        let L = span.length;
        let M_A = 0, M_B = 0;
        span.loads.forEach(load => {
          if (load.type === "udl") {
            // For full UDL (from 0 to L)
            let w = load.mag;
            let a = load.from !== undefined ? load.from : 0;
            let b = load.to !== undefined ? load.to : L;
            let l = b - a;
            if (l === L && a === 0) {
              // Full UDL
              M_A += -w * Math.pow(L, 2) / 12;
              M_B += w * Math.pow(L, 2) / 12;
            } else {
              // Partial UDL
              // M(AB) = -(w * l) * (L - (l/2) - a) / 12
              // M(BA) = (w * l) * ((l/2) + a) / 12
              M_A += -(w * l) * (L - (l / 2) - a) / 12;
              M_B += (w * l) * ((l / 2) + a) / 12;
            }
          } else if (load.type === "point") {
            let P = load.mag;
            let a = load.pos || 0;
            let b = L - a;
            // M(AB) = -P * b^2 * a / L^2
            // M(BA) = P * a^2 * b / L^2
            M_A += -P * Math.pow(b, 2) * a / Math.pow(L, 2);
            M_B += P * Math.pow(a, 2) * b / Math.pow(L, 2);
          } else if (load.type === "moment") {
            let M = load.mag;
            let a = load.pos || 0;
            // M(AB) = M * (1 - a/L)
            // M(BA) = M * (a/L)
            M_A += M * (1 - a / L);
            M_B += M * (a / L);
          }
        });
        femResults.push({
          span: idx + 1,
          length: L,
          M_A: M_A,
          M_B: M_B
        });
      });
    
      // Build HTML table
      let html = `<h3>Fixed-End Moments (FEM) for Each Span</h3>
        <table border="1" cellpadding="4" style="border-collapse:collapse;">
          <thead>
            <tr><th>Span</th><th>Length (mm)</th><th>FEM at Left (M<sub>A</sub>)</th><th>FEM at Right (M<sub>B</sub>)</th></tr>
          </thead>
          <tbody>`;
      femResults.forEach(r => {
        // Convert length from mm to m, FEM from Nm to kNm
        const length_m = (r.length / 1000).toFixed(2);
        const M_A_kNm = (r.M_A / 1000).toFixed(2);
        const M_B_kNm = (r.M_B / 1000).toFixed(2);
        html += `<tr><td>${r.span}</td><td>${length_m}</td><td>${M_A_kNm}</td><td>${M_B_kNm}</td></tr>`;
      });
      html += `</tbody></table>`;
    
      const steelCheckArea = document.getElementById('steelCheckArea');
      if (steelCheckArea) {
        // Remove any previous FEM table
        let oldFEM = document.getElementById('femResultsTable');
        if (oldFEM) oldFEM.remove();
        // Create a wrapper div for FEM results
        const femDiv = document.createElement('div');
        femDiv.id = 'femResultsTable';
        femDiv.innerHTML = html;
        // Insert FEM table just before the diagrams (i.e., before #beamDiagrams)
        const diagramsDiv = document.getElementById('beamDiagrams');
        if (diagramsDiv) {
          steelCheckArea.insertBefore(femDiv, diagramsDiv);
        } else {
          steelCheckArea.appendChild(femDiv);
        }
      }
    }