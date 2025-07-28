// ========== REFERENCIAS ==========
const $ = id => document.getElementById(id);
const tablaAcc = $('tabla-accesorios');
let filaSeleccionadaAcc = null;
let grafico = null;
const passwordEliminar = 'error';

// ========== INICIO ==========
window.onload = () => {
  cargarDesdeLocalStorage();
  actualizarMetricas();
};

// ========== EVENTOS ==========
$('form-accesorios')?.addEventListener('submit', guardarNuevoAccesorio);
$('btnEditar')?.addEventListener('click', editarAccesorioSeleccionado);
$('btnEliminar')?.addEventListener('click', eliminarAccesorioSeleccionado);
$('exportarImagenBtn')?.addEventListener('click', exportarSeleccionadaComoImagen);
$('exportarExcelBtn')?.addEventListener('click', exportarTablaAExcel);
$('btn-exportar-json')?.addEventListener('click', exportarBaseDeDatos);
$('btn-agregar-copia')?.addEventListener('click', guardarCopiaSeguridad);
$('importarBD')?.addEventListener('change', importarBaseDeDatos);

// ========== FORMULARIO ==========
function capturarDatosFormulario() {
  return {
    fecha: $('fechaAcc').value,
    nombre: $('nombreAcc').value,
    categoria: $('categoriaAcc').value,
    precio: $('precioAcc').value,
    cantidad: $('cantidadAcc').value,
    observaciones: $('observacionesAcc').value,
    cliente: $('clienteAcc').value,
    contacto: $('contactoAcc').value
  };
}

function guardarNuevoAccesorio(e) {
  e.preventDefault();
  const nuevo = capturarDatosFormulario();
  agregarFilaAccesorios(nuevo, true);
  e.target.reset();
  actualizarMetricas();
}

// ========== CRUD ==========
function agregarFilaAccesorios(data, guardar) {
  const fila = document.createElement('tr');
  fila.innerHTML = `
    <td>${data.fecha}</td><td>${data.nombre}</td><td>${data.categoria}</td>
    <td>${data.precio}</td><td>${data.cantidad}</td><td>${data.observaciones}</td>
    <td>${data.cliente}</td><td>${data.contacto}</td>`;
  fila.onclick = () => seleccionarFila(fila, data);
  tablaAcc.appendChild(fila);

  if (guardar) {
    const accesorios = obtenerDesdeLocalStorage();
    accesorios.push(data);
    localStorage.setItem('accesorios', JSON.stringify(accesorios));
  }
}

function seleccionarFila(fila, data) {
  if (filaSeleccionadaAcc) filaSeleccionadaAcc.classList.remove('table-primary');
  filaSeleccionadaAcc = fila;
  filaSeleccionadaAcc.classList.add('table-primary');
  Object.entries(data).forEach(([k, v]) => {
    const campo = $(k + 'Acc');
    if (campo) campo.value = v;
  });
}

function eliminarAccesorioSeleccionado() {
  if (!filaSeleccionadaAcc) return alert('Selecciona un accesorio');
  if (prompt('Contraseña para eliminar:') !== passwordEliminar) return alert('Contraseña incorrecta');

  const nombre = filaSeleccionadaAcc.children[1].textContent;
  const fecha = filaSeleccionadaAcc.children[0].textContent;

  const datos = obtenerDesdeLocalStorage().filter(d => !(d.nombre === nombre && d.fecha === fecha));
  localStorage.setItem('accesorios', JSON.stringify(datos));
  filaSeleccionadaAcc.remove();
  filaSeleccionadaAcc = null;
  actualizarMetricas();
  alert('Accesorio eliminado');
}

function editarAccesorioSeleccionado() {
  if (!filaSeleccionadaAcc) return alert('Selecciona un accesorio');
  if (prompt('Contraseña para editar:') !== passwordEliminar) return alert('Contraseña incorrecta');

  const nuevo = capturarDatosFormulario();
  const nombre = filaSeleccionadaAcc.children[1].textContent;
  const fecha = filaSeleccionadaAcc.children[0].textContent;

  const datos = obtenerDesdeLocalStorage();
  const index = datos.findIndex(d => d.nombre === nombre && d.fecha === fecha);
  if (index !== -1) datos[index] = nuevo;
  localStorage.setItem('accesorios', JSON.stringify(datos));

  filaSeleccionadaAcc.innerHTML = `
    <td>${nuevo.fecha}</td><td>${nuevo.nombre}</td><td>${nuevo.categoria}</td>
    <td>${nuevo.precio}</td><td>${nuevo.cantidad}</td><td>${nuevo.observaciones}</td>
    <td>${nuevo.cliente}</td><td>${nuevo.contacto}</td>`;
  $('form-accesorios').reset();
  actualizarMetricas();
  filaSeleccionadaAcc = null;
  alert('Accesorio editado');
}

