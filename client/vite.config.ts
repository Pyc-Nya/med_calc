import { defineConfig } from 'vite';
// import checker from 'vite-plugin-checker';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(), 
    // checker({ typescript: true })
  ],
  server: {
    port: 3000, // можно поменять порт для dev-сервера
    open: true, // автоматически открывать браузер
    strictPort: true, // если порт занят, не переключаться на другой
    hmr: {
      protocol: 'ws',         // по умолчанию ws, можно 'wss' если нужен SSL
      host: 'localhost',      // если в Docker/WSL — заменить на 0.0.0.0
      port: 3000,
      overlay: true,          // показывает overlay с ошибками
    },
  },
  build: {
    sourcemap: false,
    // Меняем минификатор на "terser"
    minify: 'terser',
    terserOptions: {
      // Сокрытие/«перемалывание» имён на верхнем уровне
      mangle: {
        // Сильная обфускация имён на верхнем уровне
        toplevel: true,
      },
      // Удаляем имена классов и функций (если это не ломает ваш код)
      keep_classnames: false,
      keep_fnames: false,
      compress: {
        // Пара проходов компрессора для более сильной оптимизации
        passes: 3,
        // Убираем console.* и debugger
        drop_console: true,
        drop_debugger: true,
      },
      // Дополнительные настройки вывода (по желанию)
      format: {
        // Можно включить опцию comments: false,
        // чтобы вообще вырезать комментарии
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        entryFileNames: 'ui-designer_build.js', // Устанавливаем имя выходного JS-файла
      },
    },
  },
});
