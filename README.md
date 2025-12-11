# 🌿 Green Compass

**Carbon Intelligence Dashboard for Nepal**

A modern, AI-powered carbon footprint tracking and analysis application focused on Nepal's major cities — Kathmandu, Bhaktapur, and Lalitpur. Built with React, Vite, and Tailwind CSS, powered by Google Gemini AI for real-time data generation.

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4.10-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.14-06B6D4?logo=tailwindcss)
![Gemini AI](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?logo=google)

---

## ✨ Features

### 📊 Carbon Indexing
- Real-time carbon index monitoring for selected city
- Sector-wise emissions breakdown (Transportation, Energy, Industry, Agriculture)
- Interactive pie chart visualization
- Trend analysis with quarterly change indicators
- Target vs. current index comparison

### 🧮 Carbon Footprint Calculator
- Personal carbon footprint calculation based on:
  - **Electricity Usage** (kWh/month)
  - **Transportation/Petrol** (Liters/month)
  - **Waste Production** (kg/month)
- AI-powered pre-population of average consumption values per city
- Instant CO2e emissions calculation
- Offset cost estimation in NPR
- Tree offset requirement calculator

### 📈 5-Year Forecast
- Historical carbon index data visualization (2020-2024)
- Predictive modeling for next 5 years
- Interactive line chart with trend analysis
- Year-by-year status indicators (Warning/Critical)
- Compound annual growth rate calculation

### 🌳 Mitigation Solutions
- Tree offset calculator based on personal footprint
- Actionable sustainability recommendations:
  - Solar energy transition
  - Electric vehicle adoption
  - Waste segregation practices
  - Demand response strategies
- Local plantation partner discovery

### 🤖 AI-Powered Data
- Google Gemini 1.5 Flash integration
- Dynamic emission factors per city
- Real-time average consumption data
- City-specific carbon profiles and insights

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Google AI Studio API Key** ([Get one here](https://aistudio.google.com/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HAliveKP/fun.git
   cd fun
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Open `.env` and add your Google AI Studio API key:
   ```env
   VITE_GOOGLE_API_KEY=your-api-key-here
   ```
   
   > ⚠️ **Important:** Never commit your `.env` file. It's already in `.gitignore`.

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

---

## 🏗️ Project Structure

```
fun/
├── public/              # Static assets
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Tailwind CSS imports
├── .env.example         # Environment variables template
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── vite.config.js       # Vite build configuration
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **Vite** | Fast build tool and dev server |
| **Tailwind CSS** | Utility-first styling |
| **Recharts** | Charts and data visualization |
| **Lucide React** | Modern icon library |
| **Google Gemini AI** | Real-time data generation |

---

## 🌍 Supported Regions

Currently optimized for Nepal's Kathmandu Valley:

- 🏙️ **Kathmandu** — Capital city with highest traffic density
- 🏛️ **Bhaktapur** — Heritage city with lower congestion
- 🏘️ **Lalitpur** — Rapidly developing urban center

---

## 📡 API Integration

The application uses Google Gemini 1.5 Flash for:

| Endpoint | Description |
|----------|-------------|
| `fetchEmissionFactors()` | CO2e factors for energy, transport, waste |
| `fetchAverageUsage()` | Average household consumption per city |
| `fetchHistoricalData()` | Historical carbon index (2020-2024) |
| `fetchIndexingData()` | Sector breakdown and city profile |

All API calls include fallback mock data for offline/demo usage.

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_API_KEY` | Yes | Google AI Studio API key for Gemini |

### Customization

- **Add new cities:** Update the city selector in `App.jsx` and add fallback data profiles
- **Modify emission factors:** Adjust the fallback values in `apiService.fetchEmissionFactors()`
- **Change theme:** Edit colors in `tailwind.config.js`

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📬 Contact

For questions or feedback, please open an issue on GitHub.

---

<p align="center">
  <strong>🌱 Track. Reduce. Offset. Sustain.</strong>
</p>
