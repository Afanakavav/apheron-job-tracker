// Script Node.js per creare icone Chrome Extension
// Usa sharp se disponibile, altrimenti usa jimp

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createIcons() {
  const inputPath = path.join(__dirname, '..', 'public', 'icon-192.png');
  const outputDir = path.join(__dirname, 'icons');
  const sizes = [16, 48, 128];

  // Crea directory icons se non esiste
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Verifica che il file input esista
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File non trovato: ${inputPath}`);
    console.log('💡 Assicurati che public/icon-192.png esista');
    process.exit(1);
  }

  try {
    // Prova a usare sharp (più veloce)
    const sharp = (await import('sharp')).default;
    console.log('✅ Usando sharp per ridimensionare le icone...');

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}.png`);
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(outputPath);
      console.log(`✅ Creata icona ${size}x${size}: ${outputPath}`);
    }

    console.log('\n🎉 Tutte le icone create con successo!');
    console.log(`📁 Directory: ${outputDir}`);
  } catch (sharpError) {
    // Se sharp non è disponibile, prova jimp
    try {
      const Jimp = (await import('jimp')).default;
      console.log('✅ Usando jimp per ridimensionare le icone...');

      const image = await Jimp.read(inputPath);

      for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon-${size}.png`);
        await image
          .resize(size, size)
          .writeAsync(outputPath);
        console.log(`✅ Creata icona ${size}x${size}: ${outputPath}`);
      }

      console.log('\n🎉 Tutte le icone create con successo!');
      console.log(`📁 Directory: ${outputDir}`);
    } catch (jimpError) {
      // Se neanche jimp è disponibile, usa canvas
      try {
        const { createCanvas, loadImage } = await import('canvas');
        console.log('✅ Usando canvas per ridimensionare le icone...');

        const image = await loadImage(inputPath);

        for (const size of sizes) {
          const canvas = createCanvas(size, size);
          const ctx = canvas.getContext('2d');
          
          // Disegna l'immagine ridimensionata
          ctx.drawImage(image, 0, 0, size, size);
          
          const outputPath = path.join(outputDir, `icon-${size}.png`);
          const buffer = canvas.toBuffer('image/png');
          fs.writeFileSync(outputPath, buffer);
          console.log(`✅ Creata icona ${size}x${size}: ${outputPath}`);
        }

        console.log('\n🎉 Tutte le icone create con successo!');
        console.log(`📁 Directory: ${outputDir}`);
      } catch (canvasError) {
        console.error('❌ Nessuna libreria di immagini disponibile!');
        console.error('\n💡 Installa una di queste librerie:');
        console.error('   npm install sharp');
        console.error('   oppure');
        console.error('   npm install jimp');
        console.error('   oppure');
        console.error('   npm install canvas');
        console.error('\n📝 Alternativa: Usa chrome-extension/create-icons.html nel browser');
        process.exit(1);
      }
    }
  }
}

// Esegui lo script
createIcons().catch(error => {
  console.error('❌ Errore:', error);
  process.exit(1);
});

