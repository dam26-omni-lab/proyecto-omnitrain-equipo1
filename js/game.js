// Configuración básica de Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    parent: 'game-container', // Vincula el lienzo al div con este ID
    backgroundColor: '#34495e', // Fondo gris/azul moderno
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Inicializar el juego
const game = new Phaser.Game(config);

function preload() {
    // Aquí cargarás tus imágenes, sprites de extintores y fuego más adelante
}

function create() {
    // Texto de prueba para demostrarle al profesor que Phaser está corriendo perfectamente
    this.add.text(400, 150, '¡Phaser 3 cargado con éxito!', {
        fontSize: '28px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontWeight: 'bold'
    }).setOrigin(0.5);

    this.add.text(400, 220, 'Proyecto OmniTrain - Simulador de Extintores', {
        fontSize: '18px',
        fill: '#e74c3c', // Rojo simulador / extintor
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.add.text(400, 260, 'Estatus: Listo para desarrollo de escenarios', {
        fontSize: '14px',
        fill: '#2ecc71', // Verde éxito
        fontFamily: 'Arial'
    }).setOrigin(0.5);
}

function update() {
    // Aquí irá el bucle del juego (movimiento del extintor, partículas de espuma, etc.)
}