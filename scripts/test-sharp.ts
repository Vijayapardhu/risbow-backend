import * as sharp from 'sharp';

console.log('Sharp import successful');
console.log('Sharp type:', typeof sharp);

try {
    const s = sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } });
    console.log('Sharp instance created');
} catch (e) {
    console.error('Error creating sharp instance:', e);
}
