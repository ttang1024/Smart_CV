# Stage 1: Build React frontend
FROM node:20-slim AS frontend
WORKDIR /src
RUN mkdir -p SmartCV.API/wwwroot
COPY SmartCV.Web/package*.json SmartCV.Web/
RUN cd SmartCV.Web && npm ci
COPY SmartCV.Web/ SmartCV.Web/
RUN cd SmartCV.Web && npm run build

# Stage 2: Publish .NET API (with wwwroot from stage 1)
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS backend
WORKDIR /src
COPY SmartCV.API/ SmartCV.API/
COPY --from=frontend /src/SmartCV.API/wwwroot SmartCV.API/wwwroot
RUN dotnet publish SmartCV.API/SmartCV.API.csproj -c Release -o /app/publish

# Stage 3: Runtime with Google Chrome
# .NET 10 only publishes noble (Ubuntu 24.04) images; Noble's chromium package is a snap stub
# that doesn't work in containers, so we install google-chrome-stable from Google's apt repo instead.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg2 \
    ca-certificates \
    fonts-noto-cjk \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
       | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] https://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Tell PuppeteerSharp to use the system browser instead of downloading one
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV ASPNETCORE_HTTP_PORTS=8080

COPY --from=backend /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "SmartCV.API.dll"]
