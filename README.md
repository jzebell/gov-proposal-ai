# Government Proposal AI Assistant

The **Government Proposal AI Assistant** is an intelligent platform designed to streamline the creation, review, and management of government proposals. Leveraging advanced AI models, it assists users in drafting compliant, high-quality proposals, automates repetitive tasks, and provides insightful feedback to enhance proposal success rates.

---

## Table of Contents

- [Project Description](#project-description)
- [System Requirements](#system-requirements)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [API Endpoints](#api-endpoints)
- [Development Setup](#development-setup)
- [Troubleshooting](#troubleshooting)

---

All other local information is housed in the root MD directory

## Project Description

This project provides an end-to-end solution for government proposal management, featuring:

- AI-powered proposal drafting and editing
- Compliance checking and feedback
- Collaboration tools for teams
- RESTful API for integration with other systems

---

## System Requirements

- **Operating System:** Windows 10/11, macOS, or Linux
- **CPU:** Quad-core or higher recommended
- **Memory:** 8 GB RAM minimum
- **Storage:** 2 GB free disk space
- **Docker:** v20.10+ and Docker Compose v2.0+

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) installed
- Internet connection for pulling images and dependencies

---

## Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/gov-proposal-ai.git
    cd gov-proposal-ai
    ```

2. **Copy environment variables template and configure as needed:**
    ```bash
    cp .env.example .env
    # Edit .env to set API keys and configuration
    ```

3. **Start the application using Docker Compose:**
    ```bash
    docker compose up -d
    ```

4. **Verify services are running:**
    ```bash
    docker compose ps
    ```

---

## Usage Guide

1. **Access the Web Interface:**
    - Open your browser and navigate to [http://localhost:8080](http://localhost:8080)

2. **Create a New Proposal:**
    - Click "New Proposal" and follow the guided steps.

3. **Review and Edit:**
    - Use AI suggestions to improve content and ensure compliance.

4. **Export or Submit:**
    - Download the proposal as PDF/Word or submit via integrated channels.

---

## API Endpoints

| Method | Endpoint                | Description                       |
|--------|------------------------ |-----------------------------------|
| POST   | `/api/proposals`        | Create a new proposal             |
| GET    | `/api/proposals`        | List all proposals                |
| GET    | `/api/proposals/{id}`   | Retrieve a specific proposal      |
| PUT    | `/api/proposals/{id}`   | Update a proposal                 |
| DELETE | `/api/proposals/{id}`   | Delete a proposal                 |
| POST   | `/api/ai/suggest`       | Get AI suggestions for content    |
| POST   | `/api/ai/compliance`    | Run compliance checks             |

**Authentication:**  
All endpoints require a valid API token in the `Authorization` header.

---

## Development Setup

1. **Install dependencies:**
    ```bash
    npm install
    ```

2. **Run in development mode:**
    ```bash
    npm run dev
    ```

3. **Run tests:**
    ```bash
    npm test
    ```

4. **Lint and format code:**
    ```bash
    npm run lint
    npm run format
    ```

---

## Troubleshooting

- **Docker containers not starting:**  
  Ensure Docker is running and ports 8080/8000 are free.

- **Environment variables missing:**  
  Double-check your `.env` file for required keys.

- **API errors:**  
  Check container logs with `docker compose logs`.

- **Out of memory:**  
  Increase Docker's allocated memory in settings.

- **Further help:**  
  Open an issue on [GitHub Issues](https://github.com/your-org/gov-proposal-ai/issues).

---

**Get started today and accelerate your government proposal process with AI!**