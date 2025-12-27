# hg-reporter

Aplicación para hacer scraping de descuentos de juegos de Xbox en múltiples países (Colombia, Argentina, Turquía, India), agruparlos y presentarlos en una tabla comparativa.

## Estructura del Proyecto

```
hg-reporter/
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── scraper/  # Lógica de scraping
│   │   ├── routes/   # Endpoints API
│   │   ├── services/ # Servicios (currency, excel)
│   │   └── scheduler/ # Jobs programados
│   └── package.json
├── frontend/         # Aplicación React
│   ├── src/
│   │   ├── components/
│   │   ├── services/ # API client
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Instalación

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Características

- Scraping de descuentos de Xbox en 4 países (CO, AR, TR, IN)
- Paginación cursor-based automática
- Agregación de datos por juego
- Conversión de monedas
- Tabla interactiva con búsqueda y filtros
- Exportación a Excel
- Scraping programado (cada 6 horas) y on-demand

