document.addEventListener('DOMContentLoaded', () => {
  const tablaBackups = document.getElementById('tabla-backups');
  const totalCopias = document.getElementById('total-copias');

  const backups = JSON.parse(localStorage.getItem('copiasSeguridad')) || [];

  tablaBackups.innerHTML = '';

  backups.forEach((bk, index) => {
    const fila = document.createElement('tr');
    const nombreArchivo = `backup_${bk.tipo.toLowerCase()}_${index + 1}.json`;

    const blob = new Blob([JSON.stringify(bk.datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    fila.innerHTML = `
      <td>${index + 1}</td>
      <td>${bk.fecha}</td>
      <td>${bk.tipo}</td>
      <td>
        <a href="${url}" download="${nombreArchivo}" class="btn btn-sm btn-outline-primary">Descargar</a>
      </td>
    `;
    tablaBackups.appendChild(fila);
  });

  totalCopias.textContent = backups.length;

  // Simula datos de métricas (puedes reemplazar con datos reales)
  document.getElementById('total-registros').textContent = 12;
  document.getElementById('total-unidades').textContent = 48;
  document.getElementById('valor-total').textContent = '150,000';

  // Gráfico de ejemplo para Accesorios
  const ctx = document.getElementById('graficoAccesorios').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Cables', 'Audífonos', 'Cargadores'],
      datasets: [{
        label: 'Inventario',
        data: [12, 15, 21],
        backgroundColor: ['#198754', '#0d6efd', '#ffc107']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  });
});
