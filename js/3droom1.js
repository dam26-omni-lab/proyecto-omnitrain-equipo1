import * as THREE from './three.module.min.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';

// 1. Configuración básica de la Escena
        const scene = new THREE.Scene();
        // Un color de fondo suave
        scene.background = new THREE.Color(0x34495e); 

        // 2. Configuración de la Cámara
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, 10);

        // 3. Configuración del Renderizador
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio); // Mejora la nitidez en pantallas de alta resolución
        // Sombras suaves (opcional, mejora el aspecto)
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        // 4. Iluminación Mejorada
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Luz trasera para resaltar los bordes del extintor
        const backLight = new THREE.DirectionalLight(0xffffff, 1);
        backLight.position.set(-5, 5, -5);
        scene.add(backLight);

        // 5. Controles de Órbita (LA CLAVE PARA INTERACTUAR)
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Agrega inercia/suavidad al movimiento
        controls.dampingFactor = 0.05;
        controls.minDistance = 10; // Distancia mínima de zoom
        controls.maxDistance = 50; // Distancia máxima de zoom

        // 6. Cargador GLTF
        const loader = new GLTFLoader();
        const loadingText = document.getElementById('loading');

        // Cargar el modelo directamente desde la ruta
        loader.load('../resources/extinguisher.glb', (gltf) => {
            const currentModel = gltf.scene;

            // Hacer que el modelo proyecte y reciba sombras
            currentModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            // --- AUTO-CENTRAR Y AUTO-ENFOCAR LA CÁMARA ---
            // Esto asegura que sin importar el tamaño del modelo, siempre se vea centrado
            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            currentModel.position.x += (currentModel.position.x - center.x);
            currentModel.position.y += (currentModel.position.y - center.y);
            currentModel.position.z += (currentModel.position.z - center.z);

            scene.add(currentModel);

            // Ajustar la cámara según el tamaño del modelo
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
            cameraZ *= 1.0; // Alejar un poco para que respire
            
            camera.position.set(0, size.y / 2, cameraZ);
            controls.target.set(0, 0, 0);
            
            loadingText.style.display = 'none';
            
        }, undefined, (error) => {
            console.error('Error al cargar el modelo:', error);
            loadingText.innerText = "Error al cargar el modelo. Verifica la ruta.";
        });

        // 7. Adaptarse al cambio de tamaño de la ventana
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 8. Bucle de Animación
        function animate() {
            requestAnimationFrame(animate);
            
            // Actualizar controles (requerido si enableDamping es true)
            controls.update(); 
            
            renderer.render(scene, camera);
        }

        animate();