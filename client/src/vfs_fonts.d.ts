// src/vfs_fonts.d.ts
declare module './vfs_fonts' {
  import { TFontFamily, TFontDictionary } from 'pdfmake/interfaces';

  interface CustomVfsModule {
    pdfMake: {
      vfs: { [key: string]: string };
      fonts: TFontDictionary; // Or a more specific type if you know it
    };
  }
  const customVfs: CustomVfsModule;
  export default customVfs;
}