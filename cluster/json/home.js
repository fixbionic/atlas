/**
 * Script principal para el sistema de gestión de reparaciones Fixbionic
 * 
 * Funcionalidades:
 * - Autenticación de usuarios
 * - Gestión de reparaciones (CRUD)
 * - Almacenamiento local con localStorage
 * - Generación de métricas y gráficos
 */

document.addEventListener('DOMContentLoaded', function() {
  // =================== CONSTANTES Y VARIABLES GLOBALES ===================
  const FORMULARIO = document.getElementById('formulario');
  const TABLA = document.getElementById('tabla-reparaciones');
  const LOGIN_FORM = document.getElementById('login-form');
  const PASSWORD_ELIMINAR = 'error'; // Contraseña para eliminar registros
  const CONFIG_JSON = {
    usuario: "admin",
    contraseña: "fixbionic2025"
  };
  
  let filaSeleccionada = null;
  let grafico = null;

  // =================== FUNCIONES DE AUTENTICACIÓN ===================
  if (LOGIN_FORM) {
    LOGIN_FORM.addEventListener('submit', function(e) {
      e.preventDefault();
      const passwordInput = document.getElementById('password');
      const errorMsg = document.getElementById('error-msg');
      const loginBox = document.getElementById('login-box');
      const panel = document.getElementById('panel');

      if (passwordInput.value === CONFIG_JSON.contraseña) {
        // Autenticación exitosa
        loginBox.style.display = 'none';
        panel.style.display = 'block';
      } else {
        // Error de autenticación
        errorMsg.style.display = 'block';
        loginBox.classList.add('shake');
        setTimeout(() => loginBox.classList.remove('shake'), 300);
      }
    });
  }

  // =================== FUNCIONES DE GESTIÓN DE REPARACIONES ===================
  
  /**
   * Carga inicial de datos desde localStorage
   */
  function cargarDatosIniciales() {
    const datosGuardados = JSON.parse(localStorage.getItem('reparaciones')) || [];
    datosGuardados.forEach(dato => agregarFila(dato, false));
    actualizarMetricas();
  }

  /**
   * Agrega una nueva fila a la tabla de reparaciones
   * @param {Object} data - Datos de la reparación
   * @param {Boolean} guardar - Indica si se debe guardar en localStorage
   */
  function agregarFila(data, guardar) {
    if (!TABLA) return;

    const fila = document.createElement('tr');
    const claseEstado = obtenerClaseEstado(data.estado);

    fila.innerHTML = `
      <td>${data.fecha}</td>
      <td>${data.cliente}</td>
      <td>${data.modelo}</td>
      <td>${data.reparacion}</td>
      <td>${data.tecnico}</td>
      <td>${data.notas}</td>
      <td>${data.controlID}</td>
      <td class="${claseEstado}">${capitalizarPrimeraLetra(data.estado)}</td>
    `;

    fila.addEventListener('click', manejarSeleccionFila.bind(null, fila));
    TABLA.appendChild(fila);

    if (guardar) {
      guardarReparacion(data);
    }
  }

  /**
   * Maneja la selección de una fila en la tabla
   * @param {HTMLElement} fila - Fila seleccionada
   */
  function manejarSeleccionFila(fila) {
    if (filaSeleccionada) {
      filaSeleccionada.classList.remove('seleccionada');
    }
    filaSeleccionada = fila;
    filaSeleccionada.classList.add('seleccionada');
  }

  /**
   * Guarda una reparación en localStorage
   * @param {Object} data - Datos de la reparación
   */
  function guardarReparacion(data) {
    const datosGuardados = JSON.parse(localStorage.getItem('reparaciones')) || [];
    datosGuardados.push(data);
    localStorage.setItem('reparaciones', JSON.stringify(datosGuardados));
  }

  /**
   * Elimina la fila seleccionada
   */
  window.eliminarSeleccionada = function() {
    if (!filaSeleccionada) {
      mostrarAlerta('Selecciona una fila para eliminar.');
      return;
    }

    const confirmPass = prompt('Ingresa la contraseña para eliminar:');
    if (confirmPass !== PASSWORD_ELIMINAR) {
      mostrarAlerta('Contraseña incorrecta.');
      return;
    }

    const controlID = filaSeleccionada.children[6].textContent;
    filaSeleccionada.remove();
    filaSeleccionada = null;

    eliminarReparacion(controlID);
    mostrarAlerta('Reparación eliminada con éxito.');
    actualizarMetricas();
  };

  /**
   * Elimina una reparación de localStorage
   * @param {String} controlID - ID de control de la reparación
   */
  function eliminarReparacion(controlID) {
    let datosGuardados = JSON.parse(localStorage.getItem('reparaciones')) || [];
    datosGuardados = datosGuardados.filter(d => d.controlID !== controlID);
    localStorage.setItem('reparaciones', JSON.stringify(datosGuardados));
  }

  // =================== FUNCIONES DE MÉTRICAS Y GRÁFICOS ===================
  
  /**
   * Actualiza las métricas y el gráfico de reparaciones
   */
  function actualizarMetricas() {
    const datos = JSON.parse(localStorage.getItem('reparaciones')) || [];
    const { total, pendientes, entregadas } = calcularEstadisticas(datos);

    actualizarContadores(total, pendientes, entregadas);
    actualizarGrafico(total, pendientes, entregadas);
  }

  /**
   * Calcula las estadísticas de las reparaciones
   * @param {Array} datos - Lista de reparaciones
   * @returns {Object} Estadísticas calculadas
   */
  function calcularEstadisticas(datos) {
    const total = datos.length;
    const pendientes = datos.filter(d => d.estado === 'pendiente').length;
    const entregadas = datos.filter(d => d.estado === 'entregado').length;

    return { total, pendientes, entregadas };
  }

  /**
   * Actualiza los contadores en la interfaz
   * @param {Number} total - Total de reparaciones
   * @param {Number} pendientes - Reparaciones pendientes
   * @param {Number} entregadas - Reparaciones entregadas
   */
  function actualizarContadores(total, pendientes, entregadas) {
    const totalEl = document.getElementById('total-reparaciones');
    const pendientesEl = document.getElementById('total-pendientes');
    const entregadasEl = document.getElementById('total-entregadas');

    if (totalEl) totalEl.textContent = total;
    if (pendientesEl) pendientesEl.textContent = pendientes;
    if (entregadasEl) entregadasEl.textContent = entregadas;
  }

  /**
   * Actualiza el gráfico de dona con las estadísticas
   * @param {Number} total - Total de reparaciones
   * @param {Number} pendientes - Reparaciones pendientes
   * @param {Number} entregadas - Reparaciones entregadas
   */
  function actualizarGrafico(total, pendientes, entregadas) {
    const ctx = document.getElementById('graficoReparaciones')?.getContext('2d');
    if (!ctx) return;

    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pendientes', 'Entregadas', 'No se ha hecho nada'],
        datasets: [{
          label: 'Reparaciones',
          data: [pendientes, entregadas, total - pendientes - entregadas],
          backgroundColor: ['#ffc107', '#28a745', '#6c757d'],
          borderColor: ['#fff'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  // =================== FUNCIONES UTILITARIAS ===================
  
  /**
   * Devuelve la clase CSS según el estado de la reparación
   * @param {String} estado - Estado de la reparación
   * @returns {String} Clase CSS correspondiente
   */
  function obtenerClaseEstado(estado) {
    return estado === 'entregado' ? 'estado-entregado' :
           estado === 'pendiente' ? 'estado-pendiente' : 'estado-nulo';
  }

  /**
   * Capitaliza la primera letra de un string
   * @param {String} str - String a capitalizar
   * @returns {String} String capitalizado
   */
  function capitalizarPrimeraLetra(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Muestra una alerta al usuario
   * @param {String} mensaje - Mensaje a mostrar
   */
  function mostrarAlerta(mensaje) {
    alert(mensaje);
  }

  // =================== MANEJADORES DE EVENTOS ===================
  if (FORMULARIO && TABLA) {
    FORMULARIO.addEventListener('submit', function(e) {
      e.preventDefault();

      const nuevaReparacion = {
        fecha: document.getElementById('fecha').value,
        cliente: document.getElementById('cliente').value,
        modelo: document.getElementById('modelo').value,
        reparacion: document.getElementById('reparacion').value,
        tecnico: document.getElementById('tecnico').value,
        notas: document.getElementById('notas').value,
        controlID: document.getElementById('controlID').value,
        estado: document.getElementById('estado').value
      };

      agregarFila(nuevaReparacion, true);
      FORMULARIO.reset();
      actualizarMetricas();
    });
  }

  // =================== INICIALIZACIÓN ===================
  cargarDatosIniciales();
});

// =================== SISTEMA DE LOGIN MEJORADO ===================
document.addEventListener('DOMContentLoaded', function() {
  // Elementos del DOM
  const loginForm = document.getElementById('login-form');
  const loginSection = document.getElementById('login-section');
  const panelSection = document.getElementById('panel-section');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const loginText = document.getElementById('login-text');
  const loginLoader = document.getElementById('login-loader');
  const logoutBtn = document.getElementById('logout-btn');
  
  // Credenciales válidas (en producción usar autenticación segura)
  const CREDENCIALES = {
    usuario: "admin",
    contraseña: "Fixbionic2025"
  };
  
  // Mostrar/ocultar contraseña
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.querySelector('i').classList.toggle('bi-eye-fill');
      this.querySelector('i').classList.toggle('bi-eye-slash-fill');
    });
  }
  
  // Validación del formulario de login
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Mostrar loader
      if (loginText && loginLoader) {
        loginText.classList.add('d-none');
        loginLoader.classList.remove('d-none');
      }
      
      // Validar campos
      const username = document.getElementById('username')?.value;
      const password = document.getElementById('password')?.value;
      
      // Simular validación con delay
      setTimeout(() => {
        if (username === CREDENCIALES.usuario && password === CREDENCIALES.contraseña) {
          // Login exitoso
          manejarLoginExitoso();
        } else {
          // Error de login
          manejarErrorLogin();
        }
      }, 1500);
    });
  }
  
  // Cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      // Ocultar panel y mostrar login
      panelSection.classList.add('animate__fadeOut');
      
      setTimeout(() => {
        panelSection.classList.add('d-none');
        loginSection.classList.remove('d-none');
        loginSection.classList.add('animate__fadeIn');
        
        // Resetear formulario
        if (loginForm) {
          loginForm.reset();
          loginForm.classList.remove('was-validated');
        }
        if (loginError) loginError.classList.add('d-none');
      }, 500);
    });
  }
  
  // Validación en tiempo real
  if (loginForm) {
    loginForm.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', function() {
        if (this.checkValidity()) {
          this.classList.remove('is-invalid');
        } else {
          this.classList.add('is-invalid');
        }
      });
    });
  }
  
  /**
   * Maneja el login exitoso
   */
  function manejarLoginExitoso() {
    if (loginForm && loginError) {
      loginForm.classList.remove('was-validated');
      loginError.classList.add('d-none');
    }
    
    // Ocultar login y mostrar panel
    if (loginSection && panelSection) {
      loginSection.classList.add('animate__fadeOut');
      
      setTimeout(() => {
        loginSection.classList.add('d-none');
        panelSection.classList.remove('d-none');
        panelSection.classList.add('animate__fadeIn');
        
        // Restaurar botón de login
        if (loginText && loginLoader) {
          loginText.classList.remove('d-none');
          loginLoader.classList.add('d-none');
        }
      }, 500);
    }
  }
  
  /**
   * Maneja el error de login
   */
  function manejarErrorLogin() {
    if (loginError) {
      loginError.classList.remove('d-none');
      loginError.classList.add('animate__shakeX');
    }
    
    // Restaurar botón de login
    if (loginText && loginLoader) {
      loginText.classList.remove('d-none');
      loginLoader.classList.add('d-none');
    }
    
    // Marcar campos como inválidos
    if (loginForm) {
      loginForm.classList.add('was-validated');
    }
    
    // Quitar animación de error después de que termine
    setTimeout(() => {
      if (loginError) loginError.classList.remove('animate__shakeX');
    }, 1000);
  }
});

// Bootstrap Bundle (incluye Popper)
document.addEventListener('DOMContentLoaded', function() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});