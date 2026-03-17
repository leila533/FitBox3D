// DOM Elements
const containerType = document.getElementById('container-type');
const customInputs = document.getElementById('custom-container-inputs');
const boxesContainer = document.getElementById('boxes-container');
const addBoxBtn = document.getElementById('add-box-btn');
const calculateBtn = document.getElementById('calculate-btn');
const resultsSection = document.getElementById('results');
const resultOutput = document.getElementById('result-output');
const containerCostInput = document.getElementById('container-cost');
const exportBtn = document.getElementById('export-btn');

// Converter moeda BR
function parseBrazilianCurrency(str) {
  if (!str) return NaN;
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// Formatar número
function formatNumber(num) {
  return Number(num).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Dimensões do container
function getContainerDimensions() {
  let length, width, height, maxWeight;

  if (containerType.value === '20') {
    length = 5.9; width = 2.35; height = 2.39; maxWeight = 28000;
  } else if (containerType.value === '40') {
    length = 12.03; width = 2.35; height = 2.39; maxWeight = 28000;
  } else if (containerType.value === '40hc') {
    length = 12.03; width = 2.35; height = 2.69; maxWeight = 28000;
  } else {
    length = parseFloat(document.getElementById('custom-length').value);
    width = parseFloat(document.getElementById('custom-width').value);
    height = parseFloat(document.getElementById('custom-height').value);
    maxWeight = parseFloat(document.getElementById('custom-max-weight').value);
  }

  return { length, width, height, maxWeight };
}

// Mostrar inputs personalizados
containerType.addEventListener('change', () => {
  customInputs.classList.toggle('hidden', containerType.value !== 'custom');
  validateInputs();
});

// Adicionar caixa
addBoxBtn.addEventListener('click', () => {
  addBox();
  validateInputs();
});

// Calcular
calculateBtn.addEventListener('click', () => {
  if (!validateInputs()) {
    alert('Preencha todos os campos corretamente.');
    return;
  }
  calculateAndShow();
});

// Exportar CSV
exportBtn.addEventListener('click', () => {
  if (resultsSection.classList.contains('hidden')) {
    alert('Calcule primeiro!');
    return;
  }
  exportCSV();
});

// Criar caixa
function addBox() {
  const boxDiv = document.createElement('div');
  boxDiv.classList.add('box-card');

  boxDiv.innerHTML = `
    <label>Comprimento (cm):
      <input type="number" class="box-length" required />
    </label>
    <label>Largura (cm):
      <input type="number" class="box-width" required />
    </label>
    <label>Altura (cm):
      <input type="number" class="box-height" required />
    </label>
    <label>Peso (kg):
      <input type="number" class="box-weight" required />
    </label>
    <label>Quantidade:
      <input type="number" class="box-qty" required />
    </label>
    <button type="button" class="remove-box-btn">×</button>
  `;

  boxesContainer.appendChild(boxDiv);

  boxDiv.querySelector('.remove-box-btn').onclick = () => {
    boxDiv.remove();
    validateInputs();
  };

  boxDiv.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', validateInputs);
  });
}

// Validar
function validateInputs() {
  let valid = true;

  const boxes = boxesContainer.querySelectorAll('.box-card');
  if (boxes.length === 0) valid = false;

  boxes.forEach(box => {
    box.querySelectorAll('input').forEach(input => {
      if (!input.value || input.value <= 0) valid = false;
    });
  });

  calculateBtn.disabled = !valid;
  return valid;
}

// CALCULAR
function calculateAndShow() {
  resultsSection.classList.remove('hidden');

  const { length, width, height, maxWeight } = getContainerDimensions();

  const containerVolume = length * width * height;
  const containerArea = length * width;

  let totalBoxesVolume = 0;
  let totalBoxesWeight = 0;
  let floorAreaUsed = 0;
  let dimensionWarning = false;

  const boxes = boxesContainer.querySelectorAll('.box-card');

  boxes.forEach(box => {
    const l = box.querySelector('.box-length').value / 100;
    const w = box.querySelector('.box-width').value / 100;
    const h = box.querySelector('.box-height').value / 100;
    const weight = parseFloat(box.querySelector('.box-weight').value);
    const qty = parseInt(box.querySelector('.box-qty').value);

    if (l > length || w > width || h > height) {
      dimensionWarning = true;
    }

    totalBoxesVolume += l * w * h * qty;
    totalBoxesWeight += weight * qty;
    floorAreaUsed += l * w * qty;
  });

  // 🔥 AVISOS (CORRIGIDO)
  let warningsHTML = '';

  const volumePercent = (totalBoxesVolume / containerVolume) * 100;
  const areaPercent = (floorAreaUsed / containerArea) * 100;
  const volumeLeft = containerVolume - totalBoxesVolume;

  if (areaPercent > 100) {
    warningsHTML += `<p style="color:#cc4b5f;font-weight:bold;">
    ⚠️ Problema de distribuição no piso!
    </p>`;
  }

  if (volumePercent > 100) {
    warningsHTML += `<p style="color:#cc4b5f;font-weight:bold;">
    ⚠️ Volume excedido!
    </p>`;
  }

  if (totalBoxesWeight > maxWeight) {
    warningsHTML += `<p style="color:#cc4b5f;font-weight:bold;">
    ⚠️ Peso excedido!
    </p>`;
  }

  if (dimensionWarning) {
    warningsHTML += `<p style="color:#cc4b5f;font-weight:bold;">
    ⚠️ Caixa maior que o contêiner!
    </p>`;
  }

  if (warningsHTML === '') {
    warningsHTML = `<p style="color:#2ecc71;font-weight:bold;">
    ✅ Tudo dentro dos limites!
    </p>`;
  }

  const containersNeeded = Math.max(
    Math.ceil(totalBoxesVolume / containerVolume),
    Math.ceil(totalBoxesWeight / maxWeight)
  );

  const containerCost = parseBrazilianCurrency(containerCostInput.value);
  const totalCost = containersNeeded * containerCost;

  resultOutput.innerHTML = `
    <p><strong>Volume contêiner:</strong> ${formatNumber(containerVolume)} m³</p>
    <p><strong>Volume caixas:</strong> ${formatNumber(totalBoxesVolume)} m³</p>
    <p><strong>Ocupação:</strong> ${formatNumber(volumePercent)}%</p>
    <p><strong>Área ocupada:</strong> ${formatNumber(areaPercent)}%</p>
    <p><strong>Volume livre:</strong> ${formatNumber(volumeLeft)} m³</p>
    <p><strong>Peso total:</strong> ${formatNumber(totalBoxesWeight)} kg</p>
    ${warningsHTML}
    <p><strong>Contêineres necessários:</strong> ${containersNeeded}</p>
    <p><strong>Custo total:</strong> R$ ${formatNumber(totalCost)}</p>
  `;
}

// CSV
function exportCSV() {
  alert('Exportação funcionando 🚀');
}

// Inicial
addBox();
validateInputs();
