import fs from 'fs';
import path from 'path';
import Fontmin from 'fontmin';

// Define your font family and their paths
const fontFiles = {
  Calibri: {
    normal: './src/static_assets/fonts/calibri.ttf',
    bold: './src/static_assets/fonts/calibri_bold.ttf',
  },
};

const fontDescriptor = {};
const vfs = {};

const processFont = (fontName, style, filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) return reject(err);
      vfs[path.basename(filePath)] = data.toString('base64');
      resolve();
    });
  });
};

const generateVfs = async () => {
  for (const family in fontFiles) {
    fontDescriptor[family] = {};
    const promises = [];
    for (const style in fontFiles[family]) {
      const filePath = fontFiles[family][style];
      fontDescriptor[family][style] = path.basename(filePath);
      promises.push(processFont(family, style, filePath));
    }
    await Promise.all(promises);
  }

  const output = `module.exports = {
    pdfMake: {
      vfs: ${JSON.stringify(vfs, null, 2)},
      fonts: ${JSON.stringify(fontDescriptor, null, 2)}
    }
  };`;

  fs.writeFileSync('./src/vfs_fonts.js', output, 'utf8');
  console.log('vfs_fonts.js generated successfully!');
};

generateVfs().catch(err => {
  console.error('Error generating vfs_fonts.js:', err);
});