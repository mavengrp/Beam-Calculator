// UI Event Handlers

// Prevent form submission
document.getElementById('beamForm').addEventListener('submit', function(e) {
  e.preventDefault();
});

// Flange Inputs Show/Hide
window.addEventListener('DOMContentLoaded', function() {
  function toggleFlangeInputs() {
    const type = document.getElementById('beamType').value;
    document.getElementById('beffLabel').style.display = (type === 'tbeam' || type === 'lbeam') ? '' : 'none';
    document.getElementById('flangeDepthLabel').style.display = (type === 'tbeam' || type === 'lbeam') ? '' : 'none';
  }
  document.getElementById('beamType').addEventListener('change', toggleFlangeInputs);
  toggleFlangeInputs();
});

// Support Condition Change Handler
document.getElementById('supportCondition').addEventListener('change', function() {
  const val = this.value;
  document.getElementById('spansContainer').style.display = (val === 'continuous') ? '' : 'none';
  document.getElementById('addSpanBtn').style.display = (val === 'continuous') ? '' : 'none';
  document.getElementById('beamDiagrams').style.display = (val === 'simply') ? '' : 'none';
});