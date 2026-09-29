# Weather lookup

Lets the assistant answer "what's the weather like there?" for a place given as coordinates.

## Current weather
Input is a latitude (-90 to 90) and a longitude (-180 to 180). Optionally the caller can ask for fahrenheit; the default is celsius.

We use the free Open-Meteo API at api.open-meteo.com. No API key is needed. The result has the current temperature, the wind speed in km/h, and which temperature unit was used.

If the weather service can't be reached or returns an error, the answer is the error "Weather service unavailable".
