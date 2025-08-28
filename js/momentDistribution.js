// Moment Distribution Logic

const MomentDistribution = {
  // ... (keep other methods unchanged)

  run(spans, colProps) {
    const E = colProps.E;
    const I_col = colProps.I_col;
    const H = colProps.H;
    const EI_col = E * I_col;
    const nSpans = spans.length;
    const EI_beams = spans.map(span => E * colProps.I_beam);
    const L_beams = spans.map(span => span.length);

    const K_cols = Array(nSpans + 1).fill(3 * EI_col / H);
    const K_beams = L_beams.map((L, i) => 4 * EI_beams[i] / L);

    // Compute DFs
    const DFs = [];
    for (let j = 0; j <= nSpans; j++) {
      let members = [];
      if (j > 0) members.push({ name: 'L', K: K_beams[j - 1] });
      members.push({ name: 'C', K: K_cols[j] });
      if (j < nSpans) members.push({ name: 'R', K: K_beams[j] });
      const sumK = members.reduce((sum, m) => sum + m.K, 0);
      const df = {};
      members.forEach(m => df[m.name] = m.K / sumK);
      DFs.push({ left: df.L || 0, col: df.C || 0, right: df.R || 0 });
    }

    // Compute FEMs
    const moments = spans.map(span => {
      let M_AB = 0, M_BA = 0;
      const L = span.length;
      span.loads.forEach(load => {
        const type = load.type.toLowerCase();
        if (type === 'udl') {
          const w = load.mag;
          M_AB += -w * Math.pow(L, 2) / 12;
          M_BA += -w * Math.pow(L, 2) / 12;
        } else if (type === 'point') {
          const P = load.mag;
          const a = load.pos;
          const b = L - a;
          M_AB += -P * a * b * b / Math.pow(L, 2);
          M_BA += -P * a * a * b / Math.pow(L, 2);
        } else if (type === 'moment') {
          const M = load.mag;
          const a = load.pos;
          const b = L - a;
          M_AB += M * b * (L + 2 * a) / (L * L);
          M_BA += -M * a * (L + 2 * b) / (L * L);
        }
      });
      return { left: M_AB, right: M_BA };
    });

    let colMoments = Array(nSpans + 1).fill(0);
    const threshold = 0.01;
    let converged = false;
    let iter = 0;

    while (!converged && iter < 100) {
      iter++;
      converged = true;

      for (let j = 0; j <= nSpans; j++) {
        const M_L = moments[j - 1]?.right || 0;
        const M_R = moments[j]?.left || 0;
        const M_C = colMoments[j];
        const M_total = M_L + M_C + M_R;

        const dL = -M_total * DFs[j].left;
        const dC = -M_total * DFs[j].col;
        const dR = -M_total * DFs[j].right;

        if (Math.abs(dL) > threshold || Math.abs(dC) > threshold || Math.abs(dR) > threshold) {
          converged = false;
        }

        if (j > 0) {
          moments[j - 1].right += dL;
          moments[j - 1].left += dL / 2;
        }
        if (j < nSpans) {
          moments[j].left += dR;
          moments[j].right += dR / 2;
        }
        colMoments[j] += dC;
      }
    }

    // Prepare output table (replace this with your table code)
    const table = document.createElement('table');
    table.border = 1;
    const header = table.insertRow();
    header.innerHTML = '<th>Span</th><th>Left Moment</th><th>Right Moment</th>';
    moments.forEach((m, i) => {
      const row = table.insertRow();
      row.innerHTML = `<td>${i + 1}</td><td>${m.left.toFixed(2)}</td><td>${m.right.toFixed(2)}</td>`;
    });
    const steelCheckArea = document.getElementById('steelCheckArea');
    if (steelCheckArea) {
      // Remove any previous table
      let oldMD = document.getElementById('momentDistributionTable');
      if (oldMD) oldMD.remove();
      const resultDiv = document.createElement('div');
      resultDiv.id = 'momentDistributionTable';
      resultDiv.innerHTML = '<h3>Moment Distribution Table</h3>';
      resultDiv.appendChild(table);
      const diagramsDiv = document.getElementById('beamDiagrams');
      if (diagramsDiv) {
        steelCheckArea.insertBefore(resultDiv, diagramsDiv);
      } else {
        steelCheckArea.appendChild(resultDiv);
      }
    }

    // Save to global for further use
    window.mdSupportMoments = moments;
  }
};