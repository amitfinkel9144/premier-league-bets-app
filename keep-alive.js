// keep-alive.js
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://aqkuyzbznkybvluvvjzr.supabase.co';
const PING_ENDPOINT = '/rest/v1/matches'; // או כל טבלה ציבורית

fetch(`${SUPABASE_URL}${PING_ENDPOINT}`, {
  headers: {
    apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxa3V5emJ6bmt5YnZsdXZ2anpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDg2NDEsImV4cCI6MjA2NDM4NDY0MX0.b-wENQ1HK3TMXF3lvde92ZPWNZBh3v-_gUUDZaQHxcQ',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxa3V5emJ6bmt5YnZsdXZ2anpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MDg2NDEsImV4cCI6MjA2NDM4NDY0MX0.b-wENQ1HK3TMXF3lvde92ZPWNZBh3v-_gUUDZaQHxcQ',
  },
})
  .then((res) => res.json())
  .then((data) => console.log('✅ Ping sent. Response:', data.length ? '✅ OK' : '⚠️ No data'))
  .catch((err) => console.error('❌ Ping failed:', err.message));
