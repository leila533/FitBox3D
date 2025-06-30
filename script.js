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

// Converte string BR "20.000,00" para número float 20000.00
function parseBrazilianCurrency(str) {
  if (!str) return NaN;
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// Formata número para BR "20.000,00"
function formatNumber(num) {
  return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Retorna dimensões do container baseado no tipo
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

// Mostrar/ocultar inputs personalizados
containerType.addEventListener('change', () => {
  if (containerType.value === 'custom') {
    customInputs.classList.remove('hidden');
  } else {
    customInputs.classList.add('hidden');
  }
  validateInputs();
});

// Adicionar nova caixa
addBoxBtn.addEventListener('click', () => {
  addBox();
  validateInputs();
});

// Calcular e mostrar resultado
calculateBtn.addEventListener('click', () => {
  if (!validateInputs()) {
    alert('Por favor, preencha todos os campos corretamente.');
    return;
  }
  calculateAndShow();
});

// Exportar CSV
exportBtn.addEventListener('click', () => {
  if (resultsSection.classList.contains('hidden')) {
    alert('Calcule primeiro antes de exportar!');
    return;
  }
  exportCSV();
});

// Função para adicionar caixa (incluindo peso unitário)
function addBox() {
  const boxDiv = document.createElement('div');
  boxDiv.classList.add('box-card');
  boxDiv.innerHTML = `
    <label>Comprimento (cm):
      <input type="number" class="box-length" step="0.01" min="0" required />
    </label>
    <label>Largura (cm):
      <input type="number" class="box-width" step="0.01" min="0" required />
    </label>
    <label>Altura (cm):
      <input type="number" class="box-height" step="0.01" min="0" required />
    </label>
    <label>Peso unitário (kg):
      <input type="number" class="box-weight" step="0.01" min="0" required />
    </label>
    <label>Quantidade:
      <input type="number" class="box-qty" min="1" step="1" required />
    </label>
    <button type="button" class="remove-box-btn" aria-label="Remover caixa">×</button>
  `;
  boxesContainer.appendChild(boxDiv);

  // Remover caixa
  boxDiv.querySelector('.remove-box-btn').addEventListener('click', () => {
    boxDiv.remove();
    validateInputs();
  });

  // Validar inputs ao digitar
  boxDiv.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', validateInputs);
  });
}

// Validação de inputs incluindo custo do container com formato BR
function validateInputs() {
  let valid = true;

  if (containerType.value === 'custom') {
    ['custom-length', 'custom-width', 'custom-height', 'custom-max-weight'].forEach(id => {
      const val = parseFloat(document.getElementById(id).value);
      if (isNaN(val) || val <= 0) valid = false;
    });
  }

  const boxes = boxesContainer.querySelectorAll('.box-card');
  if (boxes.length === 0) valid = false;

  boxes.forEach(box => {
    ['box-length', 'box-width', 'box-height', 'box-qty', 'box-weight'].forEach(cls => {
      const val = parseFloat(box.querySelector(`.${cls}`).value);
      if (isNaN(val) || val <= 0) valid = false;
    });
  });

  // Validar custo do container (aceita zero) convertendo de BR para número
  const costVal = parseBrazilianCurrency(containerCostInput.value);
  if (isNaN(costVal) || costVal < 0) valid = false;

  calculateBtn.disabled = !valid;
  return valid;
}

