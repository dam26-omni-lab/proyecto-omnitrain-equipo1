# Manual de Pruebas de Acceso: OmniTrain Dashboard

Este documento detalla los pasos para validar la nueva lógica de acceso al sistema **OmniTrain**, donde el **Dashboard** es público por defecto y el inicio de sesión es opcional para personalizar la experiencia.

---

## 1. Visualización del Dashboard Público

1. Abre la página del index.html en tu navegador web: https://dam26-omni-lab.github.io/proyecto-omnitrain-equipo1/

### ✅ Validación

- Al cargar la página, debes ver inmediatamente el **Dashboard principal** con sus métricas y gráficas.
- En la esquina superior derecha de la pantalla debe aparecer un botón rojo con el texto:

> **Iniciar Sesión**

---

## 2. Acceso al Formulario de Inicio de Sesión

1. Haz clic en el botón **Iniciar Sesión** ubicado en la barra superior.

### ✅ Validación

- El Dashboard desaparecerá y serás redirigido a la pantalla del formulario de acceso.

> **Opcional:** Puedes probar el botón **Volver al Dashboard** ubicado en la esquina superior izquierda para comprobar que es posible regresar sin iniciar sesión.

---

## 3. Cuentas de Prueba Disponibles

Para validar los diferentes roles del sistema, utiliza las siguientes credenciales en el formulario de acceso.

> **Importante:** Antes de ingresar las credenciales, asegúrate de seleccionar el rol correcto en el menú desplegable.

| Rol | Correo Electrónico | Contraseña |
|------|--------------------|------------|
| Administrador | `admin@omnitrain.com` | `123poradmin` |
| Colaborador | `colaborador@omnitrain.com` | `123porcolaborador` |
| Usuario | `usuario@omnitrain.com` | `123porusuario` |

---

## 4. Proceso de Validación de Ingreso

### Pasos

1. En el formulario, selecciona el **Tipo de Usuario** (por ejemplo, **Administrador**).
2. Ingresa el **Correo Electrónico** y la **Contraseña** correspondientes a la tabla anterior.
3. Haz clic en **Ingresar al Sistema**.

### ✅ Validaciones de éxito

- Aparecerá un mensaje de confirmación en color verde debajo del botón.
- Serás redirigido automáticamente al **Dashboard**.
- En la esquina superior derecha, el botón **Iniciar Sesión** desaparecerá.
- En su lugar, se mostrará:
  - Tu nombre de usuario (por ejemplo, `admin`).
  - Tu rol con la primera letra en mayúscula (por ejemplo, **Administrador**).
  - Un avatar con la inicial de tu correo electrónico.
  - Un botón gris con la opción **Salir**.

---

## 5. Cerrar Sesión y Cambiar de Usuario

1. Haz clic en el botón gris **Salir** ubicado en la esquina superior derecha del Dashboard.

### ✅ Validación

- La interfaz debe actualizarse inmediatamente.
- Tus datos dejarán de mostrarse.
- Volverá a aparecer el botón rojo **Iniciar Sesión**.
- Permanecerás en el **Dashboard público**.

Finalmente, repite el procedimiento desde el **Paso 2** utilizando las demás credenciales para verificar el funcionamiento de todos los roles del sistema.

---

## Resultado Esperado

Al finalizar las pruebas se debe confirmar que:

- El Dashboard es accesible sin necesidad de iniciar sesión.
- El formulario de acceso funciona correctamente.
- Cada rol puede autenticarse únicamente con sus credenciales correspondientes.
- Después del inicio de sesión se muestran correctamente los datos del usuario autenticado.
- El cierre de sesión restaura el estado público del Dashboard sin necesidad de recargar la página.