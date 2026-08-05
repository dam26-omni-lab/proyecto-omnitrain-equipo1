// ============================================================================
// OmniTrain — Autenticación, sesión y navegación
// ----------------------------------------------------------------------------
// Se conserva íntegra la lógica de Firebase (email/contraseña) y se añaden:
//   1. Mensajes de estado con tiempo mínimo de lectura y transición suave.
//   2. Aviso flotante (toast) al cerrar sesión.
//   3. Cabecera de sesión estable entre módulos: se pinta desde una pista
//      guardada en localStorage y, mientras Firebase responde, se muestra un
//      esqueleto que ocupa el mismo espacio (sin saltos de layout).
// ============================================================================

// Importamos las funciones necesarias de los SDKs de Firebase usando los enlaces oficiales (CDN) para navegadores
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDaRcEjfpwYdDya8UcJk_HfSQ9oHBXKtws",
    authDomain: "omnitrain-f6587.firebaseapp.com",
    projectId: "omnitrain-f6587",
    storageBucket: "omnitrain-f6587.firebasestorage.app",
    messagingSenderId: "852786425426",
    appId: "1:852786425426:web:2ef6473176d88f782fb98b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==========================================
// CONSTANTES DE TIEMPO Y ALMACENAMIENTO
// ==========================================
const MIN_STATUS_MS = 900;    // "Validando datos de acceso…" se lee al menos este tiempo
const MIN_SUCCESS_MS = 1300;  // el mensaje de acceso concedido permanece este tiempo
const FADE_MS = 250;          // debe coincidir con la transición de #loginFeedback en styles.css
const TOAST_MS = 2800;        // duración del aviso flotante
const AUTH_TIMEOUT_MS = 4000; // límite del esqueleto si Firebase no responde

const SESSION_HINT_KEY = "omnitrain-session";
const DEFAULT_ROLE = "Brigadista Certificado";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const remaining = (startedAt, minimum) => Math.max(0, minimum - (Date.now() - startedAt));
const byId = (id) => document.getElementById(id);

