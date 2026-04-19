Proyecto creado

  Estructura final:
  MargoDiseño/
  ├── server.js              ← backend Express + MercadoPago
  ├── package.json
  ├── .env                   ← configuración (editá tu token aquí)
  ├── .env.example
  ├── .gitignore
  ├── railway.json
  ├── private/
  │   └── Mudarte bien sin equicarte...pdf  ← PDF seguro, no público
  └── public/
      ├── index.html         ← product page
      ├── styles.css
      ├── main.js
      ├── success.html
      ├── failure.html
      ├── pending.html
      └── assets/
          └── profile.jpg   ← ← colocá tu foto acá

  ---
  Próximos pasos para probar

  1. Conseguir credenciales de MercadoPago (sandbox)

  1. Ingresá a https://www.mercadopago.com.ar con tu cuenta
  2. Ir a Tu negocio → Configuración → Credenciales
  3. Seleccionar Credenciales de prueba → copiar el Access token de prueba (empieza con TEST-)
  4. Abrí el archivo .env y reemplazá TEST-REEMPLAZA-CON-TU-ACCESS-TOKEN con el tuyo

  2. Arrancar el servidor

  npm run dev
  Abrir http://localhost:3000

  3. Probar el pago (sin dinero real)

  Tarjeta de prueba de MercadoPago Argentina:
  - Número: 5031 7557 3453 0604
  - CVV: 123 · Vencimiento: 11/25
  - Nombre: cualquier nombre · DNI: 12345678

  ▎ Para que los webhooks funcionen en local necesitás https://ngrok.com/: ngrok http 3000 → poner la URL HTTPS en
  ▎ BASE_URL del .env. Sin ngrok la ruta /success tiene un fallback que verifica el pago directamente, así que la
  ▎ descarga igual funciona.

  4. Colocar tu foto de perfil

  Guardar la imagen como public/assets/profile.jpg

  5. Deploy a Railway (cuando estés lista)

  Avisame y lo hacemos juntas — incluye subir el PDF al servidor de forma segura.