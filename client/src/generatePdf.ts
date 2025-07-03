import store from "./store";
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import customVfs from './vfs_fonts';
import image_base64 from "./image_base64";
pdfMake.vfs = customVfs.pdfMake.vfs;
pdfMake.fonts = customVfs.pdfMake.fonts;

const thinLineLayout = {
  hLineWidth: () => 0.3,    // толщина горизонтальных линий — 1
  vLineWidth: () => 0.3,    // толщина вертикальных линий — 1
  hLineColor: () => '#000', // цвет линий — черный
  vLineColor: () => '#000',
  paddingLeft: () => 4,   // отступы в ячейках, чтобы текст не прилипал к линиям
  paddingRight: () => 4,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

export const handleGeneratePdf = () => {
  const tableBody = [
    store.row1.map(cell => ({
      text: cell.value,
      bold: cell.isBold,
    })),
    ...store.table.slice(1).map(row =>
      row.map(cell => ({
        text: cell.value,
        bold: cell.isBold,
      }))
    )
  ];


  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60], // стандартные отступы: [left, top, right, bottom]
    content: [
      {
        image: image_base64, 
        width: 250, 
        alignment: 'center', // Center the image
        margin: [0, 0, 0, 10] // Margin below the image
      },
      {
        text: "Специализированная клиника по лечению аллергии", style: "imageLabel"
      },
      {
        text: "Импульсная осциллометрия\nРезультаты анализа", style: "header"
      },
      { 
        text: store.patientDataString, style: "conclusionText"
      },
      {
        style: 'tableSection',
        table: {
          headerRows: 1,
          body: tableBody,
        },
        layout: thinLineLayout,
      },
      { text: 'Заключение', style: 'header' },
      { text: 'До пробы с бронхолитиком:', style: 'subheader' },
      {
        // Используем store.pdfConclusion1 напрямую
        text: store.pdfConclusion1,
        style: 'conclusionText',
      },
      { text: 'После пробы с бронхолитиком:', style: 'subheader' },
      {
        // Используем store.pdfConclusion2 напрямую
        text: store.pdfConclusion2,
        style: 'conclusionText',
      },
      {
        text: "Врач: " + store.doctorName + "     _______________________________", style: "doctorData", margin: [0, 10, 0, 5]
      },
      {
        text: "Дата обследования: " + store.getLocaleDate(), style: "doctorData"
      }
    ],
    styles: {
      header: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 5],
      },
      conclusionText: {
        fontSize: 8,
        margin: [0, 0, 0, 5],
        lineHeight: 1.3
      },
      tableSection: {
        margin: [0, 0, 0, 10],
      },
      doctorData: {
        fontSize: 8,
        margin: [0, 0, 0, 5],
        lineHeight: 1.3,
        alignment: "right",
      },
      imageLabel: {
        fontSize: 12,
        margin: [0, 0, 0, 30],
        lineHeight: 1.3,
        alignment: "center",
        color: "#606060"
      }
    },
    defaultStyle: {
      fontSize: 8,
      font: 'Calibri',
    },
  };

  pdfMake.createPdf(docDefinition as any).download(`${store.patient.name} отчёт импульсная осциллометрия.pdf`);
};