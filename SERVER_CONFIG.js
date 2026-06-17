/**
 * CONFIGURATION SERVEUR POUR PWA
 * Exemples pour Nginx, Apache et Node.js
 */

// ============================================
// 1. NGINX CONFIGURATION (.conf)
// ============================================

/*
server {
  listen 443 ssl http2;
  server_name bongsc.example.com;
  
  # SSL Configuration
  ssl_certificate /etc/ssl/certs/cert.pem;
  ssl_certificate_key /etc/ssl/private/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  
  root /var/www/bongsc;
  index index.html;
  
  # ============ MANIFEST.JSON ============
  location = /manifest.json {
    types {
      application/manifest+json json;
    }
    add_header Content-Type application/manifest+json;
    add_header Cache-Control "public, max-age=3600, must-revalidate";
    try_files $uri $uri/ =404;
  }
  
  # ============ SERVICE WORKER ============
  location = /service-worker.js {
    types {
      application/javascript js;
    }
    add_header Content-Type application/javascript;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri $uri/ =404;
  }
  
  # ============ INDEX.HTML (APP PRINCIPALE) ============
  location ~ ^/(index\.html)?$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri /index.html =404;
  }
  
  # ============ ASSETS STATIQUES (JS, CSS) ============
  location ~ \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  
  # ============ IMAGES ============
  location ~ \.(png|jpg|jpeg|gif|webp|svg|ico)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
  }
  
  # ============ FONTS ============
  location ~ \.(woff|woff2|ttf|otf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  
  # ============ API FIREBASE (NO CACHE) ============
  location ~ /\.well-known/assetlinks\.json$ {
    add_header Cache-Control "public, max-age=3600";
  }
  
  # ============ SPA ROUTING (Tout renvoie à index.html) ============
  location / {
    try_files $uri $uri/ /index.html =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
  
  # ============ GZIP COMPRESSION ============
  gzip on;
  gzip_types text/plain text/css application/json application/javascript 
             text/xml application/xml application/xml+rss text/javascript 
             application/manifest+json;
  gzip_min_length 1024;
  
  # ============ SECURITY HEADERS ============
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(self), camera=(), microphone=()" always;
  
  # ============ HSTS (HTTPS Strict Transport Security) ============
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# ============ HTTP TO HTTPS REDIRECT ============
server {
  listen 80;
  server_name bongsc.example.com;
  return 301 https://$server_name$request_uri;
}
*/

// ============================================
// 2. APACHE CONFIGURATION (.htaccess)
// ============================================

/*
# Enable mod_rewrite
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # HTTPS enforcement (optional)
  # RewriteCond %{HTTPS} off
  # RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # ============ SPA ROUTING ============
  # Don't rewrite actual files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ /index.html [L,QSA]
</IfModule>

# ============ CACHE CONTROL ============
<IfModule mod_headers.c>
  # Manifest.json
  <FilesMatch "^manifest\.json$">
    Header set Content-Type "application/manifest+json"
    Header set Cache-Control "public, max-age=3600, must-revalidate"
  </FilesMatch>
  
  # Service Worker
  <FilesMatch "^service-worker\.js$">
    Header set Content-Type "application/javascript"
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
  
  # HTML files
  <FilesMatch "\.html?$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
  
  # JS and CSS
  <FilesMatch "\.(js|css)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  
  # Images
  <FilesMatch "\.(png|jpg|jpeg|gif|webp|svg|ico)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
  
  # Fonts
  <FilesMatch "\.(woff|woff2|ttf|otf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  
  # ============ SECURITY HEADERS ============
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "geolocation=(self), camera=(), microphone=()"
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# ============ GZIP COMPRESSION ============
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE text/javascript
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/json
  AddOutputFilterByType DEFLATE application/manifest+json
</IfModule>

# ============ MIME TYPES ============
<IfModule mod_mime.c>
  AddType application/manifest+json .webmanifest
  AddType application/manifest+json .json
  AddType application/javascript .js
  AddEncoding gzip .js.gz
</IfModule>
*/

// ============================================
// 3. NODE.JS / EXPRESS CONFIGURATION
// ============================================

/*
const express = require('express');
const path = require('path');
const app = express();

// ============ COMPRESSION ============
const compression = require('compression');
app.use(compression());

// ============ STATIC FILES ============
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: false
}));

// ============ MANIFEST.JSON ============
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json');
  res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// ============ SERVICE WORKER ============
app.get('/service-worker.js', (req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'service-worker.js'));
});

// ============ STORAGE MANAGER ============
app.get('/storage-manager.js', (req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(path.join(__dirname, 'public', 'storage-manager.js'));
});

// ============ PWA INIT ============
app.get('/pwa-init.js', (req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(path.join(__dirname, 'public', 'pwa-init.js'));
});

// ============ ASSETS STATIQUES ============
app.use((req, res, next) => {
  if (req.url.match(/\.(js|css)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    res.set('Cache-Control', 'public, max-age=2592000');
  } else if (req.url.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.url.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
  }
  next();
});

// ============ SECURITY HEADERS ============
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});

// ============ SPA ROUTING ============
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============ LISTEN ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

// ============================================
// 4. FIREBASE HOSTING CONFIGURATION (firebase.json)
// ============================================

/*
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/manifest.json",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/manifest+json"
          },
          {
            "key": "Cache-Control",
            "value": "public, max-age=3600, must-revalidate"
          }
        ]
      },
      {
        "source": "/service-worker.js",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/javascript"
          },
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "/storage-manager.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/pwa-init.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(png|jpg|jpeg|gif|webp|svg|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=2592000"
          }
        ]
      },
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
*/

// ============================================
// 5. VÉRIFIER LA CONFIGURATION
// ============================================

/*
Checklist de vérification:

1. Manifest.json:
   curl -I https://bongsc.example.com/manifest.json
   Doit montrer: Content-Type: application/manifest+json

2. Service Worker:
   curl -I https://bongsc.example.com/service-worker.js
   Doit montrer: Cache-Control: no-cache, no-store, must-revalidate

3. Index.html:
   curl -I https://bongsc.example.com/
   Doit montrer: Cache-Control: no-cache, no-store, must-revalidate

4. HTTPS:
   Doit être HTTPS (sauf localhost)

5. Gzip:
   curl -I -H "Accept-Encoding: gzip" https://bongsc.example.com/
   Doit montrer: Content-Encoding: gzip

6. Security Headers:
   curl -I https://bongsc.example.com/
   Vérifier X-Content-Type-Options, X-Frame-Options, etc.
*/

export { };
