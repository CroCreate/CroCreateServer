const dotenv = require("dotenv");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

// Extract environment variables
const ENV = process.env;

// Initialize express app
const app = express();

// Configure CORS
const corsRoutes = ENV.CORS?.split(",") || ["http://localhost:3000"];
app.use(
  cors({
    origin: corsRoutes,
    credentials: true,
  })
);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);

// Define constants
const PORT = ENV.PORT || 3000;


let token;

app.get("/api/cryptocurrency", async (req, res) => {
  const { slug, currency } = req.query;
  let chartDataResponse;

  try {

    let response;
    if (currency) {
      const query = `https://api.dexscreener.com/latest/dex/search?q=${slug}/${currency}`;
      response = await axios.get(query);
    } else {
      response = await axios.get(
        `https://api.dexscreener.com/latest/dex/search?q=${slug}/USDT`
      );
    }
    const pairs = response.data?.pairs;
    if (!pairs) {
      return res.json({
        success: false,
        tokenDetails: null,
        chartData: null,
      });
    }

    token = pairs?.find((pair) => {
      return (
        pair?.chainId == "cronos" &&
        ((pair?.baseToken?.symbol?.trim()?.toLowerCase() == slug.trim()?.toLowerCase() ||
          pair?.baseToken?.name?.trim()?.toLowerCase() == slug.trim()?.toLowerCase())
          && (currency ? pair?.quoteToken?.symbol?.trim()?.toLowerCase() == currency?.toLowerCase() : pair?.quoteToken?.symbol?.trim()?.toLowerCase() == "usdt"))
      );
    });

    // Fetch chart data from CoinGecko
    if (!token) {
      return res.json({
        success: false,
        tokenDetails: null,
        chartData: null,
      });
    }
    const chartQuery = `https://api.coingecko.com/api/v3/coins/cronos/contract/${token?.baseToken?.address}/market_chart?vs_currency=usd&days=365&interval=daily`
    chartDataResponse = await axios.get(chartQuery);
    res.json({
      success: true,
      tokenDetails: token,
      chartData: chartDataResponse?.data,
    });
  } catch (error) {
    if (token || chartDataResponse) {
      return res.json({
        success: true,
        tokenDetails: token || null,
        chartData: chartDataResponse?.data || null,
      });
    }
    console.log("API Error:", error.message);
    // Extract error details
    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.message ||
      "An unexpected error occurred while processing your request.";

    res.status(statusCode).json({
      success: false,
      error: {
        message: errorMessage,
        details: error.response?.data || null,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started and running on port ${PORT}`);
});
