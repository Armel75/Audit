const pdfMake = require('pdfmake/build/pdfmake');
const vfs = require('pdfmake/build/vfs_fonts');

console.log('exports', Object.keys(pdfMake));

async function run() {
  // Try variant 1: write fonts into virtualfs then plain createPdf
  try {
    for (const [f, data] of Object.entries(vfs)) {
      pdfMake.virtualfs.writeFileSync(f, Buffer.from(data, 'base64'));
    }
    const dd = {
      defaultStyle: { font: 'Roboto', fontSize: 11 },
      content: [{ text: 'TEST SOREPCO', fontSize: 20 }, { table: { body: [['a', 'b'], ['1', '2']] } }],
    };
    const doc = pdfMake.createPdf(dd);
    doc.getBuffer((buf) => console.log('VARIANT1 OK bytes=', buf.length));
  } catch (e) {
    console.log('VARIANT1 ERR', e.message);
  }
}

run();
setTimeout(() => console.log('done waiting'), 3000);
