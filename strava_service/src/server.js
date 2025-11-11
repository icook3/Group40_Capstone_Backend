import dotenv from "dotenv";
import express from "express";
import axios from "axios";

dotenv.config();

const app = express(); // Create express app
const PORT = process.env.PORT || 8080; // Server port

// Assign environment details
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const FRONTEND_REDIRECT_URI = process.env.FRONTEND_REDIRECT_URI

// Check to ensure necessary info provided
if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !FRONTEND_REDIRECT_URI) {
    console.error("ERROR: Missing client Id, client secret, or frontend redirect url");
    process.exit(1);
}

// Health check endpoint - For docker to test if service is still alive
app.get("/health", (_req, res) => {
   res.status(200).send("ok")
});

// Main OAuth callback endpoint - Strava redirects user here after approval
app.get("/oauth/callback", async (req, res) =>{
    try {
        // Strava sends ?code=XYZ in URL
        const {code, error} = req.query;

        // If Strava sends and error than stop
        if (error) {
            return res.status(400).send(`Strava Authorization Error: ${error}`);
        }

        // If Strava doesn't send code
        if (!code) {
            return res.status(400).send("Missing 'code' query parameter")
        }

        // Exchange code for access token securely from server side
        // IMPORTANT: MUST NOT HAPPEN IN BROWSER!!!!!!!
        const tokenURL = "https://www.strava.com/oauth/token";
        const payload = {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
        };

        // Perform POST to Strava OAuth token endpoint
        const {data} = await axios.post(tokenURL, payload, {
            headers: {"Content-Type": "application/json"},
            timeout: 10000 // Prevents hanging requests
        });

        // Create URL hash to send back to frontend
        // Hashing avoids tokens showing up in browser history or server logs
        const hash = new URLSearchParams({
            access_token: data.access_token ?? "",
            refresh_token: data.refresh_token ?? "",
            expires_at: String(data.expires_at ?? ""),
            athlete_id: String(data.athlete?.id ?? ""),
        }).toString();

        // Redirect user back to frontend with tokens in hash fragment
        const redirectTo = `${FRONTEND_REDIRECT_URI}#${hash}`;

        return res.redirect(302, redirectTo);
    }
    catch (err) {
        // If Strava token exchange fails
        console.error("OAuth exchange failed:", err?.response?.data || err.message);
        return res.status(500).send("OAuth token exchange failed")
    }
});

app.get("/oauth/refresh", async (req, res) => {
    try {
        // Front end sends refresh_token in URL:  ?refresh_token=XYZ
        const {refresh_token} = req.query;

        if (!refresh_token) {
            return res.status(400).send("Missing 'refresh_token' query parameter");
        }

        // Exchange code for access token securely from server side
        // IMPORTANT: MUST NOT HAPPEN IN BROWSER!!!!!!!
        const tokenURL = "https://www.strava.com/oauth/token";
        const payload = {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token,
        };

        // Perform POST to Strava OAuth token endpoint
        const {data} = await axios.post(tokenURL, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 10000
        })

        // Return minimal JSON response
        return res.json({
            access_token: data.access_token ?? "",
            refresh_token: data.refresh_token ?? "",
            expires_at: data.expires_at ?? "",
        });

    } catch (err) {
        console.error("Token refresh failed:", err?.response?.data || err.message);
        return res.status(500).send("Token refresh failed");
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Strava OAuth Service is running on port ${PORT}`)
})