// ========== EXPORTAR ==========
function exportarSeleccionadaComoImagen() {
  if (!filaSeleccionadaAcc) return alert('Selecciona una fila');
  const c = filaSeleccionadaAcc.children;
  const facturaID = 'FBX-' + Date.now().toString().slice(-6);
  const total = parseInt(c[3].textContent) * parseInt(c[4].textContent);

  const contenedor = document.createElement('div');
  contenedor.innerHTML = `
    <div style="width:300px;padding:15px;border:1px solid #000;font-family:monospace;background:#fff">
      <h4 style="text-align:center">FIXBIONIC</h4>
      <hr>
      <strong>Factura #${facturaID}</strong>
      <table style="width:100%;font-size:12px">
        <tr><td>Fecha:</td><td>${c[0].textContent}</td></tr>
        <tr><td>Producto:</td><td>${c[1].textContent}</td></tr>
        <tr><td>Precio:</td><td>$${c[3].textContent}</td></tr>
        <tr><td>Cantidad:</td><td>${c[4].textContent}</td></tr>
        <tr><td>Total:</td><td><b>$${total}</b></td></tr>
        <tr><td>Cliente:</td><td>${c[6].textContent}</td></tr>
      </table>
    </div>`;
  document.body.appendChild(contenedor);

  html2canvas(contenedor.firstElementChild).then(canvas => {
    const link = document.createElement('a');
    link.download = `Factura_${facturaID}.png`;
    link.href = canvas.toDataURL();
    link.click();
    contenedor.remove();
  });
}

function exportarTablaAExcel() {
  const datos = obtenerDesdeLocalStorage();
  if (!datos.length) return alert('No hay datos');
  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Accesorios");
  XLSX.writeFile(libro, "accesorios.xlsx");
}

function exportarBaseDeDatos() {
  const datos = obtenerDesdeLocalStorage();
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'base_accesorios.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ========== COPIAS ==========
function guardarCopiaSeguridad() {
  const datos = obtenerDesdeLocalStorage();
  const copias = JSON.parse(localStorage.getItem('copiasSeguridad')) || [];
  copias.push({ fecha: new Date().toLocaleString(), tipo: 'Accesorios', datos });
  localStorage.setItem('copiasSeguridad', JSON.stringify(copias));
  alert('Copia guardada');
}

// ========== IMPORTAR ==========
function importarBaseDeDatos(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = e => {
    try {
      const datos = JSON.parse(e.target.result);
      if (!Array.isArray(datos)) throw Error();
      localStorage.setItem('accesorios', JSON.stringify(datos));
      tablaAcc.innerHTML = '';
      datos.forEach(d => agregarFilaAccesorios(d, false));
      actualizarMetricas();
      alert('Base importada');
    } catch {
      alert('Error en archivo');
    }
  };
  lector.readAsText(archivo);
}

// ========== MÉTRICAS ==========
function obtenerDesdeLocalStorage() {
  return JSON.parse(localStorage.getItem('accesorios')) || [];
}

function cargarDesdeLocalStorage() {
  obtenerDesdeLocalStorage().forEach(d => agregarFilaAccesorios(d, false));
}

function actualizarMetricas() {
  const datos = obtenerDesdeLocalStorage();
  let totalUnidades = 0;
  let valorTotal = 0;
  const resumen = {};

  datos.forEach(d => {
    const cat = d.categoria;
    const cantidad = parseInt(d.cantidad);
    const precio = parseInt(d.precio);
    resumen[cat] = (resumen[cat] || 0) + cantidad;
    totalUnidades += cantidad;
    valorTotal += cantidad * precio;
  });

  $('total-registros').textContent = datos.length;
  $('total-unidades').textContent = totalUnidades;
  $('valor-total').textContent = valorTotal.toLocaleString();

  const ctx = $('graficoAccesorios')?.getContext('2d');
  if (!ctx) return;
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(resumen),
      datasets: [{
        label: 'Cantidad por Categoría',
        data: Object.values(resumen),
        backgroundColor: 'rgba(40, 167, 69, 0.6)',
        borderColor: 'rgba(40, 167, 69, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } },
        x: { title: { display: true, text: 'Categoría' } }
      }
    }
  });
}
