// Importamos las funciones necesarias de los SDKs de Firebase usando los enlaces oficiales (CDN) para navegadores
// Añadimos onAuthStateChanged (para recordar la sesión) y signOut (para cerrar sesión)
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

        document.addEventListener("DOMContentLoaded", () => {
            const loginSection = document.getElementById("login-section");
            const dashboardSection = document.getElementById("dashboard-section");
            
            const showLoginButton = document.getElementById("showLoginButton");
            const loggedInContainer = document.getElementById("loggedInContainer");
            const backToDashboardBtn = document.getElementById("backToDashboardBtn");
            const logoutButton = document.getElementById("logoutButton");

            // ==========================================
            // 1. GESTIÓN DE SESIÓN
            // ==========================================
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // Si está logueado: Oculta login, muestra dashboard
                    if (loginSection) {
                        loginSection.classList.remove("d-flex");
                        loginSection.classList.add("d-none");
                    }
                    if (dashboardSection) {
                        dashboardSection.classList.remove("d-none");
                    }
                    
                    // Modifica la barra superior
                    if(showLoginButton) showLoginButton.classList.add("d-none");
                    if(loggedInContainer) {
                        loggedInContainer.classList.remove("d-none");
                        loggedInContainer.classList.add("d-flex");
                    }

                    // Actualizamos el nombre y el avatar en la interfaz
                    const displayName = document.getElementById("displayName");
                    const displayAvatar = document.getElementById("displayAvatar");
                    const userName = user.email.split('@')[0];
                    
                    if (displayName) displayName.textContent = userName;
                    if (displayAvatar) displayAvatar.textContent = userName.charAt(0).toUpperCase();

                } else {
                    // Si NO hay sesión: Muestra el dashboard por defecto (acceso público)
                    if (loginSection) {
                        loginSection.classList.remove("d-flex");
                        loginSection.classList.add("d-none"); 
                    }
                    if (dashboardSection) {
                        dashboardSection.classList.remove("d-none");
                    }

                    // Muestra solo el botón de Iniciar Sesión en la barra superior
                    if(loggedInContainer) {
                        loggedInContainer.classList.remove("d-flex");
                        loggedInContainer.classList.add("d-none");
                    }
                    if(showLoginButton) showLoginButton.classList.remove("d-none");
                }
            });

            // ==========================================
            // 2. NAVEGACIÓN ENTRE DASHBOARD Y LOGIN
            // ==========================================
            if (showLoginButton) {
                showLoginButton.addEventListener("click", () => {
                    dashboardSection.classList.add("d-none");
                    loginSection.classList.remove("d-none");
                    loginSection.classList.add("d-flex");
                });
            }

            if (backToDashboardBtn) {
                backToDashboardBtn.addEventListener("click", () => {
                    loginSection.classList.remove("d-flex");
                    loginSection.classList.add("d-none");
                    dashboardSection.classList.remove("d-none");
                });
            }

            // ==========================================
            // 3. MENÚ HAMBURGUESA
            // ==========================================
            const menuToggle = document.getElementById("menuToggle");
            const sidebar = document.getElementById("sidebar");
            const sidebarOverlay = document.getElementById("sidebarOverlay");

            if (menuToggle && sidebar) {
                menuToggle.addEventListener("click", () => {
                    sidebar.classList.add("active");
                    sidebar.style.transform = "translateX(0)";
                    sidebar.style.left = "0"; 
                    if (sidebarOverlay) sidebarOverlay.style.display = "block";
                });
            }

            if (sidebarOverlay && sidebar) {
                sidebarOverlay.addEventListener("click", () => {
                    sidebar.classList.remove("active");
                    sidebar.style.transform = ""; 
                    sidebar.style.left = "";
                    sidebarOverlay.style.display = "none";
                });
            }

            // ==========================================
            // 4. LÓGICA PARA CERRAR SESIÓN
            // ==========================================
            if (logoutButton) {
                logoutButton.addEventListener("click", () => {
                    signOut(auth).then(() => {
                        console.log("Sesión finalizada exitosamente.");
                    }).catch((error) => {
                        console.error("Error al cerrar sesión:", error);
                    });
                });
            }

            // ==========================================
            // 5. LÓGICA DE INICIO DE SESIÓN (FORMULARIO)
            // ==========================================
            const form = document.getElementById("loginForm");
            if (!form) return;

            const feedbackEl = document.getElementById("loginFeedback");
            const loginButton = document.getElementById("loginButton");

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!form.checkValidity()) {
                    form.classList.add("was-validated");
                    return;
                }

                const role = document.getElementById("role").value;
                const email = document.getElementById("email").value.trim();
                const password = document.getElementById("password").value;

                feedbackEl.style.color = "#d32f2f";
                feedbackEl.textContent = "Validando datos de acceso en Firebase...";
                loginButton.disabled = true;

                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    console.log("Usuario autenticado con éxito:", user.email);

                    feedbackEl.style.color = "green";
                    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

                    if (role === "administrador") {
                        feedbackEl.textContent = `Acceso como ${roleCapitalized}. Podrás gestionar toda la plataforma.`;
                    } else if (role === "colaborador") {
                        feedbackEl.textContent = `Acceso como ${roleCapitalized}. Podrás realizar tus módulos de capacitación asignados.`;
                    } else {
                        feedbackEl.textContent = `Acceso como ${roleCapitalized}. Ingresando al entorno...`;
                    }

                    setTimeout(() => {
                        const displayRole = document.getElementById("displayRole");
                        if(displayRole) displayRole.textContent = roleCapitalized;
                        
                        form.reset();
                        form.classList.remove("was-validated");
                        feedbackEl.textContent = "";
                    }, 1000);

                } catch (error) {
                    console.error("Error de autenticación:", error);
                    feedbackEl.style.color = "#d32f2f";
                    
                    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                        feedbackEl.textContent = "Correo o contraseña incorrectos. Inténtalo de nuevo.";
                    } else {
                        feedbackEl.textContent = "No fue posible iniciar sesión. Verifica tu correo, contraseña y perfil.";
                    }
                } finally {
                    loginButton.disabled = false;
                }
            });
        });