const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 576,

    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

function preload() {

    // Fondo
    this.load.image('background', './assets/bosque.png');

    // Frames del fuego
    this.load.image('fire1', './assets/fire1.png');
    this.load.image('fire2', './assets/fire2.png');
    this.load.image('fire3', './assets/fire3.png');
    this.load.image('fire4', './assets/fire4.png');
    this.load.image('fire5', './assets/fire5.png');
}

function create() {

    // Fondo
    this.add.image(512, 288, 'background');

    // Animación del fuego
    this.anims.create({
        key: 'fireAnimation',
        frames: [
            { key: 'fire1' },
            { key: 'fire2' },
            { key: 'fire3' },
            { key: 'fire4' },
            { key: 'fire5' }
        ],
        frameRate: 12,
        repeat: -1
    });

    // Coordenadas de prueba
    const firePositions = [
        { x: 120, y: 470, scale: 1.4 },
        { x: 170, y: 450, scale: 1.2 },
        { x: 220, y: 430, scale: 1.3 },
        { x: 90,  y: 410, scale: 1.1 },
        { x: 280, y: 460, scale: 1.5 },
        { x: 320, y: 420, scale: 1.2 }
    ];

    firePositions.forEach(pos => {

        const fire = this.add.sprite(
            pos.x,
            pos.y,
            'fire1'
        );

        fire.setScale(pos.scale);

        fire.play('fireAnimation');
    });
}

function update() {

}