// ==========================================
// PISTA DE SESIÓN (evita el parpadeo al navegar)
// ==========================================
function readSessionHint() {
    try {
        const raw = localStorage.getItem(SESSION_HINT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null; // almacenamiento no disponible: se espera a Firebase
    }
}

function writeSessionHint(hint) {
    try {
        localStorage.setItem(SESSION_HINT_KEY, JSON.stringify(hint));
    } catch (e) { /* la pista no persiste; la sesión de Firebase sigue intacta */ }
}

function clearSessionHint() {
    try {
        localStorage.removeItem(SESSION_HINT_KEY);
    } catch (e) { /* sin almacenamiento no hay nada que limpiar */ }
}

function init() {
    const loginSection = byId("login-section");
    const dashboardSection = byId("dashboard-section");

    const showLoginButton = byId("showLoginButton");
    const loggedInContainer = byId("loggedInContainer");
    const backToDashboardBtn = byId("backToDashboardBtn");
    const logoutButton = byId("logoutButton");

    const displayName = byId("displayName");
    const displayRole = byId("displayRole");
    const displayAvatar = byId("displayAvatar");

    // ==========================================
    // 1. AVISOS FLOTANTES (TOAST)
    // ==========================================
    function showToast(message, tone) {
        let host = byId("omniToastHost");

        if (!host) {
            host = document.createElement("div");
            host.id = "omniToastHost";
            host.className = "omni-toast-host";
            host.setAttribute("role", "status");
            host.setAttribute("aria-live", "polite");
            document.body.appendChild(host);
        }

        const toast = document.createElement("div");
        toast.className = "omni-toast" + (tone === "danger" ? " toast-danger" : "");

        const icon = document.createElement("i");
        icon.className = tone === "danger" ? "bi bi-exclamation-triangle-fill" : "bi bi-check-circle-fill";
        icon.setAttribute("aria-hidden", "true");

        const text = document.createElement("span");
        text.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        host.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("is-visible"));

        setTimeout(() => {
            toast.classList.remove("is-visible");
            setTimeout(() => toast.remove(), FADE_MS + 100);
        }, TOAST_MS);
    }

    // ==========================================
    // 2. ESQUELETO DE LA CABECERA DE SESIÓN
    // ==========================================
    function buildAuthSkeleton() {
        const profile = document.querySelector(".user-profile");
        if (!profile || profile.querySelector(".auth-skeleton")) return;

        const skeleton = document.createElement("div");
        skeleton.className = "auth-skeleton";
        skeleton.setAttribute("aria-hidden", "true");
        skeleton.innerHTML =
            '<span class="skeleton-block skeleton-avatar"></span>' +
            '<span class="skeleton-block skeleton-pill"></span>';

        profile.appendChild(skeleton);
    }

    function stopAuthSkeleton() {
        document.body.classList.remove("auth-pending");
    }

    // ==========================================
    // 3. PINTADO DE LA CABECERA SEGÚN LA SESIÓN
    // ==========================================
    function renderLoggedIn(session) {
        if (loginSection) {
            loginSection.classList.remove("d-flex");
            loginSection.classList.add("d-none");
        }
        if (dashboardSection) dashboardSection.classList.remove("d-none");

        if (showLoginButton) showLoginButton.classList.add("d-none");
        if (loggedInContainer) {
            loggedInContainer.classList.remove("d-none");
            loggedInContainer.classList.add("d-flex");
        }

        if (displayName) displayName.textContent = session.name;
        if (displayAvatar) displayAvatar.textContent = session.initial;
        if (displayRole) displayRole.textContent = session.role || DEFAULT_ROLE;
    }

    function renderLoggedOut() {
        // Sin sesión se muestra el dashboard por defecto (acceso público)
        if (loginSection) {
            loginSection.classList.remove("d-flex");
            loginSection.classList.add("d-none");
        }
        if (dashboardSection) dashboardSection.classList.remove("d-none");

        if (loggedInContainer) {
            loggedInContainer.classList.remove("d-flex");
            loggedInContainer.classList.add("d-none");
        }
        if (showLoginButton) showLoginButton.classList.remove("d-none");
    }

    function sessionFromUser(user, role) {
        const name = user.email.split("@")[0];
        return {
            name: name,
            initial: name.charAt(0).toUpperCase(),
            role: role || (readSessionHint() || {}).role || DEFAULT_ROLE
        };
    }

    // --- Pintado temprano: antes de que Firebase responda ---
    // Si la navegación viene de una sesión activa, la cabecera se dibuja ya
    // con los datos guardados, así el botón "Salir" y el avatar no aparecen
    // de golpe a mitad de la carga.
    const hint = readSessionHint();

    if (hint && hint.name) {
        renderLoggedIn(hint);
    } else {
        document.body.classList.add("auth-pending");
        buildAuthSkeleton();
        setTimeout(stopAuthSkeleton, AUTH_TIMEOUT_MS);
    }

    // ==========================================
    // 4. GESTIÓN DE SESIÓN
    // ==========================================
    let loginFlowActive = false;   // hay un envío del formulario en curso
    let queuedUser = null;         // estado que Firebase notificó durante ese envío
    let hasQueuedUser = false;

    function applyAuthState(user, role) {
        if (user) {
            const session = sessionFromUser(user, role);
            writeSessionHint(session);
            renderLoggedIn(session);
        } else {
            clearSessionHint();
            renderLoggedOut();
        }
    }

    onAuthStateChanged(auth, (user) => {
        stopAuthSkeleton();

        // Durante el login se retiene el cambio de vista para que dé tiempo a
        // leer los mensajes; el estado se aplica al terminar la secuencia.
        if (loginFlowActive) {
            queuedUser = user;
            hasQueuedUser = true;
            return;
        }

        applyAuthState(user);
    });

    // ==========================================
    // 5. NAVEGACIÓN ENTRE DASHBOARD Y LOGIN
    // ==========================================
    if (showLoginButton) {
        showLoginButton.addEventListener("click", () => {
            if (dashboardSection) dashboardSection.classList.add("d-none");
            if (loginSection) {
                loginSection.classList.remove("d-none");
                loginSection.classList.add("d-flex");
            }
        });
    }

    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener("click", () => {
            if (loginSection) {
                loginSection.classList.remove("d-flex");
                loginSection.classList.add("d-none");
            }
            if (dashboardSection) dashboardSection.classList.remove("d-none");
        });
    }

    // ==========================================
    // 6. MENÚ HAMBURGUESA
    // ==========================================
    const menuToggle = byId("menuToggle");
    const sidebar = byId("sidebar");
    const sidebarOverlay = byId("sidebarOverlay");
    const closeSidebarBtn = byId("closeSidebarBtn");

    // Apertura y cierre centralizados en dos funciones únicas, trabajando solo
    // con la clase "active" que ya define styles.css (nada de estilos inline
    // sueltos, que era lo que impedía que el menú cerrara bien).
    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.add("active");
        if (sidebarOverlay) sidebarOverlay.classList.add("active");
        if (menuToggle) menuToggle.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
        if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    }

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            if (sidebar.classList.contains("active")) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    // Botón "X" ubicado dentro del propio menú
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener("click", closeSidebar);
    }

    // Clic en el overlay (fuera del menú) también cierra
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    // Clic en cualquier parte fuera del menú y del botón hamburguesa
    document.addEventListener("click", (event) => {
        if (!sidebar || !sidebar.classList.contains("active")) return;
        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedToggle = menuToggle && menuToggle.contains(event.target);
        if (!clickedInsideSidebar && !clickedToggle) {
            closeSidebar();
        }
    });

    // Tecla Escape
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && sidebar && sidebar.classList.contains("active")) {
            closeSidebar();
        }
    });

    // ==========================================
    // 7. CERRAR SESIÓN
    // ==========================================
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;

            try {
                await signOut(auth);
                clearSessionHint();
                showToast("Sesión cerrada con éxito");
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                showToast("No fue posible cerrar la sesión. Inténtalo de nuevo.", "danger");
            } finally {
                logoutButton.disabled = false;
            }
        });
    }

    // ==========================================
    // 8. INICIO DE SESIÓN (FORMULARIO)
    // ==========================================
    const form = byId("loginForm");
    if (!form) return;

    const feedbackEl = byId("loginFeedback");
    const loginButton = byId("loginButton");

    function setFeedback(message, tone) {
        if (!feedbackEl) return;
        feedbackEl.classList.remove("feedback-info", "feedback-success", "feedback-error");
        feedbackEl.classList.add("feedback-" + tone);
        feedbackEl.textContent = message;
        requestAnimationFrame(() => feedbackEl.classList.add("is-visible"));
    }

    async function hideFeedback() {
        if (!feedbackEl) return;
        feedbackEl.classList.remove("is-visible");
        await wait(FADE_MS);
        feedbackEl.textContent = "";
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        const role = byId("role").value;
        const email = byId("email").value.trim();
        const password = byId("password").value;
        const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

        loginFlowActive = true;
        hasQueuedUser = false;
        queuedUser = null;

        const startedAt = Date.now();
        setFeedback("Validando datos de acceso en Firebase...", "info");
        loginButton.disabled = true;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Usuario autenticado con éxito:", user.email);

            // El mensaje de validación permanece el tiempo mínimo de lectura
            await wait(remaining(startedAt, MIN_STATUS_MS));

            let successMessage;
            if (role === "administrador") {
                successMessage = `Acceso como ${roleCapitalized}. Podrás gestionar toda la plataforma.`;
            } else if (role === "colaborador") {
                successMessage = `Acceso como ${roleCapitalized}. Podrás realizar tus módulos de capacitación asignados.`;
            } else {
                successMessage = `Acceso como ${roleCapitalized}. Ingresando al entorno...`;
            }

            await hideFeedback();
            setFeedback(successMessage, "success");
            await wait(MIN_SUCCESS_MS);

            form.reset();
            form.classList.remove("was-validated");
            await hideFeedback();

            loginFlowActive = false;
            applyAuthState(hasQueuedUser ? queuedUser : user, roleCapitalized);

        } catch (error) {
            console.error("Error de autenticación:", error);

            // También se respeta el tiempo de lectura del mensaje de validación
            await wait(remaining(startedAt, MIN_STATUS_MS));
            await hideFeedback();

            if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
                setFeedback("Correo o contraseña incorrectos. Inténtalo de nuevo.", "error");
            } else {
                setFeedback("No fue posible iniciar sesión. Verifica tu correo, contraseña y perfil.", "error");
            }

            loginFlowActive = false;
            if (hasQueuedUser) applyAuthState(queuedUser);

        } finally {
            loginButton.disabled = false;
        }
    });
}

// El módulo se ejecuta con el DOM ya analizado (los scripts type="module" son
// diferidos), pero se mantiene la comprobación por seguridad.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}