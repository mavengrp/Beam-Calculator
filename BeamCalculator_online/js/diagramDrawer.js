// Diagram Drawing Functions

    function drawFBDAllSpans(canvasId = 'beamCanvas') {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gather all spans (including Span 1 and dynamic spans)
      let spans = [];

      // For Span 1
      const span1Length = parseFloat(document.getElementById('spanLength').value) || 1000;
      let span1Loads = [];
      
      // Always include the main load
      const span1LoadType = document.querySelector('input[name="loadType"]:checked').value;
      const span1LoadMag = parseFloat(document.getElementById('UltimateLoad').value) || 0;
      if (span1LoadType === "udl") {
        const udlFrom = parseFloat(document.getElementById('udlFrom')?.value) || 0;
        const udlTo = parseFloat(document.getElementById('udlTo')?.value) || (parseFloat(document.getElementById('spanLength').value) || 1000);
        if (span1LoadMag > 0 && udlTo > udlFrom) {
          span1Loads.push({ type: "udl", mag: span1LoadMag, from: udlFrom, to: udlTo });
        }
      } else {
        const span1LoadPos = parseFloat(document.getElementById('loadPosition')?.value) || 0;
        if (span1LoadMag > 0) {
          span1Loads.push({ type: span1LoadType, mag: span1LoadMag, pos: span1LoadPos });
        }
      }
      
      // Also include any extra loads
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
              span1Loads.push({ type, mag, from, to }); // <-- FIXED
            }
          } else {
            const pos = parseFloat(loadDiv.querySelector('.loadPosition')?.value) || 0;
            if (type && mag > 0) {
              span1Loads.push({ type, mag, pos }); // <-- FIXED
            }
          }
        });
      }
      
      spans.push({ length: span1Length, loads: span1Loads });
      
      // For dynamic spans
      document.querySelectorAll('#spansContainer > details').forEach(details => {
        const spanDiv = details.querySelector('.span-fields');
        const length = parseFloat(spanDiv.querySelector('label input[type="number"]').value) || 1000;
        let loads = [];
      
        // Always include the main load for this span
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
      
        // Include any extra loads for this span
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

      // Calculate total length
      const totalLength = spans.reduce((sum, s) => sum + s.length, 0);

      // Margins and scaling
      const margin = 40;
      const beamY = 60;
      const beamLengthPx = canvas.width - 2 * margin;
      const scaleX = beamLengthPx / totalLength;

      // Draw all spans as a continuous beam
      let currentX = margin;
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        const spanPx = span.length * scaleX;

        // Draw beam segment
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(currentX, beamY);
        ctx.lineTo(currentX + spanPx, beamY);
        ctx.stroke();

        // Draw all loads for this span
        span.loads.forEach(loadObj => {
            if (loadObj.type === "udl" && loadObj.mag > 0) {
            ctx.strokeStyle = "blue";
            ctx.fillStyle = "blue";
            // Use from/to for partial UDL, or whole span if not present
            let udlFrom = loadObj.from !== undefined ? loadObj.from : 0;
            let udlTo = loadObj.to !== undefined ? loadObj.to : span.length;
            let udlStartPx = currentX + (udlFrom / span.length) * spanPx;
            let udlEndPx = currentX + (udlTo / span.length) * spanPx;
            let numArrows = Math.max(Math.floor((udlTo - udlFrom) / 500), 2);
            let arrowSpacing = (udlEndPx - udlStartPx) / (numArrows - 1 || 1);
            let udlLineY = beamY - 20;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(udlStartPx, udlLineY);
            ctx.lineTo(udlEndPx, udlLineY);
            ctx.stroke();
            for (let j = 0; j < numArrows; j++) {
              let x = udlStartPx + j * arrowSpacing;
              ctx.beginPath();
              ctx.moveTo(x, udlLineY);
              ctx.lineTo(x, beamY);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(x, beamY);
              ctx.lineTo(x - 3, beamY - 7);
              ctx.lineTo(x + 3, beamY - 7);
              ctx.closePath();
              ctx.fill();
            }
            ctx.font = "12px Arial";
            ctx.fillText(`UDL: ${loadObj.mag} kN/m`, udlStartPx + 10, udlLineY - 10);
          }
          if (loadObj.type === "point" && loadObj.mag > 0) {
            ctx.strokeStyle = "red";
            ctx.fillStyle = "red";
            let posPx = currentX + (loadObj.pos / span.length) * spanPx;
            let pointArrowStart = beamY - 30;
            let pointArrowEnd = beamY;
            ctx.beginPath();
            ctx.moveTo(posPx, pointArrowStart);
            ctx.lineTo(posPx, pointArrowEnd);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(posPx, pointArrowEnd);
            ctx.lineTo(posPx - 7, pointArrowEnd - 10);
            ctx.lineTo(posPx + 7, pointArrowEnd - 10);
            ctx.closePath();
            ctx.fill();
            ctx.font = "12px Arial";
            ctx.fillText(`P = ${loadObj.mag} kN`, posPx - 20, pointArrowStart - 10);
          }
          if (loadObj.type === "moment" && loadObj.mag > 0) {
            ctx.strokeStyle = "purple";
            ctx.beginPath();
            let px = currentX + (loadObj.pos / span.length) * spanPx;
            ctx.arc(px, beamY - 10, 20, Math.PI, 2 * Math.PI, false);
            ctx.stroke();
            ctx.font = "12px Arial";
            ctx.fillStyle = "purple";
            ctx.fillText(`M = ${loadObj.mag} kNm`, px - 20, beamY - 40);
          }
        });

        // Draw span dimension
        ctx.strokeStyle = "#222";
        ctx.fillStyle = "#222";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(currentX, beamY + 30);
        ctx.lineTo(currentX + spanPx, beamY + 30);
        ctx.stroke();
        ctx.font = "12px Arial";
        ctx.fillText(`${(span.length / 1000).toFixed(2)} m`, currentX + spanPx / 2 - 20, beamY + 50);
      
        // Get support condition
        const supportCondition = document.getElementById('supportCondition').value;
        
        // Draw supports at span ends
        if (i === 0) {
          if (supportCondition === "simply") {
            // Pin (triangle)
            ctx.fillStyle = "#444";
            ctx.beginPath();
            ctx.moveTo(currentX, beamY + 2);
            ctx.lineTo(currentX - 15, beamY + 25);
            ctx.lineTo(currentX + 15, beamY + 25);
            ctx.closePath();
            ctx.fill();
          } else if (supportCondition === "continuous" || supportCondition === "cantilever") {
            // Fixed (rectangle)
            ctx.fillStyle = "#444";
            ctx.fillRect(currentX - 10, beamY - 10, 20, 40);
          }
        } else {
          if (supportCondition === "continuous") {
            // Pin (triangle) for intermediate supports
            ctx.fillStyle = "#444";
            ctx.beginPath();
            ctx.moveTo(currentX, beamY + 2);
            ctx.lineTo(currentX - 15, beamY + 25);
            ctx.lineTo(currentX + 15, beamY + 25);
            ctx.closePath();
            ctx.fill();
          }
        }
        
        // Right end support
        if (i === spans.length - 1) {
          if (supportCondition === "simply") {
            // Pin (triangle)
            ctx.fillStyle = "#444";
            ctx.beginPath();
            ctx.moveTo(currentX + spanPx, beamY + 2);
            ctx.lineTo(currentX + spanPx - 15, beamY + 25);
            ctx.lineTo(currentX + spanPx + 15, beamY + 25);
            ctx.closePath();
            ctx.fill();
          } else if (supportCondition === "continuous") {
            // Fixed (rectangle)
            ctx.fillStyle = "#444";
            ctx.fillRect(currentX + spanPx - 10, beamY - 10, 20, 40);
          }
          // For cantilever: do nothing (free end)
        }

        currentX += spanPx;
      }
    }

    function drawBMD(canvasId = 'bmdCanvas') {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    
      // Gather spans and support moments
      let spans = [];
      // Span 1
      const span1Length = parseFloat(document.getElementById('spanLength').value) || 1000;
      let span1Loads = [];
      // Main load for Span 1
      const span1LoadType = document.querySelector('input[name="loadType"]:checked').value;
      const span1LoadMag = parseFloat(document.getElementById('UltimateLoad').value) || 0;
      const span1LoadPos = parseFloat(document.getElementById('loadPosition')?.value) || 0;
      if (span1LoadMag > 0) {
        if (span1LoadType === "udl") {
          const udlFrom = parseFloat(document.getElementById('udlFrom')?.value) || 0;
          const udlTo = parseFloat(document.getElementById('udlTo')?.value) || span1Length;
          span1Loads.push({ type: "udl", mag: span1LoadMag, from: udlFrom, to: udlTo });
        } else {
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
            if (label.textContent.trim().startsWith('Load Position')) {
              pos = parseFloat(label.querySelector('input').value) || 0;
            }
          });
          if (type && mag > 0) {
            if (type === "udl") {
              const from = parseFloat(loadDiv.querySelector('.udlFrom')?.value) || 0;
              const to = parseFloat(loadDiv.querySelector('.udlTo')?.value) || span1Length;
              span1Loads.push({ type, mag, from, to });
            } else {
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
          if (mainType === "udl") {
            const udlFrom = parseFloat(spanDiv.querySelector('.udlFrom')?.value) || 0;
            const udlTo = parseFloat(spanDiv.querySelector('.udlTo')?.value) || length;
            loads.push({ type: "udl", mag: mainMag, from: udlFrom, to: udlTo });
          } else {
            loads.push({ type: mainType, mag: mainMag, pos: mainPos });
          }
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
              if (type === "udl") {
                const from = parseFloat(loadDiv.querySelector('.udlFrom')?.value) || 0;
                const to = parseFloat(loadDiv.querySelector('.udlTo')?.value) || length;
                loads.push({ type, mag, from, to });
              } else {
                loads.push({ type, mag, pos });
              }
            }
          });
        }
        spans.push({ length, loads });
      });
    
      // Get support moments from moment distribution (window.mdSupportMoments)
      const mdMoments = window.mdSupportMoments || [];
      if (mdMoments.length !== spans.length) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#c00";
        ctx.fillText("Run Moment Distribution first!", 50, 50);
        return;
      }
    
      // Drawing setup
      const margin = 40;
      const chartHeight = canvas.height - 40;
      const chartWidth = canvas.width - 2 * margin;
      const totalLength = spans.reduce((sum, s) => sum + s.length, 0);
      const scaleX = chartWidth / totalLength;
    
      // Calculate BMD points for all spans
      let points = [];
      let currentX = 0;
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        const L = span.length / 1000; // m
        const nSteps = 80;
        const M_A = mdMoments[i].left;   // kNm
        const M_B = mdMoments[i].right;  // kNm
    
        for (let step = 0; step <= nSteps; step++) {
          const x = (span.length * step) / nSteps; // mm
          const xm = x / 1000; // m
          let mx = 0;
          // End moments (linear part)
          mx += M_A * (1 - xm / L) + M_B * (xm / L);
    
          // Add effect of loads (parabolic for UDL, correct for point/moment)
          span.loads.forEach(load => {
            if (load.type === "udl") {
              let w = load.mag;
              let a = load.from !== undefined ? load.from / 1000 : 0;
              let b = load.to !== undefined ? load.to / 1000 : L;
              let l = b - a;
              if (l === L && a === 0) {
                // Full UDL, both ends fixed: M(x) = (w/12)*(L*x - x^3/L)
                mx += (w / 12) * (L * xm - Math.pow(xm, 3) / L);
              } else if (xm >= a && xm <= b) {
                // Partial UDL (approximate as simply supported for now)
                mx += w * Math.pow(xm - a, 2) / 2;
              } else if (xm > b) {
                mx += w * (b - a) * (xm - (a + b) / 2);
              }
            } else if (load.type === "point") {
              let P = load.mag;
              let a = load.pos / 1000 || 0;
              // Both ends fixed, moment at x due to P at a:
              // M(x) = P*a*(L-x)/L for x >= a, else P*(L-a)*x/L
              if (xm < a) {
                mx += P * (L - a) * xm / L;
              } else {
                mx += P * a * (L - xm) / L;
              }
            } else if (load.type === "moment") {
              let M0 = load.mag;
              let a = load.pos / 1000 || 0;
              // Both ends fixed, moment at x due to M0 at a:
              // M(x) = M0*(L-x)/L for x >= a, else M0*x/L
              if (xm < a) {
                mx += M0 * (L - a) / L;
              } else {
                mx += -M0 * a / L;
              }
            }
          });
    
          points.push({
            x: currentX + x,
            M: mx
          });
        }
        currentX += span.length;
      }
    
      // Find max/min for scaling
      const maxM = Math.max(...points.map(p => p.M));
      const minM = Math.min(...points.map(p => p.M));
      const scaleY = (chartHeight - 40) / (Math.abs(maxM) + Math.abs(minM) + 1e-6);
    
      // Draw axis
      ctx.strokeStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(margin, chartHeight / 2 + 20);
      ctx.lineTo(margin + chartWidth, chartHeight / 2 + 20);
      ctx.stroke();
    
      // Draw BMD
      ctx.strokeStyle = "#2980B9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = margin + (p.x / totalLength) * chartWidth;
        const y = chartHeight / 2 + 20 - p.M * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    
      // Labels
      ctx.fillStyle = "#2980B9";
      ctx.font = "12px Arial";
      ctx.fillText("Moment (kNm)", margin + 5, 15);
    }

    function drawSFD(canvasId = 'sfdCanvas') {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    
      // Gather spans and loads (same as drawBMD)
      let spans = [];
      const span1Length = parseFloat(document.getElementById('spanLength').value) || 1000;
      let span1Loads = [];
      const span1LoadType = document.querySelector('input[name="loadType"]:checked').value;
      const span1LoadMag = parseFloat(document.getElementById('UltimateLoad').value) || 0;
      const span1LoadPos = parseFloat(document.getElementById('loadPosition')?.value) || 0;
      if (span1LoadMag > 0) {
        if (span1LoadType === "udl") {
          const udlFrom = parseFloat(document.getElementById('udlFrom')?.value) || 0;
          const udlTo = parseFloat(document.getElementById('udlTo')?.value) || span1Length;
          span1Loads.push({ type: "udl", mag: span1LoadMag, from: udlFrom, to: udlTo });
        } else {
          span1Loads.push({ type: span1LoadType, mag: span1LoadMag, pos: span1LoadPos });
        }
      }
      const span1LoadsContainer = document.querySelector('details .loadsContainer');
      if (span1LoadsContainer && span1LoadsContainer.children.length > 0) {
        Array.from(span1LoadsContainer.children).forEach(loadDiv => {
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
            if (type === "udl") {
              const from = parseFloat(loadDiv.querySelector('.udlFrom')?.value) || 0;
              const to = parseFloat(loadDiv.querySelector('.udlTo')?.value) || span1Length;
              span1Loads.push({ type, mag, from, to });
            } else {
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
          if (mainType === "udl") {
            const udlFrom = parseFloat(spanDiv.querySelector('.udlFrom')?.value) || 0;
            const udlTo = parseFloat(spanDiv.querySelector('.udlTo')?.value) || length;
            loads.push({ type: "udl", mag: mainMag, from: udlFrom, to: udlTo });
          } else {
            loads.push({ type: mainType, mag: mainMag, pos: mainPos });
          }
        }
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
              if (type === "udl") {
                const from = parseFloat(loadDiv.querySelector('.udlFrom')?.value) || 0;
                const to = parseFloat(loadDiv.querySelector('.udlTo')?.value) || length;
                loads.push({ type, mag, from, to });
              } else {
                loads.push({ type, mag, pos });
              }
            }
          });
        }
        spans.push({ length, loads });
      });
    
      // Get support moments from moment distribution (window.mdSupportMoments)
      const mdMoments = window.mdSupportMoments || [];
      if (mdMoments.length !== spans.length) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#c00";
        ctx.fillText("Run Moment Distribution first!", 50, 50);
        return;
      }
    
      // Calculate reactions at supports using moments and loads
      // For each span, calculate reactions at left and right using:
      // V_left = (M_left + M_right)/L + sum of vertical loads (UDL, point, etc.)
      // For continuous beams, reactions are shared at supports
    
      // Drawing setup
      const margin = 40;
      const chartHeight = canvas.height - 40;
      const chartWidth = canvas.width - 2 * margin;
      const totalLength = spans.reduce((sum, s) => sum + s.length, 0);
      const scaleX = chartWidth / totalLength;
    
      // Calculate SFD points for all spans
      let points = [];
      let currentX = 0;
      let prevShear = 0;
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        const L = span.length / 1000; // m
        const nSteps = 80;
        const M_A = mdMoments[i].left;   // kNm
        const M_B = mdMoments[i].right;  // kNm
    
        // Calculate total vertical load on span
        let totalUDL = 0;
        span.loads.forEach(load => {
          if (load.type === "udl") {
            let a = load.from !== undefined ? load.from / 1000 : 0;
            let b = load.to !== undefined ? load.to / 1000 : L;
            let l = b - a;
            totalUDL += load.mag * l;
          }
          if (load.type === "point") {
            totalUDL += load.mag;
          }
        });
    
        // Calculate reactions at left and right (for simply supported, use standard formulas)
        // For continuous, use moments and loads
        // V_left = (M_A + M_B)/L + sum of vertical loads / 2 (approximate for continuous)
        // For more accuracy, use equilibrium at each support
        let V_left = null, V_right = null;
        // For simply supported: V_left = totalUDL/2, V_right = totalUDL/2
        // For continuous: V_left = (M_A + M_B)/L + ... (approximate)
        V_left = (M_A + M_B) / L + totalUDL / 2;
        V_right = totalUDL - V_left;
    
        for (let step = 0; step <= nSteps; step++) {
          const x = (span.length * step) / nSteps; // mm
          const xm = x / 1000; // m
          let shear = V_left;
    
          // Subtract UDL up to x
          span.loads.forEach(load => {
            if (load.type === "udl") {
              let a = load.from !== undefined ? load.from / 1000 : 0;
              let b = load.to !== undefined ? load.to / 1000 : L;
              let l = b - a;
              if (xm >= a && xm <= b) {
                shear -= load.mag * (xm - a);
              } else if (xm > b) {
                shear -= load.mag * l;
              }
            }
            if (load.type === "point") {
              let a = load.pos / 1000 || 0;
              if (xm >= a) {
                shear -= load.mag;
              }
            }
          });
    
          points.push({
            x: currentX + x,
            V: shear
          });
        }
        currentX += span.length;
      }
    
      // Find max/min for scaling
      const maxV = Math.max(...points.map(p => p.V));
      const minV = Math.min(...points.map(p => p.V));
      const scaleY = chartHeight / (Math.abs(maxV) + Math.abs(minV) + 1e-6);
    
      // Draw axis
      ctx.strokeStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(margin, chartHeight / 2 + 20);
      ctx.lineTo(margin + chartWidth, chartHeight / 2 + 20);
      ctx.stroke();
    
      // Draw SFD
      ctx.strokeStyle = "#E67E22";
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = margin + (p.x / totalLength) * chartWidth;
        const y = chartHeight / 2 + 20 - p.V * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    
      // Labels
      ctx.fillStyle = "#E67E22";
      ctx.font = "12px Arial";
      ctx.fillText("Shear (kN)", margin + 5, 15);
    }

    function showDiagrams() {
      // Always update spans and loads before running moment distribution
      drawFBDAllSpans('resultFBDCanvas');
      drawSFD('resultSFDCanvas');
      drawBMD('resultBMDCanvas');
    }