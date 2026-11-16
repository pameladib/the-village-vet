import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const name = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, crc]);
}

function png(width, height, rgba) {
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y += 1) {
        const row = y * (width * 4 + 1);
        raw[row] = 0;
        rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 6;
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

function paint(size, inset) {
    const pixels = Buffer.alloc(size * size * 4);
    const background = [6, 95, 70, 255];
    const paw = [255, 255, 255, 255];
    for (let i = 0; i < pixels.length; i += 4) pixels.set(background, i);
    const mark = (x, y, rx, ry) => {
        for (let py = Math.floor(y - ry); py <= y + ry; py += 1) {
            for (let px = Math.floor(x - rx); px <= x + rx; px += 1) {
                if (px < 0 || py < 0 || px >= size || py >= size) continue;
                const dx = (px + 0.5 - x) / rx;
                const dy = (py + 0.5 - y) / ry;
                if (dx * dx + dy * dy <= 1) pixels.set(paw, (py * size + px) * 4);
            }
        }
    };
    const span = size * (1 - inset * 2);
    const cx = size / 2;
    const cy = size * 0.56;
    const unit = span * 0.092;
    const toes = [
        [-1.55, -1.75],
        [-0.55, -2.2],
        [0.55, -2.2],
        [1.55, -1.75],
    ];
    for (const [dx, dy] of toes) mark(cx + dx * unit * 1.65, cy + dy * unit * 1.15, unit * 0.72, unit * 0.92);
    mark(cx, cy + unit * 0.45, unit * 1.55, unit * 1.22);
    return png(size, size, pixels);
}

writeFileSync("public/icon-192.png", paint(192, 0.08));
writeFileSync("public/icon-512.png", paint(512, 0.08));
writeFileSync("public/icon-maskable-192.png", paint(192, 0.18));
writeFileSync("public/icon-maskable-512.png", paint(512, 0.18));
writeFileSync("public/apple-touch-icon.png", paint(180, 0.08));
