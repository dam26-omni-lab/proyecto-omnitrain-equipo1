import * as THREE from './three.module.min.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';

        // 1. Configuración básica de la Escena
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2c3e50); 

        // 2. Configuración de la Cámara
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 5, 10);

        // 3. Configuración del Renderizador
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Ajuste de tono para que los colores del modelo se vean más realistas
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        document.body.appendChild(renderer.domElement);

        // 4. Iluminación para Escenarios Grandes
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        // Luz principal (simulando un sol o luz de techo fuerte)
        const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
        mainLight.position.set(10, 20, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048; // Sombras de mayor resolución
        mainLight.shadow.mapSize.height = 2048;
        scene.add(mainLight);

        // Luces de relleno para que no queden zonas completamente negras
        const fillLight1 = new THREE.DirectionalLight(0xddeeff, 1);
        fillLight1.position.set(-10, 5, -10);
        scene.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0xffeedd, 0.8);
        fillLight2.position.set(10, 5, -10);
        scene.add(fillLight2);

        // 5. Controles de Órbita
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2; 
        controls.maxDistance = 300; // Aumentado significativamente para poder ver toda la cocina

        // 6. Cargador GLTF
        const loader = new GLTFLoader();
        const loadingText = document.getElementById('loading');

        // Cargar la cocina moderna
        loader.load('../resources/modern_kitchen.glb', (gltf) => {
            const currentModel = gltf.scene;

            currentModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            // --- AUTO-CENTRAR Y AUTO-ENFOCAR ---
            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            currentModel.position.x += (currentModel.position.x - center.x);
            currentModel.position.y += (currentModel.position.y - center.y);
            currentModel.position.z += (currentModel.position.z - center.z);

            scene.add(currentModel);

            // Ajustar la cámara al tamaño de la habitación
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
            cameraZ *= 2.0; // Multiplicador ajustado para encuadrar escenarios grandes
            
            camera.position.set(center.x, size.y / 2 + center.y, cameraZ);
            controls.target.set(0, 0, 0);
            
            loadingText.style.display = 'none';
            
        }, undefined, (error) => {
            console.error('Error al cargar la cocina:', error);
            loadingText.innerText = "Error al cargar el modelo. Verifica la ruta.";
        });

        // 7. Adaptabilidad de pantalla
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 8. Bucle de Animación
        function animate() {
            requestAnimationFrame(animate);
            controls.update(); 
            renderer.render(scene, camera);
        }

        animate();