// === ESTADO GLOBAL ===
const state = {
  patronActual: [],
  set(prop, val) { this[prop] = val; }
};

const passwordEliminar = 'error';
let filaSeleccionada = null;
let grafico = null;

// === UTILIDADES ===
const $ = id => document.getElementById(id);
const qsa = sel => document.querySelectorAll(sel);
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

// === INICIALIZACIÓN ===
window.onload = () => {
  cargarDesdeLocalStorage();
  actualizarMetricas();
  manejarPatron();
  mostrarCampoContrasena();

  $('tipo-contrasena').addEventListener('change', mostrarCampoContrasena);
  $('btn-eliminar').addEventListener('click', eliminarSeleccionada);
  $('btn-editar').addEventListener('click', editarSeleccionada);
  $('buscarInput').addEventListener('input', e => buscarReparacion(e.target.value));
  $('btn-descargar-imagen').addEventListener('click', () => exportarSeleccionadaComoImagen());
  $('btn-imprimir').addEventListener('click', () => exportarSeleccionadaComoImagen('pos'));

  $('formulario').addEventListener('submit', e => {
    e.preventDefault();
    const tipo = $('tipo-contrasena').value;
    const patron = $('patron-input').value;
    const pin = $('contrasena').value;

    if (tipo === 'patron' && !patron.trim()) return $('errorPatron').style.display = 'block';

    const nuevaReparacion = {
      fecha: $('fecha').value,
      cliente: $('cliente').value,
      telefono: $('telefono').value,
      modelo: $('modelo').value,
      reparacion: $('reparacion').value,
      tecnico: $('tecnico').value,
      notas: $('notas').value,
      precio: $('precio').value,
      iva: $('iva').value,
      controlID: $('controlID').value,
      estado: $('estado').value,
      contrasena: tipo === 'pin' ? pin : patron
    };

    agregarFila(nuevaReparacion, true);
    $('formulario').reset();
    mostrarCampoContrasena();
    actualizarMetricas();
  });

  $('btn-export-json').addEventListener('click', () => {
    const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reparaciones_${new Date().toLocaleDateString('es-CO')}.json`;
    a.click();
    guardarBackup('Reparaciones', datos);
  });

  $('btn-agregar-backup').addEventListener('click', () => {
    const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
    guardarBackup('Reparaciones', datos);
    alert('Copia de seguridad guardada correctamente');
  });

  $('importarBD').addEventListener('change', function () {
    const archivo = this.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function (e) {
      try {
        const datosImportados = JSON.parse(e.target.result);
        if (!Array.isArray(datosImportados)) throw new Error("Formato incorrecto");

        localStorage.setItem('reparaciones', JSON.stringify(datosImportados));
        $('tabla-reparaciones').innerHTML = '';
        datosImportados.forEach(d => agregarFila(d, false));
        actualizarMetricas();
        alert("Datos importados correctamente.");
      } catch {
        alert("Error al importar: El archivo no es válido.");
      }
    };
    lector.readAsText(archivo);
  });

  const btnExport = $('btn-export-excel');
  const tabla = document.querySelector('table');
  if (btnExport && tabla) {
    btnExport.addEventListener('click', () => {
      const soloUna = confirm('¿Exportar solo la fila seleccionada?\nAceptar: Solo una fila\nCancelar: Toda la tabla');
      soloUna && filaSeleccionada ? exportarFilaSeleccionadaExcel() : exportarTablaCompletaExcel();
    });
  }
};

// === PATRÓN / PIN ===
function mostrarCampoContrasena() {
  const tipo = $('tipo-contrasena').value;
  $('contrasena').style.display = tipo === 'pin' ? 'block' : 'none';
  $('patron-container').style.display = tipo === 'patron' ? 'block' : 'none';
  $('errorPatron').style.display = 'none';
  state.set('patronActual', []);
  qsa('.patron-btn').forEach(b => b.classList.remove('active'));
  $('patron-input').value = '';
}

function manejarPatron() {
  qsa('.patron-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.num;
      if (!state.patronActual.includes(val)) {
        state.patronActual.push(val);
        btn.classList.add('active');
        $('patron-input').value = state.patronActual.join('-');
      }
    });
  });
}

// === CRUD LOCALSTORAGE ===
function cargarDesdeLocalStorage() {
  const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
  datos.forEach(d => agregarFila(d, false));
}

function agregarFila(data, guardar = true) {
  const fila = document.createElement('tr');
  fila.innerHTML = `
    <td>${data.fecha}</td><td>${data.cliente}</td><td>${data.telefono}</td>
    <td>${data.modelo}</td><td>${data.reparacion}</td><td>${data.tecnico}</td>
    <td>${data.notas}</td><td>${data.precio}</td><td>${data.iva}</td>
    <td>${data.controlID}</td>
    <td class="${data.estado === 'entregado' ? 'table-success' : data.estado === 'pendiente' ? 'table-warning' : 'table-light'}">
      ${capitalize(data.estado)}
    </td>
    <td>${data.contrasena || ''}</td>`;
  fila.onclick = () => seleccionarFila(fila, data);
  $('tabla-reparaciones').appendChild(fila);

  if (guardar) {
    const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
    datos.push(data);
    localStorage.setItem('reparaciones', JSON.stringify(datos));
  }
}

function seleccionarFila(fila, data) {
  if (filaSeleccionada) filaSeleccionada.classList.remove('table-info');
  filaSeleccionada = fila;
  filaSeleccionada.classList.add('table-info');

  for (const key in data) if ($(key)) $(key).value = data[key];

  const tipo = data.contrasena?.includes('-') ? 'patron' : 'pin';
  $('tipo-contrasena').value = tipo;
  mostrarCampoContrasena();

  if (tipo === 'patron') {
    const patron = data.contrasena.split('-');
    state.set('patronActual', patron);
    $('patron-input').value = data.contrasena;
    qsa('.patron-btn').forEach(btn => {
      btn.classList.toggle('active', patron.includes(btn.dataset.num));
    });
  } else {
    $('contrasena').value = data.contrasena;
  }
}

function eliminarSeleccionada() {
  if (!filaSeleccionada) return alert('Selecciona una fila');
  if (prompt('Contraseña para eliminar:') !== passwordEliminar) return alert('Contraseña incorrecta');

  const id = filaSeleccionada.children[9].textContent;
  filaSeleccionada.remove();
  filaSeleccionada = null;

  let datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
  datos = datos.filter(d => d.controlID !== id);
  localStorage.setItem('reparaciones', JSON.stringify(datos));

  alert('Reparación eliminada');
  actualizarMetricas();
}

function editarSeleccionada() {
  if (!filaSeleccionada) return alert('Selecciona una fila');
  if (prompt('Contraseña para editar:') !== passwordEliminar) return alert('Contraseña incorrecta');

  const tipo = $('tipo-contrasena').value;
  const reparacionEditada = {
    fecha: $('fecha').value,
    cliente: $('cliente').value,
    telefono: $('telefono').value,
    modelo: $('modelo').value,
    reparacion: $('reparacion').value,
    tecnico: $('tecnico').value,
    notas: $('notas').value,
    precio: $('precio').value,
    iva: $('iva').value,
    controlID: $('controlID').value,
    estado: $('estado').value,
    contrasena: tipo === 'pin' ? $('contrasena').value : $('patron-input').value
  };

  const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
  const idx = datos.findIndex(d => d.controlID === filaSeleccionada.children[9].textContent);
  if (idx !== -1) datos[idx] = reparacionEditada;
  localStorage.setItem('reparaciones', JSON.stringify(datos));

  filaSeleccionada.remove();
  agregarFila(reparacionEditada, false);
  alert('Reparación actualizada');
  $('formulario').reset();
  mostrarCampoContrasena();
  filaSeleccionada = null;
  actualizarMetricas();
}

// === MÉTRICAS ===
function actualizarMetricas() {
  const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
  const total = datos.length;
  const pendientes = datos.filter(d => d.estado === 'pendiente').length;
  const entregadas = datos.filter(d => d.estado === 'entregado').length;

  $('total-reparaciones').textContent = total;
  $('total-pendientes').textContent = pendientes;
  $('total-entregadas').textContent = entregadas;

  const ctx = $('graficoReparaciones')?.getContext('2d');
  if (!ctx) return;
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pendientes', 'Entregadas', 'Otros'],
      datasets: [{
        data: [pendientes, entregadas, total - pendientes - entregadas],
        backgroundColor: ['#ffc107', '#28a745', '#6c757d'],
        borderColor: ['#fff'], borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// === BUSCADOR ===
function buscarReparacion(valor) {
  const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
  $('tabla-reparaciones').innerHTML = '';
  datos.forEach(d => {
    if (
      d.cliente.toLowerCase().includes(valor.toLowerCase()) ||
      d.modelo.toLowerCase().includes(valor.toLowerCase()) ||
      d.controlID.includes(valor)
    ) agregarFila(d, false);
  });
}

// === EXPORTACIÓN COMPLETA A EXCEL ===
function exportarTablaCompletaExcel() {
  const tabla = document.querySelector('table');
  if (!tabla) return alert('Tabla no encontrada');

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(tabla);
  XLSX.utils.book_append_sheet(wb, ws, 'Reparaciones');
  XLSX.writeFile(wb, 'reparaciones_completas.xlsx');
}

// === EXPORTACIÓN DE UNA FILA SELECCIONADA A EXCEL ===
function exportarFilaSeleccionadaExcel() {
  if (!filaSeleccionada) return alert('Selecciona una fila primero');

  const encabezados = Array.from(document.querySelectorAll('thead th')).map(th => th.textContent.trim());
  const datosFila = Array.from(filaSeleccionada.children).map(td => td.textContent.trim());

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([encabezados, datosFila]);
  XLSX.utils.book_append_sheet(wb, ws, 'Reparación');
  XLSX.writeFile(wb, 'reparacion_individual.xlsx');
}

// === GUARDAR JSON DE REPARACIONES ===
document.getElementById("btn-guardar-json").addEventListener("click", () => {
  const datos = localStorage.getItem("reparaciones") || "[]";
  const blob = new Blob([datos], { type: "application/json" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "reparaciones.json";
  enlace.click();
});

// === AGREGAR BACKUP EN LOCALSTORAGE ===
document.getElementById("btn-agregar-backup").addEventListener("click", () => {
  const datos = JSON.parse(localStorage.getItem("reparaciones") || "[]");
  const copias = JSON.parse(localStorage.getItem("copiasSeguridad") || "[]");

  const nuevaCopia = {
    fecha: new Date().toLocaleString("es-CO"),
    tipo: "reparaciones",
    datos
  };

  copias.push(nuevaCopia);
  localStorage.setItem("copiasSeguridad", JSON.stringify(copias));
  alert("✅ Copia de seguridad guardada correctamente.");
});


// === EXPORTAR FACTURA POS DESDE FILA SELECCIONADA ===
function exportarSeleccionadaComoImagen(tipo = null) {
  if (!filaSeleccionada) return alert('Selecciona una fila');

  const cel = filaSeleccionada.children;
  const facturaID = 'FBX-' + Date.now().toString().slice(-6);
  const fecha = new Date().toLocaleDateString('es-CO');

  const contenido = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Factura</title>
  <style>
    body {
      font-family: monospace;
      font-size: 11px;
      margin: 0;
      padding: 0;
      background: #fff;
    }

    .factura {
      max-width: 280px;
      padding: 10px;
      margin: 10px auto;
      border: 1px solid #000;
      box-sizing: border-box;
    }

    .center {
      text-align: center;
    }

    .logo {
      display: block;
      margin: 0 auto 10px auto;
      max-width: 100px;
      height: auto;
    }

    .linea {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }

    .campo {
      margin-bottom: 4px;
    }

    @media print {
      @page {
        size: 70mm auto;
        margin: 0;
      }

      body {
        margin: 0;
      }

      .factura {
        border: none;
        padding: 8px;
      }

      .logo {
        max-width: 130px;
        height: auto;
        margin-bottom: 10px;
      }

      .campo {
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body onload="window.print(); window.close();">
  <div class="factura">
    <div class="center">
      <img src="../../data/img/a1.png" alt="Logo Fixbionic" class="logo" />
    </div>

    <div class="center">
      <strong>Fix_Bionic</strong><br />
      NIT: 1022421675-9<br />
      ESTABLECIMIENTO: FIX_Bionic<br />
      Cra 50 No. 51 - 29<br />
      CC Arquicentro<br />
      Itagüí, Antioquia, Colombia<br />
      Tel: (+57) 301 5920400<br />
      Registrado en el Régimen Simple de Tributación<br />
      No Responsable de IVA<br />
      Actividad Económica: 9511 - Mantenimiento y reparación de aparatos electrónicos de consumo
    </div>

    <div class="linea"></div>
    <div class="center"><strong>Factura Electrónica de Venta</strong></div>
    <div class="campo">Número: FE ${facturaID}</div>
    <div class="campo">Fecha: ${fecha}</div>
    <div class="campo">Forma de Pago: Contado</div>
    <div class="campo">Medio de Pago: Acuerdo mutuo</div>

    <div class="campo">Vendido por: ${cel[6].textContent}</div>
    <div class="campo">Cliente: ${cel[1].textContent}</div>
    <div class="campo">Teléfono: ${cel[2].textContent}</div>
    <div class="campo">Modelo: ${cel[3].textContent}</div>
    <div class="campo">Reparación: ${cel[4].textContent}</div>
    <div class="campo">Notas: ${cel[5].textContent}</div>

    <div class="linea"></div>
    <strong>Detalle:</strong><br />
    1 UND ${cel[4].textContent}<br />
    Precio Unitario: $${parseFloat(cel[7].textContent).toLocaleString()}<br />
    Valor Total: $${parseFloat(cel[7].textContent).toLocaleString()}<br />

    <div class="linea"></div>
    <strong>Total a Pagar:</strong> $${parseFloat(cel[7].textContent).toLocaleString()}<br />
    Cambio: $0.00<br />
    Total Descuentos: $0.00<br />

    <div class="linea"></div>
    <strong>Discriminación Tarifas de IVA:</strong><br />
    Base: $${parseFloat(cel[8].textContent).toLocaleString()}<br />
    IVA: $${(parseFloat(cel[7].textContent) - parseFloat(cel[8].textContent)).toLocaleString()}<br />

    <div class="campo">Control ID: ${cel[9].textContent}</div>
    <div class="campo">Estado: ${cel[10].textContent}</div>
    <div class="campo">Contraseña: ${cel[11].textContent}</div>

    <div class="linea"></div>
    Autorización Numeración de Facturación<br />
    Resolución 187648078910412<br />
    Desde: 03/02/2025 - Hasta: 03/02/2027<br />
    Prefijo: FE - Desde N° 1 hasta N° 200

    <div class="linea"></div>
    <div class="center">**** Gracias por su compra ****</div>
    <div class="center">
      Impresa por Factura Ya - Software de Facturación<br />
      NIT: 901361537-1 - Proveedor Tecnológico Factura Ya
    </div>
  </div>
</body>
</html>
`;

  const ventana = window.open('', '', 'width=380,height=700');
  ventana.document.open();
  ventana.document.write(contenido);
  ventana.document.close();
}

