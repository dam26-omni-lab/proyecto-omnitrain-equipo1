/* ============================================================
   OmniTrain · Respaldo de navegación
   ------------------------------------------------------------
   El menú hamburguesa y el cambio a la pantalla de acceso los
   controla js/login.js, que se carga como módulo ES
   (<script type="module">). Los navegadores BLOQUEAN los módulos
   cuando la página se abre con doble clic (file://), así que en
   ese caso login.js nunca llega a ejecutarse y la interfaz queda
   sin menú y sin botón de acceso.

   Este archivo NO modifica ni sustituye a login.js: solo
   comprueba si alcanzó a ejecutarse y, únicamente si no fue así,
   reconecta la navegación mínima para que el sitio siga siendo
   recorrible. Cuando login.js funciona con normalidad, este
   respaldo no hace absolutamente nada (no se enlaza a nada, así
   que no hay riesgo de que un clic se procese dos veces).
   ============================================================ */
(function (global) {
  'use strict';

  /* --------------------------------------------------------
     ¿Alcanzó a ejecutarse login.js?
     Deja dos huellas al arrancar, antes de que responda Firebase:
       · Sin sesión previa: crea el esqueleto ".auth-skeleton".
       · Con sesión previa: quita "d-none" de #loggedInContainer.
     Los módulos se ejecutan antes de DOMContentLoaded, así que en
     ese momento la huella ya tiene que estar.
     -------------------------------------------------------- */
  function loginEjecutado() {
    if (global.__omniLoginFallo === true) return false;
    if (document.querySelector('.auth-skeleton')) return true;

    var contenedor = document.getElementById('loggedInContainer');
    if (contenedor && !contenedor.classList.contains('d-none')) return true;

    return false;
  }

  function activarRespaldo() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    var menuToggle = document.getElementById('menuToggle');
    var loginSection = document.getElementById('login-section');
    var dashboardSection = document.getElementById('dashboard-section');
    var showLoginButton = document.getElementById('showLoginButton');
    var backToDashboardBtn = document.getElementById('backToDashboardBtn');

    /* ---- Menú lateral ---- */
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', function () {
        var abierto = sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active', abierto);
        menuToggle.setAttribute('aria-expanded', String(abierto));
      });
    }

    /* ---- Ir a la pantalla de acceso ---- */
    if (showLoginButton && loginSection) {
      showLoginButton.addEventListener('click', function () {
        if (dashboardSection) dashboardSection.classList.add('d-none');
        loginSection.classList.remove('d-none');
        loginSection.classList.add('d-flex');
        avisarModulos();
      });
    }

    if (backToDashboardBtn && loginSection) {
      backToDashboardBtn.addEventListener('click', function () {
        loginSection.classList.remove('d-flex');
        loginSection.classList.add('d-none');
        if (dashboardSection) dashboardSection.classList.remove('d-none');
      });
    }

    console.warn(
      'OmniTrain: login.js no se ejecutó. Los navegadores bloquean los módulos ' +
      'ES cuando la página se abre con file://. Sirve el proyecto por http:// ' +
      '(por ejemplo con la extensión Live Server de VS Code) para que el inicio ' +
      'de sesión con Firebase funcione.'
    );
  }

  /* Explica en el propio formulario por qué no podrá autenticar */
  function avisarModulos() {
    var feedback = document.getElementById('loginFeedback');
    if (!feedback || feedback.dataset.respaldo === '1') return;

    feedback.dataset.respaldo = '1';
    feedback.className = 'text-center mt-3 fw-bold feedback-error is-visible';
    feedback.textContent =
      'La validación con Firebase necesita que el proyecto se abra por http:// ' +
      'y no como archivo local (file://).';
  }

  function revisar() {
    if (!loginEjecutado()) activarRespaldo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revisar);
  } else {
    revisar();
  }
})(window);
