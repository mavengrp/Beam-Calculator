    function downloadPDF() {
      showFEMResults();

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
    
      // Set a clean font
      doc.setFont("helvetica", "normal");
    
      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Beam Calculation Report", 10, 18);
    
      // Section separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.8);
      doc.line(10, 22, 200, 22);
    
      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("Job Number: ____________________", 10, 28);
      doc.text("Client: _________________________", 10, 33);
      doc.text("Calculated by: __________________", 10, 38);
      doc.text("Date: " + new Date().toLocaleDateString(), 150, 28);
    
      // Section: Input Parameters
      let y = 45;
      doc.setFontSize(13);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, "bold");
      doc.text("Input Parameters", 10, y);
      doc.setFont(undefined, "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
    
      // Draw a light gray box for input parameters
      doc.setFillColor(245, 247, 250);
      doc.rect(10, y + 3, 190, 9 * 8, "F");
    
      const inputParams = [
        `Support Condition: ${document.getElementById("supportCondition").value}`,
        `Beam Type: ${document.getElementById("beamType").value}`,
        `Beam Depth (h): ${document.getElementById("beamDepth").value} mm`,
        `Beam Width (b): ${document.getElementById("beamWidth").value} mm`,
        `Flange Depth (hf): ${document.getElementById("flangeDepth").value} mm`,
        `Concrete Cover: ${document.getElementById("concreteCover").value} mm`,
        `Diameter of Bar: ${document.getElementById("barDiameter").value} mm`,
        `Diameter of Link: ${document.getElementById("linkDiameter").value} mm`,
        `fck: ${document.getElementById("fck").value} N/mm²`,
        `fyk: ${document.getElementById("fyk").value} N/mm²`,
      ];
      inputParams.forEach((param, idx) => {
        doc.text(param, 14, y + 10 + idx * 8);
      });
    
      y += 10 + inputParams.length * 8;
    
      // Section: Results
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("Results", 10, y + 8);
      doc.setFont(undefined, "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
    
      // Section separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(10, y + 10, 200, y + 10);
    
      // Main results (fullResult)
      let content = fullResult;
      content = content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
      let resultLines = doc.splitTextToSize(content, 180);
      let resultY = y + 18;
      resultLines.forEach(line => {
        if (resultY > 280) { doc.addPage(); resultY = 20; }
        doc.text(line, 10, resultY);
        resultY += 8;
      });
      y = resultY;
    
      // Provided area of steel and checks (from steelCheckArea)
      const steelCheckArea = document.getElementById("steelCheckArea");
      if (steelCheckArea) {
        // Clone steelCheckArea and remove the tables before extracting text
        let clone = steelCheckArea.cloneNode(true);
        let femTable = clone.querySelector('#femResultsTable');
        if (femTable) femTable.remove();
        let mdTable = clone.querySelector('#momentDistributionTable');
        if (mdTable) mdTable.remove();
        let steelText = clone.innerText || clone.textContent || "";
        if (steelText.trim()) {
          if (y > 230) { doc.addPage(); y = 20; }
          doc.setFontSize(14);
          doc.text("Steel Checks & Provided Area", 10, y + 10);
          doc.setFontSize(12);
          // Format steel checks for better line breaks
          let steelLines = steelText.replace(/\s{2,}/g, ' ').split(/\n|\. |\r/).map(s => s.trim()).filter(Boolean);
          let formattedSteelLines = [];
          steelLines.forEach(line => {
            if (line.length > 90) {
              formattedSteelLines.push(...doc.splitTextToSize(line, 180));
            } else {
              formattedSteelLines.push(line);
            }
          });
          doc.text(formattedSteelLines, 10, y + 18);
          y += 18 + formattedSteelLines.length * 8;
        }
      }
    
      // FEM Table with jsPDF-AutoTable
      const femDiv = document.getElementById('femResultsTable');
      if (femDiv) {
        const table = femDiv.querySelector('table');
        if (table) {
          // Get headers
          const headers = [];
          table.querySelectorAll('thead tr th').forEach(th => {
            headers.push(th.textContent.trim());
          });
          // Get rows
          const rows = [];
          table.querySelectorAll('tbody tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('td').forEach(td => {
              row.push(td.textContent.trim());
            });
            if (row.length) rows.push(row);
          });
    
          if (y > 230) { doc.addPage(); y = 20; }
          doc.setFontSize(14);
          doc.text("Fixed-End Moments (FEM) Table", 10, y + 10);
          doc.setFontSize(11);
    
          doc.autoTable({
            head: [headers],
            body: rows,
            startY: y + 18,
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: 11,
              cellPadding: 3,
              textColor: [45,58,74],
              lineColor: [220,220,220]
            },
            headStyles: {
              fillColor: [230,233,242],
              textColor: [45,58,74],
              fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [244,247,250] },
            tableLineColor: [220,220,220],
            tableLineWidth: 0.5,
          });
          y = doc.lastAutoTable.finalY + 10;
        }
      }
    
      // Moment Distribution Table with jsPDF-AutoTable
      const mdDiv = document.getElementById('momentDistributionTable');
      if (mdDiv) {
        const table = mdDiv.querySelector('table');
        if (table) {
          // Get all header rows
          const headRows = [];
          table.querySelectorAll('thead tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('th').forEach(th => {
              row.push(th.textContent.trim());
            });
            if (row.length) headRows.push(row);
          });
          // Get all body rows (only <td> cells, skip <th>)
          const bodyRows = [];
          table.querySelectorAll('tbody tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('td').forEach(td => {
              row.push(td.textContent.trim());
            });
            if (row.length) bodyRows.push(row);
          });
      
          if (y > 230) { doc.addPage(); y = 20; }
          doc.setFontSize(14);
          doc.text("Moment Distribution Table", 10, y + 10);
          doc.setFontSize(10);
      
          doc.autoTable({
            head: headRows,
            body: bodyRows,
            startY: y + 18,
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: 9,
              cellPadding: 2,
              textColor: [45,58,74],
              lineColor: [220,220,220]
            },
            headStyles: {
              fillColor: [230,233,242],
              textColor: [45,58,74],
              fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [244,247,250] },
            tableLineColor: [220,220,220],
            tableLineWidth: 0.5,
          });
          y = doc.lastAutoTable.finalY + 10;
        }
      }
    
      // FBD, SFD, BMD diagrams (no titles)
      function addDiagram(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
          if (y > 200) { doc.addPage(); y = 20; }
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 10, y + 10, 180, 60);
          y += 70;
        }
      }
      addDiagram('resultFBDCanvas');
      addDiagram('resultSFDCanvas');
      addDiagram('resultBMDCanvas');
    
      // Save the PDF
      doc.save("Beam_Calculation_Report.pdf");
    }