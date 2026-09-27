# Screw Piles

A landing page for screw-pile foundations with a preliminary estimator and contact forms.

![Preview of the landing page](docs/preview.png)

## Overview

A landing page for screw-pile foundations with a preliminary estimator and contact forms. The layout adapts to desktop and mobile screens.

## Features

- Interactive pile-count estimator with site inputs
- Two contact forms with client-side feedback
- PHP form handler with input validation and a basic honeypot
- Responsive layout and accessible navigation

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- PHP

## Project Structure

```text
├── index.html
├── assets/css/style.css
├── assets/js/app.js
├── assets/img/
├── api/contact.php
├── privacy.html
├── manifest.webmanifest
├── docs/preview.png
└── README.md
```

## Live Demo

https://dayiawan.github.io/screw-piles/

## Running Locally

Open `index.html` in a browser for the frontend. To test contact form delivery, serve this project on a PHP-enabled host configured for outgoing mail; the form posts to `api/contact.php`.

## Notes

- GitHub Pages serves the frontend only. It cannot execute `api/contact.php`, so the contact forms cannot submit on the Pages demo. The PHP handler requires a PHP-compatible server with outbound mail configured.