// Cálculos e exibição
function calculateAndShow() {
  resultsSection.classList.remove('hidden');
  resultOutput.innerHTML = '';

  const { length, width, height, maxWeight } = getContainerDimensions();

  const containerVolume = length * width * height; // m³
  const containerArea = length * width; // m²

  let totalBoxesVolume = 0;
  let totalBoxesWeight = 0;
  let floorAreaUsed = 0;
  let dimensionWarning = false;

  const boxes = boxesContainer.querySelectorAll('.box-card');
  boxes.forEach(box => {
    const l = parseFloat(box.querySelector('.box-length').value) / 100; // cm->m
    const w = parseFloat(box.querySelector('.box-width').value) / 100;
    const h = parseFloat(box.querySelector('.box-height').value) / 100;
    const weight = parseFloat(box.querySelector('.box-weight').value);
    const qty = parseInt(box.querySelector('.box-qty').value);

    if (l > length || w > width || h > height) {
      dimensionWarning = true;
    }

    totalBoxesVolume += l * w * h * qty;
    totalBoxesWeight += weight * qty;
    floorAreaUsed += l * w * qty;
  });

  const volumePercent = (totalBoxesVolume / containerVolume) * 100;
  const areaPercent = (floorAreaUsed / containerArea) * 100;
  const volumeLeft = containerVolume - totalBoxesVolume;

  const containersNeededByVolume = Math.ceil(totalBoxesVolume / containerVolume);
  const containersNeededByWeight = Math.ceil(totalBoxesWeight / maxWeight);
  const containersNeeded = Math.max(containersNeededByVolume, containersNeededByWeight);

  // Calcular camadas empilhadas por caixa, garantir mínimo 1
  const layersByBox = [];
  boxes.forEach(box => {
    const h = parseFloat(box.querySelector('.box-height').value) / 100;
    const layersRaw = Math.floor(height / h);
    const layers = layersRaw > 0 ? layersRaw : 1; // pelo menos 1
    layersByBox.push(layers);
  });

  // Converter custo container com parseBR
  const containerCost = parseBrazilianCurrency(containerCostInput.value);
  const totalCost = containersNeeded * containerCost;

  // Mensagens de aviso
  let warningsHTML = '';
  if (volumePercent > 100) {
    warningsHTML += `<p style="color: #cc4b5f; font-weight: bold;">⚠️ Volume das caixas excede o volume do contêiner selecionado!</p>`;
  }
  if (totalBoxesWeight > maxWeight) {
    warningsHTML += `<p style="color: #cc4b5f; font-weight: bold;">⚠️ Peso total das caixas excede a capacidade do contêiner (${formatNumber(maxWeight / 1000)} toneladas)!</p>`;
  }
  if (dimensionWarning) {
    warningsHTML += `<p style="color: #cc4b5f; font-weight: bold;">⚠️ Pelo menos uma caixa excede as dimensões internas do contêiner!</p>`;
  }

  // Pluralizar camadas corretamente
  let layersStr = layersByBox
    .map((layers, i) => `Caixa ${i + 1}: ${layers} camada${layers > 1 ? 's' : ''} empilhada${layers > 1 ? 's' : ''}`)
    .join('<br>');

  resultOutput.innerHTML = `
    <p><strong>Volume do contêiner:</strong> ${formatNumber(containerVolume)} m³</p>
    <p><strong>Volume total das caixas:</strong> ${formatNumber(totalBoxesVolume)} m³</p>
    <p><strong>Porcentagem ocupada (volume):</strong> ${formatNumber(volumePercent)}%</p>
    <p><strong>Área do piso do contêiner:</strong> ${formatNumber(containerArea)} m²</p>
    <p><strong>Área ocupada pelas caixas:</strong> ${formatNumber(floorAreaUsed)} m² (${formatNumber(areaPercent)}%)</p>
    <p><strong>Volume livre restante:</strong> ${formatNumber(volumeLeft)} m³</p>
    <p><strong>Peso total das caixas:</strong> ${formatNumber(totalBoxesWeight)} kg</p>
    <p><strong>Capacidade máxima do contêiner:</strong> ${formatNumber(maxWeight)} kg</p>
    ${warningsHTML}
    <p style="margin-top: 1rem; font-size: 1.2rem;">
      📦 <strong>Contêineres necessários:</strong> ${containersNeeded}
    </p>
    <p><strong>Camadas empilhadas por caixa:</strong><br>${layersStr}</p>
    <p><strong>Custo por contêiner:</strong> R$ ${formatNumber(containerCost)}</p>
    <p><strong>Custo total estimado:</strong> R$ ${formatNumber(totalCost)}</p>
  `;
}

// Exportar dados CSV
function exportCSV() {
  let csv = 'Item,Comprimento (cm),Largura (cm),Altura (cm),Peso unitário (kg),Quantidade\n';
  const boxes = boxesContainer.querySelectorAll('.box-card');
  boxes.forEach((box, i) => {
    const l = box.querySelector('.box-length').value;
    const w = box.querySelector('.box-width').value;
    const h = box.querySelector('.box-height').value;
    const weight = box.querySelector('.box-weight').value;
    const qty = box.querySelector('.box-qty').value;
    csv += `Caixa ${i + 1},${l},${w},${h},${weight},${qty}\n`;
  });

  const { length, width, height, maxWeight } = getContainerDimensions();

  csv += `\nContêiner,${length},${width},${height},Capacidade máxima (kg),${maxWeight}\n`;
  csv += `\nVolume contêiner (m³),${formatNumber(length * width * height)}\n`;
  csv += `Volume total caixas (m³),${formatNumber(
    Array.from(boxesContainer.querySelectorAll('.box-card')).reduce((sum, box) => {
      const l = parseFloat(box.querySelector('.box-length').value) / 100;
      const w = parseFloat(box.querySelector('.box-width').value) / 100;
      const h = parseFloat(box.querySelector('.box-height').value) / 100;
      const qty = parseInt(box.querySelector('.box-qty').value);
      return sum + l * w * h * qty;
    }, 0)
  )}\n`;
  csv += `Peso total caixas (kg),${formatNumber(
    Array.from(boxesContainer.querySelectorAll('.box-card')).reduce((sum, box) => {
      const weight = parseFloat(box.querySelector('.box-weight').value);
      const qty = parseInt(box.querySelector('.box-qty').value);
      return sum + weight * qty;
    }, 0)
  )}\n`;
  csv += `Contêineres necessários,${calculateContainersNeeded()}\n`;
  csv += `Custo por contêiner (R$),${formatNumber(parseBrazilianCurrency(containerCostInput.value))}\n`;
  csv += `Custo total estimado (R$),${formatNumber(parseBrazilianCurrency(containerCostInput.value) * calculateContainersNeeded())}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fitbox3d_resultado.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Auxiliar para containers necessários na exportação
function calculateContainersNeeded() {
  const { length, width, height, maxWeight } = getContainerDimensions();

  const containerVolume = length * width * height;

  let totalBoxesVolume = 0;
  let totalBoxesWeight = 0;
  const boxes = boxesContainer.querySelectorAll('.box-card');
  boxes.forEach(box => {
    const l = parseFloat(box.querySelector('.box-length').value) / 100;
    const w = parseFloat(box.querySelector('.box-width').value) / 100;
    const h = parseFloat(box.querySelector('.box-height').value) / 100;
    const weight = parseFloat(box.querySelector('.box-weight').value);
    const qty = parseInt(box.querySelector('.box-qty').value);
    totalBoxesVolume += l * w * h * qty;
    totalBoxesWeight += weight * qty;
  });

  const containersNeededByVolume = Math.ceil(totalBoxesVolume / containerVolume);
  const containersNeededByWeight = Math.ceil(totalBoxesWeight / maxWeight);

  return Math.max(containersNeededByVolume, containersNeededByWeight);
}

// Inicializa uma caixa e valida inputs
addBox();
validateInputs